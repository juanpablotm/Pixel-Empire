import type { Feature } from '../core/model/content';

/**
 * Features básicas de la Fase 1 (docs/09 §5): cada una suma calidad potencial
 * pero cuesta semanas de desarrollo y añade deuda de bugs (docs/03 factores C y D).
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
];

export function getFeature(id: string): Feature {
  const feature = features.find((f) => f.id === id);
  if (!feature) throw new Error(`Feature desconocida: ${id}`);
  return feature;
}
