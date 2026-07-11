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
  /** Calidad Real Q, 0..100 (docs/03). */
  quality: number;
  /** Reseña pública 0..100. Fase 1: igual a Q (sin modas, hype ni segmentos aún). */
  review: number;
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
  /** false cuando las ventas semanales caen bajo el umbral y el juego sale del mercado. */
  salesActive: boolean;
}
