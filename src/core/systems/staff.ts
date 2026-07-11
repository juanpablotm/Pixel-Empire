import { balance } from '../../data/balance';
import { getGenre } from '../../data/genres';
import { firstNames, lastNames, specialtyLabels } from '../../data/staffTexts';
import { traits as allTraits, getTrait } from '../../data/traits';
import { appendLog } from '../engine/log';
import { makeRng, type Rng } from '../engine/rng';
import type { GameState } from '../model/gameState';
import type { Employee, SalaryTier, Specialty, TeamFactorResult } from '../model/staff';
import { nudgeMoralDrift } from './morale';
import { employerPoolModifiers, withReputationDeltas } from './reputation';

/**
 * Sistema de personal (docs/05): anatomía del empleado, teamFactor
 * (competencia × moral × sinergia, docs/03 factor E), química de equipo
 * (docs/12 §5), acciones del jugador (contratar/formar/asignar/motivar/
 * crunch/despedir), burnout, renuncias y pool de contratación. Funciones
 * puras; todo número de balance vive en data/balance.ts.
 */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clampStat = (value: number): number => clamp(value, 0, 100);

/** Stream del PRNG para la generación de candidatos, separado del semanal. */
const CANDIDATE_STREAM = 1 << 20;

// ---------------------------------------------------------------------------
// Rasgos: agregación de modificadores (docs/05 §3, docs/09 §6)
// ---------------------------------------------------------------------------

function hasTrait(employee: Employee, traitId: string): boolean {
  return employee.traits.includes(traitId);
}

/** Multiplicador del daño del crunch: producto de los rasgos (2 = doble). */
export function crunchSensitivity(employee: Employee): number {
  return employee.traits.reduce((mult, id) => mult * (getTrait(id).modifiers.crunchSensitivity ?? 1), 1);
}

/** Multiplicador de velocidad de los rasgos (Perfeccionista lento, etc.). */
function speedMod(employee: Employee): number {
  return employee.traits.reduce((mult, id) => mult * (getTrait(id).modifiers.speed ?? 1), 1);
}

/** Bonus de competencia efectiva de los rasgos (proporción). */
function qualityBonus(employee: Employee): number {
  return employee.traits.reduce((sum, id) => sum + (getTrait(id).modifiers.qualityBonus ?? 0), 0);
}

/** Aporte del equipo asignado al innovationMod (Visionarios, docs/03 §3). */
export function teamInnovationBonus(team: readonly Employee[]): number {
  return team.reduce(
    (sum, e) => sum + e.traits.reduce((s, id) => s + (getTrait(id).modifiers.innovation ?? 0), 0),
    0,
  );
}

// ---------------------------------------------------------------------------
// El fundador y el tramo salarial
// ---------------------------------------------------------------------------

/** Crea al fundador: determinista por semilla, salario 0, nunca renuncia. */
export function createFounder(seed: number): Employee {
  const f = balance.staff.founder;
  return {
    id: f.id,
    name: f.name,
    avatarSeed: `${f.id}-${seed}`,
    specialty: f.specialty,
    skills: { ...f.skills },
    traits: [...f.traits],
    morale: f.morale,
    energy: f.energy,
    loyalty: f.loyalty,
    salary: 0,
    level: f.level,
    xp: 0,
    founder: true,
    burnedOut: false,
    weeksLowEnergy: 0,
  };
}

/** Tramo salarial según la skill de la especialidad (docs/12 §6). */
export function salaryTierOf(employee: Employee): SalaryTier {
  const skill = employee.skills[employee.specialty];
  const tiers = balance.staff.candidates.specialtySkillByTier;
  if (skill >= tiers.estrella[0]) return 'estrella';
  if (skill >= tiers.senior[0]) return 'senior';
  return 'junior';
}

// ---------------------------------------------------------------------------
// teamFactor: competencia × moral × sinergia (docs/03 factor E)
// ---------------------------------------------------------------------------

