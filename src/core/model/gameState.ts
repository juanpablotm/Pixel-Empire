import type { CommunityState } from './community';
import type { EraId } from './era';
import type { MarketState } from './market';
import type {
  ActiveScandal,
  CashflowEntry,
  DebtSource,
  LegacyTrackedStats,
  RegulationState,
  ReputationVector,
} from './moral';
import type { Project } from './project';
import type { ReleasedGame } from './release';
import type { Employee } from './staff';

export type { EraId };

/** Etapa de escala del estudio: garaje → corporación (docs/02 §4). */
export type ScaleStage = 1 | 2 | 3 | 4;

/** Datos del estudio (docs/09 §1): capital, reputación segmentada y deuda moral. */
export interface Studio {
  capital: number;
  /** Reputación por segmento 0..100 (docs/06 §1): vector, nunca un escalar. */
  reputation: ReputationVector;
  /** "Deuda de reputación" oculta total (docs/06 §5): escala los escándalos. */
  reputationDebt: number;
  /**
   * Desglose de la deuda por palanca de codicia. Suma = reputationDebt
   * (invariante mantenida por core/systems/morale.ts); hace que cada
   * escándalo sea trazable a una decisión concreta del jugador.
   */
  debtBySource: Partial<Record<DebtSource, number>>;
  /**
   * Deriva moral visible −1..1 para la Balanza "El Precio" (docs/10 §7.4):
   * las palancas de codicia la inclinan al 💰 (−), las de integridad al ⭐ (+).
   * Decae hacia 0 cada semana. No afecta a la simulación: es la conciencia.
   */
  moralDrift: number;
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
    | 'moral'
    | 'staff'
    | 'estudio'
    | 'mercado'
    | 'comunidad'
    | 'fin';
  text: string;
}

/**
 * Fin de partida: bancarrota (docs/06 §1: capital negativo sostenido) o
 * retiro voluntario para contemplar el Legado (docs/06 §6).
 */
export interface GameOverInfo {
  week: number;
  reason: 'bancarrota' | 'retiro';
}

/**
 * Estado completo de la partida. JSON plano y serializable: sin clases,
 * funciones ni valores no serializables (docs/08 §5 y §7).
 *
 * Fase 4: bucle núcleo + personal + mercado vivo + dilema moral y economía
 * completa. Las fases siguientes añadirán community y research (docs/08 §5).
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
  /** Principal vivo de la línea de crédito; 0 = sin deuda (docs/06 §4). */
  loanPrincipal: number;
  /** Escándalos en curso: penalizan ventas mientras duran (docs/06 §5). */
  scandals: ActiveScandal[];
  /** La capa social (docs/07): sentimiento, feed, creadores, bombing y crisis. */
  community: CommunityState;
  /** Presión y regulaciones promulgadas por era (docs/06 §5). */
  regulation: RegulationState;
  /** Contadores históricos para el Legado (docs/06 §6). */
  stats: LegacyTrackedStats;
  /** Libro de caja semanal para Finanzas (docs/10 §10.9); longitud acotada. */
  cashflow: CashflowEntry[];
  /** Contador para generar ids de proyecto únicos y deterministas. */
  projectCounter: number;
  /** Semanas consecutivas con capital negativo (bancarrota al agotar la gracia). */
  negativeWeeks: number;
  gameOver: GameOverInfo | null;
  log: LogEntry[];
}
