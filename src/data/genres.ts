import type { Genre } from '../core/model/content';

/**
 * Géneros semilla de la Fase 1: los cuatro disponibles en E1 (docs/09 §2).
 * El balance ideal Diseño/Técnica viene de la tabla cerrada de docs/09.
 * specialtyWeights pondera las skills del equipo en el teamFactor (docs/03
 * factor E): un RPG valora Diseño; el marketing no aporta calidad (docs/05 §2).
 */
export const genres: readonly Genre[] = [
  {
    id: 'rpg',
    name: 'RPG',
    idealDesign: 0.65,
    idealTech: 0.35,
    specialtyWeights: { diseno: 0.45, tecnica: 0.25, arte: 0.2, audio: 0.1, marketing: 0 },
    appearsInEra: 'E1',
  },
  {
    id: 'estrategia',
    name: 'Estrategia',
    idealDesign: 0.55,
    idealTech: 0.45,
    specialtyWeights: { diseno: 0.4, tecnica: 0.35, arte: 0.15, audio: 0.1, marketing: 0 },
    appearsInEra: 'E1',
  },
  {
    id: 'aventura',
    name: 'Aventura',
    idealDesign: 0.7,
    idealTech: 0.3,
    specialtyWeights: { diseno: 0.45, tecnica: 0.15, arte: 0.25, audio: 0.15, marketing: 0 },
    appearsInEra: 'E1',
  },
  {
    id: 'puzzle',
    name: 'Puzzle/Casual',
    idealDesign: 0.6,
    idealTech: 0.4,
    specialtyWeights: { diseno: 0.4, tecnica: 0.3, arte: 0.2, audio: 0.1, marketing: 0 },
    appearsInEra: 'E1',
  },
];

export function getGenre(id: string): Genre {
  const genre = genres.find((g) => g.id === id);
  if (!genre) throw new Error(`Género desconocido: ${id}`);
  return genre;
}
