import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getPlatform } from '../../data/platforms';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import {
  projectTotalWeeks,
  releasedGameCost,
  setFocus,
  sizeBlockReason,
  startProject,
  toggleFeature,
  type ProjectConcept,
} from './projects';
import type { Employee } from '../model/staff';

const SEED = 42;

const CONCEPT: ProjectConcept = {
  name: 'Mazmorras del Alba',
  themeId: 'fantasia',
  genreId: 'rpg',
  platformId: 'pcCasero',
  audience: 'hardcore',
  size: 'pequeno',
};

function withProject(concept: ProjectConcept = CONCEPT): GameState {
  return startProject(createInitialState(SEED), concept);
}

/** Avanza ticks hasta acumular `count` lanzamientos (con tope de seguridad). */
function runUntilRelease(state: GameState, count = 1, maxTicks = 60): GameState {
  let s = state;
  for (let i = 0; i < maxTicks && s.releasedGames.length < count; i++) {
    s = tick(s);
  }
  return s;
}

describe('startProject — concepción (docs/02 §2 paso 1)', () => {
  it('crea el proyecto con precio por tamaño de data/balance.ts', () => {
    const state = withProject();
    expect(state.projects).toHaveLength(1);
    const p = state.projects[0];
    expect(p.id).toBe('proyecto-1');
    expect(p.phase).toBe(1);
    expect(p.price).toBe(balance.economy.priceBySize.pequeno);
    expect(state.projectCounter).toBe(1);
    expect(state.log.some((e) => e.type === 'proyecto')).toBe(true);
  });

  it('el reparto de esfuerzo por defecto es uniforme y suma 1', () => {
    const p = withProject().projects[0];
    for (const allocation of p.focus) {
      const total = Object.values(allocation).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 10);
    }
  });

  it('rechaza un segundo proyecto simultáneo (garaje) y nombres vacíos', () => {
    const state = withProject();
    expect(() => startProject(state, { ...CONCEPT, name: 'Otro' })).toThrow(/Ya hay un proyecto/);
    expect(() => startProject(createInitialState(SEED), { ...CONCEPT, name: '   ' })).toThrow(
      /nombre/,
    );
  });

  it('rechaza contenido desconocido', () => {
    expect(() =>
      startProject(createInitialState(SEED), { ...CONCEPT, themeId: 'inexistente' }),
    ).toThrow(/Tema desconocido/);
  });

  it('fija startWeek en la semana de concepción (docs/17 U4)', () => {
    const state = withProject();
    expect(state.projects[0].startWeek).toBe(state.week);
  });
});

describe('el calendario es el calendario: la plantilla no acelera (docs/02 §1 y §6)', () => {
  /** Estudio con `n` personas asignadas, todas al mismo proyecto. */
  function withTeam(n: number, concept: ProjectConcept = CONCEPT): GameState {
    const base = createInitialState(SEED);
    const extra: Employee[] = Array.from({ length: n - 1 }, (_, i) => ({
      ...base.staff[0],
      id: `dev-${i}`,
      name: `Dev ${i}`,
      founder: false,
      salary: 300,
    }));
    const staffed: GameState = {
      ...base,
      studio: { ...base.studio, scaleStage: 4, capital: 5_000_000 },
      staff: [...base.staff, ...extra],
    };
    return startProject(staffed, concept);
  }

  it('un tick es UNA semana, tenga el equipo 1 persona o 7', () => {
    for (const n of [1, 4, 7]) {
      const after = tick(withTeam(n));
      expect(after.projects[0].weeksSpent, `${n} personas`).toBe(1);
    }
  });

  it('la duración total la fija el tamaño, no la plantilla', () => {
    const solo = runUntilRelease(withTeam(1), 1, 40);
    const crowd = runUntilRelease(withTeam(7), 1, 40);
    const weeks = balance.development.phaseWeeksBySize.pequeno * 3;
    expect(solo.releasedGames[0].releaseWeek).toBe(weeks);
    expect(crowd.releasedGames[0].releaseWeek).toBe(weeks);
  });

  it('más gente no adelanta el lanzamiento: ejecuta mejor en el mismo plazo', () => {
    // Con la plantilla justa (pequeño espera 1) el equipo grande se topa en
    // maxCrewRatio: ayuda, pero con rendimientos decrecientes (Brooks).
    const solo = tick(withTeam(1));
    const crowd = tick(withTeam(7));
    expect(crowd.projects[0].weeksSpent).toBe(solo.projects[0].weeksSpent);
    expect(crowd.projects[0].designPoints).toBeGreaterThan(solo.projects[0].designPoints);
    const ratio = crowd.projects[0].designPoints / solo.projects[0].designPoints;
    expect(ratio).toBeLessThanOrEqual(balance.development.maxCrewRatio + 1e-9);
  });
});

