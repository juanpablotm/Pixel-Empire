import type { EraId } from './era';
import type { Project } from './project';
import type { ReleasedGame } from './release';

export type { EraId };

/** Datos del estudio. Fase 1: solo capital; crecerá según docs/09 §1 (reputación en Fase 4). */
export interface Studio {
  capital: number;
}

/** Entrada del historial de eventos para la UI y el Legado (docs/08 §5). */
export interface LogEntry {
  week: number;
  type: 'proyecto' | 'fase' | 'lanzamiento' | 'ventas' | 'economia' | 'fin';
  text: string;
}

/** Fin de partida (docs/06 §1: capital negativo sostenido = bancarrota). */
export interface GameOverInfo {
  week: number;
  reason: 'bancarrota';
}

/**
 * Estado completo de la partida. JSON plano y serializable: sin clases,
 * funciones ni valores no serializables (docs/08 §5 y §7).
 *
 * Fase 1: bucle núcleo del garaje. Las fases siguientes añadirán staff,
 * candidates, market, community y research según docs/08 §5.
 */
export interface GameState {
  seed: number;
  /** Tiempo en ticks (1 tick = 1 semana). */
  week: number;
  era: EraId;
  studio: Studio;
  /** Proyectos en desarrollo. En el garaje (etapa 1) solo puede haber uno. */
  projects: Project[];
  releasedGames: ReleasedGame[];
  /** Contador para generar ids de proyecto únicos y deterministas. */
  projectCounter: number;
  /** Semanas consecutivas con capital negativo (bancarrota al agotar la gracia). */
  negativeWeeks: number;
  gameOver: GameOverInfo | null;
  log: LogEntry[];
}
