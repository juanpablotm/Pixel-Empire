import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { expandBlockedLabels } from '../../data/staffTexts';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState, ScaleStage } from '../model/gameState';
import type { Employee } from '../model/staff';
import { weeklyFixedCosts } from './economy';
import { advancePolicies, salaryCostFactor, setPolicies } from './policies';
import { sizeBlockReason, startProject, projectCap } from './projects';
import {
  expandBlockReason,
  expandStudio,
  scaleStageInfo,
  setCrunch,
  staffCap,
  toggleAssignment,
} from './staff';

/**
 * Las 5 etapas de escala (docs/02 §4, docs/18 V4): el avance SE COMPRA
 * (cumplir el requisito solo habilita; ampliar cuesta), los tamaños de
 * proyecto gatean por etapa (incluido el nuevo "Muy grande"), el overhead
 * fijo crece con cada etapa y el multi-proyecto/las políticas siguen
 * funcionando. El tick sigue siendo puro con varios equipos en paralelo.
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

/** Estudio en una etapa dada con plantilla y capital a medida. */
function atStage(stage: ScaleStage, staffCount: number, capital = 500_000): GameState {
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

const scale = balance.staff.scale;

describe('el avance se compra (docs/18 V4-c): no hay ascenso sin pagar', () => {
  it('cumplir el umbral NO sube la etapa por muchos ticks que pasen', () => {
    const req = scale.requirementsByStage[2];
    let state = atStage(1, 1, req.capital + 5_000);
    for (let i = 0; i < 6; i++) state = tick(state);
    expect(state.studio.scaleStage).toBe(1);
  });

  it('expandStudio cobra el desembolso y sube UNA etapa (sin saltos)', () => {
    const rich = atStage(1, 1, 100_000_000); // caja para cualquier etapa
    const after = expandStudio(rich);
    expect(after.studio.scaleStage).toBe(2); // solo a la inmediata siguiente
    expect(after.studio.capital).toBe(100_000_000 - scale.upgradeCostByStage[2]);
    expect(after.log.some((e) => e.type === 'estudio')).toBe(true);
    // El pool de candidatos llega con la etapa nueva.
    expect(after.candidates).toHaveLength(scale.poolSizeByStage[2]);
  });

  it('sin el requisito, la compra está bloqueada con su motivo (capital o plantilla)', () => {
    const req3 = scale.requirementsByStage[3];
    // Capital corto: bloquea por capital.
    const poor = atStage(2, req3.staff, req3.capital - 1);
    expect(expandBlockReason(poor)).toContain('💰');
    expect(() => expandStudio(poor)).toThrow(/💰/);
    // Plantilla corta: bloquea por plantilla.
    const lonely = atStage(2, req3.staff - 1, req3.capital * 2);
    expect(expandBlockReason(lonely)).toBe(expandBlockedLabels.staff(req3.staff));
    expect(() => expandStudio(lonely)).toThrow(/plantilla/);
    // Con todo: se puede.
    expect(expandBlockReason(atStage(2, req3.staff, req3.capital))).toBeNull();
  });

  it('la Corporación es la cima: no hay más etapas que comprar', () => {
    const corp = atStage(5, 20, 100_000_000);
    expect(expandBlockReason(corp)).toBe(expandBlockedLabels.maxStage);
    expect(() => expandStudio(corp)).toThrow();
  });

  it('el requisito de capital siempre supera el coste: comprar nunca deja la caja en rojo', () => {
    for (const stage of [2, 3, 4, 5] as const) {
      expect(scale.requirementsByStage[stage].capital).toBeGreaterThan(
        scale.upgradeCostByStage[stage],
      );
    }
  });
});

/**
 * La cronología de escala (docs/17 U1) enseña requisitos y coste: tienen que
 * ser los que de verdad aplica la compra, no una copia que se desincronice.
 */
describe('scaleStageInfo: lo que se muestra es lo que se aplica', () => {
  it('el garaje es el punto de partida: ni requisito ni coste', () => {
    expect(scaleStageInfo(1).requires).toBeNull();
    expect(scaleStageInfo(1).upgradeCost).toBeNull();
  });

  it('con lo que pide cada etapa se compra; un pelo por debajo, no', () => {
    for (const stage of [2, 3, 4, 5] as const) {
      const info = scaleStageInfo(stage);
      expect(info.requires).toEqual(scale.requirementsByStage[stage]);
      expect(info.upgradeCost).toBe(scale.upgradeCostByStage[stage]);
      const from = (stage - 1) as ScaleStage;
      const staffCount = Math.max(1, scale.requirementsByStage[stage].staff);

      const ready = atStage(from, staffCount, scale.requirementsByStage[stage].capital);
      expect(expandStudio(ready).studio.scaleStage).toBe(stage);
      const short = atStage(from, staffCount, scale.requirementsByStage[stage].capital - 1);
      expect(expandBlockReason(short)).not.toBeNull();
    }
  });

  it('los topes que anuncia son los que aplican el aforo y el multi-proyecto', () => {
    for (const stage of [1, 2, 3, 4, 5] as const) {
      const info = scaleStageInfo(stage);
      expect(info.staffCap).toBe(staffCap(atStage(stage, 1)));
      expect(info.projectCap).toBe(projectCap(atStage(stage, 1)));
    }
  });
});

describe('los tamaños gatean por etapa y plantilla (docs/17 E1 + docs/18 V4-b)', () => {
  it('el "Muy grande" exige Estudio grande (etapa 4) y 15 en plantilla', () => {
    const gate = balance.development.sizeGate.muyGrande;
    // En la etapa 3, bloqueado por etapa aunque sobre gente.
    expect(sizeBlockReason(atStage(3, gate.minStaff), 'muyGrande')).toMatch(/Estudio grande/);
    // En la etapa 4 con plantilla corta, bloqueado por plantilla.
    expect(sizeBlockReason(atStage(4, gate.minStaff - 1), 'muyGrande')).toMatch(/plantilla/);
    // Con etapa y plantilla, se puede concebir de verdad.
    const ready = atStage(4, gate.minStaff);
    expect(sizeBlockReason(ready, 'muyGrande')).toBeNull();
    const started = startProject(ready, { ...CONCEPT, name: 'Épica', size: 'muyGrande' });
    expect(started.projects[0].size).toBe('muyGrande');
    // Y se paga su coste base al iniciar (más la licencia de la plataforma).
    expect(started.studio.capital).toBeLessThanOrEqual(
      ready.studio.capital - balance.economy.sizeBaseCost.muyGrande,
    );
  });

  it('el AAA es cosa de Corporaciones: etapa 5 y una organización de 40', () => {
    const gate = balance.development.sizeGate.aaa;
    expect(gate.minStage).toBe(5);
    expect(sizeBlockReason(atStage(4, 25), 'aaa')).toMatch(/Corporación/);
    expect(sizeBlockReason(atStage(5, gate.minStaff - 1), 'aaa')).toMatch(/plantilla/);
    expect(sizeBlockReason(atStage(5, gate.minStaff), 'aaa')).toBeNull();
  });
});

describe('el overhead fijo crece con la etapa (docs/18 V4-d)', () => {
  it('a igualdad de plantilla, cada etapa quema más por semana', () => {
    const costs = ([1, 2, 3, 4, 5] as const).map((stage) =>
      weeklyFixedCosts(atStage(stage, 3)),
    );
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThan(costs[i - 1]);
    }
  });

  it('una Corporación quema MUCHO: sostenerla exige seguir sacando éxitos', () => {
    // Solo la infraestructura de la etapa 5 (sin nóminas) ya supera 1,5M/año:
    // el "punto dulce" de riesgo cero no existe (docs/18 V4-d).
    expect(balance.economy.upkeepExtraByStage[5] * 52).toBeGreaterThan(1_500_000);
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

  it('en el Estudio (etapa 3) conviven varios proyectos con equipos separados', () => {
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
  it('las políticas llegan con el Estudio grande (etapa 4)', () => {
    expect(() => setPolicies(atStage(3, 5), { antiCrunch: true })).toThrow(/Estudio grande/);
    const state = setPolicies(atStage(4, 10), { antiCrunch: true });
    expect(state.policies.antiCrunch).toBe(true);
  });

  it('anti-crunch: prohíbe activarlo y apaga el que hubiera', () => {
    let state = atStage(4, 10);
    state = startProject(state, { ...CONCEPT, name: 'Alfa' });
    state = setCrunch(state, true);
    state = setPolicies(state, { antiCrunch: true });
    expect(() => setCrunch(state, true)).toThrow(/anti-crunch/);
    const after = advancePolicies(state);
    expect(after.projects[0].crunch).toBe(false);
  });

  it('la política salarial mueve el coste y el ánimo en direcciones opuestas', () => {
    const base = atStage(5, 10);
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
    let state = setPolicies(atStage(5, 6), { autoTraining: true });
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
    let state = setPolicies(atStage(5, 6), { autoBonus: true });
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
      ...atStage(3, 3),
      policies: { salary: 'generosa' as const, antiCrunch: true, autoTraining: true, autoBonus: true },
    };
    expect(salaryCostFactor(small)).toBe(1);
    expect(advancePolicies(small)).toBe(small);
  });
});
