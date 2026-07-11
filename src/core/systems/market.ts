import { balance } from '../../data/balance';
import { genres, getGenre } from '../../data/genres';
import { getPlatform, platforms } from '../../data/platforms';
import { getTheme, themes } from '../../data/themes';
import { reviewSegments } from '../../data/segments';
import { appendLog } from '../engine/log';
import type { Rng } from '../engine/rng';
import type { EraId } from '../model/era';
import type { Platform } from '../model/content';
import type { GameState } from '../model/gameState';
import type {
  CurvePoint,
  MarketState,
  PlatformMarketState,
  PlatformStage,
  ReviewMarketInfo,
  Segment,
  TrendDirection,
  TrendStage,
  TrendState,
} from '../model/market';
import type { Audience } from '../model/project';
import type { ReleasedGame } from '../model/release';

/**
 * Mercado y modas dinámicas (docs/04): popularidades que evolucionan por tick,
 * saturación con decaimiento, hype de doble filo, ciclos de vida de plataformas,
 * reseñas por segmento y la curva de ventas pico + cola larga.
 *
 * "Mayormente determinista" (docs/00): la tendencia viene guionizada en las
 * curvas base de src/data/ y es legible; el PRNG solo añade un matiz suave.
 */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Redondeo a 1 decimal para guardar ajustes legibles en el estado. */
const round1 = (value: number): number => Math.round(value * 10) / 10;

// ---------------------------------------------------------------------------
// Curvas guionizadas
// ---------------------------------------------------------------------------

/**
 * Valor de una curva guionizada en una semana: interpolación lineal entre
 * puntos; fuera del rango se mantiene el valor del extremo (docs/04 §2).
 */
export function curveValueAt(curve: readonly CurvePoint[], week: number): number {
  if (curve.length === 0) return 0;
  if (week <= curve[0].week) return curve[0].value;
  const last = curve[curve.length - 1];
  if (week >= last.week) return last.value;
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (week <= b.week) {
      const t = (week - a.week) / (b.week - a.week);
      return a.value + (b.value - a.value) * t;
    }
  }
  return last.value;
}

/** Dirección ↑→↓ de la curva base en las últimas semanas (el ruido no cuenta). */
export function trendDirection(curve: readonly CurvePoint[], week: number): TrendDirection {
  const p = balance.market.popularity;
  const delta = curveValueAt(curve, week) - curveValueAt(curve, week - p.directionLookbackWeeks);
  if (delta > p.directionThreshold) return 'sube';
  if (delta < -p.directionThreshold) return 'baja';
  return 'estable';
}

/** Etapa del ciclo de vida de una moda (docs/04 §2), derivada de la curva base. */
export function trendStage(curve: readonly CurvePoint[], week: number): TrendStage {
  const p = balance.market.popularity;
  const level = curveValueAt(curve, week);
  const direction = trendDirection(curve, week);
  if (level <= p.stage.deadLevel) return direction === 'sube' ? 'naciendo' : 'muerto';
  if (direction === 'sube') return level < p.stage.emergingLevel ? 'naciendo' : 'creciendo';
  if (direction === 'baja') return 'declive';
  return level >= p.stage.peakLevel ? 'pico' : 'estable';
}

// ---------------------------------------------------------------------------
// Plataformas (docs/04 §7)
// ---------------------------------------------------------------------------

/** Una plataforma admite proyectos nuevos entre su lanzamiento y su descatalogación. */
export function platformAvailable(platform: Platform, week: number): boolean {
  return week >= platform.releaseWeek && week < platform.endWeek;
}

/** Etapa del ciclo de vida de una plataforma (docs/04 §7). */
export function platformStage(platform: Platform, week: number): PlatformStage {
  const cfg = balance.market.platforms;
  if (week < platform.releaseWeek) return 'anunciada';
  if (week >= platform.endWeek) return 'descatalogada';
  if (week - platform.releaseWeek < cfg.launchWindowWeeks) return 'lanzamiento';

  const peak = platform.lifecycleCurve.reduce((max, p) => Math.max(max, p.value), 1);
  const delta =
    (curveValueAt(platform.lifecycleCurve, week) -
      curveValueAt(platform.lifecycleCurve, week - cfg.directionLookbackWeeks)) /
    peak;
  if (delta > cfg.directionThreshold) return 'crecimiento';
  if (delta < -cfg.directionThreshold) return 'declive';
  return 'madurez';
}

