import type { CreatorArchetype } from '../core/model/community';
import type { EraId } from '../core/model/era';
import type { Segment } from '../core/model/market';
import type { Audience } from '../core/model/project';

/**
 * Roster de creadores de contenido (docs/07 §3 y docs/09 §8), gateado por
 * era (docs/09 §7). Arquetipos cerrados en docs/12 §7; en E1–E3 los
 * "creadores" son revistas/prensa y personajes de la tele/radio de la época
 * con el mismo comportamiento; la web (E4), el vídeo (E5) y el streaming (E6)
 * traen las formas modernas, con cada vez más alcance.
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
    id: 'portalNexo',
    name: 'Portal Nexo',
    archetype: 'critico',
    description:
      'La web de análisis que leen los que saben. Exigente y muy influyente entre crítica y hardcore.',
    reach: 1_600,
    targetSegments: { critica: 0.45, hardcore: 0.35, prensa: 0.2 },
    demandingness: 0.75,
    genreAffinity: { rpg: 0.85, shooter: 0.75, estrategia: 0.7, aventura: 0.7, gestion: 0.6, ritmo: 0.4 },
    audienceAffinity: { hardcore: 0.85, amplio: 0.65, casual: 0.4, infantil: 0.25 },
    acquisitionCost: 1_800,
    appearsInEra: 'E4',
  },
  {
    id: 'clanArena',
    name: 'ClanArena.net',
    archetype: 'competitivo',
    description:
      'El foro de los torneos online. Vive por el netcode y el balance; masacra el pay-to-win.',
    reach: 2_200,
    targetSegments: { hardcore: 0.65, comunidad: 0.35 },
    demandingness: 0.8,
    genreAffinity: { shooter: 0.95, estrategia: 0.85, battleRoyale: 0.9, rpg: 0.6, deportivo: 0.6, puzzle: 0.25 },
    audienceAffinity: { hardcore: 1, amplio: 0.55, casual: 0.25, infantil: 0.1 },
    acquisitionCost: 2_500,
    appearsInEra: 'E4',
  },
  {
    id: 'tuboMax',
    name: 'TuboMax',
    archetype: 'variedades',
    description:
      'El canal de vídeo que ve media internet. Ríe, grita y lo juega todo… cinco minutos.',
    reach: 6_000,
    targetSegments: { comunidad: 0.45, casual: 0.4, prensa: 0.15 },
    demandingness: 0.35,
    genreAffinity: { terror: 0.9, sandbox: 0.85, plataformas: 0.7, shooter: 0.7, battleRoyale: 0.8, gestion: 0.5, estrategia: 0.3 },
    audienceAffinity: { amplio: 0.85, casual: 0.8, infantil: 0.7, hardcore: 0.45 },
    acquisitionCost: 6_000,
    appearsInEra: 'E5',
  },
  {
    id: 'lolaCasual',
    name: 'Lola Casual',
    archetype: 'influencer',
    description:
      'La influencer del móvil: enorme entre el público casual, alérgica a lo denso.',
    reach: 4_500,
    targetSegments: { casual: 0.55, comunidad: 0.45 },
    demandingness: 0.25,
    genreAffinity: { puzzle: 0.9, ritmo: 0.85, gestion: 0.75, simulacion: 0.7, carreras: 0.6, rpg: 0.35, estrategia: 0.25 },
    audienceAffinity: { casual: 0.95, infantil: 0.75, amplio: 0.7, hardcore: 0.2 },
    acquisitionCost: 4_000,
    appearsInEra: 'E5',
  },
  {
    id: 'streamKing',
    name: 'StreamKing',
    archetype: 'variedades',
    description:
      'El streamer número uno. Si tu juego revienta en su directo, revienta delante de millones.',
    reach: 9_000,
    targetSegments: { comunidad: 0.5, casual: 0.3, hardcore: 0.2 },
    demandingness: 0.45,
    genreAffinity: { battleRoyale: 0.95, shooter: 0.85, terror: 0.85, sandbox: 0.8, deportivo: 0.6, puzzle: 0.4, estrategia: 0.35 },
    audienceAffinity: { amplio: 0.9, hardcore: 0.7, casual: 0.7, infantil: 0.4 },
    acquisitionCost: 12_000,
    appearsInEra: 'E6',
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
  {
    id: 'sintetIcaro',
    name: 'Sintet-Ícaro',
    archetype: 'influencer',
    description:
      'Un presentador sintético entrenado con toda la historia del videojuego. Alcance colosal, criterio inquietante.',
    reach: 11_000,
    targetSegments: { comunidad: 0.4, casual: 0.3, prensa: 0.15, hardcore: 0.15 },
    demandingness: 0.55,
    genreAffinity: { sandbox: 0.85, simulacion: 0.85, rpg: 0.75, battleRoyale: 0.7, terror: 0.7, ritmo: 0.6 },
    audienceAffinity: { amplio: 0.85, hardcore: 0.7, casual: 0.7, infantil: 0.5 },
    acquisitionCost: 18_000,
    appearsInEra: 'E7',
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
