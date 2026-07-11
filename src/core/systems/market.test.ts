import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { genres } from '../../data/genres';
import { getPlatform } from '../../data/platforms';
import { getTheme, themes } from '../../data/themes';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { Platform } from '../model/content';
import type { GameState } from '../model/gameState';
import type { ReleasedGame } from '../model/release';
import {
  comboKey,
  computeSegmentReviews,
  createMarketState,
  curveValueAt,
  effectiveSaturation,
  expectedWeeklyUnits,
  marketSize,
  platformAvailable,
  platformStage,
  registerReleaseSaturation,
  saturationModifier,
  trendDirection,
  trendStage,
} from './market';
import { startProject, type ProjectConcept } from './projects';

const SEED = 42;

const CONCEPT: ProjectConcept = {
  name: 'Mazmorras del Alba',
  themeId: 'fantasia',
  genreId: 'rpg',
  platformId: 'pcCasero',
  audience: 'hardcore',
  size: 'pequeno',
};

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

function runTicks(state: GameState, n: number): GameState {
  let s = state;
  for (let i = 0; i < n; i++) s = tick(s);
  return s;
}

/** Avanza ticks hasta acumular `count` lanzamientos (con tope de seguridad). */
function runUntilRelease(state: GameState, count = 1, maxTicks = 60): GameState {
  let s = state;
  for (let i = 0; i < maxTicks && s.releasedGames.length < count; i++) {
    s = tick(s);
  }
  return s;
}

describe('curveValueAt — curvas guionizadas (docs/04 §2)', () => {
  const curve = [
    { week: 0, value: 0 },
    { week: 10, value: 1 },
    { week: 20, value: 0.5 },
  ];

  it('interpola linealmente y mantiene los extremos fuera de rango', () => {
    expect(curveValueAt(curve, -5)).toBe(0);
    expect(curveValueAt(curve, 0)).toBe(0);
    expect(curveValueAt(curve, 5)).toBeCloseTo(0.5, 10);
    expect(curveValueAt(curve, 10)).toBe(1);
    expect(curveValueAt(curve, 15)).toBeCloseTo(0.75, 10);
    expect(curveValueAt(curve, 25)).toBe(0.5);
  });
});

describe('popularidades vivas — evolución por tick (docs/04 §2, CA)', () => {
  it('la popularidad evoluciona por tick y es determinista (misma semilla = mismas modas)', () => {
    const a = runTicks(createInitialState(SEED), 30);
    const b = runTicks(createInitialState(SEED), 30);
    expect(a.market).toEqual(b.market);

    const initial = createInitialState(SEED).market;
    expect(a.market.genres.rpg.pop).not.toBe(initial.genres.rpg.pop);
  });

  it('el ruido solo matiza: cada popularidad se queda cerca de su curva base', () => {
    const s = runTicks(createInitialState(SEED), 80);
    const week = s.week - 1; // semana procesada por el último tick
    for (const genre of genres) {
      const pop = s.market.genres[genre.id].pop;
      expect(pop).toBeGreaterThanOrEqual(0);
      expect(pop).toBeLessThanOrEqual(1);
      expect(Math.abs(pop - curveValueAt(genre.basePopularityCurve, week))).toBeLessThan(0.15);
    }
    for (const theme of themes) {
      const pop = s.market.themes[theme.id].pop;
      expect(Math.abs(pop - curveValueAt(theme.basePopularityCurve, week))).toBeLessThan(0.15);
    }
  });

  it('dirección ↑→↓ y etapas del ciclo de vida según la curva base (Espacio: la moda temprana)', () => {
    const espacio = getTheme('espacio').basePopularityCurve;
    expect(trendDirection(espacio, 20)).toBe('sube');
    expect(trendStage(espacio, 20)).toBe('creciendo');
    expect(trendStage(espacio, 40)).toBe('pico');
    expect(trendDirection(espacio, 110)).toBe('baja');
    expect(trendStage(espacio, 110)).toBe('declive');

    const piratas = getTheme('piratas').basePopularityCurve;
    expect(trendStage(piratas, 140)).toBe('muerto');
    // Renacimiento nostálgico años después (docs/04 §2).
    expect(trendStage(piratas, 200)).toBe('naciendo');
  });

  it('el estado inicial del mercado cubre todos los géneros, temas y plataformas', () => {
    const market = createInitialState(SEED).market;
    for (const genre of genres) expect(market.genres[genre.id]).toBeDefined();
    for (const theme of themes) expect(market.themes[theme.id]).toBeDefined();
    expect(market.platforms.pcCasero).toBeDefined();
    expect(market.platforms.commo64).toBeDefined();
    expect(market.saturation).toEqual({});
  });
});