/**
 * Tamaño de mercado de una plataforma para un público (docs/04 §6–7):
 * base instalada actual × sesgo de público de la plataforma.
 */
export function marketSize(platform: Platform, audience: Audience, market: MarketState): number {
  const installedBase = market.platforms[platform.id]?.installedBase ?? 0;
  return installedBase * (platform.audienceBias[audience] ?? 1);
}

// ---------------------------------------------------------------------------
// Saturación (docs/04 §3)
// ---------------------------------------------------------------------------

/** Clave del contador de saturación de un combo género+tema. */
export function comboKey(genreId: string, themeId: string): string {
  return `${genreId}|${themeId}`;
}

/**
 * Saturación efectiva de un combo: su contador + una parte de la saturación
 * de otros temas del mismo género (inundar un género también pesa).
 */
export function effectiveSaturation(
  market: MarketState,
  genreId: string,
  themeId: string,
): number {
  const own = market.saturation[comboKey(genreId, themeId)] ?? 0;
  const prefix = `${genreId}|`;
  let sameGenre = 0;
  for (const [key, value] of Object.entries(market.saturation)) {
    if (key.startsWith(prefix)) sameGenre += value;
  }
  return own + balance.market.saturation.sameGenreWeight * (sameGenre - own);
}

/** modificadorVentas_saturación = 1 − k·saturación, con margen y suelo (docs/04 §3). */
export function saturationModifier(effSaturation: number): number {
  const s = balance.market.saturation;
  const excess = Math.max(0, effSaturation - s.freeAllowance);
  return Math.max(s.minModifier, 1 - s.k * excess);
}

/** Registra un lanzamiento en el contador de saturación de su combo. */
export function registerReleaseSaturation(
  market: MarketState,
  genreId: string,
  themeId: string,
): MarketState {
  const key = comboKey(genreId, themeId);
  return {
    ...market,
    saturation: {
      ...market.saturation,
      [key]: (market.saturation[key] ?? 0) + balance.market.saturation.releaseIncrement,
    },
  };
}

// ---------------------------------------------------------------------------
// Popularidad actual y reseñas por segmento (docs/04 §2 y §5)
// ---------------------------------------------------------------------------

/** Popularidad conjunta de un combo: media de género y tema. */
export function comboPopularity(market: MarketState, genreId: string, themeId: string): number {
  const genre = market.genres[genreId]?.pop ?? 0.5;
  const theme = market.themes[themeId]?.pop ?? 0.5;
  return (genre + theme) / 2;
}

export interface SegmentReviewsInput {
  quality: number;
  genreId: string;
  themeId: string;
  audience: Audience;
  /** Hype acumulado al lanzar, 0..1. */
  hype: number;
  era: EraId;
  market: MarketState;
}

export interface SegmentReviewsResult {
  bySegment: Partial<Record<Segment, number>>;
  /** Media ponderada por los pesos de data/segments.ts (alimenta las ventas). */
  average: number;
  info: ReviewMarketInfo;
}

/**
 * De Calidad a Reseña por segmento (docs/04 §5):
 *   reseñaBase = Q × estándarEra(era)
 *   reseña_seg = clamp(base + afinidadModa − penalizaciónExpectativas + sesgoSegmento, 0, 100)
 */