/** Skill 0..1 del empleado ponderada por las especialidades del género. */
function genreWeightedSkill01(employee: Employee, genreId: string): number {
  const weights = getGenre(genreId).specialtyWeights;
  const total = (Object.entries(weights) as [Specialty, number][]).reduce(
    (sum, [spec, w]) => sum + w * employee.skills[spec],
    0,
  );
  return total / 100;
}

/** Output semanal del equipo asignado en "semanas de fundador" (1 = base). */
export function computeTeamOutput(team: readonly Employee[], crunch: boolean): number {
  const b = balance.staff;
  return team.reduce((sum, e) => {
    const burnout = e.burnedOut ? b.burnout.outputPenalty : 1;
    const boost = crunch ? b.crunch.outputBoost : 1;
    return sum + speedMod(e) * burnout * boost;
  }, 0);
}

/** ¿El par a/b coincide con algún par de rasgos de la lista? */
function matchesTraitPair(
  a: Employee,
  b: Employee,
  pairs: readonly (readonly [string, string])[],
): boolean {
  return pairs.some(
    ([t1, t2]) =>
      (hasTrait(a, t1) && hasTrait(b, t2)) || (hasTrait(a, t2) && hasTrait(b, t1)),
  );
}

/**
 * Química de equipo v1 [DECIDIDO, docs/12 §5]:
 *   sinergiaFactor = clamp(1 + Σ_pares (0.03·afín − 0.04·conflicto), 0.8, 1.2)
 * Afines: Mentor+junior, especialidades complementarias para el género,
 * rasgos compatibles. Conflicto: rasgos que chocan (dos Estrellas mediáticas)
 * y Llaneros solitarios en equipos grandes.
 */
export function computeSynergy(
  team: readonly Employee[],
  genreId: string,
): { synergyFactor: number; affinities: number; conflicts: number } {
  const chem = balance.staff.chemistry;
  const weights = getGenre(genreId).specialtyWeights;
  const juniorMax = balance.staff.xp.juniorMaxLevel;

  let affinities = 0;
  let conflicts = 0;
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      const a = team[i];
      const b = team[j];

      const mentorPair =
        (hasTrait(a, 'mentor') && b.level <= juniorMax) ||
        (hasTrait(b, 'mentor') && a.level <= juniorMax);
      const complementary =
        a.specialty !== b.specialty &&
        weights[a.specialty] >= chem.complementaryWeight &&
        weights[b.specialty] >= chem.complementaryWeight;
      if (mentorPair || complementary || matchesTraitPair(a, b, chem.compatibleTraitPairs)) {
        affinities += 1;
      }

      const soloFriction =
        team.length >= chem.soloConflictTeamSize &&
        (hasTrait(a, 'llaneroSolitario') || hasTrait(b, 'llaneroSolitario'));
      if (soloFriction || matchesTraitPair(a, b, chem.conflictTraitPairs)) {
        conflicts += 1;
      }
    }
  }

  const synergyFactor = clamp(
    1 + chem.affinityBonus * affinities - chem.conflictPenalty * conflicts,
    chem.min,
    chem.max,
  );
  return { synergyFactor, affinities, conflicts };
}

/**
 * Factor E (docs/03): teamFactor = competencia media ponderada por el género
 * × factor de moral × sinergia, en el rango 0.5–1.3 [DECIDIDO, docs/12 §3].
 */
export function computeTeamFactor(team: readonly Employee[], genreId: string): TeamFactorResult {
  const tf = balance.staff.teamFactor;
  const burnoutPenalty = balance.staff.burnout.competencePenalty;

  const competence01 =
    team.length === 0
      ? 0
      : team.reduce((sum, e) => {
          const raw =
            genreWeightedSkill01(e, genreId) *
            (1 + qualityBonus(e)) *
            (e.burnedOut ? burnoutPenalty : 1);
          return sum + Math.min(1, raw);
        }, 0) / team.length;

  const avgMorale01 =
    team.length === 0 ? 0 : team.reduce((sum, e) => sum + e.morale, 0) / team.length / 100;

  const competenceFactor = tf.competenceMin + tf.competenceSpan * competence01;
  const moraleFactor = tf.moraleMin + tf.moraleSpan * avgMorale01;
  const { synergyFactor, affinities, conflicts } = computeSynergy(team, genreId);

  const teamFactor = clamp(competenceFactor * moraleFactor * synergyFactor, tf.min, tf.max);
  return { teamFactor, competence01, competenceFactor, moraleFactor, synergyFactor, affinities, conflicts };
}

