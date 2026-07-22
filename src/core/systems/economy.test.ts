import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import {
  availableCredit,
  creditLimit,
  estimateRunwayWeeks,
  isDebtSpiraling,
  launchMarketingCampaign,
  outstandingDebt,
  repayLoan,
  takeLoan,
  weeklyFixedCosts,
  weeklyLoanInterest,
} from './economy';
import { startProject } from './projects';

const SEED = 42;

/** Estado inicial de garaje con el capital indicado. */
function withCapital(capital: number): GameState {
  const state = createInitialState(SEED);
  return { ...state, studio: { ...state.studio, capital } };
}

describe('economía mínima de Fase 1 (docs/06 §4)', () => {
  it('sin proyecto solo se paga el coste fijo semanal', () => {
    const before = createInitialState(SEED);
    const after = tick(before);
    expect(after.studio.capital).toBe(before.studio.capital - balance.economy.weeklyUpkeep);
    expect(after.negativeWeeks).toBe(0);
  });

  it('con proyecto se paga además el desarrollo (1 persona·semana en el garaje)', () => {
    const before = startProject(createInitialState(SEED), {
      name: 'Prueba',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
    });
    const after = tick(before);
    expect(after.studio.capital).toBe(
      before.studio.capital -
        balance.economy.weeklyUpkeep -
        balance.economy.devCostPerPersonWeek,
    );
  });

  it('capital negativo sostenido = bancarrota = fin de partida (docs/06 §1)', () => {
    let state = withCapital(50);

    state = tick(state); // capital -50: empieza la cuenta atrás
    expect(state.studio.capital).toBeLessThan(0);
    expect(state.negativeWeeks).toBe(1);
    expect(state.log.some((e) => e.type === 'economia')).toBe(true);
    expect(state.gameOver).toBeNull();

    for (let i = 1; i < balance.economy.bankruptcyGraceWeeks; i++) {
      state = tick(state);
    }
    expect(state.negativeWeeks).toBe(balance.economy.bankruptcyGraceWeeks);
    expect(state.gameOver).not.toBeNull();
    expect(state.gameOver?.reason).toBe('bancarrota');
    expect(state.log.some((e) => e.type === 'fin')).toBe(true);
  });

  it('tras el game over el mundo se congela', () => {
    let state = withCapital(0);
    for (let i = 0; i <= balance.economy.bankruptcyGraceWeeks; i++) state = tick(state);
    expect(state.gameOver).not.toBeNull();

    const frozen = tick(state);
    expect(frozen).toBe(state); // ni siquiera avanza la semana
  });

  it('volver a números verdes reinicia la cuenta atrás de bancarrota', () => {
    let state = withCapital(150);
    state = tick(state); // 50
    state = tick(state); // -50 → negativeWeeks 1
    expect(state.negativeWeeks).toBe(1);

    // Un ingreso providencial saca la caja del rojo.
    state = { ...state, studio: { ...state.studio, capital: 5_000 } };
    state = tick(state);
    expect(state.negativeWeeks).toBe(0);
    expect(state.gameOver).toBeNull();
  });
});

