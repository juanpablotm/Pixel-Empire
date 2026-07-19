import { balance } from '../../data/balance';
import {
  ambientPosts,
  crisisPosts,
  dilemmaPosts,
  feedAuthors,
  leverPosts,
  liveBugPosts,
  releasePosts,
  responsePosts,
  streamPosts,
} from '../../data/communityTexts';
import { creators, getCreator, type CreatorDef } from '../../data/creators';
import { getCrisisDef, getCrisisResponse } from '../../data/crises';
import { eraAtLeast } from '../../data/regulations';
import { appendLog } from '../engine/log';
import { makeRng, type Rng } from '../engine/rng';
import type {
  ActiveCrisis,
  CommunityPost,
  CommunityState,
  CrisisCause,
  CrisisRepDeltas,
  CrisisResponseId,
  DilemmaKind,
  PendingDilemma,
  PostMood,
  ReviewBomb,
  StreamResult,
  StreamTier,
} from '../model/community';
import type { GameState } from '../model/gameState';
import type { Audience, Project } from '../model/project';
import type { ReleasedGame } from '../model/release';
import { clampHype } from './market';
import { hasMtx, nudgeMoralDrift, scandalCushion } from './morale';
import { withReputationDeltas, type ReputationDeltas } from './reputation';

/**
 * La capa social (docs/07): sentimiento de comunidad con feed generado,
 * campañas de creadores (fit × calidad × bugs), hype/leaks con dilemas,
 * review bombing TEMPORAL y gestión de crisis con reloj.
 *
 * Coherencia "mayormente determinista" (docs/07 §5): toda crisis es trazable
 * a una decisión del jugador (deuda de codicia, claves con un juego roto,
 * promesa inflada). El PRNG solo decide el sabor: qué creador topa con el
 * bug, el timing del leak, qué plantilla de post sale. Nunca castiga una
 * buena decisión de la nada.
 */

/** Stream del PRNG para el sabor en el momento del lanzamiento (docs/08 §1). */
const RELEASE_FLAVOR_STREAM = 6 << 20;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
const clamp01 = (value: number): number => clamp(value, 0, 1);
const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Estado inicial de la capa social (partida nueva o migración de save). */
export function initialCommunityState(): CommunityState {
  return {
    sentiment: balance.community.sentiment.initial,
    feed: [],
    crises: [],
    bombs: [],
    dilemmas: [],
    firedDilemmas: {},
  };
}

// ---------------------------------------------------------------------------
// Sentimiento (docs/07 §2)
// ---------------------------------------------------------------------------

/**
 * modificadorComunidad(sentimiento) sobre las ventas (docs/04 §6): el boca a
 * boca. Sustituye en el tick al colchón por reputación de Fase 4: el
 * sentimiento revierte hacia la reputación de comunidad, así que a largo
 * plazo coinciden; a corto, el humor manda.
 */
export function sentimentSalesModifier(sentiment: number): number {
  return 1 + balance.community.sentiment.salesCoef * ((sentiment - 50) / 50);
}

/** Suma (o resta) sentimiento con clamp 0..100. Exportada desde 9.6: la quema
 * del Early Access (systems/earlyAccess.ts) pasa por el MISMO punto único. */
export function addSentiment(community: CommunityState, amount: number): CommunityState {
  if (amount === 0) return community;
  return { ...community, sentiment: round2(clamp(community.sentiment + amount, 0, 100)) };
}

// ---------------------------------------------------------------------------
// Feed de posts (docs/10 §7.3): plantillas + variables, el PRNG elige el sabor
// ---------------------------------------------------------------------------

interface PostVars {
  game?: string;
  creator?: string;
  hashtag?: string;
}

function fillTemplate(text: string, vars: PostVars): string {
  return text
    .replaceAll('{game}', vars.game ?? '')
    .replaceAll('{creator}', vars.creator ?? '')
    .replaceAll('{hashtag}', vars.hashtag ?? '')
    .trim();
}

function pushPost(
  state: GameState,
  rng: Rng,
  mood: PostMood,
  templates: readonly string[],
  vars: PostVars = {},
): GameState {
  const post: CommunityPost = {
    week: state.week,
    mood,
    author: rng.pick(feedAuthors),
    text: fillTemplate(rng.pick(templates), vars),
    ...(vars.hashtag ? { hashtag: vars.hashtag } : {}),
  };
  const feed = [...state.community.feed, post].slice(-balance.community.feed.maxPosts);
  return { ...state, community: { ...state.community, feed } };
}

// ---------------------------------------------------------------------------
// Review bombing (docs/07 §5): estado temporal, nunca permanente
// ---------------------------------------------------------------------------

/** Nota pública visible: la real menos el bombardeo activo (la real no cambia). */
export function visibleReview(game: ReleasedGame, community: CommunityState): number {
  const penalty = community.bombs
    .filter((b) => b.gameId === game.id && b.weeksLeft > 0)
    .reduce((worst, b) => Math.max(worst, b.reviewPenalty), 0);
  return Math.max(0, game.review - penalty);
}