// ---------------------------------------------------------------------------
// Pool de contratación (docs/05 §6)
// ---------------------------------------------------------------------------

/**
 * Tramo del candidato, sesgado por la reputación de empleador (docs/05 §7):
 * un estudio querido atrae más seniors/estrellas; uno quemado, más juniors.
 * Mismo nº de llamadas al PRNG sea cual sea la reputación (determinismo).
 */
function rollTier(rng: Rng, tierFactor: number): SalaryTier {
  const w = balance.staff.candidates.tierWeights;
  const senior = w.senior * tierFactor;
  const estrella = w.estrella * tierFactor;
  const junior = Math.max(0, 1 - senior - estrella);
  const total = junior + senior + estrella;
  const roll = rng.next() * total;
  if (roll < junior) return 'junior';
  if (roll < junior + senior) return 'senior';
  return 'estrella';
}

function rollTraits(rng: Rng): string[] {
  const c = balance.staff.candidates;
  const count = rng.int(c.traitCountMin, c.traitCountMax);
  const pool = allTraits.map((t) => t.id);
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    const index = rng.int(0, pool.length - 1);
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked;
}

function generateCandidate(
  rng: Rng,
  seed: number,
  week: number,
  index: number,
  employerRep: number,
): Employee {
  const c = balance.staff.candidates;
  const pool = employerPoolModifiers(employerRep);
  const tier = rollTier(rng, pool.tierFactor);
  const specialty = rng.pick(c.specialties);
  const traits = rollTraits(rng);

  const generalista = traits.includes('generalista');
  const obsesivo = traits.includes('especialistaObsesivo');
  const [sMin, sMax] = c.specialtySkillByTier[tier];
  const otherRange = generalista ? c.generalistaSkillRange : c.otherSkillRange;

  const skills = {} as Record<Specialty, number>;
  for (const spec of Object.keys(specialtyLabels) as Specialty[]) {
    skills[spec] = spec === specialty ? rng.int(sMin, sMax) : rng.int(otherRange[0], otherRange[1]);
    if (obsesivo) {
      skills[spec] = clampStat(
        skills[spec] + (spec === specialty ? c.especialistaSkillShift : -c.especialistaSkillShift),
      );
    }
  }

  return {
    id: `cand-${week}-${index}`,
    name: `${rng.pick(firstNames)} ${rng.pick(lastNames)}`,
    avatarSeed: `${seed}-${week}-${index}`,
    specialty,
    skills,
    traits,
    morale: rng.int(c.moraleRange[0], c.moraleRange[1]),
    energy: rng.int(c.energyRange[0], c.energyRange[1]),
    loyalty: rng.int(c.loyaltyRange[0], c.loyaltyRange[1]),
    // Un estudio con mala fama de empleador paga prima; uno querido, descuento
    // (docs/05 §7: "atraen peor talento y más caro").
    salary: Math.round(balance.staff.salaries[tier] * pool.salaryPremium),
    level: rng.int(c.levelByTier[tier][0], c.levelByTier[tier][1]),
    xp: 0,
    founder: false,
    burnedOut: false,
    weeksLowEnergy: 0,
  };
}

/**
 * Genera el pool de candidatos de una semana: determinista por (semilla,
 * semana), con su propio stream del PRNG. La reputación de empleador sesga
 * calidad y coste (docs/05 §7); con rep 50 el pool es el neutro de siempre.
 * La dependencia de la era llega en Fase 6.
 */
