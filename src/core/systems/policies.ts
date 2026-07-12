import { balance } from '../../data/balance';
import { appendLog } from '../engine/log';
import type { GameState } from '../model/gameState';
import type { SalaryPolicy, StudioPolicies } from '../model/policies';
import type { Employee } from '../model/staff';
import { withReputationDeltas } from './reputation';

/**
 * Gestión por políticas (docs/02 §4 y docs/10 §14): desde el estudio
 * consolidado el jugador fija políticas y el estudio las aplica cada semana,
 * en lugar de gestionar persona a persona. Determinista: nada de PRNG.
 */

const clampStat = (value: number): number => Math.min(100, Math.max(0, value));

export function defaultPolicies(): StudioPolicies {
  return { salary: 'mercado', antiCrunch: false, autoTraining: false, autoBonus: false };
}

/** ¿La escala actual permite gestión por políticas? */
export function policiesUnlocked(state: GameState): boolean {
  return state.studio.scaleStage >= balance.policies.minStage;
}

/** Acción: cambiar las políticas del estudio (solo en la escala grande). */
export function setPolicies(state: GameState, patch: Partial<StudioPolicies>): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  if (!policiesUnlocked(state)) {
    throw new Error('La gestión por políticas llega con el estudio consolidado (docs/02 §4)');
  }
  return { ...state, policies: { ...state.policies, ...patch } };
}

/**
 * Multiplicador del coste salarial semanal según la política (docs/02 §4).
 * Lo consume weeklyFixedCosts (economy.ts); 1 si las políticas no aplican.
 */
export function salaryCostFactor(state: GameState): number {
  if (!policiesUnlocked(state)) return 1;
  return balance.policies.salary[state.policies.salary].costFactor;
}

function applySalaryPolicy(state: GameState, policy: SalaryPolicy): GameState {
  const cfg = balance.policies.salary[policy];
  // Anotados como number: el balance usa literales `as const`.
  const moralePerWeek: number = cfg.moralePerWeek;
  const loyaltyPerWeek: number = cfg.loyaltyPerWeek;
  const employerRepPerWeek: number = cfg.employerRepPerWeek;
  if (moralePerWeek === 0 && loyaltyPerWeek === 0 && employerRepPerWeek === 0) {
    return state;
  }
  const cap = balance.policies.moraleCap;
  const staff = state.staff.map((e) => ({
    ...e,
    // La política generosa sube la moral solo hasta el techo (sin bajar la
    // de quien ya esté por encima); la austera la erosiona sin techo.
    morale:
      moralePerWeek > 0
        ? e.morale >= cap
          ? e.morale
          : Math.min(cap, e.morale + moralePerWeek)
        : clampStat(e.morale + moralePerWeek),
    loyalty: clampStat(e.loyalty + loyaltyPerWeek),
  }));
  const studio =
    employerRepPerWeek === 0
      ? state.studio
      : withReputationDeltas(state.studio, { empleador: employerRepPerWeek });
  return { ...state, staff, studio };
}

function applyAntiCrunch(state: GameState): GameState {
  const cap = balance.policies.moraleCap;
  const crunching = state.projects.filter((p) => p.crunch);
  let next = state;
  if (crunching.length > 0) {
    next = {
      ...next,
      projects: next.projects.map((p) => (p.crunch ? { ...p, crunch: false } : p)),
    };
    next = appendLog(
      next,
      'estudio',
      'La política anti-crunch apaga las horas extra en todos los proyectos.',
    );
  }
  const boost = balance.policies.antiCrunch.moralePerWeek;
  return {
    ...next,
    staff: next.staff.map((e) =>
      e.morale < cap ? { ...e, morale: Math.min(cap, e.morale + boost) } : e,
    ),
  };
}

/** El empleado asignable con la skill de su especialidad más floja (empate: orden estable). */
function weakestEmployee(staff: readonly Employee[]): Employee | null {
  let weakest: Employee | null = null;
  for (const e of staff) {
    if (!weakest || e.skills[e.specialty] < weakest.skills[weakest.specialty]) weakest = e;
  }
  return weakest;
}

function applyAutoTraining(state: GameState): GameState {
  const t = balance.staff.training;
  if (state.week % balance.policies.autoTraining.intervalWeeks !== 0) return state;
  if (state.studio.capital < t.cost) return state;
  const target = weakestEmployee(state.staff);
  if (!target) return state;

  const next: GameState = {
    ...state,
    studio: { ...state.studio, capital: state.studio.capital - t.cost },
    staff: state.staff.map((e) =>
      e.id === target.id
        ? {
            ...e,
            skills: {
              ...e.skills,
              [e.specialty]: clampStat(e.skills[e.specialty] + t.skillGain),
            },
            morale: clampStat(e.morale + t.moraleBoost),
          }
        : e,
    ),
  };
  return appendLog(
    next,
    'estudio',
    `Formación automática: ${target.name} mejora su especialidad (política de formación).`,
  );
}

function applyAutoBonus(state: GameState): GameState {
  const cfg = balance.policies.autoBonus;
  const m = balance.staff.motivation;
  const low = state.staff
    .filter((e) => e.morale < cfg.moraleThreshold && !e.founder)
    .sort((a, b) => a.morale - b.morale)
    .slice(0, cfg.maxPerWeek);
  if (low.length === 0) return state;

  let capital = state.studio.capital;
  const boosted = new Map<string, true>();
  for (const e of low) {
    const cost = Math.max(m.bonusMinCost, m.bonusWeeks * e.salary);
    if (capital < cost) break;
    capital -= cost;
    boosted.set(e.id, true);
  }
  if (boosted.size === 0) return state;

  const next: GameState = {
    ...state,
    studio: { ...state.studio, capital },
    staff: state.staff.map((e) =>
      boosted.has(e.id)
        ? {
            ...e,
            morale: clampStat(e.morale + m.bonusMorale),
            loyalty: clampStat(e.loyalty + m.bonusLoyalty),
          }
        : e,
    ),
  };
  return appendLog(
    next,
    'estudio',
    `Bonus automático para ${boosted.size} ${boosted.size === 1 ? 'empleado' : 'empleados'} con la moral baja.`,
  );
}

/** Tick semanal de las políticas (solo en la escala grande; docs/02 §4). */
export function advancePolicies(state: GameState): GameState {
  if (!policiesUnlocked(state)) return state;
  let next = applySalaryPolicy(state, state.policies.salary);
  if (state.policies.antiCrunch) next = applyAntiCrunch(next);
  if (state.policies.autoTraining) next = applyAutoTraining(next);
  if (state.policies.autoBonus) next = applyAutoBonus(next);
  return next;
}