/** Multiplicador de ventas del juego por bombing activo (1 = sin bombardeo). */
export function bombSalesFactor(community: CommunityState, gameId: string): number {
  return community.bombs.reduce(
    (worst, b) => (b.gameId === gameId && b.weeksLeft > 0 ? Math.min(worst, b.salesPenalty) : worst),
    1,
  );
}

// ---------------------------------------------------------------------------
// Crisis (docs/07 §5): estallido, reloj y menú de respuestas
// ---------------------------------------------------------------------------

/** El juego más reciente que encarna la causa (para señalar y poder revertir). */
function latestGameForCause(state: GameState, cause: CrisisCause): ReleasedGame | null {
  for (let i = state.releasedGames.length - 1; i >= 0; i--) {
    const g = state.releasedGames[i];
    const mon = g.monetization;
    switch (cause) {
      case 'lootboxes':
        if (mon.hasLootBoxes) return g;
        break;
      case 'mtxAgresivas':
        if ((hasMtx(mon.model) && mon.aggressiveness > 0) || mon.hasBattlePass) return g;
        break;
      case 'dayOneDLC':
        if (mon.dayOneDLC) return g;
        break;
      case 'precioAbusivo':
        if (
          g.price / balance.economy.priceBySize[g.size] >=
          balance.economy.pricing.abusiveMultiplier
        ) {
          return g;
        }
        break;
      case 'refrito':
        return g; // el lanzamiento más reciente es la fotocopia señalada
      default:
        return null; // crunch: sin juego concreto
    }
  }
  return null;
}

/**
 * Hace estallar una crisis (docs/07 §5): reloj, review bombing sobre el juego
 * señalado y feed en llamas. La reputación previa amortigua o amplifica la
 * severidad (docs/06 §5: colchón): un estudio querido sufre crisis más suaves.
 */
export function spawnCrisis(
  state: GameState,
  rng: Rng,
  cause: CrisisCause,
  gameId: string | null,
  rawSeverity: number,
): GameState {
  const cfg = balance.community.crisis;
  const def = getCrisisDef(cause);
  const cushion = scandalCushion(state.studio);
  const severity = round2(clamp(rawSeverity * cushion, cfg.minSeverity, 1));

  const crisis: ActiveCrisis = {
    id: `crisis-${state.week}-${cause}`,
    cause,
    gameId,
    startWeek: state.week,
    deadlineWeek: state.week + def.deadlineWeeks,
    severity,
    status: 'abierta',
  };

  // El bombardeo cae sobre el juego señalado o, si no lo hay, el último vivo.
  const fallback = [...state.releasedGames].reverse().find((g) => g.salesActive);
  const targetId = gameId ?? fallback?.id ?? null;
  const bombs = [...state.community.bombs];
  if (targetId !== null) {
    const floor = cfg.bombDurationSeverityFloor;
    bombs.push({
      gameId: targetId,
      cause,
      startWeek: state.week,
      weeksLeft: Math.max(1, Math.round(def.bombWeeks * (floor + (1 - floor) * severity))),
      reviewPenalty: Math.round(def.bombReviewPenalty * severity),
      salesPenalty: round2(1 - (1 - def.bombSalesPenalty) * severity),
    });
  }

  let community: CommunityState = {
    ...state.community,
    crises: [...state.community.crises, crisis],
    bombs,
  };
  community = addSentiment(community, -cfg.spawnSentimentHit * severity);

  let next: GameState = { ...state, community };
  next = appendLog(next, 'comunidad', `🔥 CRISIS: ${def.headline}. ${def.causeText}`);
  if (targetId !== null) {
    const target = next.releasedGames.find((g) => g.id === targetId);
    next = appendLog(
      next,
      'comunidad',
      `Review bombing sobre «${target?.name ?? targetId}»: nota visible y ventas se hunden hasta que amaine o lo gestiones.`,
    );
  }
  next = pushPost(next, rng, 'negativo', crisisPosts[cause], { hashtag: def.hashtag });
  next = pushPost(next, rng, 'negativo', crisisPosts[cause], { hashtag: def.hashtag });
  return next;
}

/** Escala un mapa de deltas por un factor (severidad, retraso...). */
function scaleDeltas(deltas: CrisisRepDeltas, factor: number): ReputationDeltas {
  const scaled: ReputationDeltas = {};
  for (const [seg, v] of Object.entries(deltas) as [keyof CrisisRepDeltas, number][]) {
    scaled[seg] = round2(v * factor);
  }
  return scaled;
}

