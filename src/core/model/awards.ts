import type { EraId } from './era';

/**
 * Premios anuales (docs/06 §7): la ceremonia tipo "Game Awards" de cada fin
 * de año. Desde la 8.10 (docs/18 V7) son COMPETITIVOS: no hay "ganaste"
 * automático, sino nominados y un puesto en un ranking contra el listón de la
 * industria. Las categorías viven en data/awards.ts; los umbrales, el listón y
 * las recompensas, en data/balance.ts (sección awards).
 */

/** Un nominado del ranking: tú o un estudio ficticio (docs/18 V7). */
export interface AwardNominee {
  /** Estudio: el tuyo o uno ficticio con nombre (sabor de industria viva). */
  studio: string;
  gameName: string;
  /** Puntuación con la que compite (reseña + prestigio + escala). */
  score: number;
  isPlayer: boolean;
}

/** Resultado de una categoría: el ranking completo y tu puesto. */
export interface AwardCategoryResult {
  categoryId: string;
  /** El listón de esta categoría este año (docs/18 V7). */
  bar: number;
  /** Ranking ordenado de mejor a peor; incluye al jugador si fue nominado. */
  nominees: AwardNominee[];
  /** Tu puesto (1 = ganado); null = ni nominado (no pasaste el umbral). */
  rank: number | null;
  /** Tu candidato; null si no llegó a la nominación. */
  gameId: string | null;
  gameName: string | null;
}

/** La gala de un año entera: lo único que la UI necesita para la ceremonia. */
export interface AwardCeremony {
  week: number;
  year: number;
  era: EraId;
  categories: AwardCategoryResult[];
  /** ¿Te nominaron en alguna categoría? (si no, la gala pasa de largo). */
  nominated: boolean;
}

/** Un premio GANADO por el estudio (docs/09 §1: Studio.awards). */
export interface Award {
  /** Semana de la ceremonia. */
  week: number;
  /** Año de calendario mostrado (presentación estable en el save). */
  year: number;
  /** Categoría ganada (data/awards.ts). */
  categoryId: string;
  /** Juego premiado. */
  gameId: string;
  gameName: string;
}