describe('coste atribuible del juego para el P&L (docs/17 U4)', () => {
  it('releasedGameCost = licencia + base + desarrollo (semanas·coste) + marketing', () => {
    const project = { ...withProject().projects[0], startWeek: 3, marketingUsed: [0, 1] };
    const releaseWeek = 3 + 4; // 4 semanas de calendario en desarrollo
    const licenseCost = getPlatform(project.platformId).licenseCost;
    const baseCost = balance.economy.sizeBaseCost[project.size]; // coste base del tamaño (docs/17 E1)
    const devCost = 4 * balance.economy.devCostPerPersonWeek;
    const marketing =
      balance.economy.marketing.levels[0].cost + balance.economy.marketing.levels[1].cost;
    expect(releasedGameCost(project, releaseWeek)).toBe(
      Math.round(licenseCost + baseCost + devCost + marketing),
    );
  });

  it('un proyecto sin startWeek (save viejo) imputa licencia + coste base, no desarrollo', () => {
    const project = { ...withProject().projects[0], startWeek: undefined, marketingUsed: [] };
    const licenseCost = getPlatform(project.platformId).licenseCost;
    const baseCost = balance.economy.sizeBaseCost[project.size];
    expect(releasedGameCost(project, 50)).toBe(licenseCost + baseCost);
  });

  it('el juego lanzado guarda su coste (cost > 0) al salir a la venta', () => {
    const released = runUntilRelease(withProject());
    expect(released.releasedGames[0].cost).toBeGreaterThan(0);
  });
});

/** Empleado mínimo para llenar plantilla (solo cuenta el nº para el gate). */
function filler(id: string): Employee {
  return {
    id,
    name: id,
    avatarSeed: id,
    specialty: 'diseno',
    skills: { diseno: 50, tecnica: 50, arte: 50, audio: 50, marketing: 50 },
    traits: [],
    morale: 70,
    energy: 90,
    loyalty: 60,
    salary: 500,
    level: 3,
    xp: 0,
    founder: false,
    burnedOut: false,
    weeksLowEnergy: 0,
  };
}

/** Estudio Corporación (etapa 5) con plantilla suficiente para el AAA (docs/18 V4-b). */
function corpStudio(): GameState {
  const base = createInitialState(SEED);
  const minStaff = balance.development.sizeGate.aaa.minStaff;
  return {
    ...base,
    studio: { ...base.studio, scaleStage: 5, capital: 2_000_000 },
    staff: [base.staff[0], ...Array.from({ length: minStaff - 1 }, (_, i) => filler(`e${i}`))],
  };
}

