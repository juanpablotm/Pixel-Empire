import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { makeRng } from '../engine/rng';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { Project } from '../model/project';
import type { Employee } from '../model/staff';
import { startProject, type ProjectConcept } from './projects';
import { computeQuality } from './quality';
import {
  advanceStaff,
  applyReleaseMorale,
  computeSynergy,
  computeTeamFactor,
  computeTeamOutput,
  expandStudio,
  fireEmployee,
  generateCandidates,
  hireBlockReason,
  hireCandidate,
  hiringCost,
  motivateEmployee,
  setCrunch,
  staffCap,
  toggleAssignment,
  trainEmployee,
} from './staff';
import { hireBlockedLabels } from '../../data/staffTexts';

/**
 * Sistema de personal (docs/05): teamFactor real (docs/03 factor E), química
 * cerrada de docs/12 §5, acciones del jugador, crunch como deuda, burnout,
 * renuncias, pool de candidatos y transición de escala. Semilla fija.
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

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-test',
    name: 'Empleada de prueba',
    avatarSeed: 'test',
    specialty: 'diseno',
    skills: { diseno: 60, tecnica: 40, arte: 30, audio: 30, marketing: 20 },
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

/** Estudio pequeño (etapa 2) con el fundador + los empleados dados. */
function withStage2(extraStaff: Employee[] = [], capital = 50_000): GameState {
  const base = createInitialState(SEED);
  return {
    ...base,
    studio: { ...base.studio, capital, scaleStage: 2 },
    staff: [...base.staff, ...extraStaff],
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proyecto-test',
    name: 'Juego de prueba',
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
    chosenFeatureIds: [],
    assignedStaff: ['fundador'],
    crunch: false,
    hype: 0,
    weeksSpent: 6,
    designPoints: 6.5,
    techPoints: 3.5,
    qaInvested: 0.2,
    bugDebt: 0.1,
    ...overrides,
  };
}

function runTicks(state: GameState, n: number): GameState {
  let s = state;
  for (let i = 0; i < n; i++) s = tick(s);
  return s;
}

function runUntilRelease(state: GameState, maxTicks = 80): GameState {
  let s = state;
  for (let i = 0; i < maxTicks && s.releasedGames.length === 0; i++) s = tick(s);
  return s;
}

const avg = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;

describe('el fundador y el estado inicial (docs/02 §4: garaje)', () => {
  it('la partida arranca contigo como único empleado, sin salario', () => {
    const state = createInitialState(SEED);
    expect(state.staff).toHaveLength(1);
    const founder = state.staff[0];
    expect(founder.founder).toBe(true);
    expect(founder.salary).toBe(0);
    expect(founder.traits.length).toBeGreaterThanOrEqual(1);
    expect(state.candidates).toEqual([]);
    expect(state.studio.scaleStage).toBe(1);
  });

  it('el fundador es determinista por semilla', () => {
    expect(createInitialState(7).staff).toEqual(createInitialState(7).staff);
    expect(createInitialState(7).staff[0].avatarSeed).not.toBe(
      createInitialState(8).staff[0].avatarSeed,
    );
  });
});