export function generateCandidates(seed: number, week: number, employerRep = 50): Employee[] {
  const rng = makeRng(seed, CANDIDATE_STREAM + week);
  const pool: Employee[] = [];
  for (let i = 0; i < balance.staff.candidates.poolSize; i++) {
    pool.push(generateCandidate(rng, seed, week, i, employerRep));
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Acciones del jugador (docs/05 §6)
// ---------------------------------------------------------------------------

function requireEmployee(state: GameState, employeeId: string): Employee {
  const employee = state.staff.find((e) => e.id === employeeId);
  if (!employee) throw new Error(`Empleado desconocido: ${employeeId}`);
  return employee;
}

/** Aforo de plantilla según la etapa de escala (docs/02 §4). */
export function staffCap(state: GameState): number {
  return balance.staff.scale.staffCapByStage[state.studio.scaleStage];
}

/** Coste de contratación: semanas de salario del candidato [DECIDIDO, docs/12 §6]. */
export function hiringCost(candidate: Employee): number {
  return balance.staff.hiringCostWeeks * candidate.salary;
}

/** Acción: contratar a un candidato del pool. Requiere haber salido del garaje. */
export function hireCandidate(state: GameState, candidateId: string): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const candidate = state.candidates.find((c) => c.id === candidateId);
  if (!candidate) throw new Error(`Candidato desconocido: ${candidateId}`);
  if (state.studio.scaleStage === 1) {
    throw new Error('En el garaje no cabe nadie más: consigue capital para mudarte');
  }
  if (state.staff.length >= staffCap(state)) throw new Error('La oficina está llena');

  const next: GameState = {
    ...state,
    studio: { ...state.studio, capital: state.studio.capital - hiringCost(candidate) },
    staff: [...state.staff, candidate],
    candidates: state.candidates.filter((c) => c.id !== candidateId),
  };
  return appendLog(
    next,
    'staff',
    `${candidate.name} se une al estudio (${specialtyLabels[candidate.specialty]}, ${candidate.salary} 💰/sem).`,
  );
}

/** Acción: despedir. Paga finiquito y golpea la moral de los que quedan. */
export function fireEmployee(state: GameState, employeeId: string): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const employee = requireEmployee(state, employeeId);
  if (employee.founder) throw new Error('El fundador no puede despedirse a sí mismo');

  const { teamMoraleHit, teamLoyaltyHit } = balance.staff.firing;
  const severance = balance.staff.severanceWeeks * employee.salary;
  const remaining = state.staff
    .filter((e) => e.id !== employeeId)
    .map((e) => ({
      ...e,
      morale: clampStat(e.morale - teamMoraleHit),
      loyalty: clampStat(e.loyalty - teamLoyaltyHit),
    }));
  const project = state.projects[0];

  // Despedir golpea la reputación como empleador (docs/05 §7 y docs/06 §2).
  let studio: GameState['studio'] = { ...state.studio, capital: state.studio.capital - severance };
  studio = withReputationDeltas(studio, { empleador: -balance.reputation.employer.firedHit });

  const next: GameState = {
    ...state,
    studio,
    staff: remaining,
    stats: { ...state.stats, firedCount: state.stats.firedCount + 1 },
    projects: project
      ? [{ ...project, assignedStaff: project.assignedStaff.filter((id) => id !== employeeId) }]
      : state.projects,
  };
  return appendLog(
    next,
    'staff',
    `${employee.name} ha sido despedido (finiquito: ${severance} 💰). El ambiente se resiente.`,
  );
}

