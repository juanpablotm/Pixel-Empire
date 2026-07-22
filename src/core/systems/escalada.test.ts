import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getEra } from '../../data/eras';
import { researchNodes } from '../../data/research';
import { createInitialState } from '../engine/initialState';
import { makeRng } from '../engine/rng';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { Project, ProjectSize } from '../model/project';
import type { ReleasedGame } from '../model/release';
import type { Employee } from '../model/staff';
import { engineTechLevel } from './engines';
import { computeSegmentReviews, overHypeGap } from './market';
import { computeCeilingContext } from './maturity';
import { advanceMoral } from './morale';
import { startProject } from './projects';
import { computeQuality } from './quality';

/**
 * Fase 9.1 — "El juego que no se resuelve" (docs/19 §9.1): el techo dinámico,
 * el listón por era, la fatiga de fórmula, la banda legible, el decay de
 * reputación y el marketing sin tope. Determinista, semilla fija.
 */

const SEED = 91;

const CONCEPT = {
  name: 'Mazmorras del Alba',
  themeId: 'fantasia',
  genreId: 'rpg',
  platformId: 'pcCasero',
  audience: 'hardcore',
  size: 'pequeno',
} as const;

/** Proyecto pequeño con ejecución PERFECTA (fit 1, balance ideal, sin bugs). */
function perfectProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'perfecto',
    name: 'Ejecución perfecta',
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
    marketingUsed: [],
    creatorCampaign: [],
    overPromised: false,
    phase: 3,
    focus: [{}, {}, {}],
    chosenFeatureIds: ['mundoAbierto', 'fisicasAvanzadas'], // ≥ objetivo → 1.0
    assignedStaff: ['fundador'],
    crunch: false,
    hype: 0,
    weeksSpent: 6,
    designPoints: 6.5, // ideal exacto para RPG
    techPoints: 3.5,
    qaInvested: 0,
    bugDebt: 0,
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'dev',
    name: 'Dev',
    avatarSeed: 'dev',
    specialty: 'diseno',
    skills: { diseno: 60, tecnica: 60, arte: 60, audio: 60, marketing: 30 },
    traits: [],
    morale: 80,
    energy: 100,
    loyalty: 70,
    salary: 800,
    level: 5,
    xp: 0,
    founder: false,
    burnedOut: false,
    weeksLowEnergy: 0,
    ...overrides,
  };
}

/** ReleasedGame mínimo para poblar el historial (solo importa su tamaño aquí). */
function fakeReleased(size: ProjectSize, index: number): ReleasedGame {
  return {
    id: `viejo-${index}`,
    name: `Clásico ${index}`,
    themeId: 'fantasia',
    genreId: 'rpg',
    platformId: 'pcCasero',
    audience: 'amplio',
    size,
    price: 30,
    monetization: {
      model: 'premium',
      aggressiveness: 0,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    },
    quality: 70,
    review: 70,
    reviewsBySegment: {},
    reviewMarket: { base: 70, modaBonus: 0, hypePenalty: 0 },
    hypeAtRelease: 0.3,
    saturationAtRelease: 0,
    verdict: '',
    breakdown: {
      fit: 0.8,
      fitParts: { themeGenre: 0.8, genrePlatform: 0.8, audience: 0.8 },
      balanceScore: 0.9,
      dReal: 0.6,
      dIdeal: 0.65,
      featureScore: 0.8,
      polishScore: 0.9,
      bugLevel: 0.1,
      teamFactor: 1,
      innovationMod: 1,
      base: 0.85,
      qualityCap: 85,
    },
    lines: [],
    releaseWeek: 1,
    weeklySales: [],
    totalUnits: 1000,
    totalRevenue: 30000,
    mtxRevenue: 0,
    salesActive: false,
  };
}

/**
 * Estudio maduro de media partida: Corporación en E5 con historial, toda la
 * I+D y un motor propio al día (9.2: sin motor, el término tecnológico topa).
 */
const MATURE_ENGINE_ID = 'motor-maduro';
function matureState(): GameState {
  const base = createInitialState(SEED);
  const capabilities = ['graficos3d', 'fisicas', 'online'] as const;
  return {
    ...base,
    era: 'E5',
    week: getEra('E5').startWeek,
    studio: { ...base.studio, scaleStage: 5 },
    releasedGames: Array.from({ length: 30 }, (_, i) => fakeReleased('grande', i)),
    research: { ...base.research, unlocked: researchNodes.map((n) => n.id) },
    engines: [
      {
        id: MATURE_ENGINE_ID,
        name: 'Motor maduro',
        generation: 5,
        techLevel: engineTechLevel(5, [...capabilities]),
        capabilities: [...capabilities],
        builtWeek: 1,
      },
    ],
  };
}

