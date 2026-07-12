import type { EraId } from '../core/model/era';

/**
 * Regulación por era (docs/04 §8 y docs/06 §5): leyes que invalidan modelos
 * de negocio de golpe. La presión se acumula con los escándalos (data/
 * scandals.ts); la ley se promulga cuando hay presión suficiente Y la era ha
 * llegado (p. ej. loot boxes prohibidas en E6/E7).
 */

export interface RegulationDef {
  id: string;
  name: string;
  /** Titular al promulgarse. */
  headline: string;
  /** Primera era en la que puede promulgarse (docs/06 §5: E6/E7). */
  minEra: EraId;
  /** Presión acumulada necesaria para promulgarse. */
  pressureThreshold: number;
  /** Efecto: qué invalida (interpretado por core/systems/morale.ts y sales). */
  effect: 'banLootBoxes';
}

export const regulations: readonly RegulationDef[] = [
  {
    id: 'lootbox-ban',
    name: 'Ley de cajas de botín',
    headline:
      'Aprobada la Ley de cajas de botín: se prohíben las loot boxes. El modelo muere de golpe.',
    minEra: 'E6',
    pressureThreshold: 2,
    effect: 'banLootBoxes',
  },
];

export function getRegulation(id: string): RegulationDef {
  const def = regulations.find((r) => r.id === id);
  if (!def) throw new Error(`Regulación desconocida: ${id}`);
  return def;
}

// El orden canónico de las eras vive en data/eras.ts desde Fase 6; se
// re-exporta aquí por compatibilidad con los consumidores previos.
export { eraAtLeast, eraOrder } from './eras';