describe('computeTeamFactor — Factor E real (docs/03: competencia × moral × sinergia)', () => {
  it('fundador en solitario sobre un RPG: valor calculado a mano', () => {
    const founder = createInitialState(SEED).staff[0];
    const result = computeTeamFactor([founder], 'rpg');
    // skills ponderadas: 0.45·70 + 0.25·55 + 0.2·45 + 0.1·40 = 58.25 → 0.5825
    expect(result.competence01).toBeCloseTo(0.5825, 10);
    // competencia 0.5 + 0.75·0.5825 = 0.936875 · moral (75) 1.0 · sinergia 1.0
    expect(result.competenceFactor).toBeCloseTo(0.936875, 10);
    expect(result.moraleFactor).toBeCloseTo(1.0, 10);
    expect(result.synergyFactor).toBe(1);
    expect(result.teamFactor).toBeCloseTo(0.936875, 10);
  });

  it('respeta el rango 0.5–1.3 [DECIDIDO, docs/12 §3]', () => {
    const genius = makeEmployee({
      skills: { diseno: 100, tecnica: 100, arte: 100, audio: 100, marketing: 100 },
      morale: 100,
    });
    expect(computeTeamFactor([genius], 'rpg').teamFactor).toBe(balance.staff.teamFactor.max);

    const wreck = makeEmployee({
      skills: { diseno: 0, tecnica: 0, arte: 0, audio: 0, marketing: 0 },
      morale: 0,
    });
    expect(computeTeamFactor([wreck], 'rpg').teamFactor).toBe(balance.staff.teamFactor.min);
  });

  it('el burnout hunde la competencia (penalización fuerte, docs/05 §4)', () => {
    const fresh = makeEmployee();
    const burned = makeEmployee({ burnedOut: true });
    expect(computeTeamFactor([burned], 'rpg').competence01).toBeCloseTo(
      computeTeamFactor([fresh], 'rpg').competence01 * balance.staff.burnout.competencePenalty,
      10,
    );
  });

  it('el equipo influye de forma legible en la calidad (CA docs/11 Fase 2)', () => {
    const happy = computeTeamFactor([makeEmployee({ morale: 95 })], 'rpg');
    const miserable = computeTeamFactor(
      [makeEmployee({ morale: 15, burnedOut: true })],
      'rpg',
    );
    expect(happy.teamFactor).toBeGreaterThan(miserable.teamFactor);

    const project = makeProject();
    const ctx = { era: 'E1' as const, comboRepeats: 0 };
    const qHappy = computeQuality(project, { ...ctx, teamFactor: happy.teamFactor }).q;
    const qMiserable = computeQuality(project, { ...ctx, teamFactor: miserable.teamFactor }).q;
    expect(qHappy).toBeGreaterThan(qMiserable);
  });
});

describe('química de equipo v1 [DECIDIDO, docs/12 §5]', () => {
  const senior = (overrides: Partial<Employee>) => makeEmployee({ level: 5, ...overrides });

  it('Mentor + junior es un par afín: 1 + 0.03', () => {
    const mentor = senior({ id: 'mentor', traits: ['mentor'] });
    const junior = makeEmployee({ id: 'junior', level: 1 });
    const { synergyFactor, affinities } = computeSynergy([mentor, junior], 'rpg');
    expect(affinities).toBe(1);
    expect(synergyFactor).toBeCloseTo(1.03, 10);
  });

  it('dos Estrellas mediáticas chocan: 1 − 0.04', () => {
    const a = senior({ id: 'a', traits: ['estrellaMediatica'] });
    const b = senior({ id: 'b', traits: ['estrellaMediatica'] });
    const { synergyFactor, conflicts } = computeSynergy([a, b], 'rpg');
    expect(conflicts).toBe(1);
    expect(synergyFactor).toBeCloseTo(0.96, 10);
  });

  it('especialidades complementarias para el género son afines', () => {
    const designer = senior({ id: 'd', specialty: 'diseno' });
    const coder = senior({ id: 't', specialty: 'tecnica' });
    expect(computeSynergy([designer, coder], 'rpg').synergyFactor).toBeCloseTo(1.03, 10);
  });

  it('el Llanero solitario penaliza solo en equipos grandes (docs/05 §5)', () => {
    const solo = senior({ id: 'solo', traits: ['llaneroSolitario'] });
    const mates = [1, 2, 3].map((i) => senior({ id: `m${i}` }));

    // Equipo de 3: sin fricción.
    expect(computeSynergy([solo, mates[0], mates[1]], 'rpg').conflicts).toBe(0);
    // Equipo de 4: cada par con el solitario es un conflicto (3 pares).
    const big = computeSynergy([solo, ...mates], 'rpg');
    expect(big.conflicts).toBe(3);
    expect(big.synergyFactor).toBeCloseTo(1 - 0.04 * 3, 10);
  });

  it('la sinergia queda dentro de [0.8, 1.2]', () => {
    const divas = [1, 2, 3, 4, 5, 6].map((i) =>
      senior({ id: `diva${i}`, traits: ['estrellaMediatica'] }),
    );
    expect(computeSynergy(divas, 'rpg').synergyFactor).toBe(balance.staff.chemistry.min);
  });
});

