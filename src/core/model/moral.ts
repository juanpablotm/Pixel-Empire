import type { Segment } from './market';

/**
 * Tipos del dilema moral y la economía completa (docs/06 y docs/09 §9).
 * Todo serializable: vive dentro de GameState.
 */

/** Modelo de negocio de un juego (docs/09 §9). */
export type MonetizationModel = 'premium' | 'f2p' | 'premium+dlc' | 'premium+mtx';

/** Configuración de monetización de un proyecto/juego (docs/09 §9). */
export interface MonetizationConfig {
  model: MonetizationModel;
  /** 0..1 (0 = honesto, 1 = exprimidor). Solo pesa en modelos con MTX. */
  aggressiveness: number;
  hasLootBoxes: boolean;
  hasBattlePass: boolean;
  dayOneDLC: boolean;
}

/**
 * Fuente de "deuda de reputación" (docs/06 §5). Cada palanca de codicia
 * acumula deuda en su propia cuenta: el escándalo que estalle será del tipo
 * de la mayor fuente, para que siempre sea trazable a una decisión concreta.
 */
export type DebtSource =
  | 'crunch'
  | 'lootboxes'
  | 'dayOneDLC'
  | 'mtxAgresivas'
  | 'precioAbusivo'
  | 'refrito';

/** Un escándalo en curso: penaliza ventas mientras dura (docs/06 §5). */
export interface ActiveScandal {
  /** Tipo = fuente de deuda que lo provocó (data/scandals.ts). */
  source: DebtSource;
  startWeek: number;
  /** Semanas de efecto restantes; el escándalo expira al llegar a 0. */
  weeksLeft: number;
  /** Multiplicador de ventas mientras dura (< 1). */
  salesPenalty: number;
  /** Magnitud 0..1 con la que estalló (escala los efectos, para la UI/log). */
  magnitude: number;
}

/** Estado de la regulación por era (docs/04 §8 y docs/06 §5). */
export interface RegulationState {
  /** Presión regulatoria acumulada por id de regulación (data/regulations.ts). */
  pressure: Record<string, number>;
  /** Ids de regulaciones ya promulgadas (irreversibles). */
  enacted: string[];
}

/** Contadores históricos que alimentan la puntuación de Legado (docs/06 §6). */
export interface LegacyTrackedStats {
  /** Ingreso bruto acumulado de toda la partida (ventas + MTX). */
  totalRevenue: number;
  /** Máximo capital alcanzado (Riqueza). */
  peakCapital: number;
  /** Semanas totales de crunch con empleados afectados (Ética). */
  crunchWeeks: number;
  /** Escándalos estallados (Ética). */
  scandalCount: number;
  /** Lanzamientos que apostaron por una moda naciente (Impacto). */
  earlyTrendReleases: number;
  /** Empleados despedidos (Ética/empleador). */
  firedCount: number;
}

/** Una semana del libro de caja (docs/10 §10.9): flujos recurrentes del tick. */
export interface CashflowEntry {
  week: number;
  /** Ingresos del tick: ventas + MTX. */
  income: number;
  /** Costes recurrentes del tick: fijos + desarrollo + salarios + intereses. */
  expenses: number;
}

/** Perfil de Legado multi-dimensional (docs/06 §6), cada eje 0..100. */
export interface LegacyProfile {
  riqueza: number;
  prestigio: number;
  impacto: number;
  obras: number;
  etica: number;
  /** Nº de juegos con reseña 90+ (el dato crudo detrás de "obras"). */
  masterpieces: number;
  /** Frase-retrato del estudio según el eje dominante (data/legacyTexts.ts). */
  verdict: string;
}

/** Vector de reputación por segmento (docs/06 §1): nunca un escalar. */
export type ReputationVector = Record<Segment, number>;
