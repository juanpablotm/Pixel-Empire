/** Identificador de era (E1 = garaje ~1980 … E7 = futuro cercano; ver docs/02 §5). */
export type EraId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7';

/** Datos del estudio. Fase 0: solo capital; crecerá según docs/09 §1. */
export interface Studio {
  capital: number;
}

/**
 * Estado completo de la partida. JSON plano y serializable: sin clases,
 * funciones ni valores no serializables (docs/08 §5 y §7).
 *
 * Fase 0: versión mínima. Las fases siguientes añadirán staff, projects,
 * market, community, research y log según docs/08 §5.
 */
export interface GameState {
  seed: number;
  /** Tiempo en ticks (1 tick = 1 semana). */
  week: number;
  era: EraId;
  studio: Studio;
}
