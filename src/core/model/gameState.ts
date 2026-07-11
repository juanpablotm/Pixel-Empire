import type { EraId } from './era';
import type { MarketState } from './market';
import type { Project } from './project';
import type { ReleasedGame } from './release';
import type { Employee } from './staff';

export type { EraId };

/** Etapa de escala del estudio: garaje → corporación (docs/02 §4). */
export type ScaleStage = 1 | 2 | 3 | 4;

/** Datos del estudio. Fase 2: capital + etapa de escala (reputación en Fase 4, docs/09 §1). */
export interface Studio {
  capital: number;
  scaleStage: ScaleStage;
}

/** Entrada del historial de eventos para la UI y el Legado (docs/08 §5). */
export interface LogEntry {
  week: number;
  type:
    | 'proyecto'
    | 'fase'
    | 'lanzamiento'
    | 'ventas'
    | 'economia'
    | 'staff'
    | 'estudio'
    | 'mercado'
    | 'fin';
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
 * Fase 3: bucle núcleo + personal + mercado vivo. Las fases siguientes
 * añadirán community y research según docs/08 §5.
 */
export interface GameState {
  seed: number;
  /** Tiempo en ticks (1 tick = 1 semana). */
  week: number;
  era: EraId;
  studio: Studio;
  /** Plantilla del estudio; staff[0] es siempre el fundador (docs/05). */
  staff: Employee[];
  /** Pool de contratación; vacío en el garaje (docs/05 §6). */
  candidates: Employee[];
  /** Proyectos en desarrollo. En el garaje (etapa 1) solo puede haber uno. */
  projects: Project[];
  releasedGames: ReleasedGame[];
  /** Mercado vivo: popularidades, saturación y plataformas (docs/04). */
  market: MarketState;
  /** Contador para generar ids de proyecto únicos y deterministas. */
  projectCounter: number;
  /** Semanas consecutivas con capital negativo (bancarrota al agotar la gracia). */
  negativeWeeks: number;
  gameOver: GameOverInfo | null;
  log: LogEntry[];
}