function applyBombEffect(
  bombs: readonly ReviewBomb[],
  crisis: ActiveCrisis,
  effect: 'termina' | 'acorta' | 'nada' | 'alarga',
  extendWeeks: number,
): ReviewBomb[] {
  const cfg = balance.community.crisis;
  return bombs
    .map((b) => {
      if (b.cause !== crisis.cause || b.startWeek !== crisis.startWeek) return b;
      if (effect === 'termina') return { ...b, weeksLeft: 0 };
      if (effect === 'acorta') {
        return { ...b, weeksLeft: Math.ceil(b.weeksLeft * cfg.bombShortenFactor) };
      }
      if (effect === 'alarga') return { ...b, weeksLeft: b.weeksLeft + extendWeeks };
      return b;
    })
    .filter((b) => b.weeksLeft > 0);
}

/** Recorta el historial de crisis resueltas (las abiertas nunca se tocan). */
function trimCrises(crises: readonly ActiveCrisis[]): ActiveCrisis[] {
  const open = crises.filter((c) => c.status === 'abierta');
  const resolved = crises.filter((c) => c.status !== 'abierta');
  return [...resolved.slice(-balance.community.crisis.historyMax), ...open];
}

/**
 * Desenlace del silencio (elegido o forzado por el reloj): la reputación de
 * comunidad decide si la crisis amaina o se pudre (docs/07 §5). Determinista:
 * el estudio querido recibe el beneficio de la duda; el odiado, el incendio.
 */
function resolveSilence(state: GameState, crisis: ActiveCrisis, late: boolean): GameState {
  const cfg = balance.community.crisis;
  const rng = makeRng(state.seed, RELEASE_FLAVOR_STREAM + state.week + 1);
  const communityRep = state.studio.reputation.comunidad ?? 50;
  const fades = communityRep >= cfg.silenceFadeRep;
  const outcome = fades ? cfg.silence.fade : cfg.silence.rot;
  const factor = crisis.severity * (late ? cfg.lateFactor : 1);

  let studio = withReputationDeltas(state.studio, scaleDeltas(outcome.repDeltas, factor));
  let community = addSentiment(state.community, outcome.sentiment * factor);

  const resolved: ActiveCrisis = {
    ...crisis,
    status: fades ? 'amainada' : 'podrida',
    responseId: 'silencio',
    resolvedWeek: state.week,
  };
  community = {
    ...community,
    crises: trimCrises(community.crises.map((c) => (c.id === crisis.id ? resolved : c))),
    bombs: applyBombEffect(
      community.bombs,
      crisis,
      fades ? 'acorta' : 'alarga',
      fades ? 0 : cfg.silence.rot.bombExtendWeeks,
    ),
  };

  let next: GameState = { ...state, studio, community };
  next = pushPost(next, rng, fades ? 'neutro' : 'negativo', responsePosts[fades ? 'amaina' : 'pudre']);
  return appendLog(
    next,
    'comunidad',
    fades
      ? `La crisis amaina sola: la comunidad te da el beneficio de la duda${late ? ' (aunque callar tanto tiempo dejó marca)' : ''}.`
      : `El silencio pudre la crisis: la comunidad lo toma como una confesión${late ? ' y el retraso lo empeora' : ''}.`,
  );
}

/** Revertir la decisión que causó la crisis (docs/07 §5): sacrifica ingresos. */
function revertDecision(state: GameState, crisis: ActiveCrisis): GameState {
  if (crisis.gameId === null) {
    throw new Error('No hay decisión concreta que revertir en esta crisis');
  }
  const games = state.releasedGames.map((g) => {
    if (g.id !== crisis.gameId) return g;
    switch (crisis.cause) {
      case 'lootboxes':
        return { ...g, monetization: { ...g.monetization, hasLootBoxes: false } };
      case 'mtxAgresivas':
        return {
          ...g,
          monetization: { ...g.monetization, aggressiveness: 0, hasBattlePass: false },
        };
      case 'dayOneDLC':
        return { ...g, monetization: { ...g.monetization, dayOneDLC: false } };
      case 'precioAbusivo':
        return { ...g, price: balance.economy.priceBySize[g.size] };
      default:
        return g;
    }
  });
  return { ...state, releasedGames: games };
}

/**
 * Acción: responder a una crisis abierta (docs/07 §5 y docs/10 §10.8). Cada
 * respuesta mueve los segmentos de forma distinta; el coste escala con la
 * severidad. 'culpar' se destapa SIEMPRE si la crisis es gorda (determinista).
 */
