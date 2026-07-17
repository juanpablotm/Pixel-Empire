/**
 * Premios anuales (docs/06 §7): las categorías de la ceremonia tipo "Game
 * Awards" de cada fin de año. Desde la 8.10 (docs/18 V7) son competitivos:
 * cada categoría tiene su propio listón (`barOffset` sobre el de la era) y
 * decide cuánto pesa la ESCALA del proyecto (`scaleWeight`).
 *
 * Los umbrales de nominación, el listón por era y las recompensas viven en
 * data/balance.ts (sección awards); el cálculo del puesto, en
 * core/systems/awards.ts.
 */

export type AwardCategoryId = 'goty' | 'innovacion' | 'tecnica' | 'diseno' | 'pueblo';

export interface AwardCategoryDef {
  id: AwardCategoryId;
  name: string;
  description: string;
  /**
   * Desplazamiento del listón respecto al de la era (docs/18 V7). El GOTY es
   * el más caro (0); las demás piden algo menos, pero POCO: un listón
   * generoso se gana desde E1 (tu puntuación no crece con las eras si no
   * creces de escala), y eso resucita el "ganas todos los años" que este
   * rediseño mata. Quien diferencia de verdad las categorías es `scaleWeight`.
   */
  barOffset: number;
  /**
   * Cuánto pesa la escala del proyecto en esta categoría (0..1). Alto en el
   * GOTY y en Excelencia técnica (el músculo se nota); casi nulo en
   * Innovación: ahí compite la idea, no el presupuesto.
   */
  scaleWeight: number;
}

export const awardCategories: readonly AwardCategoryDef[] = [
  {
    id: 'goty',
    name: 'Juego del Año',
    description: 'El mejor juego del año, sin más matices.',
    barOffset: 0,
    scaleWeight: 1,
  },
  {
    id: 'innovacion',
    name: 'Premio a la Innovación',
    description: 'Para quien arriesgó con algo que nadie había hecho.',
    barOffset: -4,
    scaleWeight: 0.25,
  },
  {
    id: 'tecnica',
    name: 'Excelencia Técnica',
    description: 'Un lanzamiento impecable: pulido espejo, cero bugs.',
    barOffset: -2,
    scaleWeight: 0.8,
  },
  {
    id: 'diseno',
    name: 'Mejor Diseño',
    description: 'El concepto redondo: tema, género y público en armonía.',
    barOffset: -3,
    scaleWeight: 0.5,
  },
  {
    id: 'pueblo',
    name: 'Elección del Público',
    description: 'El juego que la gente de a pie amó de verdad.',
    barOffset: -3,
    scaleWeight: 0.5,
  },
];

export function getAwardCategory(id: string): AwardCategoryDef {
  const category = awardCategories.find((c) => c.id === id);
  if (!category) throw new Error(`Categoría de premio desconocida: ${id}`);
  return category;
}

/**
 * Estudios ficticios contra los que compites (docs/18 V7). No son rivales
 * simulados (esos siguen diferidos, docs/04 §9): son el sabor de una industria
 * viva alrededor del listón.
 */
export const rivalStudios: readonly string[] = [
  'Mango Interactive',
  'Wolfbyte Studios',
  'Peluche Digital',
  'Iron Kraken Games',
  'Studio Lumen',
  'Tortuga Bros.',
  'Nimbus Softworks',
  'Cinco Pixeles',
  'Havoc & Sons',
  'Aurora Machine',
  'Bad Robot Bytes',
  'Nocturno Games',
];

/**
 * Cómo aparece el jugador en el ranking. El estado no guarda nombre de
 * estudio (docs/09 §1), así que la gala lo nombra así.
 */
export const playerStudioLabel = 'Tu estudio';

/** Títulos ficticios para los juegos nominados (sabor; el PRNG los combina). */
export const rivalTitles: readonly string[] = [
  'Últimos Faros',
  'Corazón de Óxido',
  'Vientos de Kessel',
  'La Caída de Arben',
  'Neón Roto',
  'Manifiesto',
  'El Jardín Vertical',
  'Sombras de Hierro',
  'Cazadores de Ecos',
  'Retorno a Val',
  'Vacío Azul',
  'Grito Silencioso',
  'La Última Sinfonía',
  'Rutas Perdidas',
  'Hijos del Trueno',
  'Quimera',
  'Ámbar',
  'El Puente de los Cuervos',
];