describe('pool de candidatos (docs/05 §6)', () => {
  it('es determinista: misma semilla y semana → mismo pool', () => {
    expect(generateCandidates(SEED, 5)).toEqual(generateCandidates(SEED, 5));
    expect(generateCandidates(SEED, 5)).not.toEqual(generateCandidates(SEED, 6));
  });

  it('los candidatos cumplen el esquema: 1–3 rasgos, skills 0–100, salario por tramo [DECIDIDO]', () => {
    const salaries = Object.values(balance.staff.salaries) as number[];
    for (const week of [1, 12, 24, 36]) {
      for (const c of generateCandidates(SEED, week)) {
        expect(c.traits.length).toBeGreaterThanOrEqual(1);
        expect(c.traits.length).toBeLessThanOrEqual(3);
        expect(new Set(c.traits).size).toBe(c.traits.length);
        for (const value of Object.values(c.skills)) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        }
        expect(salaries).toContain(c.salary);
        expect(balance.staff.candidates.specialties).toContain(c.specialty);
        expect(c.founder).toBe(false);
      }
    }
  });
});

describe('acciones del jugador (docs/05 §6)', () => {
  it('contratar: paga el coste, suma a plantilla y saca al candidato del pool', () => {
    const pool = generateCandidates(SEED, 1);
    const state: GameState = { ...withStage2(), candidates: pool };
    const hired = hireCandidate(state, pool[0].id);

    expect(hired.staff).toHaveLength(2);
    expect(hired.candidates).toHaveLength(pool.length - 1);
    expect(hired.studio.capital).toBe(state.studio.capital - hiringCost(pool[0]));
    expect(hiringCost(pool[0])).toBe(balance.staff.hiringCostWeeks * pool[0].salary);
    expect(hired.log.some((e) => e.type === 'staff')).toBe(true);
  });

  it('en el garaje no se contrata; con la oficina llena tampoco', () => {
    const pool = generateCandidates(SEED, 1);
    const garage: GameState = { ...createInitialState(SEED), candidates: pool };
    expect(() => hireCandidate(garage, pool[0].id)).toThrow(/garaje/);

    const sevenMore = [1, 2, 3, 4, 5, 6, 7].map((i) => makeEmployee({ id: `e${i}` }));
    const full: GameState = { ...withStage2(sevenMore), candidates: pool };
    expect(full.staff).toHaveLength(8);
    expect(() => hireCandidate(full, pool[0].id)).toThrow(/llena/);
  });

  it('aforo (docs/17 B1): hireBlockReason da el motivo visible y corta al llegar al tope', () => {
    const pool = generateCandidates(SEED, 1);
    const cap = staffCap(withStage2()); // 8 en el estudio pequeño

    // Con hueco: sin motivo de bloqueo y se puede contratar.
    const room: GameState = { ...withStage2(), candidates: pool };
    expect(room.staff.length).toBeLessThan(cap);
    expect(hireBlockReason(room)).toBeNull();
    expect(() => hireCandidate(room, pool[0].id)).not.toThrow();

    // Justo en el aforo: el botón se deshabilita con «Oficina llena — mejórala».
    const fillers = Array.from({ length: cap - 1 }, (_, i) => makeEmployee({ id: `full-${i}` }));
    const atCap: GameState = { ...withStage2(fillers), candidates: pool };
    expect(atCap.staff).toHaveLength(cap);
    expect(hireBlockReason(atCap)).toBe(hireBlockedLabels.officeFull);
    expect(() => hireCandidate(atCap, pool[0].id)).toThrow(hireBlockedLabels.officeFull);

    // El garaje tiene su propio motivo (aún no hay oficina).
    const garage: GameState = { ...createInitialState(SEED), candidates: pool };
    expect(hireBlockReason(garage)).toBe(hireBlockedLabels.garage);
  });

  it('partida antigua por encima del aforo: sigue bloqueada, no se cuela nadie más (docs/17 B1)', () => {
    // Un save viejo pudo quedar con más plantilla que el aforo de su etapa. El
    // aforo se lee de la etapa ACTUAL, así que queda bloqueado igual al cargar.
    const pool = generateCandidates(SEED, 1);
    const cap = staffCap(withStage2());
    const legacy = Array.from({ length: cap + 2 }, (_, i) => makeEmployee({ id: `legacy-${i}` }));
    const overCap: GameState = { ...withStage2(legacy), candidates: pool };
    expect(overCap.staff.length).toBeGreaterThan(cap);
    expect(hireBlockReason(overCap)).toBe(hireBlockedLabels.officeFull);
    expect(() => hireCandidate(overCap, pool[0].id)).toThrow(hireBlockedLabels.officeFull);
  });

  it('despedir: finiquito, golpe de moral al resto y fuera del proyecto', () => {
    const emp = makeEmployee({ id: 'emp-1', salary: 800 });
    const state = startProject(withStage2([emp]), CONCEPT);
    expect(state.projects[0].assignedStaff).toContain('emp-1');

    const after = fireEmployee(state, 'emp-1');
    expect(after.staff.map((e) => e.id)).toEqual(['fundador']);
    expect(after.studio.capital).toBe(
      state.studio.capital - balance.staff.severanceWeeks * 800,
    );
    expect(after.staff[0].morale).toBe(75 - balance.staff.firing.teamMoraleHit);
    expect(after.staff[0].loyalty).toBe(100 - balance.staff.firing.teamLoyaltyHit);
    expect(after.projects[0].assignedStaff).not.toContain('emp-1');
    expect(() => fireEmployee(after, 'fundador')).toThrow(/fundador/i);
  });

  it('despidos masivos: 3+ en la ventana golpean Empleador y Comunidad (docs/17 E3)', () => {
    const team = [
      makeEmployee({ id: 'a', salary: 500 }),
      makeEmployee({ id: 'b', salary: 500 }),
      makeEmployee({ id: 'c', salary: 500 }),
    ];
    const state = withStage2(team);
    const initEmployer = state.studio.reputation.empleador;
    const initComunidad = state.studio.reputation.comunidad;
    const initSentiment = state.community.sentiment;

    // Un despido puntual: golpe modesto a Empleador, sin tocar a la Comunidad.
    const s1 = fireEmployee(state, 'a');
    expect(s1.recentFireWeeks).toHaveLength(1);
    const singleDrop = initEmployer - (s1.studio.reputation.empleador ?? 0);
    expect(singleDrop).toBeGreaterThan(0);
    expect(s1.studio.reputation.comunidad).toBe(initComunidad);
    expect(s1.community.sentiment).toBe(initSentiment);

    const s2 = fireEmployee(s1, 'b');
    expect(s2.recentFireWeeks).toHaveLength(2);
    expect(s2.studio.reputation.comunidad).toBe(initComunidad); // aún no es masivo

    // El 3.º cruza el umbral: ERE sonado.
    const s3 = fireEmployee(s2, 'c');
    expect(s3.recentFireWeeks).toHaveLength(3);
    // Empleador cae MÁS que en un despido puntual (golpe extra del ERE).
    const massDrop = (s2.studio.reputation.empleador ?? 0) - (s3.studio.reputation.empleador ?? 0);
    expect(massDrop).toBeGreaterThan(singleDrop);
    // Y ahora sí toca a la Comunidad y al termómetro de sentimiento.
    expect(s3.studio.reputation.comunidad).toBeLessThan(initComunidad);
    expect(s3.community.sentiment).toBeLessThan(initSentiment);
    expect(s3.log.some((e) => e.type === 'comunidad' && /masivos/i.test(e.text))).toBe(true);
  });

  it('despidos fuera de la ventana no cuentan como masivos (docs/17 E3)', () => {
    const team = [makeEmployee({ id: 'a' }), makeEmployee({ id: 'b' })];
    const base = withStage2(team);
    // Dos despidos muy antiguos, semanas fuera de la ventana de 8.
    const state: GameState = { ...base, week: 40, recentFireWeeks: [1, 2] };
    const after = fireEmployee(state, 'a');
    // Los antiguos se podan: solo cuenta este → no es masivo, la comunidad no se entera.
    expect(after.recentFireWeeks).toEqual([40]);
    expect(after.studio.reputation.comunidad).toBe(base.studio.reputation.comunidad);
    expect(after.community.sentiment).toBe(base.community.sentiment);
  });

  it('formar: cuesta dinero y sube la skill elegida', () => {
    const emp = makeEmployee({ id: 'emp-1' });
    const state = withStage2([emp]);
    const after = trainEmployee(state, 'emp-1', 'tecnica');
    const trained = after.staff.find((e) => e.id === 'emp-1');
    expect(trained?.skills.tecnica).toBe(40 + balance.staff.training.skillGain);
    expect(after.studio.capital).toBe(state.studio.capital - balance.staff.training.cost);
  });

  it('motivar: el bonus sube moral, el aumento sube salario y lealtad', () => {
    const emp = makeEmployee({ id: 'emp-1', salary: 800, morale: 50, loyalty: 40 });
    const state = withStage2([emp]);
    const m = balance.staff.motivation;

    const bonused = motivateEmployee(state, 'emp-1', 'bonus');
    const b = bonused.staff.find((e) => e.id === 'emp-1');
    expect(b?.morale).toBe(50 + m.bonusMorale);
    expect(b?.loyalty).toBe(40 + m.bonusLoyalty);
    expect(bonused.studio.capital).toBe(state.studio.capital - m.bonusWeeks * 800);

    const raised = motivateEmployee(state, 'emp-1', 'aumento');
    const r = raised.staff.find((e) => e.id === 'emp-1');
    expect(r?.salary).toBe(Math.round(800 * (1 + m.raisePct)));
    expect(r?.loyalty).toBe(40 + m.raiseLoyalty);

    // El fundador no cobra salario: sin aumento; su bonus usa el coste mínimo.
    expect(() => motivateEmployee(state, 'fundador', 'aumento')).toThrow(/salario/);
    const founderBonus = motivateEmployee(state, 'fundador', 'bonus');
    expect(founderBonus.studio.capital).toBe(state.studio.capital - m.bonusMinCost);
  });

  it('asignar y retirar del proyecto en curso', () => {
    const emp = makeEmployee({ id: 'emp-1' });
    let state = startProject(withStage2([emp]), CONCEPT);
    expect(state.projects[0].assignedStaff).toEqual(['fundador', 'emp-1']);

    state = toggleAssignment(state, 'emp-1');
    expect(state.projects[0].assignedStaff).toEqual(['fundador']);
    state = toggleAssignment(state, 'emp-1');
    expect(state.projects[0].assignedStaff).toEqual(['fundador', 'emp-1']);

    expect(() => toggleAssignment(withStage2([emp]), 'emp-1')).toThrow(/proyecto/);
  });
});