export function respondToCrisis(
  state: GameState,
  crisisId: string,
  responseId: CrisisResponseId,
): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const crisis = state.community.crises.find((c) => c.id === crisisId);
  if (!crisis || crisis.status !== 'abierta') {
    throw new Error('Esa crisis no está abierta');
  }
  const def = getCrisisDef(crisis.cause);
  if (!def.responses.includes(responseId)) {
    throw new Error(`La respuesta ${responseId} no aplica a esta crisis`);
  }

  if (responseId === 'silencio') return resolveSilence(state, crisis, false);

  const cfg = balance.community.crisis;
  const response = getCrisisResponse(responseId);
  const rng = makeRng(state.seed, RELEASE_FLAVOR_STREAM + state.week + 2);
  const cost = Math.round(response.costFactor * crisis.severity);
  if (cost > 0 && state.studio.capital < cost) {
    throw new Error('No hay caja para esa respuesta');
  }

  // 'culpar' en una crisis gorda se destapa siempre (docs/07 §5): la mentira
  // es una decisión más, y también se paga.
  const backfires =
    responseId === 'culpar' && crisis.severity >= cfg.culparBackfireSeverity;
  const repDeltas = backfires ? response.backfireRepDeltas ?? {} : response.repDeltas;
  const sentimentDelta = backfires
    ? response.backfireSentimentDelta ?? 0
    : response.sentimentDelta;

  let next = state;
  if (responseId === 'revertir') next = revertDecision(next, crisis);

  let studio = withReputationDeltas(next.studio, scaleDeltas(repDeltas, crisis.severity));
  studio = { ...studio, capital: studio.capital - cost };

  const resolved: ActiveCrisis = {
    ...crisis,
    status: 'gestionada',
    responseId,
    resolvedWeek: next.week,
  };
  let community = addSentiment(next.community, sentimentDelta * crisis.severity);
  community = {
    ...community,
    crises: trimCrises(community.crises.map((c) => (c.id === crisis.id ? resolved : c))),
    bombs: applyBombEffect(
      community.bombs,
      crisis,
      backfires ? 'alarga' : response.bombEffect,
      cfg.bombExtendWeeks,
    ),
  };

  // La buena gestión también desinfla el escándalo de docs/06 que la originó.
  const scandals =
    response.scandalEffect === 'acorta' && !backfires
      ? next.scandals.map((s) =>
          s.source === crisis.cause && s.weeksLeft > 0
            ? { ...s, weeksLeft: Math.ceil(s.weeksLeft * cfg.scandalShortenFactor) }
            : s,
        )
      : next.scandals;

  next = { ...next, studio, community, scandals };

  const postKey = backfires ? 'culparBackfire' : responseId;
  next = pushPost(
    next,
    rng,
    backfires || responseId === 'corporativo' || responseId === 'culpar'
      ? 'negativo'
      : 'positivo',
    responsePosts[postKey],
  );
  const costText = cost > 0 ? ` (−${cost.toLocaleString('es-ES')} 💰)` : '';
  next = appendLog(
    next,
    'comunidad',
    backfires
      ? `Negaste una crisis demasiado grande y la mentira se destapó. Ahora es mucho peor.`
      : `Respuesta a la crisis: ${response.name}${costText}.`,
  );
  return next;
}

// ---------------------------------------------------------------------------
// Creadores y reparto de claves (docs/07 §3)
// ---------------------------------------------------------------------------

/** Roster visible en la era actual (los streamers llegan con las eras, docs/07 §7). */
export function availableCreators(era: GameState['era']): CreatorDef[] {
  return creators.filter((c) => eraAtLeast(era, c.appearsInEra));
}

/** Claves disponibles por lanzamiento según el tamaño del proyecto. */
export function keysAllowed(size: Project['size']): number {
  return balance.community.keys.bySize[size];
}

/** fit(juego, públicoCreador) 0..1 (docs/07 §3): género + público objetivo. */
export function creatorFit(
  creator: CreatorDef,
  genreId: string,
  audience: Audience,
): number {
  const cfg = balance.community.creators;
  const genreFit = creator.genreAffinity[genreId] ?? 0.5;
  const audienceFit = creator.audienceAffinity[audience] ?? 0.5;
  return clamp01(cfg.fitGenreWeight * genreFit + cfg.fitAudienceWeight * audienceFit);
}

/**
 * resultadoCreador = fit × factorCalidad × factorBugs (docs/07 §3), puro y
 * legible: la exigencia del creador sube el listón de calidad y los bugs
 * hunden el directo. Sin azar: la misma decisión da el mismo resultado.
 */
export function computeStreamOutcome(
  creator: CreatorDef,
  game: Pick<ReleasedGame, 'genreId' | 'audience' | 'quality'>,
  bugLevel: number,
): Omit<StreamResult, 'creatorId' | 'tier' | 'liveBug' | 'salesBoost'> {
  const cfg = balance.community.creators;
  const fit = creatorFit(creator, game.genreId, game.audience);
  const qualityFactor = clamp01(
    game.quality / (cfg.qualityFloor + cfg.qualitySpan * creator.demandingness),
  );
  const bugFactor = Math.max(0, 1 - cfg.bugPenalty * bugLevel);
  return {
    outcome: round2(fit * qualityFactor * bugFactor),
    fit: round2(fit),
    qualityFactor: round2(qualityFactor),
    bugFactor: round2(bugFactor),
  };
}

function tierOf(outcome: number): StreamTier {
  const cfg = balance.community.creators;
  if (outcome >= cfg.successThreshold) return 'exito';
  if (outcome >= cfg.lukewarmThreshold) return 'tibio';
  return 'desastre';
}

