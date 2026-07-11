import type { Segment } from './market';
import type { DebtSource } from './moral';

/**
 * Tipos de la capa social (docs/07 y docs/09 §8–§10): sentimiento de
 * comunidad, feed de posts, campañas de creadores, review bombing y crisis.
 * Todo serializable: vive dentro de GameState.
 */

// ---------------------------------------------------------------------------
// Feed y sentimiento (docs/07 §2 y docs/10 §7.3)
// ---------------------------------------------------------------------------

export type PostMood = 'positivo' | 'negativo' | 'neutro';

/** Un post del muro social simulado ("Chirp"), generado por plantillas. */
export interface CommunityPost {
  week: number;
  mood: PostMood;
  /** Handle ficticio del autor (sabor, elegido por el PRNG). */
  author: string;
  text: string;
  hashtag?: string;
}

// ---------------------------------------------------------------------------
// Creadores de contenido (docs/07 §3 y docs/09 §8)
// ---------------------------------------------------------------------------

/** Arquetipos cerrados (docs/12 §7); 'revista' es la forma E1–E3 de la prensa. */
export type CreatorArchetype =
  | 'revista'
  | 'variedades'
  | 'competitivo'
  | 'vtuber'
  | 'critico'
  | 'influencer';

/** Resultado legible del "directo" de un creador con clave (docs/07 §3). */
export type StreamTier = 'exito' | 'tibio' | 'desastre';

/** Lo que pasó cuando un creador jugó tu juego (docs/10 §7.2, el Directo). */
export interface StreamResult {
  creatorId: string;
  /** resultadoCreador 0..1 = fit × factorCalidad × factorBugs (docs/07 §3). */
  outcome: number;
  fit: number;
  qualityFactor: number;
  bugFactor: number;
  tier: StreamTier;
  /** Bug ridículo en directo: momento viral negativo (docs/07 §3). */
  liveBug: boolean;
  /** Empuje que aportó al pico de ventas (proporción sobre el pico). */
  salesBoost: number;
}

// ---------------------------------------------------------------------------
// Review bombing (docs/07 §5): estado TEMPORAL, nunca permanente
// ---------------------------------------------------------------------------

/** Causa de una crisis: las fuentes de deuda de docs/06 + las nativas de docs/07. */
export type CrisisCause = DebtSource | 'bugEnDirecto' | 'promesaRota';

/** Bombardeo de reseñas en curso: hunde nota visible y ventas mientras dura. */
export interface ReviewBomb {
  gameId: string;
  cause: CrisisCause;
  startWeek: number;
  /** Semanas de bombardeo restantes; expira al llegar a 0 ("amaina"). */
  weeksLeft: number;
  /** Puntos que resta a la nota visible mientras dura (la real no cambia). */
  reviewPenalty: number;
  /** Multiplicador de ventas del juego bombardeado (< 1). */
  salesPenalty: number;
}

// ---------------------------------------------------------------------------
// Crisis con reloj (docs/07 §5 y docs/10 §10.8)
// ---------------------------------------------------------------------------

export type CrisisResponseId = 'silencio' | 'disculpa' | 'corporativo' | 'culpar' | 'revertir';

/**
 * Desenlaces: 'gestionada' (respuesta activa), 'amainada' (silencio con la
 * comunidad de tu lado) o 'podrida' (silencio siendo odiado, o ignorarla).
 */
export type CrisisStatus = 'abierta' | 'gestionada' | 'amainada' | 'podrida';

/** Un evento de crisis con reloj: empeora si no actúas (docs/07 §5). */
export interface ActiveCrisis {
  id: string;
  cause: CrisisCause;
  /** Juego señalado (null en escándalos sin juego concreto, p. ej. crunch). */
  gameId: string | null;
  startWeek: number;
  /** El reloj: sin respuesta al llegar aquí, el desenlace se fuerza (tarde y peor). */
  deadlineWeek: number;
  /** Severidad 0..1 al estallar (ya amortiguada por la reputación previa). */
  severity: number;
  status: CrisisStatus;
  responseId?: CrisisResponseId;
  resolvedWeek?: number;
}

// ---------------------------------------------------------------------------
// Dilemas de pre-lanzamiento (docs/07 §4)
// ---------------------------------------------------------------------------

export type DilemmaKind = 'leakAlpha' | 'sobreHype';

/** Un dilema pendiente de decisión del jugador (pausa el juego). */
export interface PendingDilemma {
  kind: DilemmaKind;
  projectId: string;
  week: number;
}

// ---------------------------------------------------------------------------
// Estado agregado
// ---------------------------------------------------------------------------

/** La capa social del estudio (docs/07); parte de GameState desde Fase 5. */
export interface CommunityState {
  /** Termómetro de sentimiento 0..100 (docs/07 §2): el humor, rápido; la
   * reputación de comunidad (docs/06) es el poso lento al que revierte. */
  sentiment: number;
  /** Feed de posts generados, acotado (docs/10 §7.3). */
  feed: CommunityPost[];
  /** Crisis activas y resueltas recientes (historial corto para la UI). */
  crises: ActiveCrisis[];
  /** Review bombings activos. */
  bombs: ReviewBomb[];
  /** Dilemas esperando decisión. */
  dilemmas: PendingDilemma[];
  /** Dilemas ya disparados por proyecto (no se repiten). */
  firedDilemmas: Record<string, DilemmaKind[]>;
}

/** Deltas de reputación de una respuesta de crisis (puntos ± por segmento). */
export type CrisisRepDeltas = Partial<Record<Segment, number>>;
