import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { featureGenreAffinity, features, getFeature } from '../../data/features';
import { genres } from '../../data/genres';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import { startProject, toggleFeature, type ProjectConcept } from './projects';
import { computeQuality } from './quality';
import { buildReviewLines } from './review';
import { buyResearch, featureFitRevealed, learnFeatureInsights } from './research';

/**
 * Fase 9.3 (docs/19 §9.3): features por género. Elegir features es una
 * decisión de CRITERIO: una feature fuera de género no sube la nota y añade
 * más bugs; una que encaja sí; el desglose lo explica (Pilar 2); el encaje se
 * GANA (nodo global o lanzando); las variantes de un trade-off se excluyen.
 */

const SEED = 42;

const PUZZLE: ProjectConcept = {
  name: 'Bloques Lógicos',
  themeId: 'fantasia',
  genreId: 'puzzle',
  platformId: 'pcCasero',
  audience: 'casual',
  size: 'pequeno',
};

function withProject(concept: ProjectConcept): GameState {
  // Caja explícita: el garaje de 9.6 arranca con 4.000 💰 y el apilador de
  // features alarga el proyecto hasta quebrar antes de lanzar. Aquí se mide
  // la CALIDAD del criterio, no la supervivencia — se dota al estudio.
  const base = createInitialState(SEED);
  return startProject(
    { ...base, studio: { ...base.studio, capital: 60_000 } },
    concept,
  );
}

/** Avanza ticks hasta acumular `count` lanzamientos (con tope de seguridad). */
function runUntilRelease(state: GameState, count = 1, maxTicks = 80): GameState {
  let s = state;
  for (let i = 0; i < maxTicks && s.releasedGames.length < count; i++) {
    s = tick(s);
  }
  return s;
}