describe('crunch: empujón a corto plazo, deuda a largo (CA docs/11 Fase 2)', () => {
  it('con dobles turnos el plazo avanza al doble, y degrada moral, energía y lealtad', () => {
    const base = startProject(createInitialState(SEED), CONCEPT);
    // 2 ticks: con crunch van 4 de las 6 semanas del pequeño (sin lanzar aún).
    const normal = runTicks(base, 2);
    const crunched = runTicks(setCrunch(base, true), 2);

    // El crunch es la ÚNICA vía de comprimir el plazo (docs/02 §6.1): dobles
    // turnos = 2 semanas de trabajo por semana real. La plantilla no lo hace.
    expect(crunched.projects[0].weeksSpent).toBe(
      normal.projects[0].weeksSpent * balance.staff.crunch.weeksPerTick,
    );
    expect(crunched.projects[0].designPoints).toBeGreaterThan(normal.projects[0].designPoints);

    // Deuda: el fundador acaba peor en las tres barras.
    const [fNormal] = normal.staff;
    const [fCrunched] = crunched.staff;
    expect(fCrunched.morale).toBeLessThan(fNormal.morale);
    expect(fCrunched.energy).toBeLessThan(fNormal.energy);
    expect(fCrunched.loyalty).toBeLessThan(fNormal.loyalty);
  });

  it('con crunch el juego sale antes, con más bugs y peor equipo → menos calidad', () => {
    const base = startProject(createInitialState(SEED), CONCEPT);
    const normal = runUntilRelease(base);
    const crunched = runUntilRelease(setCrunch(base, true));

    const gNormal = normal.releasedGames[0];
    const gCrunched = crunched.releasedGames[0];
    // El trato del crunch: adelanta el lanzamiento…
    expect(gCrunched.releaseWeek).toBeLessThan(gNormal.releaseWeek);
    expect(gCrunched.breakdown.bugLevel).toBeGreaterThan(gNormal.breakdown.bugLevel);
    expect(gCrunched.breakdown.teamFactor).toBeLessThan(gNormal.breakdown.teamFactor);
    expect(gCrunched.quality).toBeLessThan(gNormal.quality);
  });

  it('el rasgo Sensible al crunch duplica el daño; Workaholic lo amortigua', () => {
    const sensitive = makeEmployee({ id: 'sensible', traits: ['sensibleCrunch'] });
    const tough = makeEmployee({ id: 'duro', traits: ['workaholic'] });
    let state = startProject(withStage2([sensitive, tough]), CONCEPT);
    state = setCrunch(state, true);
    state = advanceStaff(state, makeRng(SEED, 1));

    const after = Object.fromEntries(state.staff.map((e) => [e.id, e]));
    const drain = balance.staff.crunch.energyDrain;
    expect(after.sensible.energy).toBe(90 - drain * 2);
    expect(after.duro.energy).toBe(90 - drain * 0.5);
  });
});

