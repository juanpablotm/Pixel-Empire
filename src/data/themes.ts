import type { Theme } from '../core/model/content';

/**
 * Los 29 temas del baseline (docs/09 §3), gateados por era. Las curvas dan el
 * sabor histórico (docs/04 §2): Espacio muere y renace, los Zombis explotan
 * en E5, el Cyberpunk madura en E7... Los puntos de las semanas 0–260 de los
 * temas de E1 se conservan de fases anteriores.
 *
 * Los 14 últimos (2 por era) llegan en la 8.10 (docs/18 V6). No necesitan
 * nada más para integrarse: `appearsInEra` los habilita y, al no estar en
 * `balance.research.knowledge.starterThemes`, nacen gateados por 💡 con el
 * coste de `themeCostByEra` (docs/17 P1).
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

  // ── Temas de la 8.10 (docs/18 V6): 2 por era ──────────────────────────────
  {
    id: 'mitologia',
    name: 'Mitología',
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.5 },
      { week: 60, value: 0.55 },
      { week: 150, value: 0.6 },
      { week: 700, value: 0.5 },
      // El repunte épico de E4 (dioses y grandes gestas).
      { week: 1150, value: 0.65 },
      { week: 1600, value: 0.55 },
      { week: 2100, value: 0.6 },
      { week: 2500, value: 0.55 },
    ],
  },
  {
    id: 'oeste',
    name: 'Oeste',
    appearsInEra: 'E1',
    basePopularityCurve: [
      { week: 0, value: 0.6 },
      { week: 80, value: 0.55 },
      { week: 180, value: 0.4 },
      { week: 400, value: 0.3 },
      // Muerto durante el 3D: nadie quiere vaqueros en E3.
      { week: 700, value: 0.15 },
      { week: 1100, value: 0.2 },
      { week: 1600, value: 0.3 },
      // El gran renacimiento del western en E6.
      { week: 1900, value: 0.55 },
      { week: 2200, value: 0.65 },
      { week: 2500, value: 0.5 },
    ],
  },
  {
    id: 'ninjas',
    name: 'Ninjas / artes marciales',
    appearsInEra: 'E2',
    basePopularityCurve: [
      { week: 261, value: 0.5 },
      // La fiebre arcade de E2–E3.
      { week: 420, value: 0.7 },
      { week: 600, value: 0.75 },
      { week: 800, value: 0.6 },
      { week: 1100, value: 0.45 },
      { week: 1600, value: 0.35 },
      { week: 2100, value: 0.4 },
      { week: 2500, value: 0.35 },
    ],
  },
  {
    id: 'fantasiaOscura',
    name: 'Fantasía oscura',
    appearsInEra: 'E2',
    basePopularityCurve: [
      { week: 261, value: 0.3 },
      { week: 700, value: 0.35 },
      { week: 1100, value: 0.45 },
      { week: 1500, value: 0.5 },
      // Su momento llega con el hardcore de E6.
      { week: 1900, value: 0.7 },
      { week: 2200, value: 0.8 },
      { week: 2500, value: 0.7 },
    ],
  },
  {
    id: 'terrorPsicologico',
    name: 'Terror psicológico',
    appearsInEra: 'E3',
    basePopularityCurve: [
      { week: 677, value: 0.3 },
      { week: 950, value: 0.4 },
      { week: 1250, value: 0.4 },
      // El boom indie de E5–E6 lo pone de moda.
      { week: 1550, value: 0.6 },
      { week: 1900, value: 0.7 },
      { week: 2200, value: 0.6 },
      { week: 2500, value: 0.55 },
    ],
  },
  {
    id: 'espias',
    name: 'Espías / conspiración',
    appearsInEra: 'E3',
    basePopularityCurve: [
      { week: 677, value: 0.4 },
      { week: 900, value: 0.6 },
      { week: 1200, value: 0.65 },
      { week: 1500, value: 0.55 },
      { week: 2000, value: 0.45 },
      { week: 2500, value: 0.45 },
    ],
  },
  {
    id: 'supervivencia',
    name: 'Supervivencia / naturaleza',
    appearsInEra: 'E4',
    basePopularityCurve: [
      { week: 1093, value: 0.3 },
      { week: 1400, value: 0.45 },
      // El género del momento en E5–E6: craftear y no morir.
      { week: 1650, value: 0.7 },
      { week: 1950, value: 0.85 },
      { week: 2250, value: 0.65 },
      { week: 2500, value: 0.55 },
    ],
  },
  {
    id: 'steampunk',
    name: 'Steampunk',
    appearsInEra: 'E4',
    basePopularityCurve: [
      { week: 1093, value: 0.3 },
      { week: 1400, value: 0.4 },
      // Nicho fiel: nunca explota, nunca muere.
      { week: 1700, value: 0.5 },
      { week: 2000, value: 0.4 },
      { week: 2500, value: 0.35 },
    ],
  },
  {
    id: 'vidaSocial',
    name: 'Vida social / citas',
    appearsInEra: 'E5',
    basePopularityCurve: [
      { week: 1509, value: 0.4 },
      // El móvil y las redes lo disparan.
      { week: 1750, value: 0.6 },
      { week: 2000, value: 0.7 },
      { week: 2300, value: 0.75 },
      { week: 2500, value: 0.75 },
    ],
  },
  {
    id: 'cocina',
    name: 'Cocina / restaurante',
    appearsInEra: 'E5',
    basePopularityCurve: [
      { week: 1509, value: 0.35 },
      { week: 1800, value: 0.5 },
      { week: 2100, value: 0.6 },
      { week: 2500, value: 0.65 },
    ],
  },
  {
    id: 'islaBR',
    name: 'Isla / battle royale',
    appearsInEra: 'E6',
    basePopularityCurve: [
      { week: 1873, value: 0.5 },
      // El pico más brutal del juego… y su fatiga en E7.
      { week: 2000, value: 0.85 },
      { week: 2150, value: 0.9 },
      { week: 2350, value: 0.55 },
      { week: 2500, value: 0.4 },
    ],
  },
  {
    id: 'urbanoAumentado',
    name: 'Urbano aumentado',
    appearsInEra: 'E6',
    basePopularityCurve: [
      { week: 1873, value: 0.35 },
      // Moda AR: pico corto y agudo; quien no llegue a tiempo, no llega.
      { week: 1990, value: 0.75 },
      { week: 2080, value: 0.5 },
      { week: 2250, value: 0.35 },
      { week: 2500, value: 0.3 },
    ],
  },
  {
    id: 'transhumanismo',
    name: 'Transhumanismo / IA',
    appearsInEra: 'E7',
    basePopularityCurve: [
      { week: 2289, value: 0.55 },
      { week: 2400, value: 0.7 },
      { week: 2500, value: 0.8 },
    ],
  },
  {
    id: 'colonizacionEspacial',
    name: 'Colonización espacial',
    appearsInEra: 'E7',
    basePopularityCurve: [
      { week: 2289, value: 0.6 },
      { week: 2400, value: 0.7 },
      { week: 2500, value: 0.7 },
    ],
  },
];

export function getTheme(id: string): Theme {
  const theme = themes.find((t) => t.id === id);
  if (!theme) throw new Error(`Tema desconocido: ${id}`);
  return theme;
}