describe('préstamos (docs/06 §4 y docs/12 §6)', () => {
  it('la línea de crédito escala con costes fijos y reputación agregada', () => {
    const base = createInitialState(SEED);
    // En el garaje pelado manda el suelo mínimo de la línea.
    expect(creditLimit(base)).toBe(balance.economy.loans.floorAmount);

    // Con plantilla, el banco mira ~6 meses de costes fijos × reputación.
    const state: GameState = {
      ...base,
      staff: [
        ...base.staff,
        ...[1, 2, 3].map((i) => ({ ...base.staff[0], id: `e${i}`, founder: false, salary: 800 })),
      ],
    };
    const l = balance.economy.loans;
    // Rep 50 → factor intermedio entre min y max.
    const midFactor = (l.creditFactorMin + l.creditFactorMax) / 2;
    expect(creditLimit(state)).toBe(
      Math.round(weeklyFixedCosts(state) * l.capWeeksOfFixedCosts * midFactor),
    );

    const loved: GameState = {
      ...state,
      studio: {
        ...state.studio,
        reputation: { ...state.studio.reputation, comunidad: 100, critica: 100, prensa: 100 },
      },
    };
    expect(creditLimit(loved)).toBeGreaterThan(creditLimit(state));
  });

  it('takeLoan ingresa el importe y repayLoan lo amortiza (devolución flexible)', () => {
    let state = createInitialState(SEED);
    const before = state.studio.capital;
    state = takeLoan(state, 4_000);
    expect(state.studio.capital).toBe(before + 4_000);
    expect(state.loanPrincipal).toBe(4_000);

    state = repayLoan(state, 1_500);
    expect(state.loanPrincipal).toBe(2_500);
    expect(state.studio.capital).toBe(before + 4_000 - 1_500);
    expect(state.log.filter((e) => e.type === 'economia').length).toBeGreaterThanOrEqual(2);
  });

  it('10.1: el interés (~1 %/semana) CAPITALIZA en la deuda, no sale de caja (docs/20 W1)', () => {
    let state = takeLoan(createInitialState(SEED), 5_000);
    const before = state.studio.capital;
    const l = balance.economy.loans;
    const interest = Math.round(5_000 * l.weeklyInterest);
    // La cuota obligatoria de 10.2-B se calcula sobre la deuda YA capitalizada.
    const payment = Math.max(l.minPaymentFloor, Math.round((5_000 + interest) * l.minPaymentRate));
    state = tick(state);
    // De caja sale el coste fijo y la CUOTA; el interés en sí no se cobra…
    expect(state.studio.capital).toBe(before - balance.economy.weeklyUpkeep - payment);
    // …engorda la deuda, y la cuota se lleva primero ese interés y el resto de
    // principal (deuda viva = 5.000 + interés − cuota).
    expect(state.loanInterest).toBe(0); // la cuota (>interés) lo salda entero
    expect(outstandingDebt(state)).toBe(5_000 + interest - payment);
    expect(state.loanPrincipal).toBe(5_000 + interest - payment);
    // Y se ven como líneas propias del P&L: el interés como apunte de memoria
    // (fuera de `expenses`) y la cuota DENTRO de los gastos (sí sale de caja).
    const entry = state.cashflow[state.cashflow.length - 1];
    expect(entry.interest).toBe(interest);
    expect(entry.debtPayment).toBe(payment);
    expect(entry.expenses).toBe(balance.economy.weeklyUpkeep + payment);
  });

  it('CA 10.2-B: la cuota obligatoria drena caja y hace DECRECER la deuda desatendida', () => {
    const l = balance.economy.loans;
    // Deuda directa (la línea del garaje no da para 20k): solo interesa el tick.
    const base = createInitialState(SEED);
    let state: GameState = {
      ...base,
      loanPrincipal: 20_000,
      studio: { ...base.studio, capital: 500_000 },
    };
    let debt = 20_000;
    let paidTotal = 0;
    for (let i = 0; i < 6; i++) {
      const capitalBefore = state.studio.capital;
      state = tick(state);
      debt += Math.round(debt * l.weeklyInterest); // el interés capitaliza…
      const payment = Math.min(debt, Math.max(l.minPaymentFloor, Math.round(debt * l.minPaymentRate)));
      debt -= payment; // …y la cuota obligatoria se la come y baja del principal
      paidTotal += payment;
      expect(outstandingDebt(state)).toBe(debt);
      // La cuota SALE de caja (junto al coste fijo semanal): esa es la presión
      // real que en 10.1 no existía (el interés era un número decorativo).
      expect(state.studio.capital).toBe(capitalBefore - balance.economy.weeklyUpkeep - payment);
    }
    // Con cuota (2,5 %) > interés (1 %), la deuda BAJA sola en vez de dispararse.
    expect(outstandingDebt(state)).toBeLessThan(20_000);
    expect(paidTotal).toBeGreaterThan(0);
  });

  it('CA 10.2-B: la línea disponible descuenta la DEUDA VIVA, no solo el principal', () => {
    const base = createInitialState(SEED);
    const withInterest: GameState = { ...base, loanPrincipal: 1_000, loanInterest: 900 };
    // Antes de 10.2-B el interés acumulado no estrechaba la línea: por eso la
    // deuda podía capitalizar sin consecuencia (docs/20 §Préstamos).
    expect(availableCredit(withInterest)).toBe(creditLimit(base) - 1_900);
    // Y nunca es negativa: una deuda por encima de la línea deja el crédito a 0.
    const drowning: GameState = { ...base, loanPrincipal: 0, loanInterest: 999_999 };
    expect(availableCredit(drowning)).toBe(0);
    expect(() => takeLoan(drowning, 1)).toThrow(/línea de crédito/);
  });

  it('CA 10.1: amortizar salda primero el interés y luego el principal; nunca queda negativa', () => {
    const base = createInitialState(SEED);
    let state: GameState = {
      ...base,
      loanPrincipal: 4_000,
      loanInterest: 300,
      studio: { ...base.studio, capital: 10_000 },
    };
    // Un pago de 500 salda el interés (300) y baja el principal en 200.
    state = repayLoan(state, 500);
    expect(state.loanInterest).toBe(0);
    expect(state.loanPrincipal).toBe(3_800);
    expect(state.studio.capital).toBe(9_500);

    // No se amortiza por encima de la deuda viva ni queda negativa: se topa.
    state = repayLoan(state, 999_999);
    expect(outstandingDebt(state)).toBe(0);
    expect(state.loanPrincipal).toBe(0);
    expect(state.loanInterest).toBe(0);
    // Solo se cobró la deuda pendiente (3.800), no el importe pedido.
    expect(state.studio.capital).toBe(9_500 - 3_800);
  });

  it('CA 10.1: el aviso de espiral salta cuando el interés supera el ingreso reciente, y no antes', () => {
    const spiral = balance.economy.loans.spiral;
    const base = createInitialState(SEED);

    // Deuda grande sin ingresos recientes → espiral (con caja de sobra para no
    // confundir con la bancarrota): el interés (800) supera el suelo y el 0 de
    // ingreso, y el tick deja rastro en el historial.
    let big: GameState = {
      ...base,
      loanPrincipal: 80_000,
      studio: { ...base.studio, capital: 500_000 },
    };
    expect(isDebtSpiraling(big)).toBe(true);
    big = tick(big);
    expect(big.debtSpiral).toBe(true);
    expect(
      big.log.some((e) => e.type === 'economia' && /deuda se dispara/i.test(e.text)),
    ).toBe(true);

    // Deuda trivial: por debajo del suelo absoluto NO avisa aunque no haya ingresos.
    const small: GameState = { ...base, loanPrincipal: 10_000 };
    expect(weeklyLoanInterest(small)).toBeLessThan(spiral.minWeeklyInterest);
    expect(isDebtSpiraling(small)).toBe(false);

    // La misma deuda grande, pero con ingresos que la cubren → tampoco es espiral.
    const solvent: GameState = {
      ...base,
      loanPrincipal: 80_000,
      cashflow: Array.from({ length: spiral.lookbackWeeks }, (_, i) => ({
        week: i + 1,
        income: 50_000,
        expenses: 10_000,
      })),
    };
    expect(isDebtSpiraling(solvent)).toBe(false);
  });

  it('no presta más allá de la línea ni acepta pagos imposibles', () => {
    const state = createInitialState(SEED);
    expect(() => takeLoan(state, availableCredit(state) + 1)).toThrow(/línea de crédito/);
    expect(() => takeLoan(state, 0)).toThrow(/inválido/);
    expect(() => repayLoan(state, 100)).toThrow(/No hay deuda/);

    const broke: GameState = {
      ...takeLoan(state, 4_000),
      studio: { ...state.studio, capital: 100 },
    };
    expect(() => repayLoan(broke, 4_000)).toThrow(/caja suficiente/);
  });
});

