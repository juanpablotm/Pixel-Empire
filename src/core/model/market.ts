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
 * Estado de un género o tema en el mercado (docs/04 §2, reescrito en 9.4).
 * Desde el modelo "fiebre" (docs/19 §9.4) se acabaron las curvas lentas de
 * años que premiaban acampar: casi siempre 'estable' (base plana e igual para
 * todo lo disponible), y 'fiebre' solo mientras hay una fiebre activa sobre él.
 */
export type TrendStage = 'estable' | 'fiebre';

/** Estado vivo de la popularidad de un género o tema (docs/04 §2, §9.4). */
export interface TrendState {
  /** Popularidad actual 0..1: base plana + boost de fiebre activa + ruido suave. */
  pop: number;
  /** Dirección legible: sube/baja mientras una fiebre crece o se enfría; si no, estable. */
  direction: TrendDirection;
  stage: TrendStage;
}

/**
 * Fiebre de mercado (Fase 9.4, docs/19 §9.4): un pico temporal y fuerte de
 * popularidad sobre un género o tema concreto, que dura unos meses y luego
 * decae a la base. Es la ÚNICA fuente de variación temporal del mercado: se
 * acabaron las tendencias lentas que premiaban repetir. Puede nacer de forma
 * orgánica (PRNG con semilla) o dispararla un HIT (tuyo; y de un rival en 9.5)
 * → "fiebre del oro". Serializable: vive en MarketState.fevers.
 */
export interface Fever {
  /** Id único y determinista (`f-<semana>-<target>-<targetId>`). */
  id: string;
  /** Si la fiebre recae sobre un género o sobre un tema. */
  target: 'genre' | 'theme';
  /** Id del género o tema afectado. */
  targetId: string;
  /** Semana en la que nace (empieza a subir). */
  startWeek: number;
  /** Semana del pico (boost máximo); rampa de subida start→peak, decae peak→end. */
  peakWeek: number;
  /** Semana en la que se apaga (vuelve a la base). */
  endWeek: number;
  /** Boost máximo de popularidad en el pico (se suma a la base, clamp 0..1). */
  intensity: number;
  /**
   * Origen para el sabor de la noticia: orgánica, encendida por un hit tuyo o
   * por el bombazo de un rival (Fase 9.5, docs/19 §9.5).
   */
  source: 'organica' | 'hit' | 'rival';
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
  /**
   * Fiebres activas (Fase 9.4, docs/19 §9.4): picos temporales sobre géneros o
   * temas. Solo las ACTIVAS (el tick poda las que expiran); el jugador ve las
   * de aquí, nunca las futuras. Opcional: los saves previos arrancan con `?? []`.
   */
  fevers?: Fever[];
}

/** Ajustes de mercado aplicados a la reseña, guardados para explicarla (docs/04 §5). */
export interface ReviewMarketInfo {
  /** notaBase = barScore + gain·(Q − listón(era)) (Fase 9.1, docs/19 §9.1). */
  base: number;
  /** afinidadModa: ± puntos según la popularidad actual del combo. */
  modaBonus: number;
  /** penalizaciónExpectativas: puntos restados por el hype (siempre ≥ 0). */
  hypePenalty: number;
  /**
   * Fase 9.1 (opcionales: juegos de saves previos no los llevan):
   * `eraDelta` = Q − listón de la era (el listón exacto sigue oculto);
   * `fatiga` = puntos restados por repetir fórmula / saturación (≥ 0);
   * `banda` = desvío entero de gusto/humor del mercado en [−band, +band].
   */
  eraDelta?: number;
  fatiga?: number;
  banda?: number;
}