/** Acción: formar a un empleado en una disciplina (docs/05 §6). */
export function trainEmployee(
  state: GameState,
  employeeId: string,
  specialty: Specialty,
): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const employee = requireEmployee(state, employeeId);
  const t = balance.staff.training;

  // Formar es cuidar al equipo: inclina la balanza hacia la integridad (docs/06 §2).
  const studio = nudgeMoralDrift(
    { ...state.studio, capital: state.studio.capital - t.cost },
    balance.moral.drift.careAction,
  );
  const next: GameState = {
    ...state,
    studio,
    staff: state.staff.map((e) =>
      e.id === employeeId
        ? {
            ...e,
            skills: { ...e.skills, [specialty]: clampStat(e.skills[specialty] + t.skillGain) },
            morale: clampStat(e.morale + t.moraleBoost),
          }
        : e,
    ),
  };
  return appendLog(
    next,
    'staff',
    `${employee.name} completa una formación en ${specialtyLabels[specialty]} (+${t.skillGain}).`,
  );
}

export type MotivationKind = 'bonus' | 'aumento';

/** Acción: motivar con un bonus puntual o una subida de salario (docs/05 §6). */
export function motivateEmployee(
  state: GameState,
  employeeId: string,
  kind: MotivationKind,
): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const employee = requireEmployee(state, employeeId);
  const m = balance.staff.motivation;

  if (kind === 'aumento' && employee.founder) {
    throw new Error('El fundador no cobra salario');
  }

  const cost = kind === 'bonus' ? Math.max(m.bonusMinCost, m.bonusWeeks * employee.salary) : 0;
  // Motivar es cuidar al equipo: inclina la balanza hacia la integridad (docs/06 §2).
  const studio = nudgeMoralDrift(
    { ...state.studio, capital: state.studio.capital - cost },
    balance.moral.drift.careAction,
  );
  const next: GameState = {
    ...state,
    studio,
    staff: state.staff.map((e) =>
      e.id === employeeId
        ? kind === 'bonus'
          ? {
              ...e,
              morale: clampStat(e.morale + m.bonusMorale),
              loyalty: clampStat(e.loyalty + m.bonusLoyalty),
            }
          : {
              ...e,
              salary: Math.round(e.salary * (1 + m.raisePct)),
              morale: clampStat(e.morale + m.raiseMorale),
              loyalty: clampStat(e.loyalty + m.raiseLoyalty),
            }
        : e,
    ),
  };
  return appendLog(
    next,
    'staff',
    kind === 'bonus'
      ? `${employee.name} recibe un bonus de ${cost} 💰. Se le ve más animado.`
      : `${employee.name} recibe una subida de salario. Lealtad reforzada.`,
  );
}

/** Acción: asignar o retirar a un empleado del proyecto en curso. */
export function toggleAssignment(state: GameState, employeeId: string): GameState {
  const project = state.projects[0];
  if (!project) throw new Error('No hay proyecto en desarrollo');
  requireEmployee(state, employeeId);

  const assigned = project.assignedStaff.includes(employeeId);
  const assignedStaff = assigned
    ? project.assignedStaff.filter((id) => id !== employeeId)
    : [...project.assignedStaff, employeeId];
  return { ...state, projects: [{ ...project, assignedStaff }] };
}

/** Acción: activar/desactivar el crunch del proyecto en curso (docs/05 §6). */
export function setCrunch(state: GameState, active: boolean): GameState {
  const project = state.projects[0];
  if (!project) throw new Error('No hay proyecto en desarrollo');
  if (project.crunch === active) return state;

  const next: GameState = { ...state, projects: [{ ...project, crunch: active }] };
  return appendLog(
    next,
    'staff',
    active
      ? `Crunch activado en «${project.name}»: más producción a costa del equipo.`
      : `Fin del crunch en «${project.name}». El equipo respira.`,
  );
}

// ---------------------------------------------------------------------------
// Tick semanal: desgaste, burnout, XP y renuncias (docs/05 §4 y §7)
// ---------------------------------------------------------------------------

