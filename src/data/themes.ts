import type { Theme } from '../core/model/content';

/**
 * Temas semilla de la Fase 1, todos disponibles en E1 (docs/09 §3).
 * basePopularityCurve (docs/04 §2): Espacio es la moda fuerte temprana que
 * muere y renace años después; Piratas decae hasta morir con renacimiento
 * tardío; Ciencia ficción y Vida nacen y crecen; Fantasía es el valor seguro.
 */
export const themes: readonly Theme[] = [
  {
    id: 'fantasia',
    name: 'Fantasía',
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.65 },
      { week: 50, value: 0.7 },
      { week: 120, value: 0.75 },
      { week: 200, value: 0.7 },
    ],
  },
  {
    id: 'cienciaFiccion',
    name: 'Ciencia ficción',
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.45 },
      { week: 40, value: 0.55 },
      { week: 90, value: 0.7 },
      { week: 140, value: 0.75 },
      { week: 200, value: 0.6 },
    ],
  },
  {
    id: 'espacio',
    name: 'Espacio',
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.55 },
      { week: 25, value: 0.75 },
      { week: 55, value: 0.8 },
      { week: 90, value: 0.5 },
      { week: 130, value: 0.3 },
      { week: 180, value: 0.2 },
      { week: 260, value: 0.45 },
    ],
  },
  {
    id: 'deportes',
    name: 'Deportes',
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.4 },
      { week: 60, value: 0.45 },
      { week: 150, value: 0.5 },
    ],
  },
  {
    id: 'vida',
    name: 'Vida/Cotidiano',
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.3 },
      { week: 50, value: 0.35 },
      { week: 110, value: 0.5 },
      { week: 180, value: 0.6 },
    ],
  },
  {
    id: 'piratas',
    name: 'Piratas',
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.5 },
      { week: 40, value: 0.45 },
      { week: 80, value: 0.3 },
      { week: 120, value: 0.15 },
      { week: 170, value: 0.1 },
      { week: 240, value: 0.35 },
    ],
  },
];

export function getTheme(id: string): Theme {
  const theme = themes.find((t) => t.id === id);
  if (!theme) throw new Error(`Tema desconocido: ${id}`);
  return theme;
}