describe('saturación — subir al lanzar, decaer al olvidar (docs/04 §3, CA)', () => {
  it('el lanzamiento incrementa su combo y salpica al resto del género', () => {
    const m0 = createMarketState(1);
    const m1 = registerReleaseSaturation(m0, 'rpg', 'fantasia');
    expect(m1.saturation[comboKey('rpg', 'fantasia')]).toBe(
      balance.market.saturation.releaseIncrement,
    );
    expect(effectiveSaturation(m1, 'rpg', 'fantasia')).toBe(1);
    // Otro tema del mismo género hereda la mitad (sameGenreWeight).
    expect(effectiveSaturation(m1, 'rpg', 'espacio')).toBeCloseTo(0.5, 10);
    // Otro género no se entera.
    expect(effectiveSaturation(m1, 'puzzle', 'fantasia')).toBe(0);
  });

  it('modificadorVentas = 1 − k·saturación, con margen para el primero y suelo', () => {
    const s = balance.market.saturation;
    expect(saturationModifier(0)).toBe(1);
    expect(saturationModifier(s.freeAllowance)).toBe(1); // un similar reciente es lo normal
    expect(saturationModifier(3)).toBeCloseTo(1 - s.k * (3 - s.freeAllowance), 10);
    expect(saturationModifier(50)).toBe(s.minModifier);
  });

  it('decae con el tiempo: el público olvida', () => {
    let m = createMarketState(1);
    for (let i = 0; i < 3; i++) m = registerReleaseSaturation(m, 'rpg', 'fantasia');
    const state: GameState = { ...createInitialState(SEED), market: m };
    const after = tick(state);
    expect(after.market.saturation[comboKey('rpg', 'fantasia')]).toBeCloseTo(
      3 * balance.market.saturation.decayPerWeek,
      10,
    );
  });

  it('CA: saturar un género con secuelas erosiona las ventas (también las ya lanzadas)', () => {
    const fresh = createMarketState(1);
    let saturated = fresh;
    for (let i = 0; i < 3; i++) {
      saturated = registerReleaseSaturation(saturated, 'rpg', 'fantasia');
    }
    const game = makeGame();
    const freshUnits = expectedWeeklyUnits(game, 0, fresh);
    const saturatedUnits = expectedWeeklyUnits(game, 0, saturated);
    expect(saturatedUnits).toBeCloseTo(freshUnits * saturationModifier(3), 8);
    expect(saturatedUnits).toBeLessThan(freshUnits * 0.6);
  });

  it('en partida: la segunda secuela ya nace con el mercado saturado', () => {
    let s = runUntilRelease(startProject(createInitialState(SEED), CONCEPT));
    expect(s.releasedGames[0].saturationAtRelease).toBe(0);
    expect(s.market.saturation[comboKey('rpg', 'fantasia')]).toBeGreaterThan(0);

    s = startProject(s, { ...CONCEPT, name: 'Mazmorras del Alba II' });
    s = runUntilRelease(s, 2);
    expect(s.releasedGames[1].saturationAtRelease).toBeGreaterThan(0);
  });
});

describe('reseñas por segmento (docs/04 §5, CA)', () => {
  const market = createMarketState(1);
  const input = {
    quality: 80,
    genreId: 'rpg',
    themeId: 'fantasia',
    audience: 'hardcore' as const,
    hype: 0,
    monetization: {
      model: 'premium' as const,
      aggressiveness: 0,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    },
    era: 'E1' as const,
    market,
  };

  it('cada público juzga distinto: los hardcore aman el RPG que los casual bostezan', () => {
    const result = computeSegmentReviews(input);
    expect(Object.keys(result.bySegment)).toHaveLength(4);
    expect(result.bySegment.hardcore).toBeGreaterThan(result.bySegment.casual ?? 0);
    // La media ponderada queda entre los extremos.
    expect(result.average).toBeGreaterThan(result.bySegment.casual ?? 0);
    expect(result.average).toBeLessThan(result.bySegment.hardcore ?? 100);
  });

  it('reseñaBase = Q × estándarEra y la moda suma o resta', () => {
    const result = computeSegmentReviews(input);
    expect(result.info.base).toBe(80); // E1: estándar 1.0
    expect(result.info.hypePenalty).toBe(0);
    // Fantasía + RPG están por encima del neutro en la semana 1 → bonus positivo.
    expect(result.info.modaBonus).toBeGreaterThan(0);
  });

  it('CA: el hype endurece la reseña (doble filo, parte 1)', () => {
    const low = computeSegmentReviews({ ...input, hype: 0.1 });
    const high = computeSegmentReviews({ ...input, hype: 0.9 });
    expect(low.info.hypePenalty).toBe(0); // por debajo del hype "gratis"
    expect(high.info.hypePenalty).toBeGreaterThan(5);
    expect(high.average).toBeLessThan(low.average);
    expect(high.bySegment.critica).toBeLessThan(low.bySegment.critica ?? 100);
  });
});