describe('burnout: la deuda del crunch (docs/05 §4)', () => {
  it('energía sostenidamente baja → burnout; el quemado rinde la mitad', () => {
    const tired = makeEmployee({ id: 'agotada', energy: 15 });
    let state = startProject(withStage2([tired]), CONCEPT);

    for (let week = 1; week <= balance.staff.burnout.weeksToBurnout; week++) {
      state = advanceStaff(state, makeRng(SEED, week));
    }
    const burned = state.staff.find((e) => e.id === 'agotada');
    expect(burned?.burnedOut).toBe(true);
    expect(burned?.morale).toBe(70 - balance.staff.burnout.moraleHit);
    expect(state.log.some((e) => e.type === 'staff' && e.text.includes('burnout'))).toBe(true);

    expect(computeTeamOutput([burned as Employee], false)).toBe(
      balance.staff.burnout.outputPenalty,
    );
  });

  it('descansar (sin asignar) recupera energía y saca del burnout', () => {
    const burned = makeEmployee({ id: 'agotada', energy: 10, burnedOut: true });
    let state = withStage2([burned]); // sin proyecto: todos descansan
    for (let week = 1; week <= 10; week++) {
      state = advanceStaff(state, makeRng(SEED, week));
    }
    const rested = state.staff.find((e) => e.id === 'agotada');
    expect(rested?.burnedOut).toBe(false);
    expect(rested?.energy).toBeGreaterThanOrEqual(balance.staff.burnout.exitEnergy);
  });
});

