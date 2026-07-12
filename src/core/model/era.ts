/** Identificador de era (E1 = garaje ~1980 … E7 = futuro cercano; ver docs/02 §5). */
export type EraId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7';

/**
 * Definición de una era (docs/02 §5 y docs/09 §7). Las instancias viven en
 * data/eras.ts. Los `unlocks` del esquema de docs/09 §7 no se duplican aquí:
 * se derivan del contenido (`appearsInEra` de géneros/temas/plataformas/
 * features/creadores/monetización) con `eraUnlocks()` para que haya una sola
 * fuente de verdad. El listón de calidad (`qualityStandard`) y los techos de Q
 * son números de balance y viven en data/balance.ts (docs/09 §11).
 */
export interface EraDef {
  id: EraId;
  name: string;
  /** Años aproximados, solo presentación ("~1980–1985"). */
  period: string;
  /** Semana absoluta en la que empieza la era (E1 = semana de inicio). */
  startWeek: number;
  /** Titular del evento de transición (docs/02 §5 y docs/10 §7.6). */
  transitionHeadline: string;
  /** Resumen legible de qué cambia con la era. */
  transitionSummary: string;
}
