import type { Segment } from '../core/model/market';
import type { MonetizationConfig } from '../core/model/moral';
import type { Audience } from '../core/model/project';

/**
 * Segmentos de público (docs/06 §1 y docs/04 §5): cada público valora cosas
 * distintas. Aquí viven sus datos: pesos de la reputación agregada, sesgos de
 * reseña (género, público, monetización) y etiquetas. Los 6 segmentos tienen
 * reputación (Fase 4); reseñan 4 (comunidad opina en Fase 5; empleador no
 * reseña: es el talento, docs/05 §7).
 */

/** Sesgo de reseña por monetización (docs/04 §5): puntos ± sobre 0–100. */
export interface MonetizationBias {
  /** × agresividad, solo en modelos con MTX (premium+mtx, f2p). */
  perAggression: number;
  lootBoxes: number;
  battlePass: number;
  dayOneDLC: number;
  /** Sesgo plano si el modelo es F2P (gratis atrae a unos, espanta a otros). */
  f2p: number;
}

export interface SegmentDef {
  id: Segment;
  name: string;
  /** Peso en la reputación agregada (docs/06 §1); los 6 suman 1. */
  repWeight: number;
  /** Peso en la reseña media (docs/04 §6); solo pesa en los que reseñan. */
  weight: number;
  /** Puntos ± por género: a cada público le gustan cosas distintas. */
  genreBias: Record<string, number>;
  /** Puntos ± según el público objetivo del juego. */
  audienceBias: Partial<Record<Audience, number>>;
  /** Puntos ± según el modelo de negocio (docs/06 §2: víctimas concretas). */
  monetizationBias: MonetizationBias;
}

const noMonetizationBias: MonetizationBias = {
  perAggression: 0,
  lootBoxes: 0,
  battlePass: 0,
  dayOneDLC: 0,
  f2p: 0,
};

/** Los 6 segmentos con reputación (docs/06 §1). */
export const segments: readonly SegmentDef[] = [
  {
    id: 'critica',
    name: 'Crítica',
    repWeight: 0.2,
    weight: 0.3,
    // La crítica profesional juzga la obra, no la moda: sin sesgos de género.
    genreBias: {},
    audienceBias: {},
    // La monetización mancha la obra, pero no es su vara de medir principal.
    monetizationBias: { perAggression: -3, lootBoxes: -2, battlePass: 0, dayOneDLC: -2, f2p: 0 },
  },
  {
    id: 'prensa',
    name: 'Prensa',
    repWeight: 0.15,
    weight: 0.2,
    genreBias: { aventura: 1 },
    audienceBias: { amplio: 2 },
    monetizationBias: { perAggression: -2, lootBoxes: -2, battlePass: -1, dayOneDLC: -2, f2p: 0 },
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    repWeight: 0.2,
    weight: 0.25,
    genreBias: {
      rpg: 5,
      estrategia: 4,
      aventura: 1,
      puzzle: -5,
      shooter: 2,
      simulacion: 2,
      sandbox: 2,
      battleRoyale: 2,
      ritmo: -3,
      deportivo: -2,
    },
    audienceBias: { hardcore: 3, casual: -4, infantil: -6 },
    // "No pay-to-win" (docs/06 §1): la monetización agresiva los enfurece.
    monetizationBias: { perAggression: -10, lootBoxes: -8, battlePass: -3, dayOneDLC: -6, f2p: -2 },
  },
  {
    id: 'casual',
    name: 'Casual',
    repWeight: 0.15,
    weight: 0.25,
    genreBias: {
      puzzle: 5,
      aventura: 2,
      rpg: -3,
      estrategia: -5,
      ritmo: 3,
      plataformas: 2,
      deportivo: 2,
      carreras: 1,
      terror: -4,
      simulacion: -2,
    },
    audienceBias: { casual: 3, infantil: 1, hardcore: -4 },
    // "Los Casual apenas lo notan" (docs/06 §1); lo gratis les encanta.
    monetizationBias: { perAggression: -2, lootBoxes: -1, battlePass: 0, dayOneDLC: -1, f2p: 3 },
  },
  {
    id: 'comunidad',
    name: 'Comunidad',
    repWeight: 0.15,
    weight: 0,
    genreBias: {},
    audienceBias: {},
    monetizationBias: noMonetizationBias,
  },
  {
    id: 'empleador',
    name: 'Empleador',
    repWeight: 0.15,
    weight: 0,
    genreBias: {},
    audienceBias: {},
    monetizationBias: noMonetizationBias,
  },
];

/** Segmentos que emiten reseña al lanzar (docs/04 §5). */
export const reviewSegments: readonly SegmentDef[] = segments.filter((s) => s.weight > 0);

export function getSegmentDef(id: Segment): SegmentDef {
  const segment = segments.find((s) => s.id === id);
  if (!segment) throw new Error(`Segmento sin definición: ${id}`);
  return segment;
}

/** Sesgo total de reseña por monetización para un segmento (docs/04 §5). */
export function monetizationReviewBias(def: SegmentDef, config: MonetizationConfig): number {
  const b = def.monetizationBias;
  const hasMtx = config.model === 'premium+mtx' || config.model === 'f2p';
  return (
    (hasMtx ? b.perAggression * config.aggressiveness : 0) +
    (config.hasLootBoxes ? b.lootBoxes : 0) +
    (config.hasBattlePass ? b.battlePass : 0) +
    (config.dayOneDLC ? b.dayOneDLC : 0) +
    (config.model === 'f2p' ? b.f2p : 0)
  );
}
