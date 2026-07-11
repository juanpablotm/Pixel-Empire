import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getPlatform } from '../../data/platforms';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { ReleasedGame } from '../model/release';
import {
  expectedWeeklyUnits,
  priceModifier,
  saturationModifier,
  effectiveSaturation,
} from './market';
import { weeklyRevenue } from './sales';

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
    monetization: {
      model: 'premium',
      aggressiveness: 0,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    },
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
    mtxRevenue: 0,
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

describe('factorMonetización v1 (docs/12 §6, CA de Fase 4)', () => {
  const mtx = (over: Partial<ReleasedGame['monetization']>) =>
    makeGame({
      monetization: {
        model: 'premium',
        aggressiveness: 0,
        hasLootBoxes: false,
        hasBattlePass: false,
        dayOneDLC: false,
        ...over,
      },
    });

  it('premium = 1.0 · premium+dlc ≈ 1.15 · premium+mtx ≈ 1 + 0.6·agg · f2p ≈ 0.3 + 0.8·agg', () => {
    const units = 100;
    const price = 20;
    expect(weeklyRevenue(mtx({ model: 'premium' }), units, false)).toEqual({
      sales: units * price,
      mtx: 0,
    });
    expect(weeklyRevenue(mtx({ model: 'premium+dlc' }), units, false).sales).toBe(
      Math.round(units * price * 1.15),
    );
    const aggressive = weeklyRevenue(
      mtx({ model: 'premium+mtx', aggressiveness: 0.5 }),
      units,
      false,
    );
    expect(aggressive.sales).toBe(units * price);
    expect(aggressive.mtx).toBe(Math.round(units * price * 0.6 * 0.5));
    const f2p = weeklyRevenue(mtx({ model: 'f2p', aggressiveness: 1 }), units, false);
    expect(f2p.sales).toBe(Math.round(units * price * 0.3));
    expect(f2p.mtx).toBe(Math.round(units * price * 0.8));
  });

  it('la codicia paga: el mismo juego con MTX agresivas ingresa más por unidad', () => {
    const honest = weeklyRevenue(mtx({ model: 'premium' }), 100, false);
    const greedy = weeklyRevenue(mtx({ model: 'premium+mtx', aggressiveness: 1 }), 100, false);
    expect(greedy.sales + greedy.mtx).toBeGreaterThan(honest.sales + honest.mtx);
  });

  it('los ingresos MTX se acumulan aparte en el juego (mtxRevenue)', () => {
    let state = withGame(mtx({ model: 'premium+mtx', aggressiveness: 1 }));
    state = tick(state);
    const game = state.releasedGames[0];
    expect(game.mtxRevenue).toBeGreaterThan(0);
    expect(game.totalRevenue).toBeGreaterThan(game.mtxRevenue);
  });
});

describe('modificadorPrecio(precio, público) (docs/04 §6 y docs/06 §2)', () => {
  it('al precio recomendado el modificador es neutro', () => {
    expect(priceModifier(makeGame())).toBe(1);
  });

  it('el precio abusivo recorta volumen, más en públicos sensibles', () => {
    const expensiveHardcore = priceModifier(makeGame({ price: 30 }));
    const expensiveCasual = priceModifier(makeGame({ price: 30, audience: 'casual' }));
    expect(expensiveHardcore).toBeLessThan(1);
    expect(expensiveCasual).toBeLessThan(expensiveHardcore);
    // Y el generoso lo aumenta.
    expect(priceModifier(makeGame({ price: 14 }))).toBeGreaterThan(1);
  });

  it('un F2P no tiene barrera de entrada: bono plano de demanda', () => {
    const f2p = makeGame({
      monetization: {
        model: 'f2p',
        aggressiveness: 0.5,
        hasLootBoxes: false,
        hasBattlePass: false,
        dayOneDLC: false,
      },
    });
    expect(priceModifier(f2p)).toBe(balance.monetization.f2pDemandBoost);
  });
});

describe('modificadores del estudio sobre las ventas (docs/06 §3 y §5)', () => {
  it('el colchón de comunidad y el escándalo activo multiplican la curva', () => {
    const game = makeGame();
    const market = createInitialState(SEED).market;
    const base = expectedWeeklyUnits(game, 0, market);
    expect(expectedWeeklyUnits(game, 0, market, { communityFactor: 1.2 })).toBeCloseTo(
      base * 1.2,
      6,
    );
    expect(expectedWeeklyUnits(game, 0, market, { scandalFactor: 0.75 })).toBeCloseTo(
      base * 0.75,
      6,
    );
  });

  it('en el tick, un escándalo activo hunde las ventas de todo el catálogo', () => {
    const clean = tick(withGame());
    let scandalous = withGame();
    scandalous = {
      ...scandalous,
      scandals: [
        { source: 'lootboxes', startWeek: 1, weeksLeft: 8, salesPenalty: 0.75, magnitude: 1 },
      ],
    };
    scandalous = tick(scandalous);
    expect(scandalous.releasedGames[0].weeklySales[0]).toBeLessThan(
      clean.releasedGames[0].weeklySales[0],
    );
  });
});
