import type { EraId } from './era';

/**
 * Tipos de la investigación (docs/02 §3): puntos 💡 que se acumulan al
 * desarrollar juegos y al asignar personal a I+D, y se gastan en un árbol de
 * desbloqueos gateado por era. Los nodos viven en data/research.ts.
 */

/**
 * Capacidades de estudio que puede mejorar un nodo (docs/02 §3). Desde la
 * Fase 9.2 el devOutput de los motores ya NO viene de nodos: lo aporta el
 * MOTOR del proyecto (balance.engines.devOutputByGeneration); los nodos de
 * arquitectura solo gatean qué generación se puede construir.
 * Cada valor es un bonus aditivo sobre 1:
 * p. ej. devOutput 0.1 = +10 % de capacidad semanal del equipo. Ojo: la
 * capacidad NO acorta el calendario (la duración la fija el tamaño del
 * proyecto); mejora la EJECUCIÓN en ese plazo (docs/02 §2 paso 3).
 */
export type StudioCapability = 'devOutput' | 'qaEfficiency' | 'hypeGain' | 'researchSpeed';

/**
 * Facetas del conocimiento de mercado que un nodo puede revelar globalmente
 * (docs/17 P2): la PISTA PREDICTIVA (saberlo antes de lanzar). El desglose de
 * reseña a posteriori nunca se paga (Pilar 2, docs/03). Cada faceta:
 *   · `fit`        → el medidor de Fit en vivo deja de estar "difuso" (docs/03 A).
 *   · `balance`    → el ideal Diseño/Técnica del género (docs/03 B).
 *   · `price`      → el precio recomendado por tamaño (docs/06 §2).
 *   · `featureFit` → el encaje feature×género al elegir features (9.3, docs/19 §9.3).
 */
export type MarketKnowledge = 'fit' | 'balance' | 'price' | 'featureFit';

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
  /** Faceta de conocimiento de mercado que revela globalmente (docs/17 P2). */
  reveals?: MarketKnowledge;
}

/** Estado de la investigación dentro de GameState (docs/08 §5). */
export interface ResearchState {
  /** Puntos 💡 disponibles. */
  points: number;
  /** Ids de nodos ya investigados. */
  unlocked: string[];
  /** Empleados asignados a I+D (~1 💡 por persona·semana, docs/12 §6). */
  rdStaff: string[];
  /**
   * Ids de temas desbloqueados con 💡 (docs/17 P1). Los temas "starter"
   * (balance.research.knowledge.starterThemes) NO se guardan aquí: son libres
   * desde el inicio. Un tema es usable si su era llegó y (es starter o está
   * en esta lista). Opcional: los saves previos arrancan con `?? []`.
   */
  themes?: string[];
  /**
   * Combos `themeId|genreId` cuya PISTA PREDICTIVA se aprendió al "Investigar
   * resultados" de un lanzamiento (docs/17 P2): revela el fit de ese combo y el
   * balance ideal de ese género, sin comprar el nodo global. Opcional: `?? []`.
   */
  insights?: string[];
  /**
   * Pares `featureId|genreId` cuyo ENCAJE se conoce (Fase 9.3, docs/19 §9.3).
   * Se aprenden GRATIS al lanzar: el desglose de reseña nombra qué features
   * encajaban y cuáles no (Pilar 2), así que ese conocimiento pasa a ser tuyo.
   * El nodo global 'teoriaDiseno' lo revela todo de golpe. Opcional: `?? []`.
   */
  featureInsights?: string[];
}
