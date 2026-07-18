import { balance } from '../../data/balance';
import { getGenre } from '../../data/genres';
import { getResearchNode } from '../../data/research';
import type { GameState } from '../model/gameState';
import type { ProjectSize } from '../model/project';
import type { Employee, Specialty } from '../model/staff';
import { genreWeightedSkill01 } from './staff';

/**
 * El techo dinámico de calidad (Fase 9.1, docs/19 §9.1 y docs/03 §3):
 *   techoQ = min(capEra, capMadurez, capTalento, capTech)
 * más el encaje de alcance (ambición vs capacidad), que no es un techo sino un
 * multiplicador que hunde la Q cuando el estudio no llena el tamaño elegido.
 *
 * Este módulo calcula los términos que dependen del ESTUDIO (GameState);
 * computeQuality (quality.ts) recibe el resultado y sigue sin conocer el
 * estado global. Todo puro y determinista; los números en balance.quality.
 */

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Contexto de techo dinámico + alcance que consume computeQuality (docs/03 §3). */
export interface CeilingContext {
  /** Techos parciales, ya en puntos de Q (0..100). */
  capMadurez: number;
  capTalento: number;
  capTech: number;
  /** Términos crudos 0..1, para el desglose y los tests. */
  madurez01: number;
  mejorSkillClave01: number;
  techDepth01: number;
  /** Especialidad clave del género (el "rol" donde hace falta la estrella). */
  keySpecialty: Specialty;
  /** Encaje de alcance: poderEquipo / poderObjetivo(tamaño), y su factor sobre Q. */
  alcance01: number;
  alcanceFactor: number;
}

/**
 * Experiencia acumulada del estudio: cada lanzamiento suma según su tamaño y
 * cada etapa de escala aporta un plus. Es la materia prima de la madurez.
 */
export function studioExperience(state: GameState): number {
  const m = balance.quality.ceiling.maturity;
  const fromReleases = state.releasedGames.reduce((sum, g) => sum + m.sizeExp[g.size], 0);
  return fromReleases + m.stageExp[state.studio.scaleStage];
}

/** Madurez 0..1: curva saturante exp/(exp + halfway) — sube DESPACIO. */
export function maturity01(state: GameState): number {
  const exp = studioExperience(state);
  return exp / (exp + balance.quality.ceiling.maturity.halfway);
}

/** La especialidad con más peso en el género: donde una estrella marca el techo. */
export function keySpecialtyOf(genreId: string): Specialty {
  const weights = getGenre(genreId).specialtyWeights;
  let best: Specialty = 'diseno';
  for (const spec of Object.keys(weights) as Specialty[]) {
    if (weights[spec] > weights[best]) best = spec;
  }
  return best;
}

/** La mejor skill de la especialidad clave entre los asignados (0..1). */
export function bestKeySkill01(team: readonly Employee[], keySpecialty: Specialty): number {
  return team.reduce((best, e) => Math.max(best, e.skills[keySpecialty]), 0) / 100;
}

/**
 * Profundidad tecnológica 0..1: suma de `techValue` de los nodos comprados
 * contra el objetivo de la era. Objetivo 0 (E1) = sin expectativa: completa.
 */
export function techDepth01(state: GameState): number {
  const t = balance.quality.ceiling.tech;
  const target = t.targetByEra[state.era];
  if (target <= 0) return 1;
  const points = state.research.unlocked.reduce(
    (sum, id) => sum + (getResearchNode(id).techValue ?? 0),
    0,
  );
  return clamp01(points / target);
}

/** Poder del equipo asignado: Σ skill ponderada por género (cuerpos Y talento). */
export function teamPower(team: readonly Employee[], genreId: string): number {
  return team.reduce((sum, e) => sum + genreWeightedSkill01(e, genreId), 0);
}

/**
 * Contexto completo del techo dinámico para un lanzamiento: madurez, mejor
 * talento en el rol clave, adecuación tecnológica y encaje de alcance.
 */
export function computeCeilingContext(
  state: GameState,
  team: readonly Employee[],
  genreId: string,
  size: ProjectSize,
): CeilingContext {
  const c = balance.quality.ceiling;
  const s = balance.quality.scope;

  const madurez = maturity01(state);
  const keySpecialty = keySpecialtyOf(genreId);
  const mejorSkill = bestKeySkill01(team, keySpecialty);
  const tech = techDepth01(state);

  const alcance01 = clamp01(teamPower(team, genreId) / s.powerTarget[size]);
  const alcanceFactor = Math.max(s.floor, alcance01 ** s.exponent);

  return {
    capMadurez: c.maturity.min + (c.maturity.max - c.maturity.min) * madurez,
    capTalento: c.talent.min + c.talent.span * mejorSkill,
    capTech: c.tech.min + c.tech.span * tech,
    madurez01: madurez,
    mejorSkillClave01: mejorSkill,
    techDepth01: tech,
    keySpecialty,
    alcance01,
    alcanceFactor,
  };
}
