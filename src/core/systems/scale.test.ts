import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { Employee } from '../model/staff';
import { weeklyFixedCosts } from './economy';
import { advancePolicies, salaryCostFactor, setPolicies } from './policies';
import { startProject, projectCap } from './projects';
import { advanceScale, scaleStageInfo, setCrunch, staffCap, toggleAssignment } from './staff';

/**
 * Las 4 etapas de escala (docs/02 §4): hitos de transición, multi-proyecto
 * desde el estudio consolidado y gestión por políticas en la escala grande
 * (docs/10 §14). El tick sigue siendo puro con varios equipos en paralelo.
 */

const SEED = 42;

function makeEmployee(id: string, overrides: Partial<Employee> = {}): Employee {
  return {
    id,
    name: `Empleado ${id}`,
    avatarSeed: id,
    specialty: 'tecnica',
    skills: { diseno: 40, tecnica: 60, arte: 30, audio: 30, marketing: 20 },
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

/** Estudio en una etapa dada con plantilla y capital de sobra. */
function atStage(stage: 1 | 2 | 3 | 4, staffCount: number, capital = 500_000): GameState {
  const base = createInitialState(SEED);
  const extra = Array.from({ length: staffCount - 1 }, (_, i) => makeEmployee(`emp-${i + 1}`));
  return {
    ...base,
    studio: { ...base.studio, scaleStage: stage, capital },
    staff: [...base.staff, ...extra],
  };
}

const CONCEPT = {
  themeId: 'fantasia',
  genreId: 'rpg',
  platformId: 'pcCasero',
  audience: 'amplio' as const,
  size: 'pequeno' as const,
};

describe('hitos de transición (docs/02 §4)', () => {
  it('estudio pequeño → consolidado por capital y plantilla', () => {
    const scale = balance.staff.scale;
    const ready = atStage(2, scale.stage3.staff, scale.stage3.capital);
    expect(advanceScale(ready).studio.scaleStage).toBe(3);
    // Sin plantilla suficiente, el capital no basta (hitos combinados).
    const rich = atStage(2, scale.stage3.staff - 1, scale.stage3.capital * 2);
    expect(advanceScale(rich).studio.scaleStage).toBe(2);
  });

  it('consolidado → CORPORACIÓN, el gran momento del magnate', () => {
    const scale = balance.staff.scale;
    const ready = atStage(3, scale.stage4.staff, scale.stage4.capital);
    const next = advanceScale(ready);
    expect(next.studio.scaleStage).toBe(4);
    expect(next.log.some((e) => e.type === 'estudio' && e.text.includes('CORPORACIÓN'))).toBe(
      true,
    );
  });

  it('el pool de candidatos crece con la etapa', () => {
    const scale = balance.staff.scale;
    const corp = advanceScale(atStage(3, scale.stage4.staff, scale.stage4.capital));
    expect(corp.candidates.length).toBe(scale.poolSizeByStage[4]);
  });
});

/**
 * La cronología de escala (docs/17 U1) enseña requisitos: tienen que ser los
 * que de verdad hacen subir de etapa, no una copia que se desincronice.
 */
describe('scaleStageInfo: los requisitos que se muestran son los que se aplican', () => {
  it('el garaje es el punto de partida: no tiene requisito', () => {
    expect(scaleStageInfo(1).requires).toBeNull();
  });

  it('con lo que pide cada etapa se sube; un pelo por debajo, no', () => {
    for (const stage of [2, 3, 4] as const) {
      const req = scaleStageInfo(stage).requires;
      expect(req).not.toBeNull();
      if (req === null) continue;
      const from = (stage - 1) as 1 | 2 | 3;
      const staffCount = Math.max(1, req.staff);

      expect(advanceScale(atStage(from, staffCount, req.capital)).studio.scaleStage).toBe(stage);
      expect(advanceScale(atStage(from, staffCount, req.capital - 1)).studio.scaleStage).toBe(
        from,
      );
    }
  });

  it('los topes que anuncia son los que aplican el aforo y el multi-proyecto', () => {
    for (const stage of [1, 2, 3, 4] as const) {
      const info = scaleStageInfo(stage);
      expect(info.staffCap).toBe(staffCap(atStage(stage, 1)));
      expect(info.projectCap).toBe(projectCap(atStage(stage, 1)));
    }
  });
});

describe('multi-proyecto (docs/02 §4: varios equipos en paralelo)', () => {
  it('el aforo de proyectos depende de la etapa', () => {
    expect(projectCap(atStage(1, 1))).toBe(1);
    expect(projectCap(atStage(3, 8))).toBe(balance.staff.scale.projectCapByStage[3]);
    let state = startProject(atStage(1, 1, 20_000), { ...CONCEPT, name: 'Único' });
    expect(() => startProject(state, { ...CONCEPT, name: 'Segundo' })).toThrow(
      /Ya hay un proyecto/,
    );
  });

  it('en el estudio consolidado conviven varios proyectos con equipos separados', () => {
    let state = atStage(3, 5);
    state = startProject(state, { ...CONCEPT, name: 'Alfa' });
    // El primer proyecto se lleva a todos los libres; se libera gente para Beta.
    state = toggleAssignment(state, 'emp-1', state.projects[0].id);
    state = toggleAssignment(state, 'emp-2', state.projects[0].id);
    state = startProject(state, { ...CONCEPT, name: 'Beta', themeId: 'espacio' });
    const [alfa, beta] = state.projects;
    // El equipo de Beta son los que quedaron libres: sin robar a Alfa.
    expect(beta.assignedStaff).toEqual(['emp-1', 'emp-2']);
    expect(alfa.assignedStaff).not.toContain('emp-1');

    // Ambos avanzan en el mismo tick, cada uno con su equipo.
    const after = tick(state);
    expect(after.projects[0].weeksSpent).toBeGreaterThan(0);
    expect(after.projects[1].weeksSpent).toBeGreaterThan(0);
  });

  it('asignar a alguien a otro proyecto lo saca del anterior (exclusividad)', () => {
    let state = atStage(3, 5);
    state = startProject(state, { ...CONCEPT, name: 'Alfa' });
    state = startProject(state, { ...CONCEPT, name: 'Beta', themeId: 'espacio' });
    const [alfa, beta] = state.projects;
    expect(alfa.assignedStaff).toContain('fundador');
    state = toggleAssignment(state, 'fundador', beta.id);
    expect(state.projects[0].assignedStaff).not.toContain('fundador');
    expect(state.projects[1].assignedStaff).toContain('fundador');
  });

  it('el crunch es por proyecto', () => {
    let state = atStage(3, 5);
    state = startProject(state, { ...CONCEPT, name: 'Alfa' });
    state = startProject(state, { ...CONCEPT, name: 'Beta', themeId: 'espacio' });
    state = setCrunch(state, true, state.projects[1].id);
    expect(state.projects[0].crunch).toBe(false);
    expect(state.projects[1].crunch).toBe(true);
  });

  it('al terminar un proyecto solo sale él del tablero', () => {
    let state = atStage(3, 5);
    state = startProject(state, { ...CONCEPT, name: 'Corto' });
    state = toggleAssignment(state, 'emp-1', state.projects[0].id);
    state = startProject(state, { ...CONCEPT, name: 'Largo', themeId: 'espacio', size: 'mediano' });
    const largoId = state.projects[1].id;
    // Adelantar el corto casi hasta el final para que lance antes.
    state = {
      ...state,
      projects: state.projects.map((p, i) => (i === 0 ? { ...p, weeksSpent: 5.9, phase: 3 } : p)),
    };
    const after = tick(state);
    expect(after.releasedGames.some((g) => g.name === 'Corto')).toBe(true);
    expect(after.projects.map((p) => p.id)).toEqual([largoId]);
  });

  it('tick(state) sigue siendo puro y determinista con varios proyectos', () => {
    let state = atStage(3, 5);
    state = startProject(state, { ...CONCEPT, name: 'Alfa' });
    state = toggleAssignment(state, 'emp-1', state.projects[0].id);
    state = startProject(state, { ...CONCEPT, name: 'Beta', themeId: 'espacio' });
    const frozen = Object.freeze(state);
    const before = structuredClone(state);
    const next = tick(frozen);
    expect(state).toEqual(before); // sin mutaciones
    expect(next).not.toBe(state);
    expect(tick(state)).toEqual(next); // determinista
  });
});

describe('gestión por políticas (docs/02 §4 y docs/10 §14)', () => {
  it('las políticas llegan con la escala grande', () => {
    expect(() => setPolicies(atStage(2, 3), { antiCrunch: true })).toThrow(/consolidado/);
    const state = setPolicies(atStage(3, 5), { antiCrunch: true });
    expect(state.policies.antiCrunch).toBe(true);
  });

  it('anti-crunch: prohíbe activarlo y apaga el que hubiera', () => {
    let state = atStage(3, 5);
    state = startProject(state, { ...CONCEPT, name: 'Alfa' });
    state = setCrunch(state, true);
    state = setPolicies(state, { antiCrunch: true });
    expect(() => setCrunch(state, true)).toThrow(/anti-crunch/);
    const after = advancePolicies(state);
    expect(after.projects[0].crunch).toBe(false);
  });

  it('la política salarial mueve el coste y el ánimo en direcciones opuestas', () => {
    const base = atStage(4, 10);
    const generosa = setPolicies(base, { salary: 'generosa' });
    const austera = setPolicies(base, { salary: 'austera' });
    expect(salaryCostFactor(generosa)).toBeGreaterThan(1);
    expect(salaryCostFactor(austera)).toBeLessThan(1);
    expect(weeklyFixedCosts(generosa)).toBeGreaterThan(weeklyFixedCosts(base));
    expect(weeklyFixedCosts(austera)).toBeLessThan(weeklyFixedCosts(base));

    const upbeat = advancePolicies(generosa);
    const gloomy = advancePolicies(austera);
    const morale = (s: GameState) => s.staff.reduce((sum, e) => sum + e.morale, 0);
    expect(morale(upbeat)).toBeGreaterThan(morale(base));
    expect(morale(gloomy)).toBeLessThan(morale(base));
  });

  it('formación automática: cada intervalo forma al más flojo pagando el coste', () => {
    let state = setPolicies(atStage(4, 6), { autoTraining: true });
    const interval = balance.policies.autoTraining.intervalWeeks;
    state = { ...state, week: interval }; // semana de formación
    const weakest = [...state.staff].sort(
      (a, b) => a.skills[a.specialty] - b.skills[b.specialty],
    )[0];
    const before = weakest.skills[weakest.specialty];
    const after = advancePolicies(state);
    const trained = after.staff.find((e) => e.id === weakest.id)!;
    expect(trained.skills[trained.specialty]).toBe(before + balance.staff.training.skillGain);
    expect(after.studio.capital).toBe(state.studio.capital - balance.staff.training.cost);
  });

  it('bonus automáticos: paga a quien tenga la moral por los suelos', () => {
    let state = setPolicies(atStage(4, 6), { autoBonus: true });
    state = {
      ...state,
      staff: state.staff.map((e) =>
        e.id === 'emp-1' ? { ...e, morale: 20 } : e,
      ),
    };
    const after = advancePolicies(state);
    const paid = after.staff.find((e) => e.id === 'emp-1')!;
    expect(paid.morale).toBeGreaterThan(20);
    expect(after.studio.capital).toBeLessThan(state.studio.capital);
  });

  it('en etapas tempranas las políticas no hacen nada aunque estén en el estado', () => {
    const small = {
      ...atStage(2, 3),
      policies: { salary: 'generosa' as const, antiCrunch: true, autoTraining: true, autoBonus: true },
    };
    expect(salaryCostFactor(small)).toBe(1);
    expect(advancePolicies(small)).toBe(small);
  });
});