/** La moral del equipo reacciona a la reseña del lanzamiento (docs/05 §4). */
export function applyReleaseMorale(state: GameState, review: number): GameState {
  const r = balance.staff.releaseMorale;
  let moraleDelta = 0;
  let loyaltyDelta = 0;
  if (review >= r.hitReview) {
    moraleDelta = r.hitMorale;
    loyaltyDelta = r.hitLoyalty;
  } else if (review >= r.okReview) {
    moraleDelta = r.okMorale;
  } else if (review <= r.flopReview) {
    moraleDelta = -r.flopMorale;
    loyaltyDelta = -r.flopLoyalty;
  }
  if (moraleDelta === 0 && loyaltyDelta === 0) return state;

  const next: GameState = {
    ...state,
    staff: state.staff.map((e) => ({
      ...e,
      morale: clampStat(e.morale + moraleDelta),
      loyalty: clampStat(e.loyalty + loyaltyDelta),
    })),
  };
  return moraleDelta > 0
    ? appendLog(next, 'staff', 'La buena acogida del lanzamiento sube la moral del equipo.')
    : appendLog(next, 'staff', 'El batacazo del lanzamiento hunde la moral del equipo.');
}

/** Probabilidad semanal de renuncia por moral/lealtad bajas y burnout. */
function quitChance(employee: Employee): number {
  if (employee.founder) return 0;
  const q = balance.staff.quits;
  const moralePressure = Math.max(0, (q.moraleThreshold - employee.morale) / q.moraleThreshold);
  const loyaltyPressure = Math.max(0, (q.loyaltyThreshold - employee.loyalty) / q.loyaltyThreshold);
  const burnoutPressure = employee.burnedOut ? q.burnoutExtraPressure : 0;
  const pressure = moralePressure + loyaltyPressure + burnoutPressure;
  return pressure <= 0 ? 0 : Math.min(q.maxChance, q.baseChance * pressure);
}

/**
 * Una semana de la plantilla: los asignados al proyecto se desgastan (el
 * crunch drena rápido), el resto descansa; burnout con energía sostenidamente
 * baja; XP y niveles por semana trabajada (los Mentores aceleran a los
 * juniors); y renuncias si moral/lealtad se hunden. El fundador nunca renuncia.
 */
