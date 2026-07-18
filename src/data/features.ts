import type { Feature } from '../core/model/content';

/**
 * Features (docs/09 §5), gateadas por era y a veces por investigación
 * (docs/02 §3): cada una suma calidad potencial pero cuesta semanas de
 * desarrollo y añade deuda de bugs (docs/03 factores C y D).
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
  },
  {
    id: 'finalRamificado',
    name: 'Final ramificado',
    description: 'Las decisiones importan: varios finales posibles.',
    qualityValue: 1.5,
    timeCostWeeks: 1,
    bugRisk: 0.05,
    appearsInEra: 'E1',
  },
  {
    id: 'fisicasAvanzadas',
    name: 'Físicas avanzadas',
    description: 'Simulación física llamativa… y traicionera.',
    qualityValue: 2,
    timeCostWeeks: 2,
    bugRisk: 0.15,
    appearsInEra: 'E1',
  },
  {
    id: 'sistemaCrafteo',
    name: 'Sistema de crafteo',
    description: 'Combinar objetos para crear otros. Profundidad extra.',
    qualityValue: 1.5,
    timeCostWeeks: 2,
    bugRisk: 0.1,
    appearsInEra: 'E1',
  },
  {
    id: 'mundoAbierto',
    name: 'Mundo abierto',
    description: 'Explora sin pasillos. Muy ambicioso para un garaje.',
    qualityValue: 3,
    timeCostWeeks: 4,
    bugRisk: 0.25,
    appearsInEra: 'E1',
  },
  {
    id: 'vozDigitalizada',
    name: 'Voz digitalizada',
    description: 'Los personajes hablan de verdad. El CD-ROM lo hace posible.',
    qualityValue: 1.5,
    timeCostWeeks: 1,
    bugRisk: 0.06,
    appearsInEra: 'E3',
  },
  {
    id: 'cinematicas',
    name: 'Cinemáticas',
    description: 'Escenas de vídeo que venden la historia (y la caja del juego).',
    qualityValue: 2,
    timeCostWeeks: 2,
    bugRisk: 0.08,
    appearsInEra: 'E3',
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
    description: 'Cada partida, un mundo distinto. La generación procedural manda.',
    qualityValue: 2.5,
    timeCostWeeks: 2,
    bugRisk: 0.15,
    appearsInEra: 'E5',
    requiresResearch: 'generacionProcedural',
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
  },
];

export function getFeature(id: string): Feature {
  const feature = features.find((f) => f.id === id);
  if (!feature) throw new Error(`Feature desconocida: ${id}`);
  return feature;
}
