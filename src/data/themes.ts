import type { Theme } from '../core/model/content';

/**
 * Los 15 temas del baseline (docs/09 §3), gateados por era. Las curvas dan el
 * sabor histórico (docs/04 §2): Espacio muere y renace, los Zombis explotan
 * en E5, el Cyberpunk madura en E7... Los puntos de las semanas 0–260 de los
 * temas de E1 se conservan de fases anteriores.
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
      // El valor seguro de siempre.
      { week: 800, value: 0.7 },
      { week: 1400, value: 0.65 },
      { week: 2000, value: 0.7 },
      { week: 2500, value: 0.65 },
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
      { week: 700, value: 0.6 },
      { week: 1200, value: 0.65 },
      { week: 1800, value: 0.55 },
      { week: 2300, value: 0.65 },
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
      // Renacimientos cíclicos: sims espaciales en E4, supervivencia en E6.
      { week: 700, value: 0.35 },
      { week: 1150, value: 0.55 },
      { week: 1600, value: 0.4 },
      { week: 2000, value: 0.55 },
      { week: 2400, value: 0.5 },
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
      { week: 800, value: 0.6 },
      { week: 1500, value: 0.65 },
      { week: 2200, value: 0.6 },
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
      // Los sims sociales de E4–E5 y el confort de E6–E7.
      { week: 1100, value: 0.7 },
      { week: 1500, value: 0.65 },
      { week: 2000, value: 0.6 },
      { week: 2400, value: 0.65 },
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
      { week: 800, value: 0.3 },
      { week: 1300, value: 0.5 },
      { week: 1800, value: 0.3 },
      { week: 2300, value: 0.35 },
    ],
  },
  {
    id: 'medieval',
    name: 'Medieval',
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.45 },
      { week: 150, value: 0.55 },
      { week: 500, value: 0.5 },
      { week: 1000, value: 0.6 },
      { week: 1600, value: 0.55 },
      { week: 2200, value: 0.5 },
    ],
  },
  {
    id: 'militar',
    name: 'Militar',
    appearsInEra: 'E2',
    basePopularityCurve: [
      { week: 261, value: 0.4 },
      { week: 700, value: 0.5 },
      // La era dorada del shooter militar (E4).
      { week: 1150, value: 0.75 },
      { week: 1450, value: 0.7 },
      { week: 1800, value: 0.5 },
      { week: 2300, value: 0.45 },
    ],
  },
  {
    id: 'historia',
    name: 'Historia/Épica',
    appearsInEra: 'E2',
    basePopularityCurve: [
      { week: 261, value: 0.4 },
      { week: 700, value: 0.55 },
      { week: 1100, value: 0.6 },
      { week: 1600, value: 0.5 },
      { week: 2100, value: 0.55 },
    ],
  },
  {
    id: 'zombis',
    name: 'Zombis',
    appearsInEra: 'E3',
    basePopularityCurve: [
      { week: 677, value: 0.35 },
      { week: 1000, value: 0.5 },
      { week: 1350, value: 0.55 },
      // El gran boom zombi de E5… y la fatiga después.
      { week: 1650, value: 0.85 },
      { week: 1950, value: 0.5 },
      { week: 2300, value: 0.35 },
    ],
  },
  {
    id: 'crimen',
    name: 'Crimen',
    appearsInEra: 'E3',
    basePopularityCurve: [
      { week: 677, value: 0.35 },
      { week: 1000, value: 0.55 },
      { week: 1300, value: 0.7 },
      { week: 1800, value: 0.6 },
      { week: 2300, value: 0.6 },
    ],
  },
  {
    id: 'terrorSobrenatural',
    name: 'Terror sobrenatural',
    appearsInEra: 'E3',
    basePopularityCurve: [
      { week: 677, value: 0.4 },
      { week: 950, value: 0.55 },
      { week: 1400, value: 0.45 },
      { week: 1950, value: 0.65 },
      { week: 2400, value: 0.55 },
    ],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    appearsInEra: 'E4',
    basePopularityCurve: [
      { week: 1093, value: 0.35 },
      { week: 1500, value: 0.45 },
      { week: 1900, value: 0.5 },
      // Su gran momento llega con el futuro cercano (E7).
      { week: 2300, value: 0.75 },
      { week: 2500, value: 0.7 },
    ],
  },
  {
    id: 'postApocaliptico',
    name: 'Post-apocalíptico',
    appearsInEra: 'E4',
    basePopularityCurve: [
      { week: 1093, value: 0.4 },
      { week: 1450, value: 0.6 },
      { week: 1800, value: 0.65 },
      { week: 2200, value: 0.5 },
      { week: 2500, value: 0.45 },
    ],
  },
  {
    id: 'superheroes',
    name: 'Superhéroes',
    appearsInEra: 'E5',
    basePopularityCurve: [
      { week: 1509, value: 0.5 },
      { week: 1800, value: 0.7 },
      { week: 2050, value: 0.8 },
      // La fatiga de superhéroes de E7.
      { week: 2350, value: 0.55 },
      { week: 2500, value: 0.5 },
    ],
  },
];

export function getTheme(id: string): Theme {
  const theme = themes.find((t) => t.id === id);
  if (!theme) throw new Error(`Tema desconocido: ${id}`);
  return theme;
}
