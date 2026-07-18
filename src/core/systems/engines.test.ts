import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getLicensedEngine } from '../../data/engines';
import { getEra } from '../../data/eras';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { OwnedEngine } from '../model/engine';
import { deserializeSave, serializeSave, SAVE_VERSION } from '../../save/saveLoad';
import { createMarketState, expectedWeeklyUnits, marketSize } from './market';
import { computeCeilingContext } from './maturity';
import { startProject } from './projects';
import {
  advanceEngineBuild,
  engineAdequacy01,
  engineBuildCost,
  engineMaxPlatforms,
  engineTechLevel,
  maxBuildableGeneration,
  resolveEngine,
  startEngineBuild,
} from './engines';
import { getPlatform } from '../../data/platforms';

/**
 * Fase 9.2 — Motores y tecnología (docs/19 §9.2): el motor como término
 * tecnológico del techo, construir vs licenciar, envejecimiento emergente,
 * multiplataforma y migración de saves. Determinista, semilla fija.
 */

const SEED = 92;

function atEra(eraId: 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7', points = 0): GameState {
  const week = getEra(eraId).startWeek;
  const base = createInitialState(SEED);
  return {
    ...base,
    week,
    era: eraId,
    market: createMarketState(week),
    research: { ...base.research, points },
  };
}

