import type { Genre } from '../core/model/content';

/**
 * Los 14 géneros del baseline (docs/09 §2), gateados por era (docs/02 §5).
 * El balance ideal Diseño/Técnica viene de la tabla cerrada de docs/09.
 * specialtyWeights pondera las skills del equipo en el teamFactor (docs/03
 * factor E); el marketing no aporta calidad (docs/05 §2).
 *
 * Popularidad (docs/04 §2, reescrito en 9.4): desde el modelo "fiebre"
 * (docs/19 §9.4) NO hay curva de popularidad por género. Todo género disponible
 * en su era se sienta en la MISMA base plana (`balance.market.popularity.base`);
 * ninguno es permanentemente mejor que otro. La única variación temporal la dan
 * las fiebres. Así "¿qué juego hago?" lo decide el fit/la especialización de tu
 * estudio y la fiebre activa, no "qué acampa arriba esta era".
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
  {
    id: 'shooter',
    name: 'Shooter',
    idealDesign: 0.4,
    idealTech: 0.6,
    specialtyWeights: { diseno: 0.25, tecnica: 0.45, arte: 0.2, audio: 0.1, marketing: 0 },
    appearsInEra: 'E2',
  },
  {
    id: 'plataformas',
    name: 'Plataformas',
    idealDesign: 0.6,
    idealTech: 0.4,
    specialtyWeights: { diseno: 0.4, tecnica: 0.3, arte: 0.2, audio: 0.1, marketing: 0 },
    appearsInEra: 'E2',
  },
  {
    id: 'simulacion',
    name: 'Simulación',
    idealDesign: 0.5,
    idealTech: 0.5,
    specialtyWeights: { diseno: 0.35, tecnica: 0.4, arte: 0.15, audio: 0.1, marketing: 0 },
    appearsInEra: 'E2',
  },
  {
    id: 'deportivo',
    name: 'Deportes',
    idealDesign: 0.35,
    idealTech: 0.65,
    specialtyWeights: { diseno: 0.2, tecnica: 0.45, arte: 0.25, audio: 0.1, marketing: 0 },
    appearsInEra: 'E2',
  },
  {
    id: 'carreras',
    name: 'Carreras',
    idealDesign: 0.45,
    idealTech: 0.55,
    specialtyWeights: { diseno: 0.25, tecnica: 0.45, arte: 0.2, audio: 0.1, marketing: 0 },
    appearsInEra: 'E3',
  },
  {
    id: 'terror',
    name: 'Terror',
    idealDesign: 0.6,
    idealTech: 0.4,
    specialtyWeights: { diseno: 0.35, tecnica: 0.2, arte: 0.25, audio: 0.2, marketing: 0 },
    appearsInEra: 'E3',
  },
  {
    id: 'gestion',
    name: 'Gestión',
    idealDesign: 0.6,
    idealTech: 0.4,
    specialtyWeights: { diseno: 0.45, tecnica: 0.3, arte: 0.15, audio: 0.1, marketing: 0 },
    appearsInEra: 'E4',
  },
  {
    id: 'ritmo',
    name: 'Ritmo',
    idealDesign: 0.55,
    idealTech: 0.45,
    specialtyWeights: { diseno: 0.3, tecnica: 0.25, arte: 0.15, audio: 0.3, marketing: 0 },
    appearsInEra: 'E4',
  },
  {
    id: 'sandbox',
    name: 'Sandbox',
    idealDesign: 0.55,
    idealTech: 0.45,
    specialtyWeights: { diseno: 0.35, tecnica: 0.35, arte: 0.2, audio: 0.1, marketing: 0 },
    appearsInEra: 'E5',
    requiresResearch: 'generacionProcedural',
  },
  {
    id: 'battleRoyale',
    name: 'Battle Royale',
    idealDesign: 0.45,
    idealTech: 0.55,
    specialtyWeights: { diseno: 0.25, tecnica: 0.45, arte: 0.2, audio: 0.1, marketing: 0 },
    appearsInEra: 'E6',
    requiresResearch: 'serviciosOnline',
  },
];

export function getGenre(id: string): Genre {
  const genre = genres.find((g) => g.id === id);
  if (!genre) throw new Error(`Género desconocido: ${id}`);
  return genre;
}
