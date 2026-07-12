/**
 * Premios anuales (docs/06 §7): las categorías de la ceremonia tipo "Game
 * Awards" de cada fin de año. Los umbrales de candidatura y las recompensas
 * viven en data/balance.ts (sección awards); la selección del ganador, en
 * core/systems/awards.ts.
 */

export type AwardCategoryId = 'goty' | 'innovacion' | 'tecnica' | 'diseno' | 'pueblo';

export interface AwardCategoryDef {
  id: AwardCategoryId;
  name: string;
  description: string;
}

export const awardCategories: readonly AwardCategoryDef[] = [
  {
    id: 'goty',
    name: 'Juego del Año',
    description: 'El mejor juego del año, sin más matices.',
  },
  {
    id: 'innovacion',
    name: 'Premio a la Innovación',
    description: 'Para quien arriesgó con algo que nadie había hecho.',
  },
  {
    id: 'tecnica',
    name: 'Excelencia Técnica',
    description: 'Un lanzamiento impecable: pulido espejo, cero bugs.',
  },
  {
    id: 'diseno',
    name: 'Mejor Diseño',
    description: 'El concepto redondo: tema, género y público en armonía.',
  },
  {
    id: 'pueblo',
    name: 'Elección del Público',
    description: 'El juego que la gente de a pie amó de verdad.',
  },
];

export function getAwardCategory(id: string): AwardCategoryDef {
  const category = awardCategories.find((c) => c.id === id);
  if (!category) throw new Error(`Categoría de premio desconocida: ${id}`);
  return category;
}

/** Estudios ficticios que se llevan el premio cuando tú no (sabor del log). */
export const rivalWinners: readonly string[] = [
  'Mango Interactive',
  'Wolfbyte Studios',
  'Peluche Digital',
  'Iron Kraken Games',
  'Studio Lumen',
  'Tortuga Bros.',
];