describe('gate de tamaño de proyecto (docs/17 E1)', () => {
  it('el AAA está bloqueado hasta ser Corporación (etapa 5)', () => {
    const garage = createInitialState(SEED);
    expect(sizeBlockReason(garage, 'aaa')).toMatch(/Corporación/);
    expect(() => startProject(garage, { ...CONCEPT, size: 'aaa' })).toThrow(/Corporación/);
    // El pequeño sí se puede en el garaje.
    expect(sizeBlockReason(garage, 'pequeno')).toBeNull();
  });

  it('en Corporación con plantilla suficiente el AAA se desbloquea', () => {
    const corp = corpStudio();
    expect(sizeBlockReason(corp, 'aaa')).toBeNull();
    expect(() => startProject(corp, { ...CONCEPT, size: 'aaa' })).not.toThrow();
  });

  it('el mediano exige plantilla mínima además de etapa', () => {
    // Etapa 2 pero solo el fundador: el mediano pide 3 personas (docs/17 E1).
    const base = createInitialState(SEED);
    const stage2Solo: GameState = { ...base, studio: { ...base.studio, scaleStage: 2 } };
    expect(sizeBlockReason(stage2Solo, 'mediano')).toMatch(/personas/);
    expect(() => startProject(stage2Solo, { ...CONCEPT, size: 'mediano' })).toThrow(/personas/);
  });

  it('iniciar un proyecto cobra el coste base del tamaño (docs/17 E1)', () => {
    const before = createInitialState(SEED);
    const after = startProject(before, CONCEPT); // pequeño
    const license = getPlatform(CONCEPT.platformId).licenseCost;
    expect(after.studio.capital).toBe(
      before.studio.capital - license - balance.economy.sizeBaseCost.pequeno,
    );
  });
});

describe('castigo por sobre-hype al lanzar (docs/17 E2)', () => {
  /** Lanza un juego deliberadamente flojo (reseña baja) con el hype dado. */
  function runBadRelease(hype: number): GameState {
    const started = startProject(createInitialState(SEED), CONCEPT);
    const p0 = started.projects[0];
    // Casi terminado, poca calidad y muchos bugs → reseña baja garantizada.
    const bad = {
      ...p0,
      phase: 3 as const,
      weeksSpent: 100,
      designPoints: 0.3,
      techPoints: 0.3,
      qaInvested: 0,
      bugDebt: 4,
      hype,
    };
    return tick({ ...started, projects: [bad] });
  }

  it('mucho hype + reseña baja: castiga la cola de ventas y la reputación', () => {
    const high = runBadRelease(0.95);
    const low = runBadRelease(0.15);
    const gHigh = high.releasedGames[0];
    const gLow = low.releasedGames[0];

    // El juego no cumple (reseña por debajo del listón) y el hype estaba en rojo.
    expect(gHigh.review).toBeLessThan(balance.market.hype.overHype.reviewBar);
    expect(gHigh.overHypeTailPenalty ?? 0).toBeGreaterThan(0);
    // Sin sobre-hype (manómetro en verde) no hay castigo a la cola.
    expect(gLow.overHypeTailPenalty ?? 0).toBe(0);

    // Los que se sienten estafados castigan: hardcore y comunidad caen más.
    expect(high.studio.reputation.hardcore).toBeLessThan(low.studio.reputation.hardcore);
    expect(high.studio.reputation.comunidad).toBeLessThan(low.studio.reputation.comunidad);
    // Queda traza legible en el historial (Pilar 2).
    expect(high.log.some((e) => /bombo|sobre-?hype|estafad/i.test(e.text))).toBe(true);
  });
});

describe('setFocus y toggleFeature — decisiones de desarrollo', () => {
  it('setFocus normaliza el reparto a suma 1', () => {
    const state = setFocus(withProject(), 1, { motor: 2, jugabilidad: 1, historia: 1 });
    const allocation = state.projects[0].focus[0];
    expect(allocation.motor).toBeCloseTo(0.5, 10);
    expect(allocation.jugabilidad).toBeCloseTo(0.25, 10);
    expect(allocation.historia).toBeCloseTo(0.25, 10);
  });

  it('toggleFeature añade la feature y su riesgo de bugs; quitarla lo devuelve', () => {
    let state = toggleFeature(withProject(), 'fisicasAvanzadas');
    expect(state.projects[0].chosenFeatureIds).toEqual(['fisicasAvanzadas']);
    expect(state.projects[0].bugDebt).toBeCloseTo(0.15, 10);

    state = toggleFeature(state, 'fisicasAvanzadas');
    expect(state.projects[0].chosenFeatureIds).toEqual([]);
    expect(state.projects[0].bugDebt).toBeCloseTo(0, 10);
  });

  it('las features alargan la fase de Producción', () => {
    const sinFeatures = withProject();
    expect(projectTotalWeeks(sinFeatures.projects[0])).toBe(6);
    const conCrafteo = toggleFeature(sinFeatures, 'sistemaCrafteo');
    expect(projectTotalWeeks(conCrafteo.projects[0])).toBe(8);
  });

  it('las features se cierran al salir de la fase de Concepto', () => {
    let state = withProject(); // pequeño: fase de Concepto = 2 semanas
    state = tick(state);
    state = tick(state); // entra en Producción
    expect(state.projects[0].phase).toBe(2);
    expect(() => toggleFeature(state, 'multijugadorLocal')).toThrow(/Concepto/);
  });
});

