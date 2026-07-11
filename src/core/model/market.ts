/**
 * Tipos del mercado vivo (docs/04 y docs/09). Todo serializable: el estado
 * del mercado vive dentro de GameState y las curvas guionizadas en src/data/.
 */

/**
 * Segmento de público (docs/09 §1). En Fase 3 reseñan crítica, hardcore,
 * casual y prensa (data/segments.ts); comunidad y empleador llegan en
 * las Fases 4–5 (docs/06 y docs/07).
 */
export type Segment = 'critica' | 'hardcore' | 'casual' | 'prensa' | 'comunidad' | 'empleador';

/**
 * Punto de una curva guionizada por semana absoluta. Entre puntos se
 * interpola linealmente; fuera del rango se mantiene el valor extremo.
 */
export interface CurvePoint {
  week: number;
  value: number;
}

/** Dirección de una tendencia para el panel: ↑ sube · → estable · ↓ baja (docs/04 §2). */
export type TrendDirection = 'sube' | 'estable' | 'baja';

/**
 * Etapa del ciclo de vida de una moda (docs/04 §2):
 * Naciendo → Creciendo → Pico → Declive → Muerto (a veces renace = vuelve a
 * Creciendo). 'estable' cubre las mesetas intermedias sin dirección clara.
 */
export type TrendStage = 'naciendo' | 'creciendo' | 'pico' | 'estable' | 'declive' | 'muerto';

/** Estado vivo de la popularidad de un género o tema (docs/04 §2). */
export interface TrendState {
  /** Popularidad actual 0..1 (curva base + ruido suave del PRNG). */
  pop: number;
  /** Dirección legible derivada de la curva base (el ruido no la altera). */
  direction: TrendDirection;
  stage: TrendStage;
}

/** Etapa del ciclo de vida de una plataforma (docs/04 §7). */
export type PlatformStage =
  | 'anunciada'
  | 'lanzamiento'
  | 'crecimiento'
  | 'madurez'
  | 'declive'
  | 'descatalogada';

/** Estado vivo de una plataforma en el mercado (docs/04 §7). */
export interface PlatformMarketState {
  /**
   * Base instalada actual, en unidades de demanda semanal potencial
   * (alimenta el tamañoMercado de docs/04 §6).
   */
  installedBase: number;
  stage: PlatformStage;
}

/**
 * Estado del mercado (docs/08 §5): popularidades, saturación y plataformas.
 * Las claves de saturación son combos `genreId|themeId` (docs/04 §3).
 */
export interface MarketState {
  genres: Record<string, TrendState>;
  themes: Record<string, TrendState>;
  /** Contador de saturación por combo género|tema; decae con el tiempo. */
  saturation: Record<string, number>;
  platforms: Record<string, PlatformMarketState>;
}

/** Ajustes de mercado aplicados a la reseña, guardados para explicarla (docs/04 §5). */
export interface ReviewMarketInfo {
  /** reseñaBase = Q × estándarEra(era). */
  base: number;
  /** afinidadModa: ± puntos según la popularidad actual del combo. */
  modaBonus: number;
  /** penalizaciónExpectativas: puntos restados por el hype (siempre ≥ 0). */
  hypePenalty: number;
}