describe('marketing como coste (docs/06 §4: 5k/20k/80k)', () => {
  function inProduction(): GameState {
    let state = startProject(createInitialState(SEED), {
      name: 'Anunciado',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
    });
    // Fase 2 (Producción): el anuncio ya existe, el marketing está disponible.
    state = { ...state, projects: [{ ...state.projects[0], phase: 2 }] };
    return state;
  }

  it('una campaña cuesta su nivel y compra hype', () => {
    const state = inProduction();
    const campaign = balance.economy.marketing.levels[0];
    const after = launchMarketingCampaign(state, 0);
    expect(after.studio.capital).toBe(state.studio.capital - campaign.cost);
    expect(after.projects[0].hype).toBeCloseTo(state.projects[0].hype + campaign.hypeBoost, 6);
    expect(after.projects[0].marketingUsed).toEqual([0]);
  });

  it('9.1: las campañas son re-comprables — cada compra paga y suma su hype (docs/19)', () => {
    const state = launchMarketingCampaign(inProduction(), 0);
    const campaign = balance.economy.marketing.levels[0];
    // Repetir el mismo nivel vuelve a cobrar y vuelve a empujar el manómetro.
    const again = launchMarketingCampaign(state, 0);
    expect(again.studio.capital).toBe(state.studio.capital - campaign.cost);
    expect(again.projects[0].hype).toBeCloseTo(state.projects[0].hype + campaign.hypeBoost, 6);
    expect(again.projects[0].marketingUsed).toEqual([0, 0]);
    // Y mezclar niveles también.
    expect(launchMarketingCampaign(state, 1).projects[0].marketingUsed).toEqual([0, 1]);
  });

  it('9.1: el hype comprado no tiene tope — más dinero, más expectación', () => {
    let state = inProduction();
    // Caja de sobra para la prueba.
    state = { ...state, studio: { ...state.studio, capital: 10_000_000 } };
    for (let i = 0; i < 4; i++) state = launchMarketingCampaign(state, 3);
    expect(state.projects[0].hype).toBeGreaterThan(1);
  });

  it('no hay marketing antes del anuncio (fase de Concepto) ni sin proyecto', () => {
    const concept = startProject(createInitialState(SEED), {
      name: 'Secreto',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
    });
    expect(() => launchMarketingCampaign(concept, 0)).toThrow(/Producción/);
    expect(() => launchMarketingCampaign(createInitialState(SEED), 0)).toThrow(/No hay proyecto/);
  });
});

describe('libro de caja y runway (docs/10 §10.9)', () => {
  it('cada tick anota una entrada semana/ingresos/gastos, con longitud acotada', () => {
    let state = createInitialState(SEED);
    for (let i = 0; i < 5; i++) state = tick(state);
    expect(state.cashflow).toHaveLength(5);
    expect(state.cashflow[0]).toEqual({
      week: 1,
      income: 0,
      expenses: balance.economy.weeklyUpkeep,
    });
    expect(state.cashflow.map((e) => e.week)).toEqual([1, 2, 3, 4, 5]);
  });

  it('estima el runway con el flujo neto medio reciente', () => {
    let state = createInitialState(SEED);
    for (let i = 0; i < 4; i++) state = tick(state);
    // Solo gasta 100/semana con 10.000 − 400 en caja → ~96 semanas.
    const runway = estimateRunwayWeeks(state);
    expect(runway).toBe(Math.floor(state.studio.capital / balance.economy.weeklyUpkeep));
    // Sin historial no hay estimación.
    expect(estimateRunwayWeeks(createInitialState(SEED))).toBeNull();
  });
});
