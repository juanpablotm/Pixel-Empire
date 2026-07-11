import type { Segment } from '../core/model/market';
import type { Audience } from '../core/model/project';

/**
 * Segmentos de público que reseñan en Fase 3 (docs/04 §5): cada público
 * juzga distinto. Los sesgos son puntos ± sobre la reseña base (escala
 * 0–100). En Fase 4 se añadirá el sesgo por monetización (docs/06) y en
 * Fase 5 el segmento comunidad (docs/07).
 */
export interface SegmentDef {
  id: Segment;
  name: string;
  /** Peso en la reseña media (docs/04 §6: factorReseña usa la media). */
  weight: number;
  /** Puntos ± por género: a cada público le gustan cosas distintas. */
  genreBias: Record<string, number>;
  /** Puntos ± según el público objetivo del juego. */
  audienceBias: Partial<Record<Audience, number>>;
}

export const reviewSegments: readonly SegmentDef[] = [
  {
    id: 'critica',
    name: 'Crítica',
    weight: 0.3,
    // La crítica profesional juzga la obra, no la moda: sin sesgos de género.
    genreBias: {},
    audienceBias: {},
  },
  {
    id: 'prensa',
    name: 'Prensa',
    weight: 0.2,
    genreBias: { aventura: 1 },
    audienceBias: { amplio: 2 },
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    weight: 0.25,
    genreBias: { rpg: 5, estrategia: 4, aventura: 1, puzzle: -5 },
    audienceBias: { hardcore: 3, casual: -4, infantil: -6 },
  },
  {
    id: 'casual',
    name: 'Casual',
    weight: 0.25,
    genreBias: { puzzle: 5, aventura: 2, rpg: -3, estrategia: -5 },
    audienceBias: { casual: 3, infantil: 1, hardcore: -4 },
  },
];

export function getSegmentDef(id: Segment): SegmentDef {
  const segment = reviewSegments.find((s) => s.id === id);
  if (!segment) throw new Error(`Segmento sin definición de reseña: ${id}`);
  return segment;
}