function runUntilRelease(state: GameState, count = 1): GameState {
  let s = state;
  for (let i = 0; i < 400 && s.releasedGames.length < count; i++) s = tick(s);
  return s;
}

// ---------------------------------------------------------------------------
// CA: un primer juego no supera ~55 (docs/19 §9.1)
// ---------------------------------------------------------------------------

describe('CA 9.1: el 88 al arranque es imposible — el techo del garaje manda', () => {
  it('un primer juego PERFECTO topa en el techo de madurez (~45) y su nota ronda el 50', () => {
    const state = createInitialState(SEED);
    const ceiling = computeCeilingContext(state, state.staff, 'rpg', 'pequeno');
    // Estudio recién nacido: la madurez fija el techo en su mínimo.
    expect(ceiling.capMadurez).toBe(balance.quality.ceiling.maturity.min);

    const { q, breakdown } = computeQuality(perfectProject(), {
      era: 'E1',
      teamFactor: 1.2, // incluso con un equipo inspirado
      comboRepeats: 0,
      ceiling,
    });
    expect(breakdown.base).toBeCloseTo(1.0, 10);
    expect(breakdown.capBinding).toBe('madurez');
    expect(q).toBe(balance.quality.ceiling.maturity.min);
    expect(q).toBeLessThanOrEqual(52);

    // Y la nota media tampoco escapa: juegues como juegues, no hay 88 en 1980.
    const reviews = computeSegmentReviews({
      quality: q,
      genreId: 'rpg',
      themeId: 'fantasia',
      audience: 'hardcore',
      hype: 0,
      monetization: perfectProject().monetization,
      era: 'E1',
      market: state.market,
      recentRepeats: 0,
      bandOffset: balance.market.reviews.band, // incluso con la banda a favor
    });
    expect(reviews.average).toBeLessThanOrEqual(55);
  });

  it('la madurez sube DESPACIO: lanzar 3 pequeños apenas mueve el techo', () => {
    const base = createInitialState(SEED);
    const withHistory: GameState = {
      ...base,
      releasedGames: Array.from({ length: 3 }, (_, i) => fakeReleased('pequeno', i)),
    };
    const ceiling = computeCeilingContext(withHistory, base.staff, 'rpg', 'pequeno');
    expect(ceiling.capMadurez).toBeGreaterThan(balance.quality.ceiling.maturity.min);
    expect(ceiling.capMadurez).toBeLessThan(55);
  });
});

// ---------------------------------------------------------------------------
// CA: una obra maestra exige estudio maduro + ESTRELLA en el rol clave
// ---------------------------------------------------------------------------

describe('CA 9.1: las obras maestras se ganan (madurez + estrella + tech)', () => {
  const project = () => perfectProject({ assignedStaff: ['fundador', 'dev'] });

  it('estudio maduro SIN estrella en el rol clave: el techo queda por debajo de 85', () => {
    const state = { ...matureState(), staff: [makeEmployee({ id: 'dev' })] };
    // Buen senior (75) pero no estrella en Diseño (el rol clave del RPG).
    state.staff[0].skills.diseno = 75;
    const ceiling = computeCeilingContext(state, state.staff, 'rpg', 'pequeno', MATURE_ENGINE_ID);
    expect(ceiling.keySpecialty).toBe('diseno');
    expect(ceiling.capTalento).toBeLessThan(85);

    const { q, breakdown } = computeQuality(project(), {
      era: 'E5',
      teamFactor: 1.25,
      comboRepeats: 0,
      ceiling,
    });
    expect(breakdown.capBinding).toBe('talento');
    expect(q).toBeLessThan(85);
  });

  it('el MISMO estudio con una estrella (90 en el rol clave) alcanza el 85+', () => {
    const state = {
      ...matureState(),
      staff: [makeEmployee({ id: 'dev', skills: { diseno: 90, tecnica: 60, arte: 60, audio: 60, marketing: 30 } })],
    };
    const ceiling = computeCeilingContext(state, state.staff, 'rpg', 'pequeno', MATURE_ENGINE_ID);
    expect(ceiling.capTalento).toBeGreaterThanOrEqual(85);

    const { q } = computeQuality(project(), {
      era: 'E5',
      teamFactor: 1.25,
      comboRepeats: 0,
      ceiling,
    });
    expect(q).toBeGreaterThanOrEqual(85);
  });

  it('un estudio joven con estrella sigue topado: la madurez no se compra', () => {
    const base = createInitialState(SEED);
    const state = {
      ...base,
      staff: [
        ...base.staff,
        makeEmployee({ id: 'dev', skills: { diseno: 95, tecnica: 60, arte: 60, audio: 60, marketing: 30 } }),
      ],
    };
    const ceiling = computeCeilingContext(state, state.staff, 'rpg', 'pequeno');
    const { q } = computeQuality(project(), {
      era: 'E1',
      teamFactor: 1.25,
      comboRepeats: 0,
      ceiling,
    });
    expect(q).toBe(balance.quality.ceiling.maturity.min);
  });

  it('sin motor el techo tecnológico muerde en eras tardías (9.2)', () => {
    const state = { ...matureState(), research: { ...matureState().research, unlocked: [] } };
    // Sin engineId = código artesanal (nivel 0): en E5 la adecuación es 0.
    const ceiling = computeCeilingContext(state, [makeEmployee({ id: 'dev' })], 'rpg', 'pequeno');
    expect(ceiling.motorAdequacy01).toBe(0);
    expect(ceiling.capTech).toBe(balance.quality.ceiling.engine.min);
  });
});

