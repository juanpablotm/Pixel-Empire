import type { EraId } from './era';

/**
 * Tipos de la investigación (docs/02 §3): puntos 💡 que se acumulan al
 * desarrollar juegos y al asignar personal a I+D, y se gastan en un árbol de
 * desbloqueos gateado por era. Los nodos viven en data/research.ts.
 */

/**
 * Capacidades de estudio que puede mejorar un nodo (docs/02 §3: "motores
 * propios y capacidades de estudio"). Cada valor es un bonus aditivo sobre 1:
 * p. ej. devOutput 0.1 = +10 % de output semanal de los equipos.
 */
export type StudioCapability = 'devOutput' | 'qaEfficiency' | 'hypeGain' | 'researchSpeed';

/** Un nodo del árbol de investigación (data/research.ts). */
export interface ResearchNodeDef {
  id: string;
  name: string;
  description: string;
  /** Coste en puntos 💡. */
  cost: number;
  /** Primera era en la que puede investigarse (docs/02 §3: gateado por era). */
  era: EraId;
  /** Nodos que deben estar comprados antes. */
  requiresNodes?: string[];
  /** Mejoras de capacidad del estudio (bonus aditivos). */
  effects?: Partial<Record<StudioCapability, number>>;
}

/** Estado de la investigación dentro de GameState (docs/08 §5). */
export interface ResearchState {
  /** Puntos 💡 disponibles. */
  points: number;
  /** Ids de nodos ya investigados. */
  unlocked: string[];
  /** Empleados asignados a I+D (~1 💡 por persona·semana, docs/12 §6). */
  rdStaff: string[];
}
