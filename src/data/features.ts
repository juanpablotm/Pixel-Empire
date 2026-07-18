import type { Feature, FeatureAffinity } from '../core/model/content';

/**
 * Features (docs/09 §5), gateadas por era y a veces por investigación
 * (docs/02 §3): cada una suma calidad potencial pero cuesta semanas de
 * desarrollo y añade deuda de bugs (docs/03 factores C y D).
 *
 * Desde la Fase 9.3 (docs/19 §9.3) cada feature declara su AFINIDAD POR
 * GÉNERO: `fitsGenres` (encaja, aporta entera), `clashesGenres` (no encaja:
 * no aporta —resta un poco— y multiplica sus bugs) y el resto neutro (aporta
 * a medias). Elegir features es una decisión de criterio, no de apilar.
 * Algunas vienen en VARIANTES excluyentes (`variantGroup`): puntos distintos
 * del trade-off barato/rápido vs caro/lento/calidad.
 */
export const features: readonly Feature[] = [
  {
    id: 'multijugadorLocal',
    name: 'Multijugador local',
    description: 'Dos jugadores en la misma máquina. Barato y querido.',
    qualityValue: 1,
    timeCostWeeks: 1,
    bugRisk: 0.06,
    appearsInEra: 'E1',
    fitsGenres: ['deportivo', 'carreras', 'plataformas', 'ritmo', 'estrategia', 'puzzle'],
    clashesGenres: ['aventura', 'terror', 'gestion'],
  },
  {
    id: 'finalRamificado',
    name: 'Final ramificado',
    description: 'Las decisiones importan: varios finales posibles.',
    qualityValue: 1.5,
    timeCostWeeks: 1,
    bugRisk: 0.05,
    appearsInEra: 'E1',
    fitsGenres: ['rpg', 'aventura', 'terror'],
    clashesGenres: ['deportivo', 'carreras', 'ritmo', 'puzzle', 'battleRoyale'],
  },
  {
    id: 'fisicasAvanzadas',
    name: 'Físicas avanzadas',
    description: 'Simulación física llamativa… y traicionera.',
    qualityValue: 2,
    timeCostWeeks: 2,
    bugRisk: 0.15,
    appearsInEra: 'E1',
    fitsGenres: ['shooter', 'carreras', 'simulacion', 'plataformas', 'puzzle'],
    clashesGenres: ['ritmo', 'gestion'],
  },
  {
    id: 'sistemaCrafteo',
    name: 'Sistema de crafteo',
    description: 'Combinar objetos para crear otros. Profundidad extra.',
    qualityValue: 1.5,
    timeCostWeeks: 2,
    bugRisk: 0.1,
    appearsInEra: 'E1',
    fitsGenres: ['rpg', 'sandbox', 'simulacion', 'terror'],
    clashesGenres: ['deportivo', 'carreras', 'ritmo', 'puzzle'],
  },
  {
    id: 'mundoAbierto',
    name: 'Mundo abierto artesanal',
    description: 'Cada rincón diseñado a mano. Caro y lento, pero memorable.',
    qualityValue: 3,
    timeCostWeeks: 4,
    bugRisk: 0.25,
    appearsInEra: 'E1',
    fitsGenres: ['rpg', 'aventura', 'sandbox'],
    clashesGenres: ['puzzle', 'ritmo', 'deportivo', 'gestion'],
    variantGroup: 'mundoAbierto',
  },
  {
    id: 'editorNiveles',
    name: 'Editor de niveles',
    description: 'Los jugadores construyen tus niveles. Comunidad y longevidad.',
    qualityValue: 2,
    timeCostWeeks: 2,
    bugRisk: 0.12,
    appearsInEra: 'E2',
    fitsGenres: ['puzzle', 'plataformas', 'estrategia', 'sandbox', 'gestion'],
    clashesGenres: ['aventura', 'terror'],
  },
  {
    id: 'modoCarrera',
    name: 'Modo carrera',
    description: 'Temporadas, fichajes y palmarés: una razón para volver cada semana.',
    qualityValue: 2,
    timeCostWeeks: 2,
    bugRisk: 0.08,
    appearsInEra: 'E2',
    fitsGenres: ['deportivo', 'carreras', 'gestion', 'simulacion'],
    clashesGenres: ['aventura', 'terror', 'puzzle'],
  },
  {
    id: 'bandaSonora',
    name: 'Banda sonora original',
    description: 'Música compuesta para tu juego. Nadie se queja de un buen tema.',
    qualityValue: 1.5,
    timeCostWeeks: 1,
    bugRisk: 0.02,
    appearsInEra: 'E2',
    fitsGenres: ['ritmo', 'carreras', 'plataformas', 'aventura'],
  },
  {
    id: 'vozDigitalizada',
    name: 'Voz digitalizada',
    description: 'Los personajes hablan de verdad. El CD-ROM lo hace posible.',
    qualityValue: 1.5,
    timeCostWeeks: 1,
    bugRisk: 0.06,
    appearsInEra: 'E3',
    fitsGenres: ['aventura', 'rpg', 'terror'],
    clashesGenres: ['puzzle'],
    variantGroup: 'voces',
  },
  {
    id: 'cinematicas',
    name: 'Cinemáticas',
    description: 'Escenas de vídeo que venden la historia (y la caja del juego).',
    qualityValue: 2,
    timeCostWeeks: 2,
    bugRisk: 0.08,
    appearsInEra: 'E3',
    fitsGenres: ['rpg', 'aventura', 'shooter', 'terror'],
    clashesGenres: ['puzzle', 'gestion', 'ritmo'],
  },
  {
    id: 'multijugadorOnline',
    name: 'Multijugador online',
    description: 'Jugar contra el mundo entero. Exige dominar la tecnología de red.',
    qualityValue: 3,
    timeCostWeeks: 3,
    bugRisk: 0.2,
    appearsInEra: 'E4',
    requiresResearch: 'tecnologiaOnline',
    // El netcode vive en el motor (Fase 9.2): sin capacidad Online, no hay
    // multijugador — investigar la tecnología no basta si tu motor es de ayer.
    requiresEngineCapability: 'online',
    fitsGenres: ['shooter', 'deportivo', 'carreras', 'estrategia', 'battleRoyale'],
    clashesGenres: ['aventura'],
  },
  {
    id: 'doblajeCompleto',
    name: 'Doblaje completo',
    description: 'Cada línea interpretada por actores. Caro y lento, acabado de lujo.',
    qualityValue: 3,
    timeCostWeeks: 3,
    bugRisk: 0.08,
    appearsInEra: 'E4',
    requiresResearch: 'produccionAudio',
    fitsGenres: ['rpg', 'aventura', 'terror'],
    clashesGenres: ['puzzle', 'ritmo', 'deportivo', 'carreras'],
    variantGroup: 'voces',
  },
  {
    id: 'logros',
    name: 'Logros y desafíos',
    description: 'Medallitas digitales. A la comunidad le encantan más de lo que admite.',
    qualityValue: 1,
    timeCostWeeks: 1,
    bugRisk: 0.03,
    appearsInEra: 'E4',
  },
  {
    id: 'mapaProcedural',
    name: 'Mundo procedural',
    description: 'Mundos infinitos generados al vuelo. Barato… y algo repetitivo.',
    qualityValue: 2.5,
    timeCostWeeks: 2,
    bugRisk: 0.15,
    appearsInEra: 'E5',
    requiresResearch: 'generacionProcedural',
    fitsGenres: ['sandbox', 'rpg', 'estrategia'],
    clashesGenres: ['aventura', 'ritmo', 'deportivo'],
    variantGroup: 'mundoAbierto',
  },
  {
    id: 'guardadoNube',
    name: 'Guardado en la nube',
    description: 'Tu partida te sigue a todas partes.',
    qualityValue: 1,
    timeCostWeeks: 1,
    bugRisk: 0.05,
    appearsInEra: 'E5',
  },
  {
    id: 'modoFoto',
    name: 'Modo foto',
    description: 'Los jugadores hacen tu marketing en las redes.',
    qualityValue: 1.5,
    timeCostWeeks: 1,
    bugRisk: 0.04,
    appearsInEra: 'E6',
    fitsGenres: ['sandbox', 'aventura', 'carreras', 'simulacion'],
    clashesGenres: ['puzzle', 'ritmo'],
  },
  {
    id: 'crossPlay',
    name: 'Cross-play',
    description: 'Todas las plataformas, una sola partida. Un reto de infraestructura.',
    qualityValue: 2.5,
    timeCostWeeks: 2,
    bugRisk: 0.18,
    appearsInEra: 'E6',
    requiresResearch: 'infraestructuraCloud',
    requiresEngineCapability: 'online',
    fitsGenres: ['shooter', 'deportivo', 'battleRoyale', 'carreras'],
    clashesGenres: ['aventura', 'terror'],
  },
  {
    id: 'companeroIA',
    name: 'Compañero con IA',
    description: 'Un personaje que conversa de verdad. El futuro, con sus riesgos.',
    qualityValue: 3,
    timeCostWeeks: 3,
    bugRisk: 0.22,
    appearsInEra: 'E7',
    requiresResearch: 'iaGenerativa',
    fitsGenres: ['rpg', 'aventura', 'terror', 'simulacion'],
    clashesGenres: ['puzzle', 'deportivo', 'carreras', 'ritmo'],
  },
];

export function getFeature(id: string): Feature {
  const feature = features.find((f) => f.id === id);
  if (!feature) throw new Error(`Feature desconocida: ${id}`);
  return feature;
}

/** Encaje de una feature con un género (Fase 9.3): verde/ámbar/rojo. */
export function featureGenreAffinity(feature: Feature, genreId: string): FeatureAffinity {
  if (feature.fitsGenres?.includes(genreId)) return 'encaja';
  if (feature.clashesGenres?.includes(genreId)) return 'noEncaja';
  return 'neutro';
}

/** La otra variante del mismo trade-off entre las elegidas, si la hay (9.3). */
export function chosenVariantSibling(
  feature: Feature,
  chosenIds: readonly string[],
): Feature | undefined {
  if (feature.variantGroup === undefined) return undefined;
  return chosenIds
    .map((id) => getFeature(id))
    .find((f) => f.id !== feature.id && f.variantGroup === feature.variantGroup);
}