export function advanceStaff(state: GameState, rng: Rng): GameState {
  if (state.staff.length === 0) return state;
  const b = balance.staff;
  const project = state.projects[0];
  const assignedIds = project ? project.assignedStaff : [];
  const events: string[] = [];

  const worked = state.staff.map((employee) => {
    let { morale, energy, loyalty, xp, level, salary } = employee;
    let skills = employee.skills;
    const working = project !== undefined && assignedIds.includes(employee.id);

    if (working) {
      const sens = crunchSensitivity(employee);
      if (project.crunch) {
        energy -= b.crunch.energyDrain * sens;
        morale -= b.crunch.moraleDrain * sens;
        loyalty -= b.crunch.loyaltyDrain * sens;
      } else {
        energy -= b.work.energyDrain;
      }

      // XP: los juniors con un Mentor al lado crecen más rápido (docs/05 §3).
      const mentorBonus =
        level <= b.xp.juniorMaxLevel
          ? state.staff.reduce(
              (best, other) =>
                other.id !== employee.id && assignedIds.includes(other.id)
                  ? Math.max(best, getTraitMentorBonus(other))
                  : best,
              0,
            )
          : 0;
      xp += b.xp.perWeekWorked * (1 + mentorBonus);
      while (level < b.xp.maxLevel && xp >= b.xp.perLevel) {
        xp -= b.xp.perLevel;
        level += 1;
        skills = levelUpSkills(skills, employee.specialty);
        salary = Math.round(salary * (1 + b.xp.salaryRaisePct));
        events.push(`${employee.name} sube a nivel ${level}: mejora sus skills.`);
      }
    } else {
      energy += b.work.restEnergyRecovery;
      if (morale < b.work.restMoraleCap) {
        morale = Math.min(b.work.restMoraleCap, morale + b.work.restMoraleRecovery);
      }
    }

    energy = clampStat(energy);

    // Burnout: energía sostenidamente baja → penalización fuerte (docs/05 §4).
    let weeksLowEnergy = energy <= b.burnout.energyThreshold ? employee.weeksLowEnergy + 1 : 0;
    let burnedOut = employee.burnedOut;
    if (!burnedOut && weeksLowEnergy >= b.burnout.weeksToBurnout) {
      burnedOut = true;
      morale -= b.burnout.moraleHit;
      events.push(`${employee.name} está en burnout: su rendimiento se desploma.`);
    } else if (burnedOut) {
      if (energy >= b.burnout.exitEnergy) {
        burnedOut = false;
        weeksLowEnergy = 0;
        events.push(`${employee.name} se ha recuperado del burnout.`);
      } else {
        morale -= b.burnout.moraleDrainPerWeek;
      }
    }

    return {
      ...employee,
      morale: clampStat(morale),
      energy,
      loyalty: clampStat(loyalty),
      xp,
      level,
      skills,
      salary,
      burnedOut,
      weeksLowEnergy,
    };
  });

  // Renuncias (docs/05 §7): probabilidad creciente con la infelicidad.
  const quitters = worked.filter((e) => rng.chance(quitChance(e)));
  let staff = worked;
  let projects = state.projects;
  let studio = state.studio;
  if (quitters.length > 0) {
    const quitIds = new Set(quitters.map((e) => e.id));
    staff = worked
      .filter((e) => !quitIds.has(e.id))
      .map((e) => ({ ...e, morale: clampStat(e.morale - b.quits.teamMoraleHit) }));
    if (project) {
      projects = [
        {
          ...project,
          assignedStaff: project.assignedStaff.filter((id) => !quitIds.has(id)),
        },
      ];
    }
    // Cada renuncia sonada araña la reputación de empleador (docs/05 §7).
    studio = withReputationDeltas(studio, {
      empleador: -balance.reputation.employer.quitHit * quitters.length,
    });
    for (const quitter of quitters) {
      events.push(`${quitter.name} renuncia, harto del trato recibido.`);
    }
  }

  let next: GameState = { ...state, staff, projects, studio };
  for (const text of events) {
    next = appendLog(next, 'staff', text);
  }
  return next;
}

function getTraitMentorBonus(employee: Employee): number {
  return employee.traits.reduce((best, id) => Math.max(best, getTrait(id).modifiers.mentorBonus ?? 0), 0);
}

function levelUpSkills(
  skills: Record<Specialty, number>,
  specialty: Specialty,
): Record<Specialty, number> {
  const gain = balance.staff.xp;
  const next = { ...skills };
  for (const spec of Object.keys(next) as Specialty[]) {
    next[spec] = clampStat(
      next[spec] + (spec === specialty ? gain.skillGainSpecialty : gain.skillGainOthers),
    );
  }
  return next;
}

// ---------------------------------------------------------------------------
// Escala: Garaje → Estudio pequeño (docs/02 §4)
// ---------------------------------------------------------------------------

/**
 * Transición de etapa por hito de capital y refresco periódico del pool de
 * candidatos. Las etapas 3–4 (consolidado, corporación) llegan en Fase 6.
 */
export function advanceScale(state: GameState): GameState {
  const { scale, candidates } = balance.staff;

  const employerRep = state.studio.reputation.empleador;

  if (state.studio.scaleStage === 1) {
    if (state.studio.capital < scale.stage2CapitalThreshold) return state;
    const next: GameState = {
      ...state,
      studio: { ...state.studio, scaleStage: 2 },
      candidates: generateCandidates(state.seed, state.week, employerRep),
    };
    return appendLog(
      next,
      'estudio',
      `El estudio sale del garaje a una oficina pequeña: ya puedes contratar (hasta ${scale.staffCapByStage[2]} personas).`,
    );
  }

  if (state.week % candidates.refreshWeeks === 0) {
    return {
      ...state,
      candidates: generateCandidates(state.seed, state.week, employerRep),
    };
  }
  return state;
}
