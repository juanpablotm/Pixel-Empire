import type { Theme } from '../core/model/content';

/**
 * Los 29 temas del baseline (docs/09 §3), gateados por era. Los 14 últimos
 * (2 por era) llegaron en la 8.10 (docs/18 V6). `appearsInEra` los habilita y,
 * al no estar en `balance.research.knowledge.starterThemes`, nacen gateados por
 * 💡 con el coste de `themeCostByEra` (docs/17 P1).
 *
 * Popularidad (docs/04 §2, reescrito en 9.4): desde el modelo "fiebre"
 * (docs/19 §9.4) NO hay curva de popularidad por tema. Todo tema disponible se
 * sienta en la MISMA base plana (`balance.market.popularity.base`); ninguno es
 * permanentemente mejor que otro. La variación temporal la dan solo las
 * fiebres. Todos los temas quedan igual de viables de base — exploras porque
 * nada te ata a un tema, en vez de repetir "el que está de moda esta era".
 */
export const themes: readonly Theme[] = [
  { id: 'fantasia', name: 'Fantasía', appearsInEra: 'E1' },
  { id: 'cienciaFiccion', name: 'Ciencia ficción', appearsInEra: 'E1' },
  { id: 'espacio', name: 'Espacio', appearsInEra: 'E1' },
  { id: 'deportes', name: 'Deportes', appearsInEra: 'E1' },
  { id: 'vida', name: 'Vida/Cotidiano', appearsInEra: 'E1' },
  { id: 'piratas', name: 'Piratas', appearsInEra: 'E1' },
  { id: 'medieval', name: 'Medieval', appearsInEra: 'E1' },
  { id: 'militar', name: 'Militar', appearsInEra: 'E2' },
  { id: 'historia', name: 'Historia/Épica', appearsInEra: 'E2' },
  { id: 'zombis', name: 'Zombis', appearsInEra: 'E3' },
  { id: 'crimen', name: 'Crimen', appearsInEra: 'E3' },
  { id: 'terrorSobrenatural', name: 'Terror sobrenatural', appearsInEra: 'E3' },
  { id: 'cyberpunk', name: 'Cyberpunk', appearsInEra: 'E4' },
  { id: 'postApocaliptico', name: 'Post-apocalíptico', appearsInEra: 'E4' },
  { id: 'superheroes', name: 'Superhéroes', appearsInEra: 'E5' },

  // ── Temas de la 8.10 (docs/18 V6): 2 por era ──────────────────────────────
  { id: 'mitologia', name: 'Mitología', appearsInEra: 'E1' },
  { id: 'oeste', name: 'Oeste', appearsInEra: 'E1' },
  { id: 'ninjas', name: 'Ninjas / artes marciales', appearsInEra: 'E2' },
  { id: 'fantasiaOscura', name: 'Fantasía oscura', appearsInEra: 'E2' },
  { id: 'terrorPsicologico', name: 'Terror psicológico', appearsInEra: 'E3' },
  { id: 'espias', name: 'Espías / conspiración', appearsInEra: 'E3' },
  { id: 'supervivencia', name: 'Supervivencia / naturaleza', appearsInEra: 'E4' },
  { id: 'steampunk', name: 'Steampunk', appearsInEra: 'E4' },
  { id: 'vidaSocial', name: 'Vida social / citas', appearsInEra: 'E5' },
  { id: 'cocina', name: 'Cocina / restaurante', appearsInEra: 'E5' },
  { id: 'islaBR', name: 'Isla / battle royale', appearsInEra: 'E6' },
  { id: 'urbanoAumentado', name: 'Urbano aumentado', appearsInEra: 'E6' },
  { id: 'transhumanismo', name: 'Transhumanismo / IA', appearsInEra: 'E7' },
  { id: 'colonizacionEspacial', name: 'Colonización espacial', appearsInEra: 'E7' },
];

export function getTheme(id: string): Theme {
  const theme = themes.find((t) => t.id === id);
  if (!theme) throw new Error(`Tema desconocido: ${id}`);
  return theme;
}
