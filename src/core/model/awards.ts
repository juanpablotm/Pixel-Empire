/**
 * Premios anuales (docs/06 §7): la ceremonia tipo "Game Awards" de cada fin
 * de año. Las categorías viven en data/awards.ts; los umbrales y recompensas,
 * en data/balance.ts (sección awards).
 */

/** Un premio ganado por el estudio (docs/09 §1: Studio.awards). */
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