function ownedEngine(overrides: Partial<OwnedEngine> = {}): OwnedEngine {
  return {
    id: 'motor-test',
    name: 'Motor de prueba',
    generation: 3,
    techLevel: engineTechLevel(3, ['graficos3d', 'fisicas']),
    capabilities: ['graficos3d', 'fisicas'],
    builtWeek: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// CA: un juego grande sobre motor viejo TOPA BAJO; el pequeño depende menos
// ---------------------------------------------------------------------------

describe('CA 9.2: el motor es el término tecnológico del techo (docs/03 §3.1)', () => {
  it('un AAA en E5 sobre un motor de E3 topa bajo; el mismo motor en un juego pequeño apenas topa', () => {
    const state: GameState = { ...atEra('E5'), engines: [ownedEngine()] };
    const aaa = engineAdequacy01(state, 'motor-test', 'aaa', 'shooter');
    const chico = engineAdequacy01(state, 'motor-test', 'pequeno', 'aventura');
    // El AAA/shooter exige mucho más motor que el pequeño narrativo.
    expect(aaa).toBeLessThan(0.7);
    expect(chico).toBeGreaterThan(0.95);

    const team = state.staff;
    const capAaa = computeCeilingContext(state, team, 'shooter', 'aaa', 'motor-test').capTech;
    const capChico = computeCeilingContext(state, team, 'aventura', 'pequeno', 'motor-test').capTech;
    expect(capAaa).toBeLessThan(85);
    expect(capChico).toBeGreaterThan(95);
  });

  it('sin motor (código artesanal) E1 no exige nada y E4 topa en el mínimo', () => {
    expect(engineAdequacy01(atEra('E1'), null, 'grande', 'rpg')).toBe(1);
    expect(engineAdequacy01(atEra('E4'), null, 'grande', 'rpg')).toBe(0);
    const cap = computeCeilingContext(atEra('E4'), [], 'rpg', 'grande', null).capTech;
    expect(cap).toBe(balance.quality.ceiling.engine.min);
  });

  it('CA: los motores ENVEJECEN — el mismo motor pierde adecuación era a era', () => {
    const engine = ownedEngine();
    const eras = ['E3', 'E4', 'E5', 'E6'] as const;
    // Un AAA/shooter: el perfil que más motor exige (docs/19 §9.2).
    const adequacies = eras.map((era) =>
      engineAdequacy01({ ...atEra(era), engines: [engine] }, 'motor-test', 'aaa', 'shooter'),
    );
    // Nivel fijo + demanda creciente = brecha creciente (el envejecimiento).
    for (let i = 1; i < adequacies.length; i++) {
      expect(adequacies[i]).toBeLessThan(adequacies[i - 1]);
    }
    expect(adequacies[0]).toBeGreaterThan(0.95); // puntero en su era
    expect(adequacies[3]).toBeLessThan(0.5); // obsoleto dos eras después
  });
});

// ---------------------------------------------------------------------------
// CA: construir un motor cuesta dinero + 💡 + tiempo
// ---------------------------------------------------------------------------

describe('CA 9.2: construir motor propio (💰 + 💡 + semanas)', () => {
  it('la obra descuenta 💰 y 💡 al encargarla y el motor aparece al terminar las semanas', () => {
    const e2 = atEra('E2', 50);
    const base: GameState = {
      ...e2,
      studio: { ...e2.studio, capital: 100_000 },
      research: { ...e2.research, points: 50, unlocked: ['motorPropio1'] },
    };
    const cost = engineBuildCost(base, 2, []);
    expect(cost.money).toBeGreaterThan(0);
    expect(cost.points).toBeGreaterThan(0);
    expect(cost.weeks).toBeGreaterThan(0);

    let s = startEngineBuild(base, { name: 'Mi Motor', generation: 2, capabilities: [] });
    expect(s.studio.capital).toBe(base.studio.capital - cost.money);
    expect(s.research.points).toBe(50 - cost.points);
    expect(s.engineBuild?.weeksLeft).toBe(cost.weeks);
    expect(s.engines ?? []).toHaveLength(0);
    // No se pueden encargar dos obras a la vez.
    expect(() => startEngineBuild(s, { name: 'Otro', generation: 2, capabilities: [] })).toThrow(
      /obra de motor en curso/,
    );

    // El tick descuenta semanas; el motor no existe hasta terminar.
    for (let i = 0; i < cost.weeks - 1; i++) s = advanceEngineBuild(s);
    expect(s.engines ?? []).toHaveLength(0);
    s = advanceEngineBuild(s);
    expect(s.engineBuild).toBeNull();
    expect(s.engines).toHaveLength(1);
    expect(s.engines?.[0].name).toBe('Mi Motor');
    expect(s.engines?.[0].techLevel).toBe(engineTechLevel(2, []));
  });

  it('la generación está gateada por I+D y por la era', () => {
    // Sin arquitectura, solo gen 1; con Arquitectura I, hasta la 3 — pero la
    // era acota: en E2 no se construye un motor de 1995.
    const e2 = atEra('E2', 999);
    expect(maxBuildableGeneration(e2)).toBe(1);
    const conNodo = {
      ...e2,
      research: { ...e2.research, unlocked: ['motorPropio1'] },
    };
    expect(maxBuildableGeneration(conNodo)).toBe(2);
    expect(() =>
      startEngineBuild(conNodo, { name: 'Imposible', generation: 3, capabilities: [] }),
    ).toThrow(/generación/);
    const e4 = {
      ...atEra('E4', 999),
      research: { ...atEra('E4').research, points: 999, unlocked: ['motorPropio1'] },
    };
    expect(maxBuildableGeneration(e4)).toBe(3);
  });

  it('mejorar un motor existente cuesta la fracción de la obra nueva (amortizar premia)', () => {
    const e4 = atEra('E4', 200);
    const state: GameState = {
      ...e4,
      studio: { ...e4.studio, capital: 1_000_000 },
      engines: [ownedEngine({ generation: 3 })],
      research: {
        ...e4.research,
        points: 200,
        unlocked: ['motorPropio1', 'motorPropio2'],
      },
    };
    const nueva = engineBuildCost(state, 4, ['graficos3d', 'fisicas']);
    const mejora = engineBuildCost(state, 4, ['graficos3d', 'fisicas'], 'motor-test');
    expect(mejora.money).toBeLessThan(nueva.money);
    expect(mejora.points).toBeLessThan(nueva.points);
    // Las capacidades que el motor ya tiene no se vuelven a pagar.
    expect(mejora.money).toBe(Math.round(balance.engines.moneyByGeneration[4] * balance.engines.upgradeFactor));

    let s = startEngineBuild(state, {
      upgradeOf: 'motor-test',
      generation: 4,
      capabilities: ['graficos3d', 'fisicas'],
    });
    while (s.engineBuild) s = advanceEngineBuild(s);
    expect(s.engines).toHaveLength(1); // mismo motor, no uno nuevo
    expect(s.engines?.[0].id).toBe('motor-test');
    expect(s.engines?.[0].generation).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// CA: licenciar aplica royalty sobre las ventas
// ---------------------------------------------------------------------------

describe('CA 9.2: licenciar (moderno ya, pero con royalty y sin activo)', () => {
  it('al concebir con motor licenciado se paga la cuota y el juego congela su royalty', () => {
    const state = { ...atEra('E4'), studio: { ...atEra('E4').studio, capital: 500_000 } };
    const def = getLicensedEngine('irreal2');
    const s = startProject(state, {
      name: 'Con Irreal',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
      engineId: 'irreal2',
    });
    const upfront =
      getPlatform('pcCasero').licenseCost +
      balance.economy.sizeBaseCost.pequeno +
      def.upfrontFee;
    expect(s.studio.capital).toBe(500_000 - upfront);
    expect(s.projects[0].engineId).toBe('irreal2');
  });

  it('la royalty recorta los ingresos semanales y se acumula en royaltyPaid', () => {
    const state = { ...atEra('E4'), studio: { ...atEra('E4').studio, capital: 500_000 } };
    let s = startProject(state, {
      name: 'Con Irreal',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
      engineId: 'irreal2',
    });
    while (s.releasedGames.length === 0) s = tick(s);
    const released = s.releasedGames[0];
    expect(released.royaltyPct).toBe(getLicensedEngine('irreal2').royaltyPct);
    expect(released.engineName).toBe('Irreal Engine 2');

    // Unas semanas de ventas: lo pagado en royalty es ~pct de lo bruto.
    for (let i = 0; i < 8; i++) s = tick(s);
    const g = s.releasedGames[0];
    expect(g.totalUnits).toBeGreaterThan(0);
    expect(g.royaltyPaid ?? 0).toBeGreaterThan(0);
    const gross = g.totalRevenue + (g.royaltyPaid ?? 0);
    expect((g.royaltyPaid ?? 0) / gross).toBeCloseTo(g.royaltyPct ?? 0, 1);
  });

  it('un motor propio no paga royalty', () => {
    const state: GameState = {
      ...atEra('E3'),
      studio: { ...atEra('E3').studio, capital: 500_000 },
      engines: [ownedEngine()],
    };
    let s = startProject(state, {
      name: 'Con el mío',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
      engineId: 'motor-test',
    });
    while (s.releasedGames.length === 0) s = tick(s);
    for (let i = 0; i < 8; i++) s = tick(s);
    const g = s.releasedGames[0];
    expect(g.royaltyPct).toBe(0);
    expect(g.royaltyPaid ?? 0).toBe(0);
  });

  it('el catálogo se renueva: un motor retirado no admite proyectos nuevos', () => {
    const e6 = { ...atEra('E6'), studio: { ...atEra('E6').studio, capital: 500_000 } };
    expect(() =>
      startProject(e6, {
        name: 'Tarde',
        themeId: 'fantasia',
        genreId: 'rpg',
        platformId: 'pcCasero',
        audience: 'amplio',
        size: 'pequeno',
        engineId: 'rayTech', // retirado en E5
      }),
    ).toThrow(/retirado/);
  });
});

// ---------------------------------------------------------------------------
// CA: multiplataforma — capacidad del motor + demanda que suma
// ---------------------------------------------------------------------------

describe('CA 9.2: multiplataforma (capacidad del motor que se investiga)', () => {
  it('sin capacidad de kit, solo una plataforma; con biplataforma, dos', () => {
    const e3 = { ...atEra('E3'), studio: { ...atEra('E3').studio, capital: 500_000 } };
    const concept = {
      name: 'Doble',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      platformIds: ['pcCasero', 'playsystem'],
      audience: 'amplio' as const,
      size: 'pequeno' as const,
    };
    expect(engineMaxPlatforms(e3, null)).toBe(1);
    expect(() => startProject(e3, concept)).toThrow(/una plataforma/);

    const biEngine = ownedEngine({
      id: 'motor-bi',
      capabilities: ['graficos3d', 'biplataforma'],
      techLevel: engineTechLevel(3, ['graficos3d', 'biplataforma']),
    });
    const conKit: GameState = { ...e3, engines: [biEngine] };
    expect(engineMaxPlatforms(conKit, 'motor-bi')).toBe(2);
    const s = startProject(conKit, { ...concept, engineId: 'motor-bi' });
    expect(s.projects[0].platformIds).toEqual(['pcCasero', 'playsystem']);
    // Cada plataforma paga su licencia al iniciar.
    const upfront =
      getPlatform('pcCasero').licenseCost +
      getPlatform('playsystem').licenseCost +
      balance.economy.sizeBaseCost.pequeno;
    expect(s.studio.capital).toBe(500_000 - upfront);
  });

  it('la demanda de ventas SUMA las bases instaladas de las plataformas', () => {
    const e3 = atEra('E3');
    let s = { ...e3, studio: { ...e3.studio, capital: 500_000 } };
    // Juego ficticio lanzado en 2 plataformas vs el mismo en 1.
    const mono = startProject(s, {
      name: 'Mono',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
    });
    let m = mono;
    while (m.releasedGames.length === 0) m = tick(m);
    const game = m.releasedGames[0];
    const multi = { ...game, platformIds: ['pcCasero', 'playsystem'] };
    const unitsMono = expectedWeeklyUnits(game, 1, m.market);
    const unitsMulti = expectedWeeklyUnits(multi, 1, m.market);
    expect(unitsMulti).toBeGreaterThan(unitsMono);
    // La proporción sigue a las bases instaladas (misma reseña/hype/precio).
    const base1 = marketSize(getPlatform('pcCasero'), 'amplio', m.market);
    const base2 = marketSize(getPlatform('playsystem'), 'amplio', m.market);
    expect(unitsMulti / unitsMono).toBeCloseTo((base1 + base2) / base1, 5);
  });
});

// ---------------------------------------------------------------------------
// Migración de saves v12 → v13 (no destructiva)
// ---------------------------------------------------------------------------

describe('9.2: migración v13 — los nodos motorPropio se convierten en motor', () => {
  it('un save v12 con motorPropio2 gana un motor gen 4 equivalente y los proyectos lo adoptan', () => {
    const base = atEra('E4');
    const state: GameState = {
      ...startProject(
        { ...base, studio: { ...base.studio, capital: 500_000 } },
        {
          name: 'Heredado',
          themeId: 'fantasia',
          genreId: 'rpg',
          platformId: 'pcCasero',
          audience: 'amplio',
          size: 'pequeno',
        },
      ),
      research: {
        ...base.research,
        unlocked: ['motorPropio1', 'motorPropio2', 'tecnologiaOnline'],
      },
    };
    // Simula un save v12: sin motores y sin los campos nuevos.
    const stripped = JSON.parse(serializeSave(state)) as {
      saveVersion: number;
      state: Record<string, unknown>;
    };
    stripped.saveVersion = 12;
    delete stripped.state['engines'];
    delete stripped.state['engineBuild'];
    const projects = stripped.state['projects'] as Record<string, unknown>[];
    for (const p of projects) {
      delete p['platformIds'];
      delete p['engineId'];
    }
    const migrated = deserializeSave(JSON.stringify(stripped));

    expect(SAVE_VERSION).toBeGreaterThanOrEqual(13);
    expect(migrated.engines).toHaveLength(1);
    const engine = migrated.engines?.[0];
    expect(engine?.generation).toBe(4);
    // El "Motor propio II" de antes era 3D; el online estaba investigado.
    expect(engine?.capabilities).toContain('graficos3d');
    expect(engine?.capabilities).toContain('online');
    // El proyecto en curso lo adopta y estrena platformIds.
    expect(migrated.projects[0].engineId).toBe(engine?.id);
    expect(migrated.projects[0].platformIds).toEqual(['pcCasero']);
    // Y el motor heredado funciona como término del techo.
    expect(
      engineAdequacy01(migrated, engine?.id, 'pequeno', 'rpg'),
    ).toBeGreaterThan(0.9);
  });

  it('un save v12 sin nodos de motor migra sin inventar activos', () => {
    const state = atEra('E1');
    const stripped = JSON.parse(serializeSave(state)) as {
      saveVersion: number;
      state: Record<string, unknown>;
    };
    stripped.saveVersion = 12;
    delete stripped.state['engines'];
    delete stripped.state['engineBuild'];
    const migrated = deserializeSave(JSON.stringify(stripped));
    expect(migrated.engines).toEqual([]);
    expect(migrated.engineBuild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveEngine: la vista uniforme
// ---------------------------------------------------------------------------

describe('9.2: resolveEngine', () => {
  it('artesanal para null, propio para ids del taller, licenciado para el catálogo', () => {
    const state: GameState = { ...atEra('E4'), engines: [ownedEngine()] };
    expect(resolveEngine(state, null).kind).toBe('artesanal');
    expect(resolveEngine(state, 'motor-test').kind).toBe('propio');
    expect(resolveEngine(state, 'irreal2').kind).toBe('licenciado');
    expect(() => resolveEngine(state, 'noExiste')).toThrow(/desconocido/);
  });
});