describe('datos de afinidad (docs/09 §5): consistentes y completos', () => {
  it('fitsGenres/clashesGenres usan ids de género válidos y no se solapan', () => {
    const genreIds = new Set(genres.map((g) => g.id));
    for (const f of features) {
      for (const id of [...(f.fitsGenres ?? []), ...(f.clashesGenres ?? [])]) {
        expect(genreIds.has(id), `${f.id}: género desconocido ${id}`).toBe(true);
      }
      const overlap = (f.fitsGenres ?? []).filter((id) => (f.clashesGenres ?? []).includes(id));
      expect(overlap, `${f.id}: fits y clashes se solapan`).toEqual([]);
    }
  });

  it('cada grupo de variantes tiene al menos dos miembros', () => {
    const groups = new Map<string, number>();
    for (const f of features) {
      if (f.variantGroup !== undefined) {
        groups.set(f.variantGroup, (groups.get(f.variantGroup) ?? 0) + 1);
      }
    }
    expect(groups.size).toBeGreaterThan(0);
    for (const [group, count] of groups) {
      expect(count, `grupo ${group}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('todo género tiene features que le encajan (el criterio existe en todos)', () => {
    for (const genre of genres) {
      const fitting = features.filter((f) => f.fitsGenres?.includes(genre.id));
      expect(fitting.length, `género ${genre.id}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('featureGenreAffinity: encaja / neutro / noEncaja', () => {
    const mundoAbierto = getFeature('mundoAbierto');
    expect(featureGenreAffinity(mundoAbierto, 'rpg')).toBe('encaja');
    expect(featureGenreAffinity(mundoAbierto, 'puzzle')).toBe('noEncaja');
    expect(featureGenreAffinity(mundoAbierto, 'shooter')).toBe('neutro');
  });
});

describe('featureScore pondera por encaje (docs/03 factor C, 9.3)', () => {
  /** Proyecto puzzle de laboratorio para computeQuality (sin pasar por toggle). */
  function puzzleProject(chosenFeatureIds: string[]) {
    return {
      ...withProject(PUZZLE).projects[0],
      phase: 3 as const,
      weeksSpent: 6,
      designPoints: 6,
      techPoints: 4, // ideal puzzle 0.6/0.4: balance perfecto
      qaInvested: 0.2,
      bugDebt: 0.1, // fijo: aísla el factor C (los bugs extra van aparte)
      chosenFeatureIds,
    };
  }
  const CTX = { era: 'E1' as const, teamFactor: 1.0, comboRepeats: 0 };

  it('una feature que ENCAJA sube la nota', () => {
    const sin = computeQuality(puzzleProject([]), CTX);
    const con = computeQuality(puzzleProject(['fisicasAvanzadas']), CTX);
    expect(con.breakdown.featureScore).toBeGreaterThan(sin.breakdown.featureScore);
    expect(con.q).toBeGreaterThan(sin.q);
  });

  it('una feature FUERA de género no sube la nota: resta incluso con bugs iguales', () => {
    const criterio = computeQuality(puzzleProject(['fisicasAvanzadas']), CTX);
    const apilado = computeQuality(puzzleProject(['fisicasAvanzadas', 'mundoAbierto']), CTX);
    // El "mejor" feature del juego (valor 3) hunde el factor C en un puzzle:
    // resta 0.25·3 del numerador. Y eso sin contar sus bugs ni sus 4 semanas.
    expect(apilado.breakdown.featureScore).toBeLessThan(criterio.breakdown.featureScore);
    expect(apilado.q).toBeLessThan(criterio.q);
    expect(apilado.breakdown.featureParts).toContainEqual({
      id: 'mundoAbierto',
      affinity: 'noEncaja',
    });
  });

  it('una neutra aporta la mitad que una que encaja (mismo valor)', () => {
    // multijugadorLocal vale 1 y encaja con puzzle; guardadoNube vale 1 y es
    // neutra en todas partes. Se comparan sus aportes al numerador.
    const target = balance.quality.featureScopeTarget.pequeno;
    const encaja = computeQuality(puzzleProject(['multijugadorLocal']), CTX);
    expect(encaja.breakdown.featureScore).toBeCloseTo(1 / target, 10);
    const neutra = computeQuality(puzzleProject(['guardadoNube']), CTX);
    expect(neutra.breakdown.featureScore).toBeCloseTo(0.5 / target, 10);
  });
});

describe('toggleFeature (9.3): bugs de misfit y variantes excluyentes', () => {
  it('una feature fuera de género mete MÁS bugs (misfitBugMult)', () => {
    const state = withProject(PUZZLE);
    const before = state.projects[0].bugDebt;
    const scale = balance.development.featureBugScale;

    // Físicas avanzadas encaja con puzzle: bugs normales (escalados).
    const conFisicas = toggleFeature(state, 'fisicasAvanzadas');
    const fisicas = getFeature('fisicasAvanzadas');
    expect(conFisicas.projects[0].bugDebt - before).toBeCloseTo(fisicas.bugRisk * scale, 10);

    // Mundo abierto NO pega en un puzzle: bugs multiplicados.
    const conMundo = toggleFeature(state, 'mundoAbierto');
    const mundo = getFeature('mundoAbierto');
    expect(conMundo.projects[0].bugDebt - before).toBeCloseTo(
      mundo.bugRisk * scale * balance.quality.featureAffinity.misfitBugMult,
      10,
    );

    // Quitarla devuelve la deuda exacta (simétrico).
    const sinMundo = toggleFeature(conMundo, 'mundoAbierto');
    expect(sinMundo.projects[0].bugDebt).toBeCloseTo(before, 10);
  });

  it('elegir una variante desmarca la otra (variantGroup)', () => {
    // RPG en E5 con la generación procedural investigada: las dos variantes
    // de mundo abierto están disponibles y son un trade-off excluyente.
    const base = createInitialState(SEED);
    const e5: GameState = {
      ...base,
      era: 'E5',
      research: { ...base.research, unlocked: ['generacionProcedural'] },
    };
    const state = startProject(e5, {
      name: 'Mundos',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
    });
    const artesanal = toggleFeature(state, 'mundoAbierto');
    expect(artesanal.projects[0].chosenFeatureIds).toContain('mundoAbierto');

    const procedural = toggleFeature(artesanal, 'mapaProcedural');
    expect(procedural.projects[0].chosenFeatureIds).toContain('mapaProcedural');
    expect(procedural.projects[0].chosenFeatureIds).not.toContain('mundoAbierto');
    // La deuda de bugs queda la de la variante activa, no la suma.
    const scale = balance.development.featureBugScale;
    expect(procedural.projects[0].bugDebt - state.projects[0].bugDebt).toBeCloseTo(
      getFeature('mapaProcedural').bugRisk * scale,
      10,
    );
  });
});

describe('CA 9.3: apilar fuera de género PENALIZA; el desglose lo explica', () => {
  // Dos jugadores con el mismo estudio y la misma semilla: uno elige con
  // criterio (solo lo que encaja con puzzle), el otro apila "los mejores".
  function release(featureIds: string[]): GameState {
    let state = withProject(PUZZLE);
    for (const id of featureIds) state = toggleFeature(state, id);
    return runUntilRelease(state);
  }

  it('el apilador saca peor calidad, más bugs y una reseña que lo cuenta', () => {
    const criterio = release(['fisicasAvanzadas', 'multijugadorLocal']);
    const apilador = release([
      'fisicasAvanzadas',
      'multijugadorLocal',
      'mundoAbierto', // valor 3… que no pinta nada en un puzzle
      'sistemaCrafteo', // ídem (valor 1.5)
    ]);
    const gCriterio = criterio.releasedGames[0];
    const gApilador = apilador.releasedGames[0];

    // En el garaje el techo de madurez puede igualar las Q por arriba: apilar
    // NUNCA sube la nota, y por el camino deja más bugs, peor factor C y un
    // proyecto más largo y caro — daño neto aunque el techo disimule la Q.
    expect(gApilador.quality).toBeLessThanOrEqual(gCriterio.quality);
    expect(gApilador.breakdown.bugLevel).toBeGreaterThan(gCriterio.breakdown.bugLevel);
    expect(gApilador.breakdown.featureScore).toBeLessThan(gCriterio.breakdown.featureScore);
    expect(gApilador.cost ?? 0).toBeGreaterThan(gCriterio.cost ?? 0);

    // El desglose nombra las piezas fuera de sitio (Pilar 2)…
    const lineaApilador = gApilador.lines.find((l) => l.factor === 'features');
    expect(lineaApilador?.tone).toBe('bad');
    expect(lineaApilador?.title).toBe('Features que no pegan');
    expect(lineaApilador?.detail).toContain('Mundo abierto artesanal');
    expect(lineaApilador?.detail).toContain('Sistema de crafteo');
    // …y el del jugador con criterio no tiene nada que reprochar ahí.
    const lineaCriterio = gCriterio.lines.find((l) => l.factor === 'features');
    expect(lineaCriterio?.title).not.toBe('Features que no pegan');
  });

  it('buildReviewLines fuerza ✘ y nombra el misfit aunque el alcance esté lleno', () => {
    const breakdown = {
      fit: 0.9,
      fitParts: { themeGenre: 1, genrePlatform: 1, audience: 0.75 },
      balanceScore: 0.95,
      dReal: 0.6,
      dIdeal: 0.6,
      featureScore: 1,
      featureParts: [
        { id: 'fisicasAvanzadas', affinity: 'encaja' as const },
        { id: 'mundoAbierto', affinity: 'noEncaja' as const },
      ],
      polishScore: 0.9,
      bugLevel: 0.1,
      teamFactor: 1,
      innovationMod: 1,
      base: 0.9,
      qualityCap: 85,
    };
    const lines = buildReviewLines(breakdown, {
      themeId: 'fantasia',
      genreId: 'puzzle',
      audience: 'casual',
      size: 'pequeno',
    });
    const linea = lines.find((l) => l.factor === 'features');
    expect(linea?.tone).toBe('bad');
    expect(linea?.detail).toContain('Mundo abierto artesanal');
    expect(linea?.detail).toContain('Puzzle/Casual');
  });
});

describe('el encaje se GANA (docs/17 P2 + 9.3): nodo global o lanzando', () => {
  it('empieza oculto y el nodo Teoría del diseño lo revela para todo', () => {
    const base = createInitialState(SEED);
    expect(featureFitRevealed(base, 'mundoAbierto', 'puzzle')).toBe(false);

    const e2: GameState = {
      ...base,
      era: 'E2',
      research: { ...base.research, points: 20 },
    };
    const conNodo = buyResearch(e2, 'teoriaDiseno');
    expect(featureFitRevealed(conNodo, 'mundoAbierto', 'puzzle')).toBe(true);
    expect(featureFitRevealed(conNodo, 'finalRamificado', 'rpg')).toBe(true);
  });

  it('lanzar enseña el encaje de las features usadas con ESE género', () => {
    let state = withProject(PUZZLE);
    state = toggleFeature(state, 'fisicasAvanzadas');
    state = runUntilRelease(state);
    expect(state.releasedGames).toHaveLength(1);
    // Aprendido para puzzle (lo viviste y el desglose lo contó)…
    expect(featureFitRevealed(state, 'fisicasAvanzadas', 'puzzle')).toBe(true);
    // …pero no para otros géneros ni otras features.
    expect(featureFitRevealed(state, 'fisicasAvanzadas', 'rpg')).toBe(false);
    expect(featureFitRevealed(state, 'mundoAbierto', 'puzzle')).toBe(false);
  });

  it('learnFeatureInsights no duplica claves', () => {
    const base = createInitialState(SEED);
    const once = learnFeatureInsights(base, ['mundoAbierto'], 'rpg');
    const twice = learnFeatureInsights(once, ['mundoAbierto'], 'rpg');
    expect(twice.research.featureInsights).toEqual(['mundoAbierto|rpg']);
  });
});
