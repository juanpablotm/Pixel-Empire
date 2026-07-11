import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getPlatform } from '../../data/platforms';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { ReleasedGame } from '../model/release';
import { expectedWeeklyUnits, saturationModifier, effectiveSaturation } from './market';

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
    reviewsBySegment: { critica: 80, prensa: 80, hardcore: 80, casual: 80 },
    reviewMarket: { base: 80, modaBonus: 0, hypePenalty: 0 },
    hypeAtRelease: 0,
    saturationAtRelease: 0,
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

describe('ventas de Fase 3 — pico + cola larga recalculada por tick (docs/04 §6)', () => {
  it('expectedWeeklyUnits: demanda × factorReseña × saturación × curva(t, hype)', () => {
    const game = makeGame();
    const market = createInitialState(SEED).market;
    const s = balance.sales;
    const platform = getPlatform('pcCasero');

    const demand =
      market.platforms.pcCasero.installedBase *
      platform.audienceBias.hardcore *
      s.sizeDemandFactor.pequeno *
      market.genres.rpg.pop *
      market.themes.fantasia.pop;
    const reviewFactor = 0.8 ** s.reviewExponent;
    const satMod = saturationModifier(effectiveSaturation(market, 'rpg', 'fantasia'));
    const tailDecay = s.launch.tailDecayMin + (s.launch.tailDecayMax - s.launch.tailDecayMin) * 0.8;
    const curveAt = (t: number) =>
      s.launch.spikeBase * s.launch.spikeDecay ** t + s.launch.tailAmp * tailDecay ** t;

    expect(expectedWeeklyUnits(game, 0, market)).toBeCloseTo(
      demand * reviewFactor * satMod * curveAt(0),
      8,
    );
    expect(expectedWeeklyUnits(game, 5, market)).toBeCloseTo(
      demand * reviewFactor * satMod * curveAt(5),
      8,
    );
  });

  it('la primera semana vende cerca del pico esperado (± ruido del PRNG)', () => {
    const state = tick(withGame());
    const game = state.releasedGames[0];
    expect(game.weeklySales).toHaveLength(1);
    const units = game.weeklySales[0];
    // El tick evoluciona el mercado antes de vender: el esperado usa ese mercado.
    const expected = expectedWeeklyUnits(makeGame(), 0, state.market);
    expect(units).toBeGreaterThanOrEqual(Math.floor(expected * (1 - balance.sales.weeklyNoise)));
    expect(units).toBeLessThanOrEqual(Math.ceil(expected * (1 + balance.sales.weeklyNoise)));
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

  it('pico + cola larga: las ventas caen fuerte al principio y suave después', () => {
    let state = withGame();
    for (let i = 0; i < 9; i++) state = tick(state);
    const sales = state.releasedGames[0].weeklySales;
    expect(sales).toHaveLength(9);
    // El pico se desinfla en las primeras semanas...
    expect(sales[0]).toBeGreaterThan(sales[3]);
    // ...y la cola sigue decayendo, más despacio.
    expect(sales[3]).toBeGreaterThan(sales[8]);
    const spikeDrop = sales[3] / sales[0];
    const tailDrop = sales[8] / sales[3];
    expect(tailDrop).toBeGreaterThan(spikeDrop);
  });

  it('una reseña mejor vende más y aguanta más semanas en tiendas', () => {
    const run = (review: number) => {
      let state = withGame(makeGame({ review }));
      for (let i = 0; i < 60; i++) state = tick(state);
      return state.releasedGames[0];
    };
    const buena = run(85);
    const mala = run(40);
    expect(buena.totalUnits).toBeGreaterThan(mala.totalUnits);
    expect(buena.weeklySales.length).toBeGreaterThan(mala.weeklySales.length);
  });

  it('el juego sale de las tiendas cuando las ventas caen bajo el umbral', () => {
    let state = withGame();
    for (let i = 0; i < 60; i++) state = tick(state);
    const game = state.releasedGames[0];
    expect(game.salesActive).toBe(false);
    expect(game.weeklySales[game.weeklySales.length - 1]).toBeGreaterThanOrEqual(
      balance.sales.cutoffUnits,
    );
    expect(state.log.some((e) => e.type === 'ventas')).toBe(true);

    // Tras salir de tiendas, sus ventas no cambian más.
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