describe('desarrollo por fases hasta el lanzamiento (docs/02 §2 pasos 3 y 6)', () => {
  it('atraviesa Concepto → Producción → Pulido en las semanas correctas', () => {
    let state = withProject();
    expect(state.projects[0].phase).toBe(1);
    state = tick(state);
    expect(state.projects[0].phase).toBe(1);
    state = tick(state);
    expect(state.projects[0].phase).toBe(2);
    state = tick(tick(state));
    expect(state.projects[0].phase).toBe(3);
    expect(state.log.filter((e) => e.type === 'fase')).toHaveLength(2);
  });

  it('acumula deuda de bugs en Concepto/Producción y QA en Pulido', () => {
    let state = withProject();
    for (let i = 0; i < 4; i++) state = tick(state); // Concepto + Producción
    const tras4 = state.projects[0];
    expect(tras4.bugDebt).toBeCloseTo(4 * balance.development.baseBugsPerWeek, 10);
    expect(tras4.qaInvested).toBe(0);

    state = tick(state); // primera semana de Pulido (⅓ del esfuerzo en QA por defecto)
    const enPulido = state.projects[0];
    expect(enPulido.bugDebt).toBeCloseTo(tras4.bugDebt, 10); // en Pulido no crece
    expect(enPulido.qaInvested).toBeCloseTo(
      (1 / 3) * balance.development.qaReductionPerWeek,
      10,
    );
  });

  it('al terminar lanza el juego con reseña, desglose y veredicto', () => {
    const state = runUntilRelease(withProject());
    expect(state.projects).toHaveLength(0);
    expect(state.releasedGames).toHaveLength(1);

    const game = state.releasedGames[0];
    expect(game.name).toBe(CONCEPT.name);
    expect(game.releaseWeek).toBe(balance.time.startWeek + 5); // 6 semanas de desarrollo
    // Fase 3: la reseña ya no es Q a secas, es la media de los segmentos (docs/04 §5).
    expect(Object.keys(game.reviewsBySegment)).toHaveLength(4);
    expect(game.review).toBeGreaterThan(0);
    expect(game.hypeAtRelease).toBeGreaterThan(0);
    expect(game.quality).toBeGreaterThan(0);
    expect(game.quality).toBeLessThanOrEqual(100);
    expect(game.verdict).not.toBe('');
    expect(game.lines).toHaveLength(6);
    expect(game.lines.map((l) => l.factor)).toEqual([
      'fit',
      'balance',
      'features',
      'polish',
      'team',
      'innovation',
    ]);
    expect(state.log.some((e) => e.type === 'lanzamiento')).toBe(true);
  });

  it('repetir la misma combinación tema×género baja la innovación', () => {
    const primera = runUntilRelease(withProject());
    let segunda = startProject(primera, { ...CONCEPT, name: 'Mazmorras del Alba II' });
    segunda = runUntilRelease(segunda, 2);
    const [g1, g2] = segunda.releasedGames;
    expect(g2.breakdown.innovationMod).toBeLessThan(g1.breakdown.innovationMod);
  });

  it('es determinista: mismas acciones y semilla → mismo estado final', () => {
    const run = () => {
      let s = startProject(createInitialState(SEED), CONCEPT);
      s = toggleFeature(s, 'finalRamificado');
      s = setFocus(s, 1, { motor: 1, jugabilidad: 2, historia: 1 });
      for (let i = 0; i < 20; i++) s = tick(s);
      return s;
    };
    expect(run()).toEqual(run());
  });
});