describe('renuncias: los empleados infelices se van (CA docs/11 Fase 2)', () => {
  it('moral y lealtad hundidas acaban en renuncia; el resto acusa el golpe', () => {
    const miserable = makeEmployee({ id: 'triste', morale: 5, loyalty: 5 });
    let state = withStage2([miserable]);

    let quitWeek = 0;
    for (let week = 1; week <= 60 && state.staff.length > 1; week++) {
      state = tick(state);
      quitWeek = week;
    }
    expect(state.staff.map((e) => e.id)).toEqual(['fundador']);
    expect(quitWeek).toBeLessThan(60);
    expect(state.log.some((e) => e.type === 'staff' && e.text.includes('renuncia'))).toBe(true);
    // El fundador pierde moral cuando alguien se marcha.
    expect(state.staff[0].morale).toBeLessThan(75);
  });

  it('el fundador nunca renuncia, por hundido que esté', () => {
    const base = createInitialState(SEED);
    let state: GameState = {
      ...base,
      staff: [{ ...base.staff[0], morale: 0, loyalty: 0 }],
    };
    for (let week = 1; week <= 60; week++) {
      state = advanceStaff(state, makeRng(SEED, week));
    }
    expect(state.staff).toHaveLength(1);
  });

  it('una renuncia saca al empleado del proyecto en curso', () => {
    const miserable = makeEmployee({ id: 'triste', morale: 0, loyalty: 0 });
    let state = startProject(withStage2([miserable]), { ...CONCEPT, size: 'pequeno' });
    for (let week = 1; week <= 60 && state.staff.length > 1; week++) {
      state = advanceStaff(state, makeRng(SEED, week));
    }
    expect(state.staff).toHaveLength(1);
    expect(state.projects[0].assignedStaff).toEqual(['fundador']);
  });
});