describe('hype — doble filo en ventas (docs/04 §4, CA)', () => {
  const market = createMarketState(1);

  it('CA: más hype = más ventas de salida (doble filo, parte 2)', () => {
    const lowHype = makeGame({ hypeAtRelease: 0.1 });
    const highHype = makeGame({ hypeAtRelease: 0.9 });
    expect(expectedWeeklyUnits(highHype, 0, market)).toBeGreaterThan(
      expectedWeeklyUnits(lowHype, 0, market) * 1.5,
    );
  });

  it('sleeper hit: sin hype la cola pesa más que el pico (docs/04 §4)', () => {
    const lowHype = makeGame({ hypeAtRelease: 0 });
    const highHype = makeGame({ hypeAtRelease: 1 });
    const tailShare = (g: ReleasedGame) =>
      expectedWeeklyUnits(g, 8, market) / expectedWeeklyUnits(g, 0, market);
    expect(tailShare(lowHype)).toBeGreaterThan(tailShare(highHype));
  });

  it('el hype se acumula durante el desarrollo, no en la fase de Concepto', () => {
    let s = startProject(createInitialState(SEED), CONCEPT);
    s = runTicks(s, 2); // fase de Concepto completa (proyecto pequeño)
    expect(s.projects[0].hype).toBe(0);

    s = runUntilRelease(s);
    const game = s.releasedGames[0];
    expect(game.hypeAtRelease).toBeGreaterThan(0);
    expect(game.hypeAtRelease).toBeLessThanOrEqual(1);
    expect(game.reviewsBySegment.critica).toBeDefined();
    expect(game.reviewsBySegment.prensa).toBeDefined();
    expect(game.reviewsBySegment.hardcore).toBeDefined();
    expect(game.reviewsBySegment.casual).toBeDefined();
  });
});

describe('el momento de lanzar (docs/04 §2, CA de cierre)', () => {
  it('CA: el mismo juego vende mucho más en el pico de la moda que cuando muere', () => {
    // Espacio está en pico en la semana 40 y muerto hacia la 180 (curvas de data/).
    const peakMarket = createMarketState(40);
    const deadMarket = createMarketState(180);
    const game = makeGame({ genreId: 'puzzle', themeId: 'espacio' });

    const atPeak = expectedWeeklyUnits(game, 0, peakMarket);
    const whenDead = expectedWeeklyUnits(game, 0, deadMarket);
    expect(atPeak).toBeGreaterThan(whenDead * 1.5);
  });

  it('las ventas se recalculan por tick: si la moda cae después de lanzar, la cola se hunde', () => {
    const game = makeGame({ genreId: 'puzzle', themeId: 'espacio', review: 90 });
    // Mismo juego y misma semana relativa (t=4), con el mercado de dos momentos.
    const risingMarket = createMarketState(40);
    const dyingMarket = createMarketState(180);
    expect(expectedWeeklyUnits(game, 4, dyingMarket)).toBeLessThan(
      expectedWeeklyUnits(game, 4, risingMarket),
    );
  });
});

describe('plataformas — ciclo de vida y base instalada (docs/04 §7, CA)', () => {
  const commo = getPlatform('commo64');

  it('recorre lanzamiento → crecimiento → madurez → declive → descatalogada', () => {
    expect(platformStage(commo, 5)).toBe('lanzamiento');
    expect(platformStage(commo, 20)).toBe('crecimiento');
    expect(platformStage(commo, 80)).toBe('madurez');
    expect(platformStage(commo, 150)).toBe('declive');
    expect(platformStage(commo, 300)).toBe('descatalogada');
  });

  it('una plataforma anunciada aún no admite proyectos', () => {
    const future: Platform = { ...commo, releaseWeek: 50, endWeek: 400 };
    expect(platformStage(future, 30)).toBe('anunciada');
    expect(platformAvailable(future, 30)).toBe(false);
    expect(platformAvailable(future, 50)).toBe(true);
    expect(platformAvailable(commo, 299)).toBe(true);
    expect(platformAvailable(commo, 300)).toBe(false);
  });

  it('la base instalada sigue su curva guionizada (± ruido) y alimenta el tamaño de mercado', () => {
    const s = runTicks(createInitialState(SEED), 60);
    const week = s.week - 1;
    const installed = s.market.platforms.commo64.installedBase;
    const scripted = curveValueAt(commo.lifecycleCurve, week);
    expect(Math.abs(installed - scripted)).toBeLessThanOrEqual(scripted * 0.02 + 1);
    // El Commo 64 creció respecto a la semana 1.
    expect(installed).toBeGreaterThan(createInitialState(SEED).market.platforms.commo64.installedBase);

    // tamañoMercado = base instalada × sesgo de público (docs/04 §6).
    expect(marketSize(commo, 'casual', s.market)).toBeCloseTo(
      installed * commo.audienceBias.casual,
      10,
    );
  });
});
