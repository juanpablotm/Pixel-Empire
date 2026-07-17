import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { Employee } from '../model/staff';
import { releasedGameCost, startProject, type ProjectConcept } from './projects';
import { fireEmployee, toggleAssignment } from './staff';
import { toggleResearchAssignment } from './research';
import {
  assignSquadToProject,
  createSquad,
  disbandSquad,
  getSquads,
  renameSquad,
  setSquadMembers,
  squadOf,
  squadsUnlocked,
  withdrawTeam,
} from './squads';

/**
 * Subequipos y retirada de equipo (docs/18 V5). Los subequipos son comodidad
 * de asignación: lo que se verifica es que asignar en bloque deja el mismo
 * estado que asignar uno por uno, y que retirar al equipo pausa el proyecto
 * mientras su gente descansa. Semilla fija (docs/08 §2).
 */

const SEED = 42;

const CONCEPT: ProjectConcept = {
  name: 'Mazmorras del Alba',
  themeId: 'fantasia',
  genreId: 'rpg',
  platformId: 'pcCasero',
  audience: 'hardcore',
  size: 'pequeno',
};

function makeEmployee(id: string, overrides: Partial<Employee> = {}): Employee {
  return {
    id,
    name: `Empleada ${id}`,
    avatarSeed: id,
    specialty: 'diseno',
    skills: { diseno: 60, tecnica: 50, arte: 40, audio: 30, marketing: 20 },
    traits: [],
    morale: 70,
    energy: 90,
    loyalty: 60,
    salary: 800,
    level: 3,
    xp: 0,
    founder: false,
    burnedOut: false,
    weeksLowEnergy: 0,
    ...overrides,
  };
}

/** Estudio (etapa 3): la etapa en la que llegan los subequipos, con 3 fichajes. */
function withStage3(
  extra: Employee[] = [makeEmployee('a'), makeEmployee('b'), makeEmployee('c')],
): GameState {
  const base = createInitialState(SEED);
  return {
    ...base,
    studio: { ...base.studio, capital: 500_000, scaleStage: 3 },
    staff: [...base.staff, ...extra],
  };
}

function projectOf(state: GameState) {
  const project = state.projects[0];
  if (!project) throw new Error('sin proyecto');
  return project;
}

describe('subequipos: modelo y ciclo de vida', () => {
  it('llegan con el Estudio (etapa 3): antes serían ruido', () => {
    const base = createInitialState(SEED);
    expect(balance.staff.squads.minStage).toBe(3);
    expect(squadsUnlocked(base)).toBe(false); // garaje
    expect(squadsUnlocked({ ...base, studio: { ...base.studio, scaleStage: 3 } })).toBe(true);
  });

  it('un save previo sin el campo se lee como lista vacía, sin romper', () => {
    const base = createInitialState(SEED);
    const legacy: GameState = { ...base, squads: undefined };
    expect(getSquads(legacy)).toEqual([]);
    expect(squadOf(legacy, 'fundador')).toBeNull();
  });

  it('crear, renombrar y disolver un subequipo', () => {
    let state = withStage3();
    state = createSquad(state, 'Motor gráfico', ['a', 'b']);
    const squad = getSquads(state)[0]!;
    expect(squad.name).toBe('Motor gráfico');
    expect(squad.memberIds).toEqual(['a', 'b']);

    state = renameSquad(state, squad.id, 'Equipo A');
    expect(getSquads(state)[0]!.name).toBe('Equipo A');

    state = disbandSquad(state, squad.id);
    expect(getSquads(state)).toEqual([]);
    // Disolver no despide ni desasigna: la plantilla sigue intacta.
    expect(state.staff.map((e) => e.id)).toContain('a');
  });

  it('rechaza nombres vacíos y subequipos con gente que no existe', () => {
    const state = withStage3();
    expect(() => createSquad(state, '   ')).toThrow();
    expect(() => createSquad(state, 'Fantasmas', ['no-existe'])).toThrow();
  });

  it('un empleado pertenece a un subequipo como mucho', () => {
    let state = withStage3();
    state = createSquad(state, 'Equipo A', ['a', 'b']);
    state = createSquad(state, 'Equipo B', ['c']);
    const [equipoA, equipoB] = getSquads(state);

    // 'b' se pasa al B: debe desaparecer del A.
    state = setSquadMembers(state, equipoB!.id, ['c', 'b']);
    expect(squadOf(state, 'b')?.id).toBe(equipoB!.id);
    expect(getSquads(state).find((s) => s.id === equipoA!.id)!.memberIds).toEqual(['a']);
  });

  it('despedir saca al empleado de su subequipo', () => {
    let state = withStage3();
    state = createSquad(state, 'Equipo A', ['a', 'b']);
    state = fireEmployee(state, 'a');
    expect(getSquads(state)[0]!.memberIds).toEqual(['b']);
    expect(squadOf(state, 'a')).toBeNull();
  });
});

