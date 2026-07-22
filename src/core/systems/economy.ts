import { balance } from '../../data/balance';
import { appendLog } from '../engine/log';
import type { GameState } from '../model/gameState';
import type { CashflowEntry } from '../model/moral';
import { clampHype } from './market';
import { salaryCostFactor } from './policies';
import { aggregateReputation } from './reputation';

/**
 * Economía completa (docs/06 §4): costes recurrentes, préstamos con interés
 * semanal (~1 %/sem) que CAPITALIZA en la deuda (Fase 10.1, docs/20 W1),
 * marketing como coste, libro de caja para Finanzas y bancarrota por capital
 * negativo sostenido. Los ingresos por ventas los aplica advanceSales (que
 * anota su parte del libro de caja); aquí se paga la nómina, la deuda engorda
 * con su interés y se vigila la caja.
 */

// ---------------------------------------------------------------------------
// Préstamos (docs/06 §4 y docs/12 §6): línea de crédito flexible
// ---------------------------------------------------------------------------

/** Fracción → porcentaje legible en el historial (0,025 → "2,5 %", no "3 %"). */
const pct = (fraction: number): string =>
  `${(fraction * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;

/** Costes fijos semanales actuales (los que el banco mira para prestar). */
export function weeklyFixedCosts(state: GameState): number {
  // La política salarial abarata o encarece la nómina (docs/02 §4, escala grande).
  const salaries =
    state.staff.reduce((sum, e) => sum + e.salary, 0) * salaryCostFactor(state);
  const upkeep =
    balance.economy.weeklyUpkeep + balance.economy.upkeepExtraByStage[state.studio.scaleStage];
  return Math.round(upkeep + salaries);
}

/**
 * Línea de crédito total (docs/06 §4): ~6 meses de costes fijos, escalada por
 * la reputación agregada (un estudio querido inspira más confianza al banco).
 */
export function creditLimit(state: GameState): number {
  const l = balance.economy.loans;
  const rep01 = aggregateReputation(state.studio.reputation) / 100;
  const factor = l.creditFactorMin + (l.creditFactorMax - l.creditFactorMin) * rep01;
  return Math.max(
    l.floorAmount,
    Math.round(weeklyFixedCosts(state) * l.capWeeksOfFixedCosts * factor),
  );
}

/**
 * Crédito aún disponible: la línea menos la DEUDA VIVA (Fase 10.2-B, docs/20
 * §Préstamos). Antes solo descontaba el principal, así que el interés
 * acumulado no estrechaba la línea y la deuda podía capitalizar sin morder
 * nada — el arreglo de la 10.1 se quedaba cosmético. Ahora endeudarte te
 * reduce tu propio margen de maniobra: es la mitad "la deuda pesa" del
 * rediseño (la otra mitad es la amortización forzosa del tick).
 */
export function availableCredit(state: GameState): number {
  return Math.max(0, creditLimit(state) - outstandingDebt(state));
}

/**
 * Deuda viva total (Fase 10.1, docs/20 W1): principal pendiente + interés
 * acumulado. Es lo que hay que amortizar para saldar; compone cada tick.
 */
export function outstandingDebt(state: GameState): number {
  return state.loanPrincipal + (state.loanInterest ?? 0);
}

/**
 * Interés de esta semana (Fase 10.1): ~1 %/sem sobre la DEUDA VIVA (no solo el
 * principal), de modo que el interés no pagado compone — la espiral es real.
 */
export function weeklyLoanInterest(state: GameState): number {
  return Math.round(outstandingDebt(state) * balance.economy.loans.weeklyInterest);
}

/**
 * Cuota mínima obligatoria de esta semana (Fase 10.2-B, docs/20 §Préstamos):
 * el banco se la cobra de la CAJA en cada tick, sin preguntar. Es lo que
 * convierte el préstamo en una decisión con consecuencia — antes la deuda
 * capitalizaba al infinito (124,9 mil millones en la partida de la Fábrica)
 * sin tocar el flujo de caja jamás. Como la cuota (2,5 %) supera al interés
 * (1 %), una deuda desatendida DECRECE despacio en vez de dispararse.
 */
export function weeklyMinimumPayment(state: GameState): number {
  const debt = outstandingDebt(state);
  if (debt <= 0) return 0;
  const { minPaymentRate, minPaymentFloor } = balance.economy.loans;
  return Math.min(debt, Math.max(minPaymentFloor, Math.round(debt * minPaymentRate)));
}

/**
 * Aplica un pago de deuda: salda PRIMERO el interés acumulado y luego el
 * principal (docs/20 W1a), sin dejar la deuda negativa. Puro; no toca la caja
 * (de eso se encargan `repayLoan` y el tick, que sí la mueven).
 */
function applyDebtPayment(state: GameState, payment: number): GameState {
  const interestPaid = Math.min(payment, state.loanInterest ?? 0);
  const principalPaid = Math.min(payment - interestPaid, state.loanPrincipal);
  return {
    ...state,
    loanPrincipal: state.loanPrincipal - principalPaid,
    loanInterest: (state.loanInterest ?? 0) - interestPaid,
  };
}

/** Ingreso medio reciente (ventas + MTX) sobre la ventana de la espiral. */
export function recentAverageIncome(state: GameState): number {
  const window = state.cashflow.slice(-balance.economy.loans.spiral.lookbackWeeks);
  if (window.length === 0) return 0;
  return window.reduce((sum, e) => sum + e.income, 0) / window.length;
}

/**
 * ¿La deuda está en espiral de muerte? (docs/20 W1c) — el interés semanal
 * supera el ingreso medio reciente por encima del umbral, con un suelo
 * absoluto para no gritar por un préstamo puente trivial. Puro y trazable: la
 * UI y el store leen esto; el flag `debtSpiral` guarda el flanco entre ticks.
 */
export function isDebtSpiraling(state: GameState): boolean {
  const { spiral } = balance.economy.loans;
  if (outstandingDebt(state) <= 0) return false;
  // El suelo absoluto sigue midiéndose sobre el interés (una deuda trivial no
  // es una espiral); lo que se compara con el ingreso es la CUOTA obligatoria
  // desde 10.2-B, porque es el drenaje de caja REAL que el jugador sufre.
  if (weeklyLoanInterest(state) < spiral.minWeeklyInterest) return false;
  return weeklyMinimumPayment(state) > recentAverageIncome(state) * spiral.incomeRatio;
}

/** Acción: pedir prestado contra la línea de crédito. */
export function takeLoan(state: GameState, amount: number): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Importe de préstamo inválido');
  if (amount > availableCredit(state)) {
    throw new Error('El banco no presta más: línea de crédito agotada');
  }
  const next: GameState = {
    ...state,
    studio: { ...state.studio, capital: state.studio.capital + amount },
    loanPrincipal: state.loanPrincipal + amount,
  };
  return appendLog(
    next,
    'economia',
    `Préstamo de ${amount.toLocaleString('es-ES')} 💰 (interés ~${pct(
      balance.economy.loans.weeklyInterest,
    )}/semana). El banco cobrará una cuota semanal de ~${pct(
      balance.economy.loans.minPaymentRate,
    )} de la deuda: cuenta con ella en la caja.`,
  );
}

/**
 * Acción: amortizar deuda (devolución flexible, docs/06 §4). Desde 10.1
 * (docs/20 W1a) el pago descuenta PRIMERO el interés acumulado y luego el
 * principal — el orden correcto para que la deuda viva baje bien y nunca quede
 * negativa. No se puede pagar sin caja ni por encima de la deuda.
 */
export function repayLoan(state: GameState, amount: number): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Importe de pago inválido');
  const debt = outstandingDebt(state);
  const payment = Math.min(amount, debt);
  if (payment <= 0) throw new Error('No hay deuda que devolver');
  if (payment > state.studio.capital) {
    throw new Error('No hay caja suficiente para ese pago');
  }
  // El interés se salda antes que el principal (docs/20 W1a).
  const interestPaid = Math.min(payment, state.loanInterest ?? 0);
  const paid = applyDebtPayment(state, payment);
  const next: GameState = {
    ...paid,
    studio: { ...state.studio, capital: state.studio.capital - payment },
    // Saldada la deuda, el aviso de espiral se rearma para la próxima.
    debtSpiral: outstandingDebt(paid) <= 0 ? false : state.debtSpiral,
  };
  return appendLog(
    next,
    'economia',
    outstandingDebt(next) === 0
      ? 'Deuda saldada. La caja respira sin intereses.'
      : `Amortizados ${payment.toLocaleString('es-ES')} 💰${
          interestPaid > 0 ? ` (${interestPaid.toLocaleString('es-ES')} de intereses)` : ''
        }; deuda viva ${outstandingDebt(next).toLocaleString('es-ES')} 💰.`,
  );
}

// ---------------------------------------------------------------------------
// Marketing como coste (docs/06 §4): campañas por nivel que compran hype
// ---------------------------------------------------------------------------

/**
 * Acción: comprar una campaña de marketing para un proyecto (sin id, el
 * primero). Desde 9.1 las campañas son RE-COMPRABLES (marketing sin tope,
 * docs/19 §9.1): cada compra vuelve a pagar su coste y suma su hype; el
 * límite lo pone la caja, no una barra. `marketingUsed` guarda una entrada
 * por compra (con repetidos).
 */
export function launchMarketingCampaign(
  state: GameState,
  level: number,
  projectId?: string,
): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const project =
    projectId === undefined
      ? state.projects[0]
      : state.projects.find((p) => p.id === projectId);
  if (!project) throw new Error('No hay proyecto en desarrollo');
  const campaign = balance.economy.marketing.levels[level];
  if (!campaign) throw new Error(`Nivel de campaña desconocido: ${level}`);
  if (project.phase < balance.market.hype.startPhase) {
    throw new Error('Demasiado pronto: el marketing arranca con la Producción (el anuncio)');
  }

  // Con publisher (9.6), la campaña tira primero de SU bolsa de marketing
  // hasta agotarla; el resto lo pagas tú. Lo cubierto se acumula en el trato
  // para que el P&L no te cobre lo que no pagaste (releasedGameCost).
  const deal = project.publisherDeal;
  const covered = deal ? Math.min(deal.marketingBudgetLeft, campaign.cost) : 0;
  const yourCost = campaign.cost - covered;

  const next: GameState = {
    ...state,
    studio: { ...state.studio, capital: state.studio.capital - yourCost },
    projects: state.projects.map((p) =>
      p.id === project.id
        ? {
            ...p,
            hype: clampHype(p.hype + campaign.hypeBoost),
            marketingUsed: [...p.marketingUsed, level],
            publisherDeal:
              deal && covered > 0
                ? {
                    ...deal,
                    marketingBudgetLeft: deal.marketingBudgetLeft - covered,
                    marketingCovered: deal.marketingCovered + covered,
                  }
                : p.publisherDeal,
          }
        : p,
    ),
  };
  return appendLog(
    next,
    'economia',
    covered > 0
      ? `Campaña de marketing (nivel ${level + 1}) para «${project.name}»: ${deal!.publisherName} pone ${covered.toLocaleString(
          'es-ES',
        )} 💰 de su bolsa${yourCost > 0 ? ` y tú ${yourCost.toLocaleString('es-ES')} 💰` : ''}, el hype sube.`
      : `Campaña de marketing (nivel ${level + 1}) para «${project.name}»: −${campaign.cost.toLocaleString(
          'es-ES',
        )} 💰, el hype sube.`,
  );
}

// ---------------------------------------------------------------------------
// Libro de caja y runway (docs/10 §10.9)
// ---------------------------------------------------------------------------

/** Anota ingresos del tick en la entrada del libro de caja de esta semana. */
export function recordIncome(state: GameState, amount: number): GameState {
  if (amount === 0) return state;
  return withCashflowEntry(state, (entry) => ({ ...entry, income: entry.income + amount }));
}

/** Anota gastos del tick en el libro de caja (simétrico de recordIncome). */
export function recordExpense(state: GameState, amount: number): GameState {
  if (amount === 0) return state;
  return withCashflowEntry(state, (entry) => ({ ...entry, expenses: entry.expenses + amount }));
}

/**
 * Anota el interés de deuda del tick como línea propia del P&L (Fase 10.1,
 * docs/20 W1b). No toca `expenses`: el interés capitaliza en la deuda, no sale
 * de caja — es un apunte de memoria para que Finanzas lo muestre por semana.
 * Lo que SÍ sale de caja es la cuota obligatoria (`recordDebtPayment`).
 */
export function recordInterest(state: GameState, amount: number): GameState {
  if (amount === 0) return state;
  return withCashflowEntry(state, (entry) => ({
    ...entry,
    interest: (entry.interest ?? 0) + amount,
  }));
}

/**
 * Anota la cuota obligatoria de deuda del tick (Fase 10.2-B): a diferencia del
 * interés, esto SÍ es dinero que se va, así que suma a `expenses` (el neto de
 * caja debe reflejarlo) y además se guarda desglosada para que Finanzas pueda
 * nombrarla — el jugador tiene que ver qué parte de sus gastos es el banco.
 */
export function recordDebtPayment(state: GameState, amount: number): GameState {
  if (amount === 0) return state;
  return withCashflowEntry(state, (entry) => ({
    ...entry,
    expenses: entry.expenses + amount,
    debtPayment: (entry.debtPayment ?? 0) + amount,
  }));
}

function withCashflowEntry(
  state: GameState,
  update: (entry: CashflowEntry) => CashflowEntry,
): GameState {
  const last = state.cashflow[state.cashflow.length - 1];
  if (last && last.week === state.week) {
    return {
      ...state,
      cashflow: [...state.cashflow.slice(0, -1), update(last)],
    };
  }
  const entry = update({ week: state.week, income: 0, expenses: 0 });
  const cashflow = [...state.cashflow, entry].slice(-balance.economy.cashflowMaxWeeks);
  return { ...state, cashflow };
}

/**
 * Runway estimado: semanas de caja al flujo neto medio reciente. null si el
 * flujo es positivo (no hay cuenta atrás) o no hay historial aún.
 */
export function estimateRunwayWeeks(state: GameState): number | null {
  const lookback = state.cashflow.slice(-balance.economy.runwayLookbackWeeks);
  if (lookback.length === 0) return null;
  const net =
    lookback.reduce((sum, e) => sum + e.income - e.expenses, 0) / lookback.length;
  if (net >= 0 || state.studio.capital <= 0) return null;
  return Math.floor(state.studio.capital / -net);
}

// ---------------------------------------------------------------------------
// Tick semanal: pagar, cobrar interés y vigilar la bancarrota (docs/06 §1)
// ---------------------------------------------------------------------------

export function advanceEconomy(state: GameState): GameState {
  // El fundador no cobra salario: su coste es la persona·semana de desarrollo.
  // Con multi-proyecto, cada proyecto activo paga su semana (docs/06 §4).
  const devCost = balance.economy.devCostPerPersonWeek * state.projects.length;
  // SOLO DIAGNÓSTICO (Fase 10.2-A Exp1): con el flag test-only `loanLegacyBug`
  // se restaura el bug pre-10.1 — el interés se cobra como cuota semanal en
  // caja sobre el principal CONGELADO, sin capitalizar. En producción el flag
  // está ausente (undefined) y esta cuota es 0.
  const legacyCuota = state.loanLegacyBug
    ? Math.round(state.loanPrincipal * balance.economy.loans.weeklyInterest)
    : 0;
  const costs = weeklyFixedCosts(state) + devCost + legacyCuota;
  const capital = state.studio.capital - costs;

  let next: GameState = { ...state, studio: { ...state.studio, capital } };
  next = withCashflowEntry(next, (entry) => ({ ...entry, expenses: entry.expenses + costs }));

  // Interés de deuda (Fase 10.1, docs/20 W1): ~1 %/sem sobre la deuda VIVA que
  // CAPITALIZA (el interés no pagado engorda la deuda y compone). No sale de
  // caja: se anota como línea propia del P&L (recordInterest). Antes se cobraba
  // como cuota semanal sobre el principal congelado — la deuda nunca crecía y
  // el préstamo era dinero casi gratis (el bug W1). El bug se restaura arriba
  // (legacyCuota) SOLO en el arnés de medición; aquí, el arreglo capitaliza.
  const interest = state.loanLegacyBug ? 0 : weeklyLoanInterest(state);
  if (interest > 0) {
    next = { ...next, loanInterest: (next.loanInterest ?? 0) + interest };
    next = recordInterest(next, interest);
  }

  // AMORTIZACIÓN FORZOSA (Fase 10.2-B, docs/20 §Préstamos): tras capitalizar el
  // interés, el banco se cobra la cuota mínima de la CAJA — pase lo que pase.
  // Esto es lo que faltaba en 10.1: sin cuota obligatoria la deuda crecía a
  // 124,9 mil millones sin consecuencia alguna. Como la cuota (2,5 %) supera al
  // interés (1 %), la deuda viva baja sola si no la tocas… pero mientras tanto
  // compite con la nómina, que es justo el empujón hacia la codicia de docs/06
  // §4. Si no hay caja, se cobra igual: los números rojos son la consecuencia.
  const payment = state.loanLegacyBug ? 0 : weeklyMinimumPayment(next);
  if (payment > 0) {
    next = applyDebtPayment(next, payment);
    next = { ...next, studio: { ...next.studio, capital: next.studio.capital - payment } };
    next = recordDebtPayment(next, payment);
    if (outstandingDebt(next) <= 0) {
      next = appendLog(next, 'economia', 'Última cuota: la deuda queda saldada.');
      if (next.debtSpiral) next = { ...next, debtSpiral: false };
    }
  }
  // La caja de referencia para la bancarrota es la de DESPUÉS de pagar al banco.
  const capitalAfterDebt = next.studio.capital;

  // Espiral de deuda (docs/20 W1c): el flag guarda el flanco de subida para que
  // el store dispare el aviso importante (patrón de negativeWeeks). Al entrar en
  // espiral se deja UN rastro en el historial: el jugador la ve venir.
  const spiraling = isDebtSpiraling(next);
  if (spiraling && !next.debtSpiral) {
    next = appendLog(
      next,
      'economia',
      `La deuda se dispara: la cuota semanal (${payment.toLocaleString(
        'es-ES',
      )} 💰) ya supera lo que ingresas. Amortiza o la espiral te hundirá.`,
    );
  }
  if (spiraling !== next.debtSpiral) {
    next = { ...next, debtSpiral: spiraling };
  }

  // Riqueza histórica para el Legado (docs/06 §6).
  if (capitalAfterDebt > next.stats.peakCapital) {
    next = { ...next, stats: { ...next.stats, peakCapital: capitalAfterDebt } };
  }

  if (capitalAfterDebt >= 0) {
    return next.negativeWeeks === 0 ? next : { ...next, negativeWeeks: 0 };
  }

  const negativeWeeks = next.negativeWeeks + 1;
  next = { ...next, negativeWeeks };

  if (negativeWeeks === 1) {
    next = appendLog(
      next,
      'economia',
      `Números rojos: si la caja sigue en negativo ${balance.economy.bankruptcyGraceWeeks} semanas, es la bancarrota.`,
    );
  }

  if (negativeWeeks >= balance.economy.bankruptcyGraceWeeks) {
    next = {
      ...next,
      gameOver: { week: next.week, reason: 'bancarrota' },
    };
    next = appendLog(next, 'fin', 'Bancarrota: el estudio cierra sus puertas.');
  }

  return next;
}
