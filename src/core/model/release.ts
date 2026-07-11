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

/** Factor de calidad al que mapea cada línea del desglose (docs/03 §2–3). */
export type QualityFactor = 'fit' | 'balance' | 'features' | 'polish' | 'team' | 'innovation';

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
  /** Techo de calidad de la era aplicado (docs/03 §3). */
  qualityCap: number;
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
}
