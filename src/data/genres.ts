import type { Genre } from '../core/model/content';

/**
 * Géneros semilla de la Fase 1: los cuatro disponibles en E1 (docs/09 §2).
 * El balance ideal Diseño/Técnica viene de la tabla cerrada de docs/09.
 * specialtyWeights pondera las skills del equipo en el teamFactor (docs/03
 * factor E): un RPG valora Diseño; el marketing no aporta calidad (docs/05 §2).
 *
 * basePopularityCurve (docs/04 §2): tendencia guionizada por semana absoluta,
 * pensada para que en E1 haya una moda temprana que muere (Aventura), una que
 * nace y crece (Estrategia), un clásico en ascenso (RPG) y un estable (Puzzle).
 */
export const genres: readonly Genre[] = [
  {
    id: 'rpg',
    name: 'RPG',
    idealDesign: 0.65,
    idealTech: 0.35,
    specialtyWeights: { diseno: 0.45, tecnica: 0.25, arte: 0.2, audio: 0.1, marketing: 0 },
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.5 },
      { week: 40, value: 0.6 },
      { week: 90, value: 0.75 },
      { week: 140, value: 0.8 },
      { week: 200, value: 0.7 },
      { week: 300, value: 0.6 },
    ],
  },
  {
    id: 'estrategia',
    name: 'Estrategia',
    idealDesign: 0.55,
    idealTech: 0.45,
    specialtyWeights: { diseno: 0.4, tecnica: 0.35, arte: 0.15, audio: 0.1, marketing: 0 },
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.3 },
      { week: 30, value: 0.35 },
      { week: 70, value: 0.55 },
      { week: 110, value: 0.8 },
      { week: 150, value: 0.85 },
      { week: 210, value: 0.6 },
      { week: 280, value: 0.4 },
    ],
  },
  {
    id: 'aventura',
    name: 'Aventura',
    idealDesign: 0.7,
    idealTech: 0.3,
    specialtyWeights: { diseno: 0.45, tecnica: 0.15, arte: 0.25, audio: 0.15, marketing: 0 },
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.75 },
      { week: 30, value: 0.8 },
      { week: 60, value: 0.7 },
      { week: 100, value: 0.5 },
      { week: 150, value: 0.35 },
      { week: 220, value: 0.25 },
      { week: 280, value: 0.3 },
    ],
  },
  {
    id: 'puzzle',
    name: 'Puzzle/Casual',
    idealDesign: 0.6,
    idealTech: 0.4,
    specialtyWeights: { diseno: 0.4, tecnica: 0.3, arte: 0.2, audio: 0.1, marketing: 0 },
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.55 },
      { week: 60, value: 0.6 },
      { week: 120, value: 0.55 },
      { week: 200, value: 0.6 },
    ],
  },
];

export function getGenre(id: string): Genre {
  const genre = genres.find((g) => g.id === id);
  if (!genre) throw new Error(`Género desconocido: ${id}`);
  return genre;
}
