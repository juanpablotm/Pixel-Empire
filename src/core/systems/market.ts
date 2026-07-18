import { balance } from '../../data/balance';
import { genres, getGenre } from '../../data/genres';
import { getPlatform, platforms } from '../../data/platforms';
import { getTheme, themes } from '../../data/themes';
import { monetizationReviewBias, reviewSegments } from '../../data/segments';
import { getTrait } from '../../data/traits';
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
import type { MonetizationConfig } from '../model/moral';
import type { Audience } from '../model/project';
import type { ReleasedGame } from '../model/release';
import { capabilityBonus } from './research';

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

/**
 * Punto ÚNICO por el que pasa toda suma de hype —desarrollo, creadores,
 * marketing, premios, dilemas— (docs/17 B2). Desde 9.1 el hype NO tiene tope
 * superior (marketing sin tope, docs/19 §9.1): cuanto más metes, más subes si
 * el juego cumple y más te hundes si falla. Solo se garantiza que nunca sea
 * negativo. El hype PASIVO sigue frenado por su meseta en advanceMarket.
 */
export function clampHype(value: number): number {
  return Math.max(0, value);
}

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
  /** Hype acumulado al lanzar (≥ 0; desde 9.1 sin tope superior). */
  hype: number;
  /** Modelo de negocio: cada público lo juzga distinto (docs/04 §5 y docs/06). */
  monetization: MonetizationConfig;
  era: EraId;
  market: MarketState;
  /**
   * Fase 9.1: lanzamientos previos del MISMO combo tema×género dentro de la
   * ventana de fatiga (releaseProject los cuenta sobre releasedGames).
   */
  recentRepeats?: number;
  /**
   * Fase 9.1: desvío entero de la banda legible en [−band, +band], generado
   * por releaseProject con su stream del PRNG. Los tests unitarios pasan 0.
   */
  bandOffset?: number;
}

export interface SegmentReviewsResult {
  bySegment: Partial<Record<Segment, number>>;
  /** Media ponderada por los pesos de data/segments.ts (alimenta las ventas). */
  average: number;
  info: ReviewMarketInfo;
}

/**
 * De Calidad a Reseña por segmento (docs/04 §5, reescrito en 9.1):
 *   notaBase = barScore + gain·(Q − listón(era))   // listón EN PARTE oculto
 *   reseña_seg = clamp(notaBase + afinidadModa − penalizaciónExpectativas
 *                      − fatiga + banda + sesgoSegmento, 0, 100)
 * El listón sube más rápido que tu comodidad: un mismo 70 interno saca ~80 en
 * E2 y ~60 en E5. La fatiga cobra la repetición de fórmula y la banda añade
 * el gusto del momento — ambas SIEMPRE explicadas en el desglose (Pilar 2).
 */
export function computeSegmentReviews(input: SegmentReviewsInput): SegmentReviewsResult {
  const r = balance.market.reviews;
  const h = balance.market.hype;

  const eraDelta = input.quality - (r.eraBar[input.era] ?? r.barScore);
  const base = r.barScore + r.gain * eraDelta;
  const pop = comboPopularity(input.market, input.genreId, input.themeId);
  const modaBonus = r.modaSpan * (pop - r.modaNeutral);
  const hypePenalty = h.reviewPenaltyPerHype * Math.max(0, input.hype - h.freeHype);

  const f = r.fatigue;
  const satEff = effectiveSaturation(input.market, input.genreId, input.themeId);
  const fatiga = Math.min(
    f.max,
    f.perRepeat * (input.recentRepeats ?? 0) +
      f.perSaturation * Math.max(0, satEff - f.satMargin),
  );
  const banda = input.bandOffset ?? 0;

  const bySegment: Partial<Record<Segment, number>> = {};
  let weighted = 0;
  let totalWeight = 0;
  for (const segment of reviewSegments) {
    const bias =
      (segment.genreBias[input.genreId] ?? 0) +
      (segment.audienceBias[input.audience] ?? 0) +
      // sesgoSegmento(segmento, monetización): las MTX enfurecen al hardcore,
      // los casual apenas lo notan (docs/04 §5 y docs/06 §1).
      monetizationReviewBias(segment, input.monetization);
    const score = Math.round(clamp(base + modaBonus - hypePenalty - fatiga + banda + bias, 0, 100));
    bySegment[segment.id] = score;
    weighted += segment.weight * score;
    totalWeight += segment.weight;
  }

  return {
    bySegment,
    average: Math.round(weighted / totalWeight),
    info: {
      base: round1(base),
      modaBonus: round1(modaBonus),
      hypePenalty: round1(hypePenalty),
      eraDelta: round1(eraDelta),
      fatiga: round1(fatiga),
      banda,
    },
  };
}

/**
 * Brecha de sobre-hype (docs/17 E2): mide cuánto prometió el hype frente a lo
 * que la reseña entrega. Solo es > 0 cuando el hype entró en la zona roja
 * (≥ overHypeThreshold) Y el juego no cumple (reseña < reviewBar): el producto
 * de ambos excesos, así que hace falta mucho hype Y reseña baja a la vez. Por
 * debajo de minGap se ignora (ruido). Desde 9.1 el exceso de hype NO se acota
 * a 1 (marketing sin tope): la brecha crece con cada campaña de más, y con
 * ella el golpe de cola y de reputación. Determinista y puro.
 */
