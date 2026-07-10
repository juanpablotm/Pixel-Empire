import type { Audience } from '../core/model/project';

/**
 * Tablas de afinidad del Fit (docs/03 factor A y docs/09 §3).
 * Escala cerrada: MuyBueno 1.0 / Bueno 0.75 / Neutro 0.5 / Malo 0.25.
 * Pares no listados = Neutro (0.5).
 */

/** Afinidad Tema × Género. */
export const themeGenreAffinity: Record<string, Record<string, number>> = {
  fantasia: { rpg: 1.0, estrategia: 0.75, aventura: 1.0, puzzle: 0.5 },
  cienciaFiccion: { rpg: 0.75, estrategia: 1.0, aventura: 0.75, puzzle: 0.5 },
  espacio: { rpg: 0.75, estrategia: 1.0, aventura: 0.75, puzzle: 0.75 },
  deportes: { rpg: 0.25, estrategia: 0.5, aventura: 0.25, puzzle: 0.75 },
  vida: { rpg: 0.5, estrategia: 0.5, aventura: 0.75, puzzle: 1.0 },
  piratas: { rpg: 0.75, estrategia: 0.75, aventura: 1.0, puzzle: 0.5 },
};

/** Afinidad Público × Género (docs/03: fit público×género; monetización llega en Fase 4). */
export const audienceGenreAffinity: Record<Audience, Record<string, number>> = {
  hardcore: { rpg: 1.0, estrategia: 1.0, aventura: 0.75, puzzle: 0.5 },
  amplio: { rpg: 0.75, estrategia: 0.75, aventura: 1.0, puzzle: 0.75 },
  casual: { rpg: 0.5, estrategia: 0.5, aventura: 0.75, puzzle: 1.0 },
  infantil: { rpg: 0.25, estrategia: 0.25, aventura: 0.5, puzzle: 0.75 },
};

const NEUTRAL = 0.5;

export function getThemeGenreAffinity(themeId: string, genreId: string): number {
  return themeGenreAffinity[themeId]?.[genreId] ?? NEUTRAL;
}

export function getAudienceGenreAffinity(audience: Audience, genreId: string): number {
  return audienceGenreAffinity[audience][genreId] ?? NEUTRAL;
}