// ---------------------------------------------------------------------------
// Encaje de alcance: la ambición sin capacidad hunde la calidad
// ---------------------------------------------------------------------------

describe('9.1: ambición vs capacidad (el AAA con estudio flojo no llena el alcance)', () => {
  it('un AAA con la plantilla mínima de juniors flojos se hunde; con gente competente, no', () => {
    const state = matureState();
    // La plantilla MÍNIMA del AAA (docs/17 E1), que desde 10.2-B son 24 y no
    // 40: el tamaño del equipo es el mismo en los dos casos, así que lo único
    // que cambia es el TALENTO — que es justo lo que mide el alcance (9.1).
    const crew = balance.development.sizeGate.aaa.minStaff;
    const weak = Array.from({ length: crew }, (_, i) =>
      makeEmployee({
        id: `w-${i}`,
        skills: { diseno: 25, tecnica: 25, arte: 25, audio: 25, marketing: 20 },
      }),
    );
    const strong = Array.from({ length: crew }, (_, i) => makeEmployee({ id: `s-${i}` }));

    const weakCeiling = computeCeilingContext(state, weak, 'rpg', 'aaa');
    const strongCeiling = computeCeilingContext(state, strong, 'rpg', 'aaa');
    expect(weakCeiling.alcance01).toBeLessThan(0.7);
    // CA 10.2-B (docs/20 W2-bis): el AAA dejó de ser una trampa. Su plantilla
    // mínima, si es COMPETENTE, LLENA su alcance — antes ni 40 personas lo
    // llenaban (0,77 medido) y la reseña se hundía a 39 por diseño roto.
    expect(strongCeiling.alcance01).toBe(1);

    const aaa = () =>
      perfectProject({ size: 'aaa', chosenFeatureIds: [], assignedStaff: weak.map((e) => e.id) });
    const qWeak = computeQuality(aaa(), {
      era: 'E5',
      teamFactor: 1,
      comboRepeats: 0,
      ceiling: weakCeiling,
    });
    const qStrong = computeQuality(aaa(), {
      era: 'E5',
      teamFactor: 1,
      comboRepeats: 0,
      ceiling: strongCeiling,
    });
    // Mismo proyecto, mismo teamFactor: el alcance por sí solo abre un abismo.
    expect(qWeak.q).toBeLessThan(qStrong.q - 15);
  });
});

// ---------------------------------------------------------------------------
// CA: repetir la misma fórmula decae la nota (fatiga)
// ---------------------------------------------------------------------------

describe('CA 9.1: la repetición satura — la nota decae con cada entrega seguida', () => {
  const input = (recentRepeats: number) => ({
    quality: 75,
    genreId: 'rpg',
    themeId: 'fantasia',
    audience: 'amplio' as const,
    hype: 0,
    monetization: {
      model: 'premium' as const,
      aggressiveness: 0,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    },
    era: 'E2' as const,
    market: createInitialStateMarket(),
    recentRepeats,
    bandOffset: 0,
  });

  function createInitialStateMarket() {
    return createInitialState(SEED).market;
  }

  it('misma Q, misma semana: cada repetición reciente baja la nota', () => {
    const primera = computeSegmentReviews(input(0));
    const segunda = computeSegmentReviews(input(1));
    const tercera = computeSegmentReviews(input(2));
    expect(segunda.average).toBeLessThan(primera.average);
    expect(tercera.average).toBeLessThan(segunda.average);
    expect(segunda.info.fatiga).toBeGreaterThan(0);
    expect(tercera.info.fatiga).toBeGreaterThan(segunda.info.fatiga ?? 0);
  });

  it('la fatiga está acotada y siempre es explicable', () => {
    const decima = computeSegmentReviews(input(10));
    expect(decima.info.fatiga).toBe(balance.market.reviews.fatigue.max);
  });
});

// ---------------------------------------------------------------------------
// Banda legible: ±band, determinista y trazable
// ---------------------------------------------------------------------------

