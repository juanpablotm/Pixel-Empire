import type { Theme } from '../core/model/content';

/** Temas semilla de la Fase 1, todos disponibles en E1 (docs/09 §3). */
export const themes: readonly Theme[] = [
  { id: 'fantasia', name: 'Fantasía', appearsInEra: 'E1' },
  { id: 'cienciaFiccion', name: 'Ciencia ficción', appearsInEra: 'E1' },
  { id: 'espacio', name: 'Espacio', appearsInEra: 'E1' },
  { id: 'deportes', name: 'Deportes', appearsInEra: 'E1' },
  { id: 'vida', name: 'Vida/Cotidiano', appearsInEra: 'E1' },
  { id: 'piratas', name: 'Piratas', appearsInEra: 'E1' },
];

export function getTheme(id: string): Theme {
  const theme = themes.find((t) => t.id === id);
  if (!theme) throw new Error(`Tema desconocido: ${id}`);
  return theme;
}
