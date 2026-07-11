import type { MonetizationConfig, MonetizationModel } from '../core/model/moral';

/**
 * Modelos de negocio (docs/09 §9 y docs/06 §2). Los factores de ingresos
 * viven en data/balance.ts (sección monetization); aquí el catálogo y sus
 * reglas de composición.
 *
 * v1: todos los modelos están disponibles desde E1 para que la palanca sea
 * jugable ya; la Fase 6 los gateará por era con los `unlocks` de docs/09 §7
 * (las MTX/loot boxes históricamente llegan en E5–E6).
 */

export interface MonetizationModelDef {
  id: MonetizationModel;
  name: string;
  description: string;
  /** ¿El modelo admite microtransacciones (agresividad, loot boxes, pases)? */
  supportsMtx: boolean;
  /** ¿El modelo admite DLC day-one? */
  supportsDayOneDlc: boolean;
}

export const monetizationModels: readonly MonetizationModelDef[] = [
  {
    id: 'premium',
    name: 'Premium',
    description: 'Pagas una vez y juegas. El modelo honesto de toda la vida.',
    supportsMtx: false,
    supportsDayOneDlc: false,
  },
  {
    id: 'premium+dlc',
    name: 'Premium + DLC',
    description: 'Juego completo más expansiones. Honesto… salvo que recortes el juego base.',
    supportsMtx: false,
    supportsDayOneDlc: true,
  },
  {
    id: 'premium+mtx',
    name: 'Premium + MTX',
    description: 'Pagas el juego y además hay tienda dentro. Los hardcore afilan las antorchas.',
    supportsMtx: true,
    supportsDayOneDlc: false,
  },
  {
    id: 'f2p',
    name: 'Free-to-play',
    description: 'Gratis para jugar: los ingresos salen de las microtransacciones.',
    supportsMtx: true,
    supportsDayOneDlc: false,
  },
];

export function getMonetizationModel(id: MonetizationModel): MonetizationModelDef {
  const model = monetizationModels.find((m) => m.id === id);
  if (!model) throw new Error(`Modelo de monetización desconocido: ${id}`);
  return model;
}

/** Configuración por defecto: el modelo honesto (docs/06 §2, integridad). */
export function defaultMonetization(): MonetizationConfig {
  return {
    model: 'premium',
    aggressiveness: 0,
    hasLootBoxes: false,
    hasBattlePass: false,
    dayOneDLC: false,
  };
}
