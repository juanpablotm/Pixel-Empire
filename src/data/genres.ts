import type { Genre } from '../core/model/content';

/**
 * Géneros semilla de la Fase 1: los cuatro disponibles en E1 (docs/09 §2).
 * El balance ideal Diseño/Técnica viene de la tabla cerrada de docs/09.
 */
export const genres: readonly Genre[] = [
  { id: 'rpg', name: 'RPG', idealDesign: 0.65, idealTech: 0.35, appearsInEra: 'E1' },
  { id: 'estrategia', name: 'Estrategia', idealDesign: 0.55, idealTech: 0.45, appearsInEra: 'E1' },
  { id: 'aventura', name: 'Aventura', idealDesign: 0.7, idealTech: 0.3, appearsInEra: 'E1' },
  { id: 'puzzle', name: 'Puzzle/Casual', idealDesign: 0.6, idealTech: 0.4, appearsInEra: 'E1' },
];

export function getGenre(id: string): Genre {
  const genre = genres.find((g) => g.id === id);
  if (!genre) throw new Error(`Género desconocido: ${id}`);
  return genre;
}
