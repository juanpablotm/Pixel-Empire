import type { PlatformStage, TrendDirection, TrendStage } from '../core/model/market';

/** Etiquetas legibles del panel de tendencias y las plataformas (docs/10 §10.7). */

export const trendStageLabels: Record<TrendStage, string> = {
  naciendo: 'Naciendo',
  creciendo: 'Creciendo',
  pico: 'En su pico',
  estable: 'Estable',
  declive: 'En declive',
  muerto: 'Muerto',
};

export const trendDirectionArrows: Record<TrendDirection, string> = {
  sube: '↑',
  estable: '→',
  baja: '↓',
};

export const platformStageLabels: Record<PlatformStage, string> = {
  anunciada: 'Anunciada',
  lanzamiento: 'Lanzamiento',
  crecimiento: 'Crecimiento',
  madurez: 'Madurez',
  declive: 'Declive',
  descatalogada: 'Descatalogada',
};

/**
 * Nombres de las campañas de marketing escalonadas (docs/17 E2), alineados por
 * índice con balance.economy.marketing.levels: coste y alcance crecientes. Copy
 * aquí; los números (coste, hype) viven en balance.ts.
 */
export const marketingLevelNames = ['Nota de prensa', 'Anuncios', 'Feria/Expo', 'Campaña masiva'];
