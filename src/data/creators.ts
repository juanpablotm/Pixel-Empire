import type { CreatorArchetype } from '../core/model/community';
import type { EraId } from '../core/model/era';
import type { Segment } from '../core/model/market';
import type { Audience } from '../core/model/project';

/**
 * Roster de creadores de contenido (docs/07 §3 y docs/09 §8). Arquetipos
 * cerrados en docs/12 §7; en E1–E3 los "creadores" son revistas/prensa y
 * personajes de la tele/radio de la época con el mismo comportamiento.
 *
 * v1: el grueso del roster está disponible desde E1 para que el casting sea
 * jugable ya (mismo criterio que la monetización, ver data/monetization.ts);
 * la Fase 6 re-gateará por era con los `unlocks` de docs/09 §7 (los streamers
 * y VTubers llegan históricamente en E5–E6).
 */

export interface CreatorDef {
  id: string;
  name: string;
  archetype: CreatorArchetype;
  /** Qué le encanta y con qué te la juegas (UI del casting, docs/07 §3). */
  description: string;
  /** Tamaño de audiencia, en unidades de alcance (docs/09 §8). */
  reach: number;
  /** A qué segmentos llega su público (proporciones; suman ≈ 1). */
  targetSegments: Partial<Record<Segment, number>>;
  /** Cuán duro juzga, 0..1 (docs/09 §8): sube el listón de calidad. */
  demandingness: number;
  /** Afinidad 0..1 con cada género (0.5 = neutro si falta). */
  genreAffinity: Record<string, number>;
  /** Afinidad 0..1 con el público objetivo del juego (0.5 = neutro si falta). */
  audienceAffinity: Partial<Record<Audience, number>>;
  /** Coste de conseguir que acepte la clave (docs/09 §8). */
  acquisitionCost: number;
  appearsInEra: EraId;
}

export const creators: readonly CreatorDef[] = [
  {
    id: 'pixelSemanal',
    name: 'PixelSemanal',
    archetype: 'revista',
    description:
      'La revista seria del gremio. Valora el oficio; llega a la prensa y a la crítica.',
    reach: 900,
    targetSegments: { prensa: 0.5, critica: 0.35, hardcore: 0.15 },
    demandingness: 0.55,
    genreAffinity: { rpg: 0.7, estrategia: 0.7, aventura: 0.65, puzzle: 0.5 },
    audienceAffinity: { hardcore: 0.7, amplio: 0.6, casual: 0.45, infantil: 0.35 },
    acquisitionCost: 500,
    appearsInEra: 'E1',
  },
  {
    id: 'megaJoystick',
    name: 'MegaJoystick',
    archetype: 'revista',
    description:
      'Revista de quiosco a todo color. Menos exigente, mucha tirada entre el público casual.',
    reach: 1_400,
    targetSegments: { casual: 0.45, prensa: 0.35, comunidad: 0.2 },
    demandingness: 0.3,
    genreAffinity: { puzzle: 0.75, aventura: 0.7, rpg: 0.5, estrategia: 0.4 },
    audienceAffinity: { casual: 0.8, amplio: 0.7, infantil: 0.7, hardcore: 0.35 },
    acquisitionCost: 800,
    appearsInEra: 'E1',
  },
  {
    id: 'teleArcade',
    name: 'Tele-Arcade',
    archetype: 'variedades',
    description:
      'El programa de tele que ve todo el mundo. Audiencia enorme y casual; se aburre con lo lento y hardcore.',
    reach: 2_600,
    targetSegments: { casual: 0.55, comunidad: 0.3, prensa: 0.15 },
    demandingness: 0.35,
    genreAffinity: { puzzle: 0.9, aventura: 0.75, rpg: 0.3, estrategia: 0.2 },
    audienceAffinity: { casual: 1, amplio: 0.75, infantil: 0.85, hardcore: 0.2 },
    acquisitionCost: 2_000,
    appearsInEra: 'E1',
  },
  {
    id: 'clubMeister',
    name: 'Club Meister',
    archetype: 'competitivo',
    description:
      'El fanzine de los torneos. Adora la profundidad y el balance; destroza el pay-to-win y los bugs.',
    reach: 1_000,
    targetSegments: { hardcore: 0.7, comunidad: 0.3 },
    demandingness: 0.8,
    genreAffinity: { estrategia: 0.95, rpg: 0.8, puzzle: 0.35, aventura: 0.45 },
    audienceAffinity: { hardcore: 1, amplio: 0.55, casual: 0.25, infantil: 0.1 },
    acquisitionCost: 700,
    appearsInEra: 'E1',
  },
  {
    id: 'columnaVega',
    name: 'La Columna de Vega',
    archetype: 'critico',
    description:
      'Crítica de culto: audiencia pequeña pero influyente. Premia el arte y la narrativa; implacable con lo genérico.',
    reach: 500,
    targetSegments: { critica: 0.7, prensa: 0.3 },
    demandingness: 0.9,
    genreAffinity: { aventura: 0.95, rpg: 0.8, estrategia: 0.55, puzzle: 0.45 },
    audienceAffinity: { hardcore: 0.65, amplio: 0.6, casual: 0.45, infantil: 0.3 },
    acquisitionCost: 300,
    appearsInEra: 'E1',
  },
  {
    id: 'radioRecreativa',
    name: 'Radio Recreativa',
    archetype: 'influencer',
    description:
      'El locutor de moda: grande, superficial y volátil. Recomienda lo que suena; hoy te ama, mañana te olvida.',
    reach: 1_800,
    targetSegments: { comunidad: 0.5, casual: 0.5 },
    demandingness: 0.2,
    genreAffinity: { puzzle: 0.7, aventura: 0.65, rpg: 0.55, estrategia: 0.45 },
    audienceAffinity: { casual: 0.8, amplio: 0.75, infantil: 0.6, hardcore: 0.4 },
    acquisitionCost: 1_500,
    appearsInEra: 'E1',
  },
  {
    id: 'umiNova',
    name: 'Umi Nova',
    archetype: 'vtuber',
    description:
      'VTuber de audiencia grande y fiel. Reacciona a todo con carisma; muy sensible a la afinidad de tono.',
    reach: 3_000,
    targetSegments: { comunidad: 0.55, casual: 0.3, hardcore: 0.15 },
    demandingness: 0.5,
    genreAffinity: { aventura: 0.8, rpg: 0.75, puzzle: 0.7, estrategia: 0.35 },
    audienceAffinity: { amplio: 0.85, casual: 0.75, hardcore: 0.55, infantil: 0.6 },
    acquisitionCost: 4_000,
    appearsInEra: 'E6',
  },
];

export function getCreator(id: string): CreatorDef {
  const creator = creators.find((c) => c.id === id);
  if (!creator) throw new Error(`Creador desconocido: ${id}`);
  return creator;
}

/** Etiquetas legibles de los arquetipos (docs/07 §3). */
export const archetypeLabels: Record<CreatorArchetype, string> = {
  revista: 'Revista / prensa',
  variedades: 'Variedades masivo',
  competitivo: 'Competitivo hardcore',
  vtuber: 'VTuber',
  critico: 'Crítico de culto',
  influencer: 'Influencer casual',
};