describe('nivel y XP: la experiencia mejora skills y salario (docs/05 §1)', () => {
  it('al completar el XP del nivel sube skills y salario', () => {
    const junior = makeEmployee({
      id: 'jr',
      level: 1,
      xp: balance.staff.xp.perLevel - 1,
      salary: 300,
    });
    let state = startProject(withStage2([junior]), CONCEPT);
    state = advanceStaff(state, makeRng(SEED, 1));

    const leveled = state.staff.find((e) => e.id === 'jr');
    expect(leveled?.level).toBe(2);
    expect(leveled?.xp).toBe(0);
    expect(leveled?.skills.diseno).toBe(60 + balance.staff.xp.skillGainSpecialty);
    expect(leveled?.skills.tecnica).toBe(40 + balance.staff.xp.skillGainOthers);
    expect(leveled?.salary).toBe(Math.round(300 * (1 + balance.staff.xp.salaryRaisePct)));
    expect(state.log.some((e) => e.text.includes('nivel 2'))).toBe(true);
  });

  it('un Mentor en el equipo acelera el XP de los juniors (docs/05 §3)', () => {
    const junior = makeEmployee({ id: 'jr', level: 1 });
    const mentor = makeEmployee({ id: 'mt', level: 5, traits: ['mentor'] });

    const alone = advanceStaff(startProject(withStage2([junior]), CONCEPT), makeRng(SEED, 1));
    const mentored = advanceStaff(
      startProject(withStage2([junior, mentor]), CONCEPT),
      makeRng(SEED, 1),
    );

    const xpAlone = alone.staff.find((e) => e.id === 'jr')?.xp ?? 0;
    const xpMentored = mentored.staff.find((e) => e.id === 'jr')?.xp ?? 0;
    expect(xpAlone).toBe(balance.staff.xp.perWeekWorked);
    expect(xpMentored).toBeGreaterThan(xpAlone);
  });
});

describe('la moral reacciona al lanzamiento (docs/05 §4)', () => {
  it('un éxito sube moral y lealtad; un flop las hunde; lo mediocre no mueve nada', () => {
    const emp = makeEmployee({ id: 'e1', morale: 60, loyalty: 50 });
    const state = withStage2([emp]);
    const r = balance.staff.releaseMorale;

    const hit = applyReleaseMorale(state, 85).staff.find((e) => e.id === 'e1');
    expect(hit?.morale).toBe(60 + r.hitMorale);
    expect(hit?.loyalty).toBe(50 + r.hitLoyalty);

    const flop = applyReleaseMorale(state, 25).staff.find((e) => e.id === 'e1');
    expect(flop?.morale).toBe(60 - r.flopMorale);
    expect(flop?.loyalty).toBe(50 - r.flopLoyalty);

    expect(applyReleaseMorale(state, 50)).toBe(state);
  });
});

