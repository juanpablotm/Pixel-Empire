import type { StreamResult } from './community';
import type { ReviewMarketInfo, Segment } from './market';
import type { MonetizationConfig } from './moral';
import type { Audience, ProjectSize } from './project';

/**
 * Tipos del juego lanzado y de la descomposición de calidad (docs/03 y docs/09 §1).
 * Todo serializable: el desglose legible se genera al lanzar y se guarda con el juego.
 */

/** Tono de una línea del desglose: ✔ (good) / ~ (ok) / ✘ (bad) — docs/03 §5. */
export type FactorTone = 'good' | 'ok' | 'bad';

/** Factor de calidad al que mapea cada línea del desglose (docs/03 §2–3).
 * Desde 9.1 el desglose también explica el techo dinámico, el encaje de
 * alcance y los ajustes de mercado (listón de época, fatiga, banda). */
export type QualityFactor =
  | 'fit'
  | 'balance'
  | 'features'
  | 'polish'
  | 'team'
  | 'innovation'
  | 'ceiling'
  | 'scope'
  | 'eraBar'
  | 'fatigue'
  | 'band';

/** Una línea legible del desglose de reseña (docs/03 §5). */
export interface ReviewLine {
  factor: QualityFactor;
  tone: FactorTone;
  title: string;
  detail: string;
}

/** Descomposición numérica de Q, factor a factor (docs/03 §7, CA). */
export interface QualityBreakdown {
  /** Factor A — Fit, 0..1, y sus partes. */
  fit: number;
  fitParts: { themeGenre: number; genrePlatform: number; audience: number };
  /** Factor B — Balance Diseño/Técnica, 0..1. */
  balanceScore: number;
  dReal: number;
  dIdeal: number;
  /** Factor C — Features y alcance, 0..1. */
  featureScore: number;
  /** Factor D — Pulido, 0..1 (polishScore = 1 - bugLevel). */
  polishScore: number;
  bugLevel: number;
  /** Factor E — Multiplicador de equipo (rango típico 0.5–1.3). */
  teamFactor: number;
  /** Descomposición legible del teamFactor (Fase 2+; docs/03 factor E). */
  teamParts?: { competenceFactor: number; moraleFactor: number; synergyFactor: number };
  /** Modificador de innovación (0.9–1.15). */
  innovationMod: number;
  /** Media ponderada de A–D antes de multiplicadores. */
  base: number;
  /** Techo de calidad aplicado (docs/03 §3): desde 9.1, el mínimo de los parciales. */
  qualityCap: number;
  /**
   * Fase 9.1 — techo dinámico y alcance (docs/19 §9.1). Opcionales para que
   * los juegos de saves previos (y los breakdowns construidos en tests/demos)
   * sigan siendo válidos.
   */
  capParts?: { era: number; madurez: number; talento: number; tech: number };
  /** El techo parcial que manda (el mínimo): siempre hay UNA razón nombrable. */
  capBinding?: 'era' | 'madurez' | 'talento' | 'tech';
  /** Rol clave del género (donde el techo pide una estrella). */
  keySpecialty?: string;
  /** Encaje de alcance: poderEquipo/poderObjetivo (0..1) y su factor sobre Q. */
  alcance01?: number;
  alcanceFactor?: number;
}

export interface ReleasedGame {
  /** Igual al id del proyecto de origen. */
  id: string;
  name: string;
  themeId: string;
  genreId: string;
  platformId: string;
  audience: Audience;
  size: ProjectSize;
  price: number;
  /** Modelo de negocio con el que se lanzó (docs/09 §9); inmutable tras lanzar. */
  monetization: MonetizationConfig;
  /** Calidad Real Q, 0..100 (docs/03). */
  quality: number;
  /** Reseña media 0..100: media ponderada de los segmentos (docs/04 §5–6). */
  review: number;
  /** Reseña por segmento (docs/04 §5); solo los segmentos activos de data/segments.ts. */
  reviewsBySegment: Partial<Record<Segment, number>>;
  /** Ajustes de mercado sobre Q, guardados para explicar la reseña (docs/04 §5). */
  reviewMarket: ReviewMarketInfo;
  /** Hype acumulado al lanzar, 0..1 (docs/04 §4): pico inicial + reseña más dura. */
  hypeAtRelease: number;
  /** Saturación efectiva del combo al lanzar (docs/04 §3 y docs/09 §1). */
  saturationAtRelease: number;
  /** Frase-veredicto de la reseña (data/reviewTexts.ts). */
  verdict: string;
  breakdown: QualityBreakdown;
  /** Desglose legible, generado al lanzar (docs/03 §5). */
  lines: ReviewLine[];
  releaseWeek: number;
  /** Unidades vendidas por semana desde el lanzamiento. */
  weeklySales: number[];
  totalUnits: number;
  totalRevenue: number;
  /** Parte de totalRevenue que vino de microtransacciones (docs/06 §4). */
  mtxRevenue: number;
  /**
   * Coste atribuible al juego, fijado al lanzar (docs/17 U4): licencia de
   * plataforma + desarrollo (semanas·coste) + marketing comprado. Alimenta el
   * P&L del aviso "sale del mercado" (generó vs costó). No incluye la nómina
   * general del estudio, que es un coste compartido entre proyectos. Opcional
   * para que los juegos de fases/saves previos sigan siendo válidos.
   */
  cost?: number;
  /** false cuando las ventas semanales caen bajo el umbral y el juego sale del mercado. */
  salesActive: boolean;
  /**
   * Fase 5 (docs/07). Opcionales para que los juegos de fases/saves previos
   * sigan siendo válidos: los directos de la campaña de creadores, el empuje
   * que aportaron al pico de ventas y si el marketing prometió de más.
   */
  streams?: StreamResult[];
  creatorSpikeBoost?: number;
  overPromised?: boolean;
  /**
   * Castigo por sobre-hype fijado al lanzar (docs/17 E2): 0..1 que reduce la
   * COLA de ventas cuando el hype entró en zona roja y el juego no cumplió
   * (× 1 − overHypeTailPenalty sobre el término de cola en expectedWeeklyUnits).
   * El pico day-one no se toca. Opcional: los juegos de saves previos son 0.
   */
  overHypeTailPenalty?: number;
  /**
   * Reencuadre de trayectoria (Fase 9.1, docs/19 §9.1): un 45 temprano es un
   * logro. `personalBest` = superó (o igualó, siendo el primero) el récord del
   * estudio; `previousBestReview` = el récord anterior, para la frase "supera
   * tu mejor juego (52)". Opcionales: saves previos no los llevan.
   */
  personalBest?: boolean;
  previousBestReview?: number;
}
