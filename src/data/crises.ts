import type {
  CrisisCause,
  CrisisRepDeltas,
  CrisisResponseId,
} from '../core/model/community';

/**
 * Definiciones de crisis y de su menú de respuestas (docs/07 §5 y docs/10
 * §10.8). Cada causa es trazable a una decisión del jugador: las fuentes de
 * deuda de docs/06 (estallan vía escándalo) más las nativas de la capa social
 * (bug en directo, promesa rota). Como en data/scandals.ts, los golpes viven
 * aquí como datos; la severidad y el colchón de reputación los escalan en
 * core/systems/community.ts.
 */

export interface CrisisDef {
  cause: CrisisCause;
  /** Titular del modal y del feed. */
  headline: string;
  /** La causa en una frase: el jugador siempre sabe qué decisión la provocó. */
  causeText: string;
  /** Semanas del reloj para responder antes de que el desenlace se fuerce. */
  deadlineWeeks: number;
  /** Respuestas disponibles ('revertir' solo donde hay algo que revertir). */
  responses: CrisisResponseId[];
  /** Hashtag que arde en el feed mientras dura. */
  hashtag: string;
  /** Review bombing que dispara: puntos de nota visible a severidad 1. */
  bombReviewPenalty: number;
  /** Multiplicador de ventas del juego bombardeado a severidad 1 (< 1). */
  bombSalesPenalty: number;
  /** Semanas base de bombardeo (se escalan con la severidad). */
  bombWeeks: number;
}

const standardResponses: CrisisResponseId[] = ['silencio', 'disculpa', 'corporativo', 'culpar'];
const revertibleResponses: CrisisResponseId[] = [...standardResponses, 'revertir'];

export const crisisDefs: readonly CrisisDef[] = [
  {
    cause: 'lootboxes',
    headline: 'La comunidad se organiza contra tus loot boxes',
    causeText: 'Metiste loot boxes y la deuda de reputación estalló (docs/06 §5).',
    deadlineWeeks: 3,
    responses: revertibleResponses,
    hashtag: '#NoEsUnCasino',
    bombReviewPenalty: 18,
    bombSalesPenalty: 0.6,
    bombWeeks: 6,
  },
  {
    cause: 'mtxAgresivas',
    headline: 'Acusaciones de pay-to-win coordinadas en tu contra',
    causeText: 'La tienda in-game apretó demasiado y el público dijo basta.',
    deadlineWeeks: 3,
    responses: revertibleResponses,
    hashtag: '#PayToLose',
    bombReviewPenalty: 16,
    bombSalesPenalty: 0.65,
    bombWeeks: 6,
  },
  {
    cause: 'dayOneDLC',
    headline: '"Nos venden el juego a trozos": motín por el DLC day-one',
    causeText: 'Recortaste contenido para venderlo aparte el día del lanzamiento.',
    deadlineWeeks: 3,
    responses: revertibleResponses,
    hashtag: '#JuegoCompleto',
    bombReviewPenalty: 12,
    bombSalesPenalty: 0.7,
    bombWeeks: 5,
  },
  {
    cause: 'precioAbusivo',
    headline: 'El precio de tu juego es el meme de la semana',
    causeText: 'Pusiste un precio abusivo y la comparación te persigue.',
    deadlineWeeks: 3,
    responses: revertibleResponses,
    hashtag: '#PrecioJusto',
    bombReviewPenalty: 10,
    bombSalesPenalty: 0.75,
    bombWeeks: 4,
  },
  {
    cause: 'crunch',
    headline: 'Testimonios de crunch inundan los foros',
    causeText: 'Exprimiste al equipo con crunch y alguien lo contó todo.',
    deadlineWeeks: 3,
    responses: standardResponses,
    hashtag: '#SinCrunch',
    bombReviewPenalty: 8,
    bombSalesPenalty: 0.8,
    bombWeeks: 4,
  },
  {
    cause: 'refrito',
    headline: 'La comunidad declara la guerra a la fábrica de refritos',
    causeText: 'Encadenaste secuelas-fotocopia y el público se cansó.',
    deadlineWeeks: 3,
    responses: standardResponses,
    hashtag: '#OtraVezLoMismo',
    bombReviewPenalty: 10,
    bombSalesPenalty: 0.8,
    bombWeeks: 4,
  },
  {
    cause: 'bugEnDirecto',
    headline: 'Un bug ridículo de tu juego se hace viral en directo',
    causeText:
      'Repartiste claves con el juego lleno de bugs y un creador lo sufrió delante de su público.',
    deadlineWeeks: 2,
    responses: standardResponses,
    hashtag: '#ClipDelBug',
    bombReviewPenalty: 14,
    bombSalesPenalty: 0.65,
    bombWeeks: 5,
  },
  {
    cause: 'promesaRota',
    headline: 'El juego no cumple lo prometido y el hype revienta',
    causeText:
      'Prometiste la luna en el marketing y la brecha entre promesa y realidad te explota en la cara.',
    deadlineWeeks: 2,
    responses: standardResponses,
    hashtag: '#NosMintieron',
    bombReviewPenalty: 20,
    bombSalesPenalty: 0.55,
    bombWeeks: 6,
  },
];

