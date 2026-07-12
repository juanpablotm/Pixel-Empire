import type { EraId } from '../core/model/era';
import type { MonetizationConfig, MonetizationModel } from '../core/model/moral';

/**
 * Modelos de negocio (docs/09 §9 y docs/06 §2). Los factores de ingresos
 * viven en data/balance.ts (sección monetization); aquí el catálogo, sus
 * reglas de composición y su era de aparición (docs/02 §5: cada era trae
 * nuevos modelos — el DLC llega con la red, las MTX con lo digital...).
 */

export interface MonetizationModelDef {
  id: MonetizationModel;
  name: string;
  description: string;
  /** ¿El modelo admite microtransacciones (agresividad, loot boxes, pases)? */
  supportsMtx: boolean;
  /** ¿El modelo admite DLC day-one? */
  supportsDayOneDlc: boolean;
  /** Era en la que el modelo aparece (docs/09 §7: unlocks de monetización). */
  appearsInEra: EraId;
}

export const monetizationModels: readonly MonetizationModelDef[] = [
  {
    id: 'premium',
    name: 'Premium',
    description: 'Pagas una vez y juegas. El modelo honesto de toda la vida.',
    supportsMtx: false,
    supportsDayOneDlc: false,
    appearsInEra: 'E1',
  },
  {
    id: 'premium+dlc',
    name: 'Premium + DLC',
    description: 'Juego completo más expansiones. Honesto… salvo que recortes el juego base.',
    supportsMtx: false,
    supportsDayOneDlc: true,
    appearsInEra: 'E4',
  },
  {
    id: 'premium+mtx',
    name: 'Premium + MTX',
    description: 'Pagas el juego y además hay tienda dentro. Los hardcore afilan las antorchas.',
    supportsMtx: true,
    supportsDayOneDlc: false,
    appearsInEra: 'E5',
  },
  {
    id: 'f2p',
    name: 'Free-to-play',
    description: 'Gratis para jugar: los ingresos salen de las microtransacciones.',
    supportsMtx: true,
    supportsDayOneDlc: false,
    appearsInEra: 'E5',
  },
];

/**
 * Era de aparición de los añadidos de monetización (docs/02 §5): las loot
 * boxes llegan con lo digital (E5) y los pases de batalla con los servicios
 * (E6). La regulación puede prohibirlos después (data/regulations.ts).
 */
export const monetizationFlagEras: { lootBoxes: EraId; battlePass: EraId } = {
  lootBoxes: 'E5',
  battlePass: 'E6',
};

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
