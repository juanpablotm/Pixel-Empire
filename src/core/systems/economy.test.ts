import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import {
  availableCredit,
  creditLimit,
  estimateRunwayWeeks,
  launchMarketingCampaign,
  repayLoan,
  takeLoan,
  weeklyFixedCosts,
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

  it('el interés (~1 %/semana) se cobra cada tick sobre el principal vivo', () => {
    let state = takeLoan(createInitialState(SEED), 5_000);
    const before = state.studio.capital;
    state = tick(state);
    const interest = Math.round(5_000 * balance.economy.loans.weeklyInterest);
    expect(state.studio.capital).toBe(before - balance.economy.weeklyUpkeep - interest);
    // El principal no baja solo: la devolución es del jugador.
    expect(state.loanPrincipal).toBe(5_000);
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