export function getCrisisDef(cause: CrisisCause): CrisisDef {
  const def = crisisDefs.find((c) => c.cause === cause);
  if (!def) throw new Error(`Crisis sin definición: ${cause}`);
  return def;
}

// ---------------------------------------------------------------------------
// Menú de respuestas (docs/07 §5): cada una mueve los segmentos distinto
// ---------------------------------------------------------------------------

export interface CrisisResponseDef {
  id: CrisisResponseId;
  name: string;
  description: string;
  /** Coste 💰 a severidad 1 (se escala con la severidad de la crisis). */
  costFactor: number;
  /** Puntos ± por segmento a severidad 1 (el colchón de docs/06 §5 los escala). */
  repDeltas: CrisisRepDeltas;
  /** Empujón al termómetro de sentimiento a severidad 1. */
  sentimentDelta: number;
  /** Efecto sobre el review bombing ligado a la crisis. */
  bombEffect: 'termina' | 'acorta' | 'nada' | 'alarga';
  /** Efecto sobre el escándalo de docs/06 que la originó (si lo hay). */
  scandalEffect: 'acorta' | 'nada';
  /**
   * Solo 'culpar': si la severidad supera el umbral de balance, la mentira se
   * destapa y se aplican estos deltas en su lugar (docs/07 §5: "desastroso si
   * se destapa"). Determinista: mentir en una crisis gorda siempre se destapa.
   */
  backfireRepDeltas?: CrisisRepDeltas;
  backfireSentimentDelta?: number;
}

export const crisisResponses: readonly CrisisResponseDef[] = [
  {
    id: 'silencio',
    name: 'Silencio / esperar',
    description:
      'No decir nada y confiar en que amaine. Gratis… si la comunidad te quiere. Arriesgado.',
    costFactor: 0,
    // El desenlace real (amainar/pudrirse) lo decide la reputación previa:
    // ver balance.community.crisis.silence en data/balance.ts.
    repDeltas: {},
    sentimentDelta: 0,
    bombEffect: 'nada',
    scandalEffect: 'nada',
  },
  {
    id: 'disculpa',
    name: 'Disculpa sincera + compensación',
    description:
      'Asumir el error, parche/compensación gratis. Cuesta dinero; recupera comunidad y hardcore.',
    costFactor: 6_000,
    repDeltas: { comunidad: 3, hardcore: 2, prensa: 1 },
    sentimentDelta: 10,
    bombEffect: 'acorta',
    scandalEffect: 'acorta',
  },
  {
    id: 'corporativo',
    name: 'Comunicado corporativo',
    description:
      'Una nota de prensa defensiva y vacía. Barato; hardcore y comunidad huelen el PR a kilómetros.',
    costFactor: 500,
    repDeltas: { hardcore: -2, comunidad: -2 },
    sentimentDelta: -4,
    bombEffect: 'nada',
    scandalEffect: 'nada',
  },
  {
    id: 'culpar',
    name: 'Echar culpas / negar',
    description:
      'Negarlo todo y señalar a otros. Puede colar con el público casual… si la crisis es pequeña.',
    costFactor: 0,
    repDeltas: { casual: 1, comunidad: -1, prensa: -1 },
    sentimentDelta: 2,
    bombEffect: 'nada',
    scandalEffect: 'nada',
    backfireRepDeltas: { critica: -3, prensa: -4, comunidad: -4, hardcore: -3 },
    backfireSentimentDelta: -12,
  },
  {
    id: 'revertir',
    name: 'Revertir la decisión',
    description:
      'Quitar la monetización o bajar el precio que provocó el fuego. Sacrifica ingresos; lo apaga.',
    costFactor: 0,
    repDeltas: { comunidad: 4, hardcore: 4 },
    sentimentDelta: 12,
    bombEffect: 'termina',
    scandalEffect: 'acorta',
  },
];

export function getCrisisResponse(id: CrisisResponseId): CrisisResponseDef {
  const def = crisisResponses.find((r) => r.id === id);
  if (!def) throw new Error(`Respuesta de crisis desconocida: ${id}`);
  return def;
}
