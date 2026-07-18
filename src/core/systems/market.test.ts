import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { genres } from '../../data/genres';
import { getPlatform } from '../../data/platforms';
import { themes } from '../../data/themes';
import { createInitialState } from '../engine/initialState';
import { makeRng } from '../engine/rng';
import { tick } from '../engine/tick';
import type { Platform } from '../model/content';
import type { GameState } from '../model/gameState';
import type { ProjectSize } from '../model/project';
import type { ReleasedGame } from '../model/release';
import type { Employee } from '../model/staff';
import type { Fever, MarketState, TrendState } from '../model/market';
import {
  advanceMarket,
  clampHype,
  comboKey,
  computeSegmentReviews,
  createMarketState,
  curveValueAt,
  effectiveSaturation,
  expectedWeeklyUnits,
  feverBoost,
  marketSize,
  overHypeGap,
  platformAvailable,
  platformStage,
  registerReleaseSaturation,
  saturationModifier,
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

  it('sin fiebre, la base es plana y el ruido la deja en la banda estrecha (9.4)', () => {
    // Se acabaron las curvas de años: fuera de fiebre, todo género/tema vaga en
    // [bandMin, bandMax] ~42–58 %, así que ninguno domina (docs/19 §9.4). Una
    // fiebre activa SÍ puede romper la banda (esa es su gracia): se excluye.
    const p = balance.market.popularity;
    const s = runTicks(createInitialState(SEED), 80);
    for (const genre of genres) {
      const trend = s.market.genres[genre.id];
      if (trend.stage !== 'estable') continue;
      expect(trend.pop).toBeGreaterThanOrEqual(p.bandMin);
      expect(trend.pop).toBeLessThanOrEqual(p.bandMax);
    }
    for (const theme of themes) {
      const trend = s.market.themes[theme.id];
      if (trend.stage !== 'estable') continue;
      expect(trend.pop).toBeGreaterThanOrEqual(p.bandMin);
      expect(trend.pop).toBeLessThanOrEqual(p.bandMax);
    }
  });

  it('la etapa y la dirección las marca la FIEBRE, no una curva (9.4)', () => {
    // Sin fiebre: estable y sin dirección (no hay tendencia que leer).
    const calm = createMarketState(1);
    expect(calm.genres.rpg.stage).toBe('estable');
    expect(calm.genres.rpg.direction).toBe('estable');

    // Con una fiebre activa: 'fiebre', y la dirección sube antes del pico y baja
    // después. Se inyecta una fiebre determinista sobre el RPG.
    const fever: Fever = {
      id: 'f-test', target: 'genre', targetId: 'rpg',
      startWeek: 10, peakWeek: 15, endWeek: 25, intensity: 0.4, source: 'organica',
    };
    let s: GameState = { ...createInitialState(SEED), week: 12, market: { ...calm, fevers: [fever] } };
    s = advanceMarket(s, makeRng(SEED, 12));
    expect(s.market.genres.rpg.stage).toBe('fiebre');
    expect(s.market.genres.rpg.direction).toBe('sube'); // semana 12 < pico 15
    expect(s.market.genres.rpg.pop).toBeGreaterThan(balance.market.popularity.bandMax);

    // Pasado el pico, la dirección baja.
    let t: GameState = { ...createInitialState(SEED), week: 20, market: { ...calm, fevers: [fever] } };
    t = advanceMarket(t, makeRng(SEED, 20));
    expect(t.market.genres.rpg.direction).toBe('baja'); // semana 20 ≥ pico 15
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

  it('notaBase = barScore + gain·(Q − listón) y la moda suma o resta (9.1)', () => {
    const result = computeSegmentReviews(input);
    const r = balance.market.reviews;
    // Q 80 en E1: muy por encima del listón (61) → nota base alta y trazable.
    expect(result.info.base).toBeCloseTo(r.barScore + r.gain * (80 - r.eraBar.E1), 5);
    expect(result.info.eraDelta).toBeCloseTo(80 - r.eraBar.E1, 5);
    expect(result.info.hypePenalty).toBe(0);
    // Sin repetición ni mercado inundado, la fatiga no pega; banda 0 sin stream.
    expect(result.info.fatiga).toBe(0);
    expect(result.info.banda).toBe(0);
    // Sin fiebre, la base es plana en el neutro (9.4): la moda no suma ni resta.
    // El bonus de moda solo aparece cuando una fiebre rompe la banda.
    expect(result.info.modaBonus).toBe(0);
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

describe('hype pasivo — la meseta lo desacopla de la duración (docs/18 V3)', () => {
  /**
   * Estado con un proyecto del tamaño dado ya en fase de hype (Producción). El
   * tamaño se fuerza sobre el proyecto en vez de pasar por startProject: aquí
   * se mide SOLO la acumulación de hype de advanceMarket, y las puertas de
   * etapa (no puedes empezar un AAA en el garaje) son de otro sistema.
   */
  function withProject(size: ProjectSize, hype = 0): GameState {
    const started = startProject(createInitialState(SEED), CONCEPT);
    const project = started.projects[0];
    return {
      ...started,
      projects: [{ ...project, size, phase: balance.market.hype.startPhase, hype }],
    };
  }

  /** Solo el hype pasivo: avanza el mercado N semanas sin comprar nada. */
  function passiveHypeAfter(size: ProjectSize, weeks: number): number {
    let s = withProject(size);
    for (let i = 0; i < weeks; i++) s = advanceMarket(s, makeRng(SEED, i));
    return s.projects[0].hype;
  }

  const cap = balance.market.hype.passiveCap;

  it('CA: ningún tamaño llega solo a la zona roja, por mucho que dure el desarrollo', () => {
    // 200 semanas es más del doble que el AAA más largo: si el pasivo pudiera
    // desbocarse por tiempo, aquí se vería.
    for (const size of ['pequeno', 'mediano', 'grande', 'muyGrande', 'aaa'] as const) {
      const hype = passiveHypeAfter(size, 200);
      expect(hype).toBeLessThan(balance.market.hype.overHypeThreshold);
      expect(hype).toBeLessThanOrEqual(cap);
    }
  });

  it('el pasivo se acerca a la meseta y se para ahí (no la cruza)', () => {
    const long = passiveHypeAfter('aaa', 200);
    expect(long).toBeGreaterThan(cap * 0.95);
    expect(long).toBeLessThanOrEqual(cap);
  });

  it('los desarrollos largos siguen generando más expectación que los cortos', () => {
    // La meseta no aplana la progresión: a igual semana, el que lleva más
    // tiempo anunciado tiene más hype (docs/04 §4).
    const pequeno = passiveHypeAfter('pequeno', 4);
    const grande = passiveHypeAfter('grande', 28);
    const aaa = passiveHypeAfter('aaa', 80);
    expect(grande).toBeGreaterThan(pequeno);
    expect(aaa).toBeGreaterThan(grande);
  });

  it('el freno es progresivo: cada semana aporta menos que la anterior', () => {
    let s = withProject('grande');
    const deltas: number[] = [];
    let prev = 0;
    for (let i = 0; i < 12; i++) {
      s = advanceMarket(s, makeRng(SEED, i));
      deltas.push(s.projects[0].hype - prev);
      prev = s.projects[0].hype;
    }
    for (let i = 1; i < deltas.length; i++) {
      expect(deltas[i]).toBeLessThanOrEqual(deltas[i - 1]);
    }
  });

  it('por encima de la meseta el pasivo no aporta: subir de ahí es DECISIÓN', () => {
    // Hype comprado (marketing/creadores) muy por encima de la meseta.
    const s = withProject('aaa', 0.8);
    const after = advanceMarket(s, makeRng(SEED, 1));
    expect(after.projects[0].hype).toBe(0.8);
  });

  it('la meseta deja sitio a que marketing + creadores lleguen a la zona roja', () => {
    // El diseño exige que la palanca comprada BASTE para cruzar (docs/18 V3).
    const topCampaign = Math.max(...balance.economy.marketing.levels.map((c) => c.hypeBoost));
    expect(cap + topCampaign).toBeGreaterThan(balance.market.hype.overHypeThreshold);
  });
});

describe('popularidad de banda — viva pero sin dominar (9.4, docs/19 §9.4)', () => {
  it('la base plana vaga dentro de la banda: se mueve, pero nada acampa arriba', () => {
    // Fuera de fiebre, la popularidad se queda SIEMPRE en [bandMin, bandMax] y
    // aun así se mueve de verdad (el panel tiene vida). Es la garantía visible
    // de "hacer buenos juegos importa más que elegir la tendencia".
    const p = balance.market.popularity;
    const genre = genres[0];
    let s = createInitialState(SEED);
    let moved = 0;
    for (let i = 0; i < 300; i++) {
      // Avanza SOLO el mercado (sin economía: no queremos bancarrota a 300 sem).
      s = { ...advanceMarket(s, makeRng(SEED, s.week)), week: s.week + 1 };
      const trend = s.market.genres[genre.id];
      if (trend.stage === 'estable') {
        expect(trend.pop).toBeGreaterThanOrEqual(p.bandMin);
        expect(trend.pop).toBeLessThanOrEqual(p.bandMax);
        moved = Math.max(moved, Math.abs(trend.pop - p.base));
      }
    }
    expect(moved).toBeGreaterThan(0.02); // se mueve de verdad
    expect(moved).toBeLessThanOrEqual(p.bandMax - p.base + 1e-9); // pero nunca sale de la banda
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

describe('el hype sin marketing no alcanza la zona roja; comprado, no tiene tope (9.1)', () => {
  /** Sin comprar nada, el hype "gratis" (pasivo + premios + estrellas) queda
   * SIEMPRE por debajo de la zona roja: llegar arriba exige decisión (dinero). */
  const freeCeiling = balance.market.hype.overHypeThreshold;

  /** Estrella mediática: aporta hype extra al equipo (docs/07 §6). */
  function mediaStar(): Employee {
    return {
      id: 'estrella',
      name: 'Estrella Mediática',
      avatarSeed: 'star',
      specialty: 'marketing',
      skills: { diseno: 40, tecnica: 40, arte: 40, audio: 40, marketing: 80 },
      traits: ['estrellaMediatica'],
      morale: 80,
      energy: 100,
      loyalty: 70,
      salary: 2_000,
      level: 5,
      xp: 0,
      founder: false,
      burnedOut: false,
      weeksLowEnergy: 0,
    };
  }

  /** Relleno de plantilla para alcanzar el aforo de Corporación (docs/17 E1). */
  function team(n: number): Employee[] {
    return Array.from({ length: n }, (_, i) => ({
      ...mediaStar(),
      id: `dev-${i}`,
      name: `Dev ${i}`,
      traits: [],
    }));
  }

  it('clampHype solo impide el hype negativo: sin tope superior (docs/19 §9.1)', () => {
    expect(clampHype(5)).toBe(5);
    expect(clampHype(-3)).toBe(0);
    expect(clampHype(0.42)).toBeCloseTo(0.42, 10);
  });

  it('acumular todas las fuentes base sin comprar marketing no llega a la zona roja', () => {
    // Estudio pequeño con una Estrella mediática (hype extra) y premios
    // pendientes al máximo: todas las fuentes "gratis" de hype a la vez, y un
    // AAA que se cuece muchas semanas. Sin una sola campaña de marketing.
    const base = createInitialState(SEED);
    let s: GameState = {
      ...base,
      studio: {
        ...base.studio,
        // El AAA exige Corporación (docs/18 V4-b): etapa 5 y 40 en nómina.
        // Caja para las ~200 semanas del test: con el overhead de 8.8 una
        // corporación de 40 nóminas quema ~63k 💰/semana — con menos caja
        // quebraría a medio desarrollo y el juego nunca saldría.
        scaleStage: 5,
        capital: 15_000_000,
        awardHype: balance.awards.rewards.hypeCap,
      },
      staff: [...base.staff, mediaStar(), ...team(39)],
    };
    s = startProject(s, { ...CONCEPT, size: 'aaa' });
    // Que se cueza muchas semanas: solo el fundador y la estrella en el proyecto
    // (output bajo), pero con todas las fuentes de hype "gratis" a la vez.
    s = {
      ...s,
      projects: s.projects.map((p) => ({ ...p, assignedStaff: ['fundador', 'estrella'] })),
    };
    // El anuncio nace con el hype de los premios, muy por debajo de la zona roja.
    for (const p of s.projects) expect(p.hype).toBeLessThan(freeCeiling);

    // Un AAA se cuece ~120 semanas de calendario (docs/02 §6): el presupuesto
    // de ticks cubre su duración completa.
    for (let i = 0; i < 200 && s.releasedGames.length === 0; i++) {
      s = tick(s);
      for (const p of s.projects) {
        expect(p.hype).toBeGreaterThanOrEqual(0);
        expect(p.hype).toBeLessThan(freeCeiling);
      }
    }
    expect(s.releasedGames.length).toBeGreaterThan(0);
    // El hype con el que salió al mercado tampoco roza el sobre-hype.
    for (const g of s.releasedGames) expect(g.hypeAtRelease).toBeLessThan(freeCeiling);
  });

  it('por encima de la meseta, el hype pasivo deja de aportar (solo el comprado sube)', () => {
    // El AAA exige Corporación (docs/18 V4-b): etapa 5 y 40 en nómina.
    const base = createInitialState(SEED);
    const corp: GameState = {
      ...base,
      studio: { ...base.studio, scaleStage: 5 },
      staff: [...base.staff, ...team(40)],
    };
    let s = startProject(corp, { ...CONCEPT, size: 'aaa' });
    // Forzar Producción (el hype ya corre) con el manómetro ya inflado por
    // marketing (2.0, sin tope desde 9.1); el pasivo no añade nada encima.
    s = { ...s, projects: s.projects.map((p) => ({ ...p, phase: 2, hype: 2 })) };
    const after = tick(s);
    expect(after.projects[0].hype).toBe(2);
  });
});

describe('castigo por sobre-hype (docs/17 E2)', () => {
  const bar = balance.market.hype.overHype.reviewBar;

  it('overHypeGap: solo hay brecha con MUCHO hype Y reseña baja', () => {
    // Zona roja (hype ≥ umbral) + no cumple (reseña < listón) → castigo.
    expect(overHypeGap(0.9, 40)).toBeGreaterThan(0);
    // Hype alto pero el juego cumple: sin castigo.
    expect(overHypeGap(0.9, bar + 10)).toBe(0);
    // Reseña baja pero sin hype (zona verde): sin castigo.
    expect(overHypeGap(0.3, 40)).toBe(0);
    // Más brecha cuanto peor es la reseña (proporcional).
    expect(overHypeGap(0.9, 30)).toBeGreaterThan(overHypeGap(0.9, 60));
  });

  it('el castigo hunde la COLA de ventas, no el pico de salida', () => {
    const market = createMarketState(1);
    const clean = makeGame({ review: 45, hypeAtRelease: 0.9, overHypeTailPenalty: 0 });
    const punished = makeGame({ review: 45, hypeAtRelease: 0.9, overHypeTailPenalty: 0.4 });
    // En la cola (varias semanas después) el castigado vende bastante menos.
    expect(expectedWeeklyUnits(punished, 12, market)).toBeLessThan(
      expectedWeeklyUnits(clean, 12, market),
    );
  });
});

describe('el momento de lanzar: pillar una fiebre (docs/19 §9.4, CA de cierre)', () => {
  /** Mercado con una fiebre inyectada, con su boost ya reflejado en la pop. */
  function withFever(week: number, fever: Fever): MarketState {
    const m = createMarketState(week);
    const boost = feverBoost([fever], fever.target, fever.targetId, week);
    const cell = (prev: TrendState): TrendState => ({
      ...prev,
      pop: Math.min(1, prev.pop + boost),
      stage: 'fiebre',
      direction: 'sube',
    });
    if (fever.target === 'genre') {
      return { ...m, genres: { ...m.genres, [fever.targetId]: cell(m.genres[fever.targetId]) }, fevers: [fever] };
    }
    return { ...m, themes: { ...m.themes, [fever.targetId]: cell(m.themes[fever.targetId]) }, fevers: [fever] };
  }

  const fever: Fever = {
    id: 'f-espacio', target: 'theme', targetId: 'espacio',
    startWeek: 30, peakWeek: 40, endWeek: 55, intensity: 0.45, source: 'organica',
  };

  it('CA: el mismo juego vende mucho más durante la fiebre de su tema que sin ella', () => {
    const feveredMarket = withFever(40, fever); // en el pico
    const calmMarket = createMarketState(40); // base plana, sin fiebre
    const game = makeGame({ genreId: 'puzzle', themeId: 'espacio' });

    const inFever = expectedWeeklyUnits(game, 0, feveredMarket);
    const calm = expectedWeeklyUnits(game, 0, calmMarket);
    expect(inFever).toBeGreaterThan(calm * 1.5);
  });

  it('las ventas siguen la fiebre: la cola se hunde cuando se enfría', () => {
    const game = makeGame({ genreId: 'puzzle', themeId: 'espacio', review: 90 });
    // Misma semana relativa (t=4): durante la fiebre vs ya expirada (base plana).
    const duringFever = withFever(40, fever);
    const afterFever = createMarketState(60); // endWeek 55: ya se enfrió
    expect(expectedWeeklyUnits(game, 4, afterFever)).toBeLessThan(
      expectedWeeklyUnits(game, 4, duringFever),
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
