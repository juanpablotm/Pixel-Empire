import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { legacyVerdicts } from '../../data/legacyTexts';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { ReleasedGame } from '../model/release';
import { computeLegacy, retireStudio } from './legacy';

const SEED = 42;

/** Juego lanzado mínimo con la reseña y ventas dadas. */
function makeGame(review: number, totalUnits = 1_000, id = `g-${review}`): ReleasedGame {
  return {
    id,
    name: `Juego ${review}`,
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
    quality: review,
    review,
    reviewsBySegment: { critica: review, prensa: review, hardcore: review, casual: review },
    reviewMarket: { base: review, modaBonus: 0, hypePenalty: 0 },
    hypeAtRelease: 0,
    saturationAtRelease: 0,
    verdict: '—',
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
    totalUnits,
    totalRevenue: totalUnits * 20,
    mtxRevenue: 0,
    salesActive: false,
  };
}

describe('puntuación de Legado (docs/06 §6, CA: perfil multi-dimensional)', () => {
  it('el perfil tiene los 5 ejes en 0..100 y un veredicto', () => {
    const legacy = computeLegacy(createInitialState(SEED));
    for (const axis of ['riqueza', 'prestigio', 'impacto', 'obras', 'etica'] as const) {
      expect(legacy[axis]).toBeGreaterThanOrEqual(0);
      expect(legacy[axis]).toBeLessThanOrEqual(100);
    }
    expect(legacy.verdict.length).toBeGreaterThan(0);
  });

  it('Riqueza sale del capital máximo histórico', () => {
    const state = createInitialState(SEED);
    const rich: GameState = {
      ...state,
      stats: { ...state.stats, peakCapital: balance.legacy.wealthCapitalScale },
    };
    expect(computeLegacy(rich).riqueza).toBe(100);
    expect(computeLegacy(state).riqueza).toBeLessThan(5);
  });

  it('Obras maestras cuenta juegos con reseña 90+ (docs/06 §6)', () => {
    const state = createInitialState(SEED);
    const withGames: GameState = {
      ...state,
      releasedGames: [makeGame(92, 100, 'a'), makeGame(95, 100, 'b'), makeGame(80, 100, 'c')],
    };
    const legacy = computeLegacy(withGames);
    expect(legacy.masterpieces).toBe(2);
    expect(legacy.obras).toBe(2 * balance.legacy.masterpiecePoints);
  });

  it('Impacto premia apostar temprano por modas y los récords de ventas', () => {
    const state = createInitialState(SEED);
    const pioneer: GameState = {
      ...state,
      stats: { ...state.stats, earlyTrendReleases: 3 },
      releasedGames: [makeGame(80, balance.legacy.impactBestSellerScale)],
    };
    expect(computeLegacy(pioneer).impacto).toBe(
      Math.min(100, 3 * balance.legacy.impactPerEarlyRelease + balance.legacy.impactBestSellerWeight),
    );
  });

  it('Ética castiga escándalos, crunch y despidos; premia el buen trato', () => {
    const state = createInitialState(SEED);
    const saint = computeLegacy(state).etica;
    const sinner: GameState = {
      ...state,
      stats: { ...state.stats, scandalCount: 3, crunchWeeks: 40, firedCount: 5 },
    };
    expect(computeLegacy(sinner).etica).toBeLessThan(saint);

    const goodBoss: GameState = {
      ...state,
      studio: {
        ...state.studio,
        reputation: { ...state.studio.reputation, empleador: 90, comunidad: 85 },
      },
    };
    expect(computeLegacy(goodBoss).etica).toBeGreaterThan(saint);
  });

  it('el veredicto cuenta historias distintas: imperio odiado vs estudio adorado', () => {
    const state = createInitialState(SEED);
    const hatedEmpire: GameState = {
      ...state,
      stats: {
        ...state.stats,
        peakCapital: balance.legacy.wealthCapitalScale,
        scandalCount: 6,
        crunchWeeks: 80,
      },
      studio: {
        ...state.studio,
        reputation: { ...state.studio.reputation, empleador: 10, comunidad: 15 },
      },
    };
    expect(computeLegacy(hatedEmpire).verdict).toBe(legacyVerdicts.richButHated);

    const beloved: GameState = {
      ...state,
      releasedGames: [makeGame(88, 500, 'a'), makeGame(86, 500, 'b')],
      studio: {
        ...state.studio,
        reputation: Object.fromEntries(
          Object.keys(state.studio.reputation).map((k) => [k, 90]),
        ) as GameState['studio']['reputation'],
      },
    };
    expect(computeLegacy(beloved).verdict).toBe(legacyVerdicts.belovedButPoor);
  });
});

describe('retiro voluntario (docs/06 §6: el cierre calcula el Legado)', () => {
  it('retirarse termina la partida con razón "retiro" y congela el mundo', () => {
    const state = retireStudio(createInitialState(SEED));
    expect(state.gameOver).toEqual({ week: state.week, reason: 'retiro' });
    expect(state.log.some((e) => e.type === 'fin')).toBe(true);
    expect(tick(state)).toBe(state);
  });

  it('no se puede retirar dos veces', () => {
    const state = retireStudio(createInitialState(SEED));
    expect(() => retireStudio(state)).toThrow(/terminado/);
  });
});
