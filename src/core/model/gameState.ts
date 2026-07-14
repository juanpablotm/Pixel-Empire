import type { Award } from './awards';
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
import type { StudioPolicies } from './policies';
import type { Project } from './project';
import type { ReleasedGame } from './release';
import type { ResearchState } from './research';
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
  /** Premios anuales ganados (docs/06 §7). */
  awards: Award[];
  /**
   * Hype pendiente para el próximo proyecto por los premios recién ganados
   * (docs/06 §7: "hype para el próximo proyecto"). Se consume al concebir.
   */
  awardHype: number;
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
    | 'era'
    | 'investigacion'
    | 'premios'
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
 * Fase 6: bucle núcleo + personal + mercado vivo + dilema moral + comunidad +
 * eras completas, escala hasta corporación, investigación y premios anuales.
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
  /**
   * Proyectos en desarrollo. El aforo depende de la etapa de escala
   * (docs/02 §4): 1 hasta el estudio pequeño; varios en paralelo desde el
   * estudio consolidado (balance.staff.scale.projectCapByStage).
   */
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
  /** Puntos 💡, árbol desbloqueado y personal en I+D (docs/02 §3). */
  research: ResearchState;
  /** Gestión por políticas en la escala grande (docs/02 §4 y docs/10 §14). */
  policies: StudioPolicies;
  /** Contadores históricos para el Legado (docs/06 §6). */
  stats: LegacyTrackedStats;
  /** Libro de caja semanal para Finanzas (docs/10 §10.9); longitud acotada. */
  cashflow: CashflowEntry[];
  /** Contador para generar ids de proyecto únicos y deterministas. */
  projectCounter: number;
  /** Semanas consecutivas con capital negativo (bancarrota al agotar la gracia). */
  negativeWeeks: number;
  /**
   * Semanas de los despidos recientes (docs/17 E3): ventana móvil para detectar
   * despidos masivos (3+ en 8 semanas → golpe a Empleador/Comunidad). Se poda a
   * la ventana en cada despido. Opcional: los saves previos arrancan sin él y se
   * leen con `?? []` (mismo patrón que Project.startWeek / ReleasedGame.cost).
   */
  recentFireWeeks?: number[];
  gameOver: GameOverInfo | null;
  log: LogEntry[];
}