describe('asignar un subequipo entero (docs/18 V5)', () => {
  it('pone a todos sus miembros en el proyecto de una sola acción', () => {
    let state = startProject(withStage3(), CONCEPT);
    // startProject arranca con todo el mundo libre: vaciamos para partir de cero.
    state = withdrawTeam(state, projectOf(state).id);
    expect(projectOf(state).assignedStaff).toEqual([]);

    state = createSquad(state, 'Equipo A', ['a', 'c']);
    state = assignSquadToProject(state, getSquads(state)[0]!.id, projectOf(state).id);

    expect(projectOf(state).assignedStaff).toEqual(['a', 'c']);
  });

  it('saca a sus miembros de cualquier otro proyecto y de I+D: nadie en dos sitios', () => {
    let state = startProject(withStage3(), CONCEPT);
    const first = projectOf(state).id;
    state = withdrawTeam(state, first);
    // Segundo proyecto en paralelo (la etapa 3 admite 2, docs/02 §4).
    state = startProject(state, { ...CONCEPT, name: 'Segundo' });
    const second = state.projects[1]!.id;
    state = withdrawTeam(state, second);

    // 'a' trabajando en el primero; 'b' en I+D.
    state = toggleAssignment(state, 'a', first);
    state = toggleResearchAssignment(state, 'b');
    expect(state.research.rdStaff).toContain('b');

    state = createSquad(state, 'Equipo A', ['a', 'b']);
    state = assignSquadToProject(state, getSquads(state)[0]!.id, second);

    expect(state.projects.find((p) => p.id === second)!.assignedStaff).toEqual(['a', 'b']);
    expect(state.projects.find((p) => p.id === first)!.assignedStaff).not.toContain('a');
    expect(state.research.rdStaff).not.toContain('b');
  });

  it('no duplica a quien ya estaba asignado', () => {
    let state = startProject(withStage3(), CONCEPT);
    const id = projectOf(state).id;
    state = withdrawTeam(state, id);
    state = toggleAssignment(state, 'a', id);

    state = createSquad(state, 'Equipo A', ['a', 'b']);
    state = assignSquadToProject(state, getSquads(state)[0]!.id, id);

    expect(projectOf(state).assignedStaff).toEqual(['a', 'b']);
  });

  it('asignar en bloque deja el mismo equipo que asignar uno por uno', () => {
    const base = startProject(withStage3(), CONCEPT);
    const id = projectOf(base).id;
    const empty = withdrawTeam(base, id);

    const oneByOne = ['a', 'b', 'c'].reduce((s, emp) => toggleAssignment(s, emp, id), empty);
    let bySquad = createSquad(empty, 'Equipo A', ['a', 'b', 'c']);
    bySquad = assignSquadToProject(bySquad, getSquads(bySquad)[0]!.id, id);

    // Los subequipos son comodidad: el equipo real que ve la simulación es igual.
    expect(projectOf(bySquad).assignedStaff).toEqual(projectOf(oneByOne).assignedStaff);
  });

  it('un subequipo vacío no se puede asignar', () => {
    let state = startProject(withStage3(), CONCEPT);
    state = createSquad(state, 'Vacío');
    expect(() => assignSquadToProject(state, getSquads(state)[0]!.id, projectOf(state).id)).toThrow();
  });
});

describe('retirar el equipo entero: descanso y pausa (docs/18 V5)', () => {
  it('pausa el proyecto y sus miembros recuperan energía con el tiempo', () => {
    let state = startProject(withStage3(), CONCEPT);
    // Equipo cansado tras el crunch: el caso que motiva la función.
    state = {
      ...state,
      staff: state.staff.map((e) => ({ ...e, energy: 30 })),
      projects: [{ ...projectOf(state), crunch: true }],
    };
    const weeksBefore = projectOf(state).weeksSpent;

    state = withdrawTeam(state, projectOf(state).id);
    expect(projectOf(state).assignedStaff).toEqual([]);
    // Sin nadie a quien crunchear, el crunch se apaga (no revive al volver).
    expect(projectOf(state).crunch).toBe(false);

    for (let i = 0; i < 4; i += 1) state = tick(state);

    // El proyecto NO avanza: nadie trabaja (pausa, no cancelación).
    expect(projectOf(state).weeksSpent).toBe(weeksBefore);
    expect(state.projects).toHaveLength(1);
    // Y la gente descansa: energía arriba (docs/05 §4).
    for (const e of state.staff) {
      expect(e.energy).toBeGreaterThan(30);
    }
    expect(state.staff[0]!.energy).toBe(30 + 4 * balance.staff.work.restEnergyRecovery);
  });

  it('al reasignar, el proyecto continúa donde estaba', () => {
    let state = startProject(withStage3(), CONCEPT);
    state = tick(state);
    const weeksWorked = projectOf(state).weeksSpent;
    expect(weeksWorked).toBeGreaterThan(0);

    state = withdrawTeam(state, projectOf(state).id);
    for (let i = 0; i < 3; i += 1) state = tick(state);
    expect(projectOf(state).weeksSpent).toBe(weeksWorked); // congelado

    state = toggleAssignment(state, 'a', projectOf(state).id);
    state = tick(state);
    // Continúa desde donde estaba, no desde cero.
    expect(projectOf(state).weeksSpent).toBeGreaterThan(weeksWorked);
  });

  it('las semanas en pausa no se cobran como desarrollo en el P&L', () => {
    let state = startProject(withStage3(), CONCEPT);
    const id = projectOf(state).id;
    state = tick(state); // una semana de trabajo real
    state = withdrawTeam(state, id);
    for (let i = 0; i < 5; i += 1) state = tick(state); // cinco en pausa

    const project = projectOf(state);
    expect(project.pausedWeeks).toBe(5);

    // Descansar no infla el "costó" del juego: nadie trabajó esas semanas.
    const withPause = releasedGameCost(project, state.week);
    const asIfNeverPaused = releasedGameCost({ ...project, pausedWeeks: 0 }, state.week);
    expect(asIfNeverPaused - withPause).toBe(5 * balance.economy.devCostPerPersonWeek);
  });

  it('retirar un equipo ya vacío no cambia nada', () => {
    const state = startProject(withStage3(), CONCEPT);
    const empty = withdrawTeam(state, projectOf(state).id);
    expect(withdrawTeam(empty, projectOf(empty).id)).toBe(empty);
  });
});