/**
 * Acción: dar una clave de acceso a un creador para un proyecto (sin id, el
 * primero; docs/07 §3). Recurso limitado por lanzamiento; cuesta dinero y
 * alimenta el hype (la campaña de creadores de docs/04 §4).
 */
export function assignCreatorKey(
  state: GameState,
  creatorId: string,
  projectId?: string,
): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const project =
    projectId === undefined
      ? state.projects[0]
      : state.projects.find((p) => p.id === projectId);
  if (!project) throw new Error('No hay proyecto en desarrollo');
  if (project.phase < balance.market.hype.startPhase) {
    throw new Error('Demasiado pronto: las claves se reparten desde la Producción (el anuncio)');
  }
  const creator = getCreator(creatorId);
  if (!eraAtLeast(state.era, creator.appearsInEra)) {
    throw new Error(`${creator.name} todavía no existe en esta era`);
  }
  if (project.creatorCampaign.includes(creatorId)) {
    throw new Error(`${creator.name} ya tiene clave para este lanzamiento`);
  }
  if (project.creatorCampaign.length >= keysAllowed(project.size)) {
    throw new Error('No quedan claves para este lanzamiento (recurso limitado)');
  }

  const keys = balance.community.keys;
  const hypeBoost = Math.min(keys.hypeBoostCap, (creator.reach / keys.reachScale) * keys.hypeBoost);
  const next: GameState = {
    ...state,
    studio: { ...state.studio, capital: state.studio.capital - creator.acquisitionCost },
    projects: state.projects.map((p) =>
      p.id === project.id
        ? {
            ...p,
            creatorCampaign: [...p.creatorCampaign, creatorId],
            hype: clampHype(round2(p.hype + hypeBoost)),
          }
        : p,
    ),
  };
  return appendLog(
    next,
    'comunidad',
    `Clave de «${project.name}» para ${creator.name}: −${creator.acquisitionCost.toLocaleString('es-ES')} 💰. El casting está hecho; el riesgo, también.`,
  );
}

// ---------------------------------------------------------------------------
// Efectos del lanzamiento (docs/07 §3–§5): directos, promesa y feed
// ---------------------------------------------------------------------------

/**
 * Aplica la capa social de un lanzamiento: los directos de la campaña de
 * creadores (ventas + reputación por segmento), el bug en directo si el juego
 * salió roto (bugLevel decide; el PRNG solo elige a la víctima), el juicio de
 * la promesa inflada y las sacudidas del termómetro. Llamado desde
 * releaseProject justo después de los efectos morales (docs/06).
 */