export function computeSegmentReviews(input: SegmentReviewsInput): SegmentReviewsResult {
  const r = balance.market.reviews;
  const h = balance.market.hype;

  const base = input.quality * (r.eraStandard[input.era] ?? 1);
  const pop = comboPopularity(input.market, input.genreId, input.themeId);
  const modaBonus = r.modaSpan * (pop - r.modaNeutral);
  const hypePenalty =
    (h.reviewPenaltyMax * Math.max(0, input.hype - h.freeHype)) / (1 - h.freeHype);

  const bySegment: Partial<Record<Segment, number>> = {};
  let weighted = 0;
  let totalWeight = 0;
  for (const segment of reviewSegments) {
    const bias =
      (segment.genreBias[input.genreId] ?? 0) + (segment.audienceBias[input.audience] ?? 0);
    const score = Math.round(clamp(base + modaBonus - hypePenalty + bias, 0, 100));
    bySegment[segment.id] = score;
    weighted += segment.weight * score;
    totalWeight += segment.weight;
  }

  return {
    bySegment,
    average: Math.round(weighted / totalWeight),
    info: { base: round1(base), modaBonus: round1(modaBonus), hypePenalty: round1(hypePenalty) },
  };
}

// ---------------------------------------------------------------------------
// Ventas: pico + cola larga, recalculadas por tick (docs/04 §6)
// ---------------------------------------------------------------------------

/**
 * Unidades esperadas (sin ruido) de un juego en su semana t desde el
 * lanzamiento, con el mercado ACTUAL: si la moda muere, la plataforma declina
 * o el género se satura después de lanzar, la curva viva lo refleja.
 *
 *   demanda = tamañoMercado(plataforma, público) × factorTamaño × pop(género) × pop(tema)
 *   curva(t) = pico(hype)·spikeDecay^t + cola·tailDecay(reseña)^t
 *   unidades = demanda × factorReseña × modificadorSaturación × curva(t)
 */
export function expectedWeeklyUnits(
  game: ReleasedGame,
  weeksSinceRelease: number,
  market: MarketState,
): number {
  const s = balance.sales;
  const platform = getPlatform(game.platformId);

  const demand =
    marketSize(platform, game.audience, market) *
    s.sizeDemandFactor[game.size] *
    (market.genres[game.genreId]?.pop ?? 0.5) *
    (market.themes[game.themeId]?.pop ?? 0.5);

  const reviewFactor = (game.review / 100) ** s.reviewExponent;
  const satMod = saturationModifier(effectiveSaturation(market, game.genreId, game.themeId));

  const spike =
    s.launch.spikeBase *
    (1 + balance.market.hype.salesSpikeCoef * game.hypeAtRelease) *
    s.launch.spikeDecay ** weeksSinceRelease;
  const tailDecay =
    s.launch.tailDecayMin + (s.launch.tailDecayMax - s.launch.tailDecayMin) * (game.review / 100);
  const tail = s.launch.tailAmp * tailDecay ** weeksSinceRelease;

  return demand * reviewFactor * satMod * (spike + tail);
}

// ---------------------------------------------------------------------------
// Estado del mercado: creación y avance por tick
// ---------------------------------------------------------------------------

function trendStateAt(curve: readonly CurvePoint[], week: number, pop: number): TrendState {
  return { pop, direction: trendDirection(curve, week), stage: trendStage(curve, week) };
}

function platformStateAt(platform: Platform, week: number, installedBase: number): PlatformMarketState {
  return { installedBase: Math.max(0, Math.round(installedBase)), stage: platformStage(platform, week) };
}

/** Base instalada guionizada de una plataforma en una semana (0 antes del lanzamiento). */
function platformBaseAt(platform: Platform, week: number): number {
  return week < platform.releaseWeek ? 0 : curveValueAt(platform.lifecycleCurve, week);
}

/** Estado inicial del mercado en una semana: las curvas base, sin ruido aún. */
export function createMarketState(week: number): MarketState {
  const genreStates: Record<string, TrendState> = {};
  for (const genre of genres) {
    genreStates[genre.id] = trendStateAt(
      genre.basePopularityCurve,
      week,
      curveValueAt(genre.basePopularityCurve, week),
    );
  }
  const themeStates: Record<string, TrendState> = {};
  for (const theme of themes) {
    themeStates[theme.id] = trendStateAt(
      theme.basePopularityCurve,
      week,
      curveValueAt(theme.basePopularityCurve, week),
    );
  }
  const platformStates: Record<string, PlatformMarketState> = {};
  for (const platform of platforms) {
    platformStates[platform.id] = platformStateAt(platform, week, platformBaseAt(platform, week));
  }
  return { genres: genreStates, themes: themeStates, saturation: {}, platforms: platformStates };
}