export function overHypeGap(hype: number, review: number): number {
  const h = balance.market.hype;
  const o = h.overHype;
  const hypeExcess = Math.max(0, (hype - h.overHypeThreshold) / (1 - h.overHypeThreshold));
  const shortfall = clamp((o.reviewBar - review) / o.reviewBar, 0, 1);
  const gap = hypeExcess * shortfall;
  return gap >= o.minGap ? gap : 0;
}

// ---------------------------------------------------------------------------
// Ventas: pico + cola larga, recalculadas por tick (docs/04 §6)
// ---------------------------------------------------------------------------

/**
 * modificadorPrecio(precio, público) (docs/04 §6 y docs/06 §2): precio caro →
 * menos volumen, sobre todo en públicos sensibles (casual/infantil); precio
 * generoso → más volumen. Un F2P no tiene barrera de entrada: bono plano.
 */
export function priceModifier(game: Pick<ReleasedGame, 'price' | 'size' | 'audience' | 'monetization'>): number {
  if (game.monetization.model === 'f2p') return balance.monetization.f2pDemandBoost;
  const recommended = balance.economy.priceBySize[game.size];
  const elasticity = balance.economy.pricing.elasticityByAudience[game.audience];
  return (recommended / game.price) ** elasticity;
}

/** Modificadores de ventas que dependen del estudio, no del mercado (docs/06). */
export interface SalesContext {
  /** Colchón de comunidad (docs/06 §3 y docs/07 §2); 1 = neutro. */
  communityFactor?: number;
  /** Penalización por escándalos activos (docs/06 §5); 1 = sin escándalo. */
  scandalFactor?: number;
  /** Review bombing sobre ESTE juego (docs/07 §5); 1 = sin bombardeo. */
  bombFactor?: number;
}

/**
 * Unidades esperadas (sin ruido) de un juego en su semana t desde el
 * lanzamiento, con el mercado ACTUAL: si la moda muere, la plataforma declina
 * o el género se satura después de lanzar, la curva viva lo refleja.
 *
 *   demanda = tamañoMercado(plataforma, público) × factorTamaño × pop(género) × pop(tema)
 *   curva(t) = pico(hype)·spikeDecay^t + cola·tailDecay(reseña)^t
 *   unidades = demanda × factorReseña × modificadorSaturación × modificadorPrecio
 *            × colchónComunidad × factorEscándalo × curva(t)
 */
export function expectedWeeklyUnits(
  game: ReleasedGame,
  weeksSinceRelease: number,
  market: MarketState,
  context: SalesContext = {},
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
    // La campaña de creadores empuja el pico de salida (docs/07 §3).
    (1 + (game.creatorSpikeBoost ?? 0)) *
    s.launch.spikeDecay ** weeksSinceRelease;
  const tailDecay =
    s.launch.tailDecayMin + (s.launch.tailDecayMax - s.launch.tailDecayMin) * (game.review / 100);
  // El castigo por sobre-hype (docs/17 E2) hunde SOLO la cola: el pico day-one
  // se mantiene (ya compraron por el hype), pero el boca a boca revela la verdad.
  const tail =
    s.launch.tailAmp * tailDecay ** weeksSinceRelease * (1 - (game.overHypeTailPenalty ?? 0));

  return (
    demand *
    reviewFactor *
    satMod *
    priceModifier(game) *
    (context.communityFactor ?? 1) *
    (context.scandalFactor ?? 1) *
    (context.bombFactor ?? 1) *
    (spike + tail)
  );
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
  // Las "Estrellas mediáticas" asignadas dan hype extra (docs/07 §6) y el
  // marketing investigado lo acelera (docs/02 §3: capacidad hypeGain).
  // El pasivo se frena contra su meseta (hype.passiveCap, docs/18 V3): la zona
  // roja solo se alcanza comprando marketing o creadores, nunca por duración.
  const hypeCapability = capabilityBonus(state, 'hypeGain');
  const projects = state.projects.map((project) => {
    if (project.phase < cfg.hype.startPhase) return project;
    const pop = comboPopularity(market, project.genreId, project.themeId);
    const starBonus = state.staff
      .filter((e) => project.assignedStaff.includes(e.id))
      .reduce(
        (sum, e) =>
          sum + e.traits.reduce((s, id) => s + (getTrait(id).modifiers.hypeBonus ?? 0), 0),
        0,
      );
    // Freno hacia la meseta: 1 en hype 0, 0 al alcanzarla (y por encima, si el
    // marketing ya la superó). Es lo que desacopla el hype pasivo de la duración.
    const headroom = Math.max(0, 1 - project.hype / cfg.hype.passiveCap);
    const gain =
      cfg.hype.gainBySize[project.size] *
      (cfg.hype.popCouplingBase + cfg.hype.popCouplingSpan * pop) *
      (1 + balance.community.mediaStarHypeCoef * starBonus) *
      hypeCapability *
      headroom;
    return { ...project, hype: clampHype(project.hype + gain) };
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