export function applyReleaseCommunityEffects(
  state: GameState,
  gameId: string,
  campaign: readonly string[],
): GameState {
  const cfg = balance.community;
  const rng = makeRng(state.seed, RELEASE_FLAVOR_STREAM + state.week);
  const game = state.releasedGames.find((g) => g.id === gameId);
  if (!game) return state;

  let next = state;
  let jolt = 0;
  let deltas: ReputationDeltas = {};

  // 1 — El feed reacciona a la reseña (docs/10 §7.3).
  const s = cfg.sentiment;
  jolt += clamp(
    (game.review - s.releaseNeutralReview) / s.releaseDivisor,
    -s.releaseJoltCap,
    s.releaseJoltCap,
  );
  const reviewTier = game.review >= 75 ? 'hit' : game.review >= 55 ? 'ok' : 'flop';
  next = pushPost(
    next,
    rng,
    reviewTier === 'hit' ? 'positivo' : reviewTier === 'ok' ? 'neutro' : 'negativo',
    releasePosts[reviewTier],
    { game: game.name },
  );

  // 2 — Y a las palancas morales (docs/06 §2): sacudidas inmediatas del humor.
  const mon = game.monetization;
  const priceRatio = game.price / balance.economy.priceBySize[game.size];
  const pricing = balance.economy.pricing;
  if (mon.hasLootBoxes) {
    jolt += s.levers.lootboxes;
    next = pushPost(next, rng, 'negativo', leverPosts.lootboxes, { game: game.name });
  }
  if (hasMtx(mon.model) && mon.aggressiveness > 0) {
    jolt += s.levers.mtxPerAggression * mon.aggressiveness;
    if (mon.aggressiveness > 0.5) {
      next = pushPost(next, rng, 'negativo', leverPosts.mtx, { game: game.name });
    }
  }
  if (mon.dayOneDLC) {
    jolt += s.levers.dayOneDLC;
    next = pushPost(next, rng, 'negativo', leverPosts.dayOneDLC, { game: game.name });
  }
  if (priceRatio >= pricing.abusiveMultiplier) {
    jolt += s.levers.abusivePrice;
    next = pushPost(next, rng, 'negativo', leverPosts.abusivePrice, { game: game.name });
  } else if (priceRatio <= pricing.generousMultiplier) {
    jolt += s.levers.generousPrice;
    next = pushPost(next, rng, 'positivo', leverPosts.generousPrice, { game: game.name });
  }
  const honest =
    !mon.hasLootBoxes &&
    !mon.dayOneDLC &&
    (!hasMtx(mon.model) || mon.aggressiveness <= balance.moral.drift.honestAggressivenessMax) &&
    priceRatio < pricing.abusiveMultiplier;
  if (honest) {
    jolt += s.levers.honestRelease;
    next = pushPost(next, rng, 'positivo', leverPosts.honest, { game: game.name });
  }

  // 3 — Los directos de la campaña de creadores (docs/07 §3).
  const c = cfg.creators;
  const bugLevel = game.breakdown.bugLevel;
  // El bug en directo es determinista: solo si mandaste un juego roto a los
  // creadores. El PRNG elige a la víctima (sabor, docs/07 §5).
  const liveBugHappens = campaign.length > 0 && bugLevel >= c.liveBugThreshold;
  const victimId = liveBugHappens ? rng.pick(campaign) : null;

  let totalBoost = 0;
  const streams: StreamResult[] = [];
  for (const creatorId of campaign) {
    const creator = getCreator(creatorId);
    const base = computeStreamOutcome(creator, game, bugLevel);
    const liveBug = creatorId === victimId;
    const outcome = round2(liveBug ? base.outcome * c.liveBugOutcomeFactor : base.outcome);
    const tier = liveBug ? 'desastre' : tierOf(outcome);
    const salesBoost = round2((creator.reach / balance.community.keys.reachScale) * outcome * c.spikeBoostCoef);
    totalBoost += salesBoost;
    streams.push({ ...base, creatorId, outcome, tier, liveBug, salesBoost });

    // Reputación por segmento objetivo del creador (docs/07 §3: efectoReputación).
    for (const [seg, share] of Object.entries(creator.targetSegments) as [
      keyof ReputationDeltas,
      number,
    ][]) {
      const d = clamp((outcome - c.repNeutral) * c.repCoef * share, -c.repCap, c.repCap);
      deltas = { ...deltas, [seg]: round2((deltas[seg] ?? 0) + d) };
    }
    if (tier === 'exito') jolt += c.sentimentSuccess;
    if (tier === 'desastre') jolt += c.sentimentDisaster;

    if (liveBug) {
      next = pushPost(next, rng, 'negativo', liveBugPosts, {
        game: game.name,
        creator: creator.name,
        hashtag: getCrisisDef('bugEnDirecto').hashtag,
      });
      next = appendLog(
        next,
        'comunidad',
        `💥 «${game.name}» se rompe en el directo de ${creator.name}: el clip ya es viral.`,
      );
    } else if (tier !== 'tibio') {
      next = pushPost(next, rng, tier === 'exito' ? 'positivo' : 'negativo', streamPosts[tier], {
        game: game.name,
        creator: creator.name,
      });
    }
  }
  totalBoost = round2(Math.min(c.spikeBoostCap, totalBoost));

  // 4 — La promesa inflada se juzga al lanzar (docs/07 §4): brecha = crisis.
  const p = cfg.promise;
  let promiseCrisis = 0;
  if (game.overPromised) {
    const expected = p.expectedBase + p.expectedSpan * game.hypeAtRelease;
    const gap = expected - game.review;
    if (gap >= p.minGap) {
      promiseCrisis = clamp01(gap / p.gapForMaxSeverity);
      next = appendLog(
        next,
        'comunidad',
        `«${game.name}» prometía ${Math.round(expected)} y entrega ${game.review}: la brecha estalla.`,
      );
    } else {
      jolt += p.deliveredSentiment;
      deltas = { ...deltas, comunidad: round2((deltas.comunidad ?? 0) + p.deliveredCommunityRep) };
      next = appendLog(
        next,
        'comunidad',
        `«${game.name}» cumple lo que prometió su marketing: el hype jugó a favor.`,
      );
    }
  }

  // Persistir directos + empuje de ventas en el juego, aplicar reputación y humor.
  next = {
    ...next,
    releasedGames: next.releasedGames.map((g) =>
      g.id === gameId ? { ...g, streams, creatorSpikeBoost: totalBoost } : g,
    ),
    studio: withReputationDeltas(next.studio, deltas),
    community: {
      ...addSentiment(next.community, round2(jolt)),
      // El proyecto ya no existe: sus dilemas pendientes quedan sin objeto.
      dilemmas: next.community.dilemmas.filter((d) => d.projectId !== gameId),
    },
  };

  // 5 — Crisis nativas del lanzamiento (siempre trazables).
  if (liveBugHappens) {
    next = spawnCrisis(next, rng, 'bugEnDirecto', gameId, Math.min(1, bugLevel * c.liveBugSeverityCoef));
  }
  if (promiseCrisis > 0) {
    next = spawnCrisis(next, rng, 'promesaRota', gameId, promiseCrisis);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Dilemas de pre-lanzamiento (docs/07 §4)
// ---------------------------------------------------------------------------

/** Opciones de cada dilema (docs/07 §4). */
export type DilemmaChoice = 'transparencia' | 'capitalizar' | 'moderar' | 'prometer';

const dilemmaChoices: Record<DilemmaKind, readonly DilemmaChoice[]> = {
  leakAlpha: ['transparencia', 'capitalizar'],
  sobreHype: ['moderar', 'prometer'],
};

function fireDilemma(state: GameState, kind: DilemmaKind, project: Project): GameState {
  const dilemma: PendingDilemma = { kind, projectId: project.id, week: state.week };
  const fired = state.community.firedDilemmas[project.id] ?? [];
  return {
    ...state,
    community: {
      ...state.community,
      dilemmas: [...state.community.dilemmas, dilemma],
      firedDilemmas: { ...state.community.firedDilemmas, [project.id]: [...fired, kind] },
    },
  };
}

/**
 * Acción: resolver un dilema pendiente. Cada opción es una palanca legible:
 * transparencia/moderar cuidan a la comunidad; capitalizar/prometer inflan el
 * hype y marcan la promesa (si el juego no cumple, crisis al lanzar).
 */
export function resolveDilemma(
  state: GameState,
  kind: DilemmaKind,
  choice: DilemmaChoice,
): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const dilemma = state.community.dilemmas.find((d) => d.kind === kind);
  if (!dilemma) throw new Error('No hay ese dilema pendiente');
  if (!dilemmaChoices[kind].includes(choice)) {
    throw new Error(`La opción ${choice} no pertenece al dilema ${kind}`);
  }
  const project = state.projects.find((p) => p.id === dilemma.projectId);
  if (!project) {
    // El proyecto ya no existe: el dilema caduca sin efectos.
    return {
      ...state,
      community: {
        ...state.community,
        dilemmas: state.community.dilemmas.filter((d) => d !== dilemma),
      },
    };
  }

  const rng = makeRng(state.seed, RELEASE_FLAVOR_STREAM + state.week + 3);
  const leak = balance.community.leak;
  const over = balance.community.overHype;

  let next: GameState = {
    ...state,
    community: {
      ...state.community,
      dilemmas: state.community.dilemmas.filter((d) => d !== dilemma),
    },
  };
  let updated = project;

  switch (choice) {
    case 'transparencia': {
      updated = { ...project, hype: clampHype(round2(project.hype + leak.transparency.hype)) };
      next = {
        ...next,
        studio: nudgeMoralDrift(
          withReputationDeltas(next.studio, { comunidad: leak.transparency.communityRep }),
          leak.transparency.drift,
        ),
        community: addSentiment(next.community, leak.transparency.sentiment),
      };
      next = pushPost(next, rng, 'positivo', dilemmaPosts.leakTransparencia, { game: project.name });
      next = appendLog(
        next,
        'comunidad',
        `Comunicado transparente sobre el leak de «${project.name}»: menos sorpresa, más confianza.`,
      );
      break;
    }
    case 'capitalizar': {
      updated = {
        ...project,
        hype: clampHype(round2(project.hype + leak.capitalize.hype)),
        overPromised: true,
      };
      next = { ...next, studio: nudgeMoralDrift(next.studio, leak.capitalize.drift) };
      next = pushPost(next, rng, 'neutro', dilemmaPosts.leakCapitalizar, { game: project.name });
      next = appendLog(
        next,
        'comunidad',
        `Capitalizas el leak de «${project.name}»: el hype sube… y la promesa queda hecha.`,
      );
      break;
    }
    case 'moderar': {
      const cap = balance.market.hype.overHypeThreshold - over.moderate.hypeMargin;
      updated = { ...project, hype: clampHype(round2(Math.min(project.hype, cap))) };
      next = {
        ...next,
        studio: nudgeMoralDrift(
          withReputationDeltas(next.studio, { comunidad: over.moderate.communityRep }),
          over.moderate.drift,
        ),
        community: addSentiment(next.community, over.moderate.sentiment),
      };
      next = appendLog(
        next,
        'comunidad',
        `Moderas la campaña de «${project.name}»: expectativas realistas, comunidad tranquila.`,
      );
      break;
    }
    case 'prometer': {
      updated = {
        ...project,
        hype: clampHype(round2(project.hype + over.promise.hype)),
        overPromised: true,
      };
      next = { ...next, studio: nudgeMoralDrift(next.studio, over.promise.drift) };
      next = pushPost(next, rng, 'negativo', dilemmaPosts.sobreHypePrometer, { game: project.name });
      next = appendLog(
        next,
        'comunidad',
        `Prometes la luna con «${project.name}»: ventas de salida aseguradas… si cumples.`,
      );
      break;
    }
  }

  return {
    ...next,
    projects: next.projects.map((p) => (p.id === updated.id ? updated : p)),
  };
}

// ---------------------------------------------------------------------------
// Tick semanal (docs/08 §4): escándalos → crisis, relojes, bombing, humor
// ---------------------------------------------------------------------------

/**
 * Una semana de la capa social. Orden: (1) los escándalos recién estallados
 * (docs/06) se dramatizan como crisis con reloj; (2) los relojes vencidos
 * fuerzan el desenlace del silencio (tarde y peor); (3) el bombing avanza y
 * amaina; (4) dilemas de pre-lanzamiento; (5) el termómetro revierte hacia la
 * reputación de comunidad con el lastre de crisis/bombing; (6) sabor del feed.
 */
export function advanceCommunity(state: GameState, rng: Rng): GameState {
  const cfg = balance.community;
  let next = state;

  // 1 — Escándalos de esta semana estallan como crisis (docs/06 §5 → docs/07 §5).
  for (const scandal of next.scandals) {
    if (scandal.startWeek !== next.week) continue;
    const exists = next.community.crises.some(
      (c) => c.cause === scandal.source && c.startWeek === scandal.startWeek,
    );
    if (exists) continue;
    const target = latestGameForCause(next, scandal.source);
    next = spawnCrisis(next, rng, scandal.source, target?.id ?? null, scandal.magnitude);
  }

  // 2 — El reloj: crisis abiertas que llegan a su fecha límite se pudren solas.
  for (const crisis of next.community.crises) {
    if (crisis.status === 'abierta' && next.week >= crisis.deadlineWeek) {
      next = resolveSilence(next, crisis, true);
    }
  }

  // 3 — El bombing es temporal: avanza y amaina (docs/07 §5).
  const stillActive: ReviewBomb[] = [];
  for (const bomb of next.community.bombs) {
    const advanced = { ...bomb, weeksLeft: bomb.weeksLeft - 1 };
    if (advanced.weeksLeft > 0) {
      stillActive.push(advanced);
    } else {
      const game = next.releasedGames.find((g) => g.id === bomb.gameId);
      next = appendLog(
        next,
        'comunidad',
        `El review bombing sobre «${game?.name ?? bomb.gameId}» amaina: la nota visible se recupera.`,
      );
    }
  }
  next = { ...next, community: { ...next.community, bombs: stillActive } };

  // 4 — Dilemas de pre-lanzamiento (docs/07 §4). Con multi-proyecto se revisa
  // cada proyecto en orden, pero solo puede estallar un dilema por semana
  // (las decisiones llegan de una en una; docs/02 §1).
  for (const project of next.projects) {
    if (next.community.dilemmas.length > 0) break;
    const fired = next.community.firedDilemmas[project.id] ?? [];
    // Cruzar la zona roja del manómetro dispara el dilema de sobre-hype (determinista).
    if (
      !fired.includes('sobreHype') &&
      project.phase >= cfg.leak.minPhase &&
      project.hype >= balance.market.hype.overHypeThreshold
    ) {
      next = fireDilemma(next, 'sobreHype', project);
      next = appendLog(
        next,
        'comunidad',
        `El hype de «${project.name}» entra en zona roja: ¿moderar la campaña o prometer la luna?`,
      );
    } else if (
      // El leak exige empleados (alguien que filtre) y algo que filtrar (hype).
      !fired.includes('leakAlpha') &&
      project.phase >= cfg.leak.minPhase &&
      project.hype >= cfg.leak.minHype &&
      next.staff.length >= 2 &&
      rng.chance(cfg.leak.chancePerWeek) // el PRNG solo decide el timing (sabor)
    ) {
      next = fireDilemma(next, 'leakAlpha', project);
      next = pushPost(next, rng, 'neutro', dilemmaPosts.leak, { game: project.name });
      next = appendLog(
        next,
        'comunidad',
        `Un empleado filtra una alpha de «${project.name}» por accidente: hay que decidir cómo responder.`,
      );
    }
  }

  // 5 — El termómetro (docs/07 §2): revierte hacia la reputación de comunidad
  // (el poso lento) con el lastre de las crisis abiertas y el bombing.
  const s = cfg.sentiment;
  const anchor = next.studio.reputation.comunidad ?? 50;
  const openCrises = next.community.crises.filter((c) => c.status === 'abierta').length;
  const activeBombs = next.community.bombs.length;
  const reverted =
    next.community.sentiment +
    (anchor - next.community.sentiment) * s.revertRate -
    openCrises * s.crisisDragPerWeek -
    activeBombs * s.bombDragPerWeek;
  next = {
    ...next,
    community: { ...next.community, sentiment: round2(clamp(reverted, 0, 100)) },
  };

  // 6 — Sabor: un post ambiental de vez en cuando, con el tono del termómetro.
  if (rng.chance(cfg.feed.ambientChance)) {
    const mood: PostMood =
      next.community.sentiment >= cfg.feed.positiveBand
        ? 'positivo'
        : next.community.sentiment <= cfg.feed.negativeBand
          ? 'negativo'
          : 'neutro';
    next = pushPost(next, rng, mood, ambientPosts[mood]);
  }

  return next;
}
