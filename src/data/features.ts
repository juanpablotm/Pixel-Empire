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
 *
 * Fase 10.3 (docs/20 W6): el catálogo se amplía con dos reglas. (a) Cada
 * feature nueva habilita una DECISIÓN — se añaden donde faltaban opciones que
 * encajaran (Ritmo tenía UNA, Gestión dos, Battle Royale dos: sus juegos
 * llenaban el alcance a base de relleno neutro), y las que son variantes
 * declaran su `variantGroup`. (b) NO se diluye la economía de 💡: ninguna
 * feature nueva estrena nodo de investigación — las gateadas cuelgan de nodos
 * que YA existen (`tecnologiaOnline`, `serviciosOnline`), así que los mismos
 * puntos compran más cosas, y `teoriaDiseno` revela el encaje de todas.
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
    // Variante barata del dilema de MÚSICA (10.3): la casera, de siempre.
    id: 'bandaSonora',
    name: 'Banda sonora original',
    description: 'Música compuesta para tu juego. Nadie se queja de un buen tema.',
    qualityValue: 1.5,
    timeCostWeeks: 1,
    bugRisk: 0.02,
    appearsInEra: 'E2',
    fitsGenres: ['ritmo', 'carreras', 'plataformas', 'aventura'],
    variantGroup: 'musica',
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
    // Variante A del dilema de ACCESIBILIDAD (10.3): abrir el juego a todos.
    // Llega en E3 y no antes: es cuando el juego deja de ser un arcade de tres
    // reglas y hay que DECIDIR a quién invitas a la fiesta.
    id: 'tutorialIntegrado',
    name: 'Tutorial integrado',
    description: 'Enseñas a jugar jugando. Las reglas duras dejan de espantar a nadie.',
    qualityValue: 1,
    timeCostWeeks: 1,
    bugRisk: 0.05,
    appearsInEra: 'E3',
    fitsGenres: ['estrategia', 'gestion', 'simulacion', 'deportivo', 'puzzle'],
    clashesGenres: ['terror', 'sandbox'],
    variantGroup: 'accesibilidad',
  },
  {
    // Variante B: la otra respuesta a la misma pregunta. No es "más difícil":
    // es un público distinto (y el Hardcore lo nota en la reseña).
    id: 'dificultadImplacable',
    name: 'Dificultad implacable',
    description: 'Sin concesiones: morir es la lección. Los que aguantan te veneran.',
    qualityValue: 1.5,
    timeCostWeeks: 2,
    bugRisk: 0.1,
    appearsInEra: 'E3',
    fitsGenres: ['plataformas', 'terror', 'shooter', 'estrategia', 'rpg'],
    clashesGenres: ['gestion', 'simulacion', 'deportivo', 'ritmo'],
    variantGroup: 'accesibilidad',
  },
  {
    // Variante A del dilema de IA (10.3): barata y previsible. Los enemigos
    // hacen lo que les dijiste, y con eso basta para casi todo.
    id: 'iaGuionizada',
    name: 'IA por guiones',
    description: 'Enemigos con rutinas escritas a mano. Predecibles, pero nunca fallan.',
    qualityValue: 1,
    timeCostWeeks: 1,
    bugRisk: 0.06,
    appearsInEra: 'E3',
    fitsGenres: ['shooter', 'plataformas', 'terror', 'deportivo', 'carreras'],
    clashesGenres: ['puzzle', 'ritmo', 'gestion'],
    variantGroup: 'ia',
  },
  {
    // Variante cara del dilema de MÚSICA (10.3): sonar como una película.
    id: 'bandaSonoraLicenciada',
    name: 'Banda sonora licenciada',
    description: 'Temas que ya suenan en la radio. Caro y lento de cerrar, pero vende la escena.',
    qualityValue: 3,
    timeCostWeeks: 3,
    bugRisk: 0.12,
    appearsInEra: 'E3',
    fitsGenres: ['ritmo', 'carreras', 'deportivo', 'plataformas', 'aventura'],
    clashesGenres: ['terror', 'estrategia', 'gestion'],
    variantGroup: 'musica',
  },
  {
    // La otra cara del multijugador (10.3): jugar CON alguien, no contra.
    id: 'modoCooperativo',
    name: 'Campaña cooperativa',
    description: 'Toda la aventura, a dos. Duplicas el diseño y triplicas los bugs raros.',
    qualityValue: 2.5,
    timeCostWeeks: 3,
    bugRisk: 0.16,
    appearsInEra: 'E3',
    fitsGenres: ['shooter', 'aventura', 'rpg', 'plataformas', 'terror'],
    clashesGenres: ['estrategia', 'gestion', 'puzzle', 'ritmo'],
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
    // Por fin algo que ENCAJA en Gestión y Simulación (10.3): antes llenaban
    // su alcance a base de relleno neutro porque no había nada para ellos.
    id: 'economiaSimulada',
    name: 'Economía simulada',
    description: 'Oferta, demanda y precios que se mueven solos. Los sistemas se enredan bonito.',
    qualityValue: 2,
    timeCostWeeks: 2,
    bugRisk: 0.12,
    appearsInEra: 'E4',
    fitsGenres: ['gestion', 'simulacion', 'estrategia', 'sandbox', 'rpg'],
    clashesGenres: ['ritmo', 'plataformas', 'carreras', 'shooter'],
  },
  {
    // Cuelga del nodo `tecnologiaOnline` que YA existe (10.3 W6b): el mismo
    // desembolso de 💡 desbloquea ahora dos features, no una.
    id: 'clasificatoriasOnline',
    name: 'Clasificatorias online',
    description: 'Ligas, rachas y una tabla mundial. La pata competitiva sin montar partidas.',
    qualityValue: 2,
    timeCostWeeks: 2,
    bugRisk: 0.15,
    appearsInEra: 'E4',
    requiresResearch: 'tecnologiaOnline',
    requiresEngineCapability: 'online',
    fitsGenres: ['shooter', 'deportivo', 'carreras', 'ritmo', 'estrategia', 'battleRoyale'],
    clashesGenres: ['aventura', 'terror', 'rpg'],
  },
  {
    id: 'personalizacionAvatar',
    name: 'Personalización de avatar',
    description: 'Que cada jugador se vea distinto. Barato, querido… y muy monetizable.',
    qualityValue: 1.5,
    timeCostWeeks: 2,
    bugRisk: 0.08,
    appearsInEra: 'E4',
    fitsGenres: ['rpg', 'deportivo', 'battleRoyale', 'simulacion', 'sandbox', 'carreras'],
    clashesGenres: ['puzzle', 'aventura', 'terror'],
  },
  {
    // Variante cara del dilema de IA (10.3): el enemigo aprende de ti.
    id: 'iaAdaptativa',
    name: 'IA adaptativa',
    description: 'Los rivales leen cómo juegas y cambian. Brillante cuando funciona.',
    qualityValue: 3,
    timeCostWeeks: 3,
    bugRisk: 0.18,
    appearsInEra: 'E5',
    fitsGenres: ['shooter', 'estrategia', 'terror', 'deportivo', 'carreras', 'simulacion'],
    clashesGenres: ['puzzle', 'ritmo', 'aventura'],
    variantGroup: 'ia',
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
    // Cuelga del nodo `serviciosOnline` que YA existe (10.3 W6b). Diseñar el
    // juego para que lo VEAN es la lectura de la era de los streamers (07).
    id: 'modoEspectador',
    name: 'Modo espectador',
    description: 'Cámaras, repeticiones y un lobby para mirar. El juego pensado para verse.',
    qualityValue: 2,
    timeCostWeeks: 2,
    bugRisk: 0.12,
    appearsInEra: 'E6',
    requiresResearch: 'serviciosOnline',
    requiresEngineCapability: 'online',
    fitsGenres: ['battleRoyale', 'shooter', 'deportivo', 'carreras', 'estrategia'],
    clashesGenres: ['aventura', 'terror', 'puzzle'],
  },
  {
    id: 'disenoRealidadMixta',
    name: 'Diseño para realidad mixta',
    description: 'Pensado para tenerlo puesto en la cara. Espectacular… y fácil de marear.',
    qualityValue: 3,
    timeCostWeeks: 3,
    bugRisk: 0.2,
    appearsInEra: 'E7',
    fitsGenres: ['terror', 'ritmo', 'simulacion', 'aventura', 'shooter', 'carreras'],
    clashesGenres: ['estrategia', 'gestion', 'puzzle'],
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