describe('escala: Garaje → Estudio pequeño (docs/02 §4, compra desde 8.8)', () => {
  it('el hito de capital ya no muda solo: la ampliación se compra (docs/18 V4-c)', () => {
    const base = createInitialState(SEED);
    const rich: GameState = {
      ...base,
      studio: {
        ...base.studio,
        capital: balance.staff.scale.requirementsByStage[2].capital + 1_000,
      },
    };
    // El tick no asciende: cumplir el umbral solo habilita el botón.
    expect(tick(rich).studio.scaleStage).toBe(1);
    // Comprar la ampliación sí: paga el coste, sube la etapa y llega el pool.
    const after = expandStudio(rich);
    expect(after.studio.scaleStage).toBe(2);
    expect(after.studio.capital).toBe(
      rich.studio.capital - balance.staff.scale.upgradeCostByStage[2],
    );
    expect(after.candidates).toHaveLength(balance.staff.scale.poolSizeByStage[2]);
    expect(after.log.some((e) => e.type === 'estudio')).toBe(true);
  });

  it('el pool se renueva cada N semanas en la etapa 2', () => {
    const stale = generateCandidates(SEED, 3);
    const base = withStage2([], 20_000);
    const state: GameState = {
      ...base,
      week: balance.staff.candidates.refreshWeeks,
      candidates: stale,
    };
    const after = tick(state);
    expect(after.candidates).not.toEqual(stale);
    expect(after.candidates).toEqual(
      generateCandidates(SEED, balance.staff.candidates.refreshWeeks),
    );
  });

  it('la oficina pequeña cuesta más de alquiler y los salarios se pagan cada semana', () => {
    const emp = makeEmployee({ id: 'e1', salary: 800 });
    const state = withStage2([emp], 10_000); // sin proyecto
    const after = tick(state);
    expect(after.studio.capital).toBe(
      10_000 - balance.economy.weeklyUpkeep - balance.economy.upkeepExtraByStage[2] - 800,
    );
  });
});

describe('las filosofías de estudio divergen (CA docs/11 Fase 2)', () => {
  function studioWithTeam(): GameState {
    let state: GameState = { ...withStage2([], 60_000), candidates: generateCandidates(SEED, 3) };
    for (const candidate of [...state.candidates]) {
      state = hireCandidate(state, candidate.id);
    }
    return startProject(state, { ...CONCEPT, name: 'El Precio', size: 'mediano' });
  }

  it('crunchear sale antes; cuidar al equipo produce más calidad y mejor plantilla', () => {
    const care = runUntilRelease(studioWithTeam());
    const greed = runUntilRelease(setCrunch(studioWithTeam(), true));

    const gameCare = care.releasedGames[0];
    const gameGreed = greed.releasedGames[0];

    // Codicia: llega antes (o igual, si el tick discreto coincide)…
    expect(gameGreed.releaseWeek).toBeLessThanOrEqual(gameCare.releaseWeek);
    // …pero con más bugs, peor equipo y menos calidad.
    expect(gameGreed.breakdown.bugLevel).toBeGreaterThanOrEqual(gameCare.breakdown.bugLevel);
    expect(gameGreed.breakdown.teamFactor).toBeLessThan(gameCare.breakdown.teamFactor);
    expect(gameGreed.quality).toBeLessThanOrEqual(gameCare.quality);

    // Y la plantilla acaba peor: la deuda humana del crunch.
    expect(avg(greed.staff.map((e) => e.morale))).toBeLessThan(
      avg(care.staff.map((e) => e.morale)),
    );
    expect(avg(greed.staff.map((e) => e.energy))).toBeLessThan(
      avg(care.staff.map((e) => e.energy)),
    );
  });

  it('es determinista: misma semilla y acciones → mismo resultado', () => {
    const run = () => runTicks(setCrunch(studioWithTeam(), true), 15);
    expect(run()).toEqual(run());
  });
});
