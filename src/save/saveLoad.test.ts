import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, startProject, tick } from '../core';
import {
  deserializeSave,
  loadFromLocalStorage,
  SAVE_STORAGE_KEY,
  SAVE_VERSION,
  saveToLocalStorage,
  serializeSave,
} from './saveLoad';

const SEED = 777;

describe('saveLoad — guardado/carga con versión (docs/08 §7)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('serializa y deserializa con round-trip idéntico', () => {
    let state = createInitialState(SEED);
    state = tick(tick(state)); // avanza un par de semanas para no probar solo el estado inicial
    expect(deserializeSave(serializeSave(state))).toEqual(state);
  });

  it('round-trip de una partida a mitad de juego (proyecto + lanzamiento)', () => {
    let state = startProject(createInitialState(SEED), {
      name: 'Mazmorras del Alba',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
    });
    for (let i = 0; i < 10; i++) state = tick(state); // lanza y vende unas semanas
    expect(state.releasedGames).toHaveLength(1);
    expect(deserializeSave(serializeSave(state))).toEqual(state);
  });

  it('migra un guardado v1 (Fase 0) al esquema actual', () => {
    const v1 = JSON.stringify({
      saveVersion: 1,
      state: { seed: SEED, week: 12, era: 'E1', studio: { capital: 8_500 } },
    });
    const state = deserializeSave(v1);
    expect(state.week).toBe(12);
    expect(state.studio.capital).toBe(8_500);
    expect(state.projects).toEqual([]);
    expect(state.releasedGames).toEqual([]);
    expect(state.projectCounter).toBe(0);
    expect(state.negativeWeeks).toBe(0);
    expect(state.gameOver).toBeNull();
    expect(state.log).toEqual([]);
  });

  it('migra un guardado v2 (Fase 1) al esquema actual: fundador, pool y escala', () => {
    const project = {
      id: 'proyecto-1',
      name: 'Viejo proyecto',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
      price: 20,
      phase: 2,
      focus: [{}, {}, {}],
      chosenFeatureIds: [],
      weeksSpent: 3,
      designPoints: 2,
      techPoints: 1,
      qaInvested: 0,
      bugDebt: 0.06,
    };
    const v2 = JSON.stringify({
      saveVersion: 2,
      state: {
        seed: SEED,
        week: 30,
        era: 'E1',
        studio: { capital: 12_000 },
        projects: [project],
        releasedGames: [],
        projectCounter: 1,
        negativeWeeks: 0,
        gameOver: null,
        log: [],
      },
    });
    const state = deserializeSave(v2);
    expect(state.studio.scaleStage).toBe(1);
    expect(state.staff).toHaveLength(1);
    expect(state.staff[0].founder).toBe(true);
    expect(state.staff[0].id).toBe('fundador');
    expect(state.candidates).toEqual([]);
    expect(state.projects[0].assignedStaff).toEqual(['fundador']);
    expect(state.projects[0].crunch).toBe(false);
    expect(state.projects[0].weeksSpent).toBe(3);
  });

  it('migra un guardado v3 (Fase 2) al esquema actual: mercado, hype y segmentos', () => {
    const base = createInitialState(SEED);
    const oldGame = {
      id: 'proyecto-1',
      name: 'Juego viejo',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
      price: 20,
      quality: 70,
      review: 70,
      verdict: 'Un buen juego con margen de mejora.',
      breakdown: {},
      lines: [],
      releaseWeek: 10,
      weeklySales: [120, 80],
      totalUnits: 200,
      totalRevenue: 4_000,
      salesActive: true,
    };
    const project = {
      id: 'proyecto-2',
      name: 'En marcha',
      themeId: 'espacio',
      genreId: 'puzzle',
      platformId: 'commo64',
      audience: 'casual',
      size: 'pequeno',
      price: 20,
      phase: 2,
      focus: [{}, {}, {}],
      chosenFeatureIds: [],
      assignedStaff: ['fundador'],
      crunch: false,
      weeksSpent: 3,
      designPoints: 2,
      techPoints: 1,
      qaInvested: 0,
      bugDebt: 0.06,
    };
    const v3 = JSON.stringify({
      saveVersion: 3,
      state: {
        ...base,
        week: 20,
        projects: [project],
        releasedGames: [oldGame],
        market: undefined,
      },
    });

    const state = deserializeSave(v3);
    // El mercado se reconstruye desde las curvas guionizadas en su semana.
    expect(state.market).toBeDefined();
    expect(state.market.genres.rpg.pop).toBeGreaterThan(0);
    expect(state.market.platforms.commo64.installedBase).toBeGreaterThan(0);
    expect(state.market.saturation).toEqual({});
    // Los proyectos en marcha arrancan sin hype; los juegos viejos heredan su reseña.
    expect(state.projects[0].hype).toBe(0);
    const migrated = state.releasedGames[0];
    expect(migrated.reviewsBySegment).toEqual({
      critica: 70,
      prensa: 70,
      hardcore: 70,
      casual: 70,
    });
    expect(migrated.reviewMarket).toEqual({ base: 70, modaBonus: 0, hypePenalty: 0 });
    expect(migrated.hypeAtRelease).toBe(0);
    expect(migrated.saturationAtRelease).toBe(0);
  });

  it('migra un guardado v4 (Fase 3) al esquema actual: reputación, deuda y economía', () => {
    const base = createInitialState(SEED);
    // Un estado "v4": sin los campos de la Fase 4.
    const v4State = {
      ...base,
      week: 25,
      studio: { capital: 9_000, scaleStage: 1 },
      releasedGames: [
        {
          id: 'proyecto-1',
          name: 'Juego v4',
          themeId: 'fantasia',
          genreId: 'rpg',
          platformId: 'pcCasero',
          audience: 'hardcore',
          size: 'pequeno',
          price: 20,
          quality: 70,
          review: 70,
          reviewsBySegment: { critica: 70, prensa: 70, hardcore: 70, casual: 70 },
          reviewMarket: { base: 70, modaBonus: 0, hypePenalty: 0 },
          hypeAtRelease: 0,
          saturationAtRelease: 0,
          verdict: 'Un buen juego.',
          breakdown: {},
          lines: [],
          releaseWeek: 10,
          weeklySales: [120, 80],
          totalUnits: 200,
          totalRevenue: 4_000,
          salesActive: true,
        },
      ],
    } as unknown as Record<string, unknown>;
    delete v4State['loanPrincipal'];
    delete v4State['scandals'];
    delete v4State['regulation'];
    delete v4State['stats'];
    delete v4State['cashflow'];

    const state = deserializeSave(JSON.stringify({ saveVersion: 4, state: v4State }));
    // La reputación arranca neutra en los 6 segmentos (docs/06 §1).
    expect(Object.keys(state.studio.reputation)).toHaveLength(6);
    expect(state.studio.reputation.hardcore).toBe(50);
    expect(state.studio.reputationDebt).toBe(0);
    expect(state.studio.moralDrift).toBe(0);
    expect(state.loanPrincipal).toBe(0);
    expect(state.scandals).toEqual([]);
    expect(state.regulation).toEqual({ pressure: {}, enacted: [] });
    // Los stats heredan lo reconstruible del historial.
    expect(state.stats.totalRevenue).toBe(4_000);
    expect(state.stats.peakCapital).toBeGreaterThanOrEqual(9_000);
    expect(state.cashflow).toEqual([]);
    // Los juegos viejos heredan el modelo honesto.
    expect(state.releasedGames[0].monetization.model).toBe('premium');
    expect(state.releasedGames[0].mtxRevenue).toBe(0);
    // Un tick sobre el estado migrado no revienta.
    expect(() => tick(state)).not.toThrow();
  });

  it('migra un guardado v6 (Fase 5) al esquema actual: eras, investigación, políticas y premios', () => {
    const base = createInitialState(SEED);
    // Un estado "v6": semana avanzada con la era congelada en E1 (antes de la
    // Fase 6 la era nunca avanzaba) y sin los campos nuevos.
    const v6State = {
      ...base,
      week: 700,
      studio: { ...base.studio, awards: undefined, awardHype: undefined },
    } as unknown as Record<string, unknown>;
    delete v6State['research'];
    delete v6State['policies'];

    const state = deserializeSave(JSON.stringify({ saveVersion: 6, state: v6State }));
    // La era se recalcula por la semana (700 cae en E3, docs/02 §5).
    expect(state.era).toBe('E3');
    // Sin historial (ni juegos ni proyectos), la progresión del conocimiento
    // arranca vacía (docs/17 P1/P2): sin temas investigados ni pistas.
    expect(state.research).toEqual({
      points: 0,
      unlocked: [],
      rdStaff: [],
      themes: [],
      insights: [],
      featureInsights: [],
    });
    expect(state.policies).toEqual({
      salary: 'mercado',
      antiCrunch: false,
      autoTraining: false,
      autoBonus: false,
    });
    expect(state.studio.awards).toEqual([]);
    expect(state.studio.awardHype).toBe(0);
    // Un tick sobre el estado migrado no revienta.
    expect(() => tick(state)).not.toThrow();
  });

  it('migra un guardado v7 (Fase 6) al esquema actual: coste del juego y startWeek (docs/17 U4)', () => {
    const concept = {
      name: 'Juego v7',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
    } as const;

    // (a) Un juego lanzado sin `cost`: se estima por tamaño/plataforma.
    let withGame = startProject(createInitialState(SEED), concept);
    for (let i = 0; i < 12 && withGame.releasedGames.length === 0; i++) withGame = tick(withGame);
    const strippedGames = withGame.releasedGames.map((g) => {
      const copy = { ...g };
      delete (copy as { cost?: number }).cost;
      return copy;
    });
    const gameState = deserializeSave(
      JSON.stringify({ saveVersion: 7, state: { ...withGame, releasedGames: strippedGames } }),
    );
    expect(gameState.releasedGames[0].cost).toBeGreaterThan(0);
    expect(() => tick(gameState)).not.toThrow();

    // (b) Un proyecto en curso sin `startWeek`: se fija en la semana actual.
    const inFlight = startProject(createInitialState(SEED), concept);
    const strippedProjects = inFlight.projects.map((p) => {
      const copy = { ...p };
      delete (copy as { startWeek?: number }).startWeek;
      return copy;
    });
    const projectState = deserializeSave(
      JSON.stringify({ saveVersion: 7, state: { ...inFlight, projects: strippedProjects } }),
    );
    expect(projectState.projects[0].startWeek).toBe(projectState.week);
  });

  it('migra un guardado v8 (Fase 8.2) al esquema actual: siembra el conocimiento desde el historial (docs/17 P1/P2)', () => {
    // Un estudio con obra hecha (juego lanzado + proyecto en curso). Relabelamos
    // los temas a no-starter para probar la siembra; el resto son objetos reales.
    let played = startProject(createInitialState(SEED), {
      name: 'Semilla',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
    });
    for (let i = 0; i < 12 && played.releasedGames.length === 0; i++) played = tick(played);
    played = startProject(played, {
      name: 'En curso',
      themeId: 'cienciaFiccion',
      genreId: 'estrategia',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
    });
    const v8State = {
      ...played,
      // Forma de research v8: sin themes/insights.
      research: { points: played.research.points, unlocked: [], rdStaff: [] },
      releasedGames: played.releasedGames.map((g) => ({
        ...g,
        themeId: 'militar',
        genreId: 'shooter',
      })),
      projects: played.projects.map((p) => ({ ...p, themeId: 'crimen', genreId: 'rpg' })),
    };

    const state = deserializeSave(JSON.stringify({ saveVersion: 8, state: v8State }));
    // Los temas ya usados (no-starter) quedan investigados: no se pierde acceso.
    expect(state.research.themes).toContain('militar');
    expect(state.research.themes).toContain('crimen');
    // Cada combo lanzado queda "aprendido" (su pista predictiva).
    expect(state.research.insights).toContain('militar|shooter');
    // Un estudio con obra a sus espaldas conoce el mercado: 3 facetas globales.
    expect(state.research.unlocked).toEqual(
      expect.arrayContaining(['analisisMercado', 'estudioGeneros', 'redAfinidades']),
    );
    expect(() => tick(state)).not.toThrow();
  });

  it('migra un guardado v9 (Fase 8.4) al esquema de 5 etapas (docs/18 V4): 4→5 sin tocar nada más', () => {
    // El mapeo por identidad de rol: 1→1, 2→2, 3→3 y la vieja Corporación (4)
    // pasa a la nueva (5). No se recorta plantilla ni proyectos (docs/17 B1).
    const cases: [number, number][] = [
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 5],
    ];
    for (const [oldStage, newStage] of cases) {
      const base = createInitialState(SEED);
      const v9State = {
        ...base,
        studio: { ...base.studio, scaleStage: oldStage },
      };
      const state = deserializeSave(JSON.stringify({ saveVersion: 9, state: v9State }));
      expect(state.studio.scaleStage).toBe(newStage);
      expect(() => tick(state)).not.toThrow();
    }
  });

  it('una vieja Corporación migrada conserva su plantilla aunque supere aforos intermedios', () => {
    const base = createInitialState(SEED);
    const bigStaff = [
      base.staff[0],
      ...Array.from({ length: 29 }, (_, i) => ({
        ...base.staff[0],
        id: `viejo-${i}`,
        name: `Veterano ${i}`,
        founder: false,
        salary: 800,
      })),
    ];
    const v9State = {
      ...base,
      studio: { ...base.studio, capital: 2_000_000, scaleStage: 4 },
      staff: bigStaff,
    };
    const state = deserializeSave(JSON.stringify({ saveVersion: 9, state: v9State }));
    // Corporación nueva (aforo 100): los 30 caben; nadie es despedido al cargar.
    expect(state.studio.scaleStage).toBe(5);
    expect(state.staff).toHaveLength(30);
    expect(() => tick(state)).not.toThrow();
  });

  it('migra un guardado v13 (Fase 9.2) a v14 (Fase 9.3): los encajes conocidos arrancan vacíos', () => {
    const base = createInitialState(SEED);
    // Un estado "v13": el campo featureInsights aún no existía.
    const { featureInsights: _v14, ...researchV13 } = base.research;
    const v13State = { ...base, research: researchV13 };
    const state = deserializeSave(JSON.stringify({ saveVersion: 13, state: v13State }));
    expect(state.research.featureInsights).toEqual([]);
    expect(() => tick(state)).not.toThrow();
  });

  it('al cargar, sanea solo el hype negativo: sin tope superior desde 9.1 (docs/19)', () => {
    let state = startProject(createInitialState(SEED), {
      name: 'Desbordado',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
    });
    // Con el marketing sin tope, un hype de 3.5 es legítimo y se conserva…
    state = { ...state, projects: state.projects.map((p) => ({ ...p, hype: 3.5 })) };
    const loaded = deserializeSave(serializeSave(state));
    expect(loaded.projects[0].hype).toBe(3.5);
    // …pero un hype negativo (corrupto) sí se sanea a 0.
    state = { ...state, projects: state.projects.map((p) => ({ ...p, hype: -0.5 })) };
    const repaired = deserializeSave(serializeSave(state));
    expect(repaired.projects[0].hype).toBe(0);
  });

  it('el JSON incluye saveVersion', () => {
    const parsed = JSON.parse(serializeSave(createInitialState(SEED))) as {
      saveVersion: number;
    };
    expect(parsed.saveVersion).toBe(SAVE_VERSION);
  });

  it('rechaza un guardado con formato desconocido', () => {
    expect(() => deserializeSave('{}')).toThrow(/formato desconocido/);
    expect(() => deserializeSave('null')).toThrow(/formato desconocido/);
    expect(() => deserializeSave('{"saveVersion":1,"state":{}}')).toThrow(
      /formato desconocido/,
    );
  });

  it('rechaza JSON corrupto', () => {
    expect(() => deserializeSave('esto no es json')).toThrow();
  });

  it('rechaza un guardado de una versión futura', () => {
    const state = createInitialState(SEED);
    const future = JSON.stringify({ saveVersion: SAVE_VERSION + 1, state });
    expect(() => deserializeSave(future)).toThrow(/versión futura/);
  });

  it('rechaza una versión antigua sin migración registrada', () => {
    const state = createInitialState(SEED);
    const old = JSON.stringify({ saveVersion: 0, state });
    expect(() => deserializeSave(old)).toThrow(/migración/);
  });

  it('guarda y carga desde localStorage', () => {
    const state = tick(createInitialState(SEED));
    saveToLocalStorage(state);
    expect(localStorage.getItem(SAVE_STORAGE_KEY)).not.toBeNull();
    expect(loadFromLocalStorage()).toEqual(state);
  });

  it('devuelve null si no hay guardado', () => {
    expect(loadFromLocalStorage()).toBeNull();
  });
});