describe('9.1: la banda de la reseña es estrecha, determinista y explicada', () => {
  it('al lanzar, la banda queda en [−band, +band], se guarda y tiene línea propia', () => {
    const s = runUntilRelease(startProject(createInitialState(SEED), CONCEPT));
    const game = s.releasedGames[0];
    const band = balance.market.reviews.band;
    expect(game.reviewMarket.banda).toBeDefined();
    expect(Math.abs(game.reviewMarket.banda ?? 99)).toBeLessThanOrEqual(band);
    expect(game.lines.some((l) => l.factor === 'band')).toBe(true);
  });

  it('misma semilla → misma banda y misma reseña (determinismo)', () => {
    const run = () => runUntilRelease(startProject(createInitialState(SEED), CONCEPT));
    const a = run().releasedGames[0];
    const b = run().releasedGames[0];
    expect(a.reviewMarket.banda).toBe(b.reviewMarket.banda);
    expect(a.review).toBe(b.review);
  });
});

// ---------------------------------------------------------------------------
// Reencuadre: tu mejor juego hasta ahora
// ---------------------------------------------------------------------------

describe('9.1: el primer juego y los récords se celebran (reencuadre)', () => {
  it('el primer lanzamiento es récord por definición; el segundo solo si supera', () => {
    let s = runUntilRelease(startProject(createInitialState(SEED), CONCEPT));
    const primero = s.releasedGames[0];
    expect(primero.personalBest).toBe(true);
    expect(primero.previousBestReview).toBeUndefined();

    // Segunda entrega del MISMO combo poco después: fatiga + innovación en
    // contra → nota igual o peor, y el récord anterior queda registrado.
    s = startProject(s, { ...CONCEPT, name: 'Mazmorras del Alba II' });
    s = runUntilRelease(s, 2);
    const segundo = s.releasedGames[1];
    expect(segundo.previousBestReview).toBe(primero.review);
    expect(segundo.personalBest).toBe(segundo.review > primero.review);
  });
});

// ---------------------------------------------------------------------------
// Dilema con dientes: la reputación decae sola
// ---------------------------------------------------------------------------

describe('CA 9.1: la reputación decae sola con el tiempo (docs/19 §9.1)', () => {
  it('por encima del objetivo se erosiona; por debajo NO hay cura gratis', () => {
    const base = createInitialState(SEED);
    const state: GameState = {
      ...base,
      studio: {
        ...base.studio,
        reputation: { ...base.studio.reputation, critica: 90, hardcore: 40 },
      },
    };
    const after = advanceMoral(state, makeRng(SEED, 1));
    expect(after.studio.reputation.critica).toBeLessThan(90);
    expect(after.studio.reputation.critica).toBeGreaterThan(85); // decae, no se desploma
    expect(after.studio.reputation.hardcore).toBe(40); // nadie te quiere gratis
  });

  it('un año sin dar motivos erosiona varios puntos', () => {
    const base = createInitialState(SEED);
    let state: GameState = {
      ...base,
      studio: { ...base.studio, reputation: { ...base.studio.reputation, comunidad: 80 } },
    };
    for (let week = 0; week < 52; week++) {
      state = advanceMoral(state, makeRng(SEED, 1000 + week));
    }
    const value = state.studio.reputation.comunidad;
    expect(value).toBeLessThan(72); // ~-8.7 puntos con rate 0.006
    expect(value).toBeGreaterThan(65);
  });
});

// ---------------------------------------------------------------------------
// Marketing sin tope: amplificador de alta varianza
// ---------------------------------------------------------------------------

describe('9.1: marketing sin tope — más hype, más caída si el juego no cumple', () => {
  it('la penalización de reseña crece sin tope con el hype', () => {
    const state = createInitialState(SEED);
    const base = {
      quality: 70,
      genreId: 'rpg',
      themeId: 'fantasia',
      audience: 'amplio' as const,
      hype: 0,
      monetization: {
        model: 'premium' as const,
        aggressiveness: 0,
        hasLootBoxes: false,
        hasBattlePass: false,
        dayOneDLC: false,
      },
      era: 'E2' as const,
      market: state.market,
      recentRepeats: 0,
      bandOffset: 0,
    };
    const h1 = computeSegmentReviews({ ...base, hype: 1 });
    const h2 = computeSegmentReviews({ ...base, hype: 2 });
    expect(h2.info.hypePenalty).toBeGreaterThan((h1.info.hypePenalty ?? 0) + 5);
    expect(h2.average).toBeLessThan(h1.average);
  });

  it('overHypeGap crece más allá del antiguo tope de hype 1.0', () => {
    expect(overHypeGap(2, 30)).toBeGreaterThan(overHypeGap(1, 30));
    // …y sigue exigiendo las DOS cosas: mucho hype Y reseña baja.
    expect(overHypeGap(2, 90)).toBe(0);
  });
});
