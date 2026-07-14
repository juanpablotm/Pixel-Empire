import { balance } from '../../data/balance';
import { appendLog } from '../engine/log';
import type { GameState } from '../model/gameState';
import { clampHype } from './market';
import { salaryCostFactor } from './policies';
import { aggregateReputation } from './reputation';

/**
 * Economía completa (docs/06 §4): costes recurrentes, préstamos con interés
 * semanal (~1 %/sem), marketing como coste, libro de caja para Finanzas y
 * bancarrota por capital negativo sostenido. Los ingresos por ventas los
 * aplica advanceSales (que anota su parte del libro de caja); aquí se paga,
 * se cobra el interés y se vigila la caja.
 */

// ---------------------------------------------------------------------------
// Préstamos (docs/06 §4 y docs/12 §6): línea de crédito flexible
// ---------------------------------------------------------------------------

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

/** Crédito aún disponible (línea menos principal vivo). */
export function availableCredit(state: GameState): number {
  return Math.max(0, creditLimit(state) - state.loanPrincipal);
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
    `Préstamo de ${amount.toLocaleString('es-ES')} 💰 (interés ~${Math.round(
      balance.economy.loans.weeklyInterest * 100,
    )} %/semana). La deuda presiona.`,
  );
}

/** Acción: amortizar principal (devolución flexible, docs/06 §4). */
export function repayLoan(state: GameState, amount: number): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Importe de pago inválido');
  const payment = Math.min(amount, state.loanPrincipal);
  if (payment <= 0) throw new Error('No hay deuda que devolver');
  if (payment > state.studio.capital) {
    throw new Error('No hay caja suficiente para ese pago');
  }
  const next: GameState = {
    ...state,
    studio: { ...state.studio, capital: state.studio.capital - payment },
    loanPrincipal: state.loanPrincipal - payment,
  };
  return appendLog(
    next,
    'economia',
    next.loanPrincipal === 0
      ? 'Préstamo saldado. La caja respira sin intereses.'
      : `Amortizados ${payment.toLocaleString('es-ES')} 💰 del préstamo.`,
  );
}

// ---------------------------------------------------------------------------
// Marketing como coste (docs/06 §4): campañas por nivel que compran hype
// ---------------------------------------------------------------------------

/** Acción: comprar una campaña de marketing para un proyecto (sin id, el primero). */
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
  if (project.marketingUsed.includes(level)) {
    throw new Error('Esa campaña ya se lanzó para este proyecto');
  }
  if (project.phase < balance.market.hype.startPhase) {
    throw new Error('Demasiado pronto: el marketing arranca con la Producción (el anuncio)');
  }

  const next: GameState = {
    ...state,
    studio: { ...state.studio, capital: state.studio.capital - campaign.cost },
    projects: state.projects.map((p) =>
      p.id === project.id
        ? {
            ...p,
            hype: clampHype(p.hype + campaign.hypeBoost),
            marketingUsed: [...p.marketingUsed, level],
          }
        : p,
    ),
  };
  return appendLog(
    next,
    'economia',
    `Campaña de marketing (nivel ${level + 1}) para «${project.name}»: −${campaign.cost.toLocaleString(
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

function withCashflowEntry(
  state: GameState,
  update: (entry: { week: number; income: number; expenses: number }) => {
    week: number;
    income: number;
    expenses: number;
  },
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
  // Interés del préstamo: ~1 %/semana sobre el principal vivo (docs/06 §4).
  const interest = Math.round(state.loanPrincipal * balance.economy.loans.weeklyInterest);
  const costs = weeklyFixedCosts(state) + devCost + interest;
  const capital = state.studio.capital - costs;

  let next: GameState = { ...state, studio: { ...state.studio, capital } };
  next = withCashflowEntry(next, (entry) => ({ ...entry, expenses: entry.expenses + costs }));

  // Riqueza histórica para el Legado (docs/06 §6).
  if (capital > next.stats.peakCapital) {
    next = { ...next, stats: { ...next.stats, peakCapital: capital } };
  }

  if (capital >= 0) {
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
