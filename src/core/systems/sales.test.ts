import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { ReleasedGame } from '../model/release';
import { expectedUnits } from './sales';

const SEED = 42;

/** Juego lanzado de prueba: reseña 80, pequeño, en PC Casero a 20 💰. */
function makeGame(overrides: Partial<ReleasedGame> = {}): ReleasedGame {
  return {
    id: 'proyecto-1',
    name: 'Mazmorras del Alba',
    themeId: 'fantasia',
    genreId: 'rpg',
    platformId: 'pcCasero',
    audience: 'hardcore',
    size: 'pequeno',
    price: 20,
    quality: 80,
    review: 80,
    verdict: 'Una joya honesta con algún defecto.',
    breakdown: {
      fit: 1,
      fitParts: { themeGenre: 1, genrePlatform: 1, audience: 1 },
      balanceScore: 1,
      dReal: 0.65,
      dIdeal: 0.65,
      featureScore: 0.5,
      polishScore: 1,
      bugLevel: 0,
      teamFactor: 0.95,
      innovationMod: 1.05,
      base: 0.875,
      qualityCap: 85,
    },
    lines: [],
    releaseWeek: 1,
    weeklySales: [],
    totalUnits: 0,
    totalRevenue: 0,
    salesActive: true,
    ...overrides,
  };
}

function withGame(game = makeGame()): GameState {
  const state = createInitialState(SEED);
  return { ...state, releasedGames: [game] };
}

describe('ventas simples de Fase 1 — demanda base × reseña (docs/11)', () => {
  it('expectedUnits: demanda base × factorTamaño × (reseña/100)^k × decay^t', () => {
    const game = makeGame();
    // 400 × 1 × 0.8² × decay⁰ = 256
    expect(expectedUnits(game, 0)).toBeCloseTo(256, 10);
    const decay = balance.sales.decayMin + (balance.sales.decayMax - balance.sales.decayMin) * 0.8;
    expect(expectedUnits(game, 3)).toBeCloseTo(256 * decay ** 3, 10);
  });

  it('la primera semana vende cerca del pico esperado (± ruido del PRNG)', () => {
    const state = tick(withGame());
    const game = state.releasedGames[0];
    expect(game.weeklySales).toHaveLength(1);
    const units = game.weeklySales[0];
    expect(units).toBeGreaterThanOrEqual(Math.floor(256 * (1 - balance.sales.weeklyNoise)));
    expect(units).toBeLessThanOrEqual(Math.ceil(256 * (1 + balance.sales.weeklyNoise)));
    expect(game.totalRevenue).toBe(units * game.price);
    expect(game.totalUnits).toBe(units);
  });

  it('los ingresos entran al capital (menos el coste fijo semanal)', () => {
    const before = withGame();
    const after = tick(before);
    const units = after.releasedGames[0].weeklySales[0];
    expect(after.studio.capital).toBe(
      before.studio.capital + units * 20 - balance.economy.weeklyUpkeep,
    );
  });

  it('las ventas decaen semana a semana (pico + cola)', () => {
    let state = withGame();
    for (let i = 0; i < 4; i++) state = tick(state);
    const sales = state.releasedGames[0].weeklySales;
    expect(sales).toHaveLength(4);
    for (let i = 1; i < sales.length; i++) {
      expect(sales[i]).toBeLessThan(sales[i - 1]);
    }
  });

  it('una reseña mejor vende más y aguanta más semanas en tiendas', () => {
    const run = (review: number) => {
      let state = withGame(makeGame({ review }));
      for (let i = 0; i < 52; i++) state = tick(state);
      return state.releasedGames[0];
    };
    const buena = run(85);
    const mala = run(40);
    expect(buena.totalUnits).toBeGreaterThan(mala.totalUnits);
    expect(buena.weeklySales.length).toBeGreaterThan(mala.weeklySales.length);
  });

  it('el juego sale de las tiendas cuando las ventas caen bajo el umbral', () => {
    let state = withGame();
    for (let i = 0; i < 52; i++) state = tick(state);
    const game = state.releasedGames[0];
    expect(game.salesActive).toBe(false);
    expect(game.weeklySales[game.weeklySales.length - 1]).toBeGreaterThanOrEqual(
      balance.sales.cutoffUnits,
    );
    expect(state.log.some((e) => e.type === 'ventas')).toBe(true);

    // Tras salir de tiendas, nada cambia salvo la economía semanal.
    const next = tick(state);
    expect(next.releasedGames[0].weeklySales).toEqual(game.weeklySales);
  });

  it('es determinista: misma semilla → misma curva de ventas', () => {
    const run = () => {
      let state = withGame();
      for (let i = 0; i < 20; i++) state = tick(state);
      return state.releasedGames[0].weeklySales;
    };
    expect(run()).toEqual(run());
  });
});
