import { balance } from '../../data/balance';
import { segments } from '../../data/segments';
import type { Studio } from '../model/gameState';
import type { Segment } from '../model/market';
import type { ReputationVector } from '../model/moral';
import type { ReleasedGame } from '../model/release';

/**
 * Reputación segmentada (docs/06 §1): un vector 0..100 por segmento, nunca un
 * escalar. Aquí viven las operaciones del vector: agregado ponderado, deltas
 * con asimetría (lenta de construir, rápida de perder, docs/06 §3), la
 * reacción a las reseñas y los modificadores que la reputación proyecta sobre
 * ventas y contratación.
 */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clampRep = (value: number): number => clamp(value, 0, 100);

/** Redondeo a 2 decimales: mantiene el estado legible y serializable estable. */
const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Vector inicial: un estudio desconocido es neutro para todos (data/balance.ts). */
export function initialReputation(): ReputationVector {
  const rep = {} as ReputationVector;
  for (const segment of segments) rep[segment.id] = balance.reputation.initial;
  return rep;
}

/** Reputación agregada 0..100: media ponderada por los pesos de data/segments.ts. */
export function aggregateReputation(rep: ReputationVector): number {
  let weighted = 0;
  let total = 0;
  for (const segment of segments) {
    weighted += segment.repWeight * (rep[segment.id] ?? balance.reputation.initial);
    total += segment.repWeight;
  }
  return weighted / total;
}

/** Deltas de reputación por segmento (puntos ±, antes de la asimetría). */
export type ReputationDeltas = Partial<Record<Segment, number>>;

/**
 * Aplica deltas al vector con la asimetría de docs/06 §3: las pérdidas se
 * multiplican por lossMultiplier (perder es más rápido que ganar).
 */
export function applyReputationDeltas(rep: ReputationVector, deltas: ReputationDeltas): ReputationVector {
  const next = { ...rep };
  for (const [segment, delta] of Object.entries(deltas) as [Segment, number][]) {
    if (delta === 0) continue;
    const effective = delta < 0 ? delta * balance.reputation.lossMultiplier : delta;
    next[segment] = round2(clampRep((next[segment] ?? balance.reputation.initial) + effective));
  }
  return next;
}

/** Suma de dos mapas de deltas (para componer palancas antes de aplicar). */
export function mergeDeltas(a: ReputationDeltas, b: ReputationDeltas): ReputationDeltas {
  const merged: ReputationDeltas = { ...a };
  for (const [segment, delta] of Object.entries(b) as [Segment, number][]) {
    merged[segment] = (merged[segment] ?? 0) + delta;
  }
  return merged;
}

/**
 * Reacción de la reputación a las reseñas de un lanzamiento (docs/06 §3):
 * cada segmento que reseña mueve SU reputación según su propia nota; la
 * comunidad reacciona a la media. Lenta de construir: ganancias con tope.
 */
export function reputationDeltasFromReviews(game: ReleasedGame): ReputationDeltas {
  const r = balance.reputation.review;
  const c = balance.reputation.communityReview;
  const deltas: ReputationDeltas = {};

  for (const [segment, score] of Object.entries(game.reviewsBySegment) as [Segment, number][]) {
    deltas[segment] = clamp((score - r.neutral) / r.divisor, -r.maxLoss, r.maxGain);
  }
  deltas.comunidad = clamp((game.review - r.neutral) / c.divisor, -c.maxLoss, c.maxGain);
  return deltas;
}

/**
 * Colchón de comunidad en ventas (docs/06 §3): una comunidad que te adora
 * compra a ciegas y perdona; una que te odia castiga el catálogo entero.
 */
export function communitySalesModifier(studio: Studio): number {
  const rep = studio.reputation.comunidad ?? balance.reputation.initial;
  return 1 + balance.reputation.communitySalesCoef * ((rep - 50) / 50);
}

/**
 * Modificadores del pool de contratación por reputación de empleador
 * (docs/05 §7): un estudio querido atrae mejor talento y más barato.
 */
export function employerPoolModifiers(employerRep: number): {
  /** Multiplicador de la probabilidad de candidatos senior/estrella. */
  tierFactor: number;
  /** Prima (o descuento) sobre el salario exigido. */
  salaryPremium: number;
} {
  const e = balance.reputation.employer;
  const t = clamp(employerRep, 0, 100) / 100;
  // Prima salarial neutra (×1) con rep 50: por debajo exigen prima, por encima
  // aceptan descuento (piecewise para que el estudio "normal" no note nada).
  const salaryPremium =
    t <= 0.5
      ? e.salaryPremiumMax + (1 - e.salaryPremiumMax) * (t / 0.5)
      : 1 + (e.salaryPremiumMin - 1) * ((t - 0.5) / 0.5);
  return {
    tierFactor: e.tierFactorMin + (e.tierFactorMax - e.tierFactorMin) * t,
    salaryPremium,
  };
}

/** Aplica deltas de reputación a un Studio (azúcar para las acciones/sistemas). */
export function withReputationDeltas(studio: Studio, deltas: ReputationDeltas): Studio {
  return { ...studio, reputation: applyReputationDeltas(studio.reputation, deltas) };
}