/**
 * Evolución de una popularidad: reversión suave hacia la curva base + ruido
 * del PRNG (docs/04 §2: la tendencia es legible, el azar solo matiza).
 */
function evolveTrend(
  prev: TrendState | undefined,
  curve: readonly CurvePoint[],
  week: number,
  rng: Rng,
): TrendState {
  const p = balance.market.popularity;
  const base = curveValueAt(curve, week);
  const deviation = prev ? prev.pop - curveValueAt(curve, week - 1) : 0;
  const pop = clamp(
    base + deviation * p.noisePersistence + p.noiseAmplitude * (rng.next() * 2 - 1),
    0,
    1,
  );
  return trendStateAt(curve, week, pop);
}

/**
 * Avanza el mercado 1 semana (docs/08 §4, primer paso del tick): popularidades,
 * base instalada de plataformas, decaimiento de la saturación y acumulación de
 * hype de los proyectos en desarrollo. Función pura.
 */
export function advanceMarket(state: GameState, rng: Rng): GameState {
  const week = state.week;
  const cfg = balance.market;

  const genreStates: Record<string, TrendState> = {};
  for (const genre of genres) {
    genreStates[genre.id] = evolveTrend(
      state.market.genres[genre.id],
      genre.basePopularityCurve,
      week,
      rng,
    );
  }
  const themeStates: Record<string, TrendState> = {};
  for (const theme of themes) {
    themeStates[theme.id] = evolveTrend(
      state.market.themes[theme.id],
      theme.basePopularityCurve,
      week,
      rng,
    );
  }

  const platformStates: Record<string, PlatformMarketState> = {};
  for (const platform of platforms) {
    const noisy =
      platformBaseAt(platform, week) *
      (1 + cfg.platforms.noiseAmplitude * (rng.next() * 2 - 1));
    platformStates[platform.id] = platformStateAt(platform, week, noisy);
  }

  // El público "olvida": la saturación decae; se limpian los restos ínfimos.
  const saturation: Record<string, number> = {};
  for (const [key, value] of Object.entries(state.market.saturation)) {
    const decayed = value * cfg.saturation.decayPerWeek;
    if (decayed >= 0.01) saturation[key] = decayed;
  }

  const market: MarketState = {
    genres: genreStates,
    themes: themeStates,
    saturation,
    platforms: platformStates,
  };

  // Hype base (docs/04 §4): crece desde la fase de Producción, más si hay moda.
  const projects = state.projects.map((project) => {
    if (project.phase < cfg.hype.startPhase) return project;
    const pop = comboPopularity(market, project.genreId, project.themeId);
    const gain =
      cfg.hype.gainBySize[project.size] *
      (cfg.hype.popCouplingBase + cfg.hype.popCouplingSpan * pop);
    return { ...project, hype: Math.min(cfg.hype.max, project.hype + gain) };
  });

  let next: GameState = { ...state, market, projects };

  // Hitos legibles del panel de tendencias: una moda toca techo o muere.
  for (const genre of genres) {
    const before = state.market.genres[genre.id]?.stage;
    const after = genreStates[genre.id].stage;
    if (before !== undefined && before !== after) {
      if (after === 'pico') {
        next = appendLog(next, 'mercado', `El género ${getGenre(genre.id).name} toca techo: está de moda.`);
      } else if (after === 'muerto') {
        next = appendLog(next, 'mercado', `El género ${getGenre(genre.id).name} ya no interesa a nadie.`);
      }
    }
  }
  for (const theme of themes) {
    const before = state.market.themes[theme.id]?.stage;
    const after = themeStates[theme.id].stage;
    if (before !== undefined && before !== after) {
      if (after === 'pico') {
        next = appendLog(next, 'mercado', `El tema ${getTheme(theme.id).name} toca techo: está de moda.`);
      } else if (after === 'muerto') {
        next = appendLog(next, 'mercado', `El tema ${getTheme(theme.id).name} ya no interesa a nadie.`);
      }
    }
  }

  return next;
}
