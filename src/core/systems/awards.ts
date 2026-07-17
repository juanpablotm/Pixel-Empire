import {
  awardCategories,
  playerStudioLabel,
  rivalStudios,
  rivalTitles,
  type AwardCategoryDef,
} from '../../data/awards';
import { balance } from '../../data/balance';
import { appendLog } from '../engine/log';
import type { Rng } from '../engine/rng';
import type { Award, AwardCategoryResult, AwardCeremony, AwardNominee } from '../model/awards';
import type { EraId } from '../model/era';
import type { GameState } from '../model/gameState';
import type { ReleasedGame } from '../model/release';
import { withReputationDeltas } from './reputation';

/**
 * Premios anuales (docs/06 §7 + docs/18 V7): cada fin de año (52 ticks) se
 * celebra la gala. Son COMPETITIVOS: tu mejor lanzamiento del año se NOMINA si
 * pasa el umbral de la categoría y luego compite por un PUESTO contra el
 * "listón de industria" (que sube con la era) y unos nominados ficticios con
 * nombre. Ganar (puesto 1) es difícil y aspiracional; solo es realista en
 * E6–E7, cuando tienes escala y prestigio.
 *
 * Todo es determinista: el listón, tu puntuación y el puesto salen de datos y
 * estado. El PRNG solo pone el sabor (qué estudios y qué títulos aparecen, y
 * dónde caen dentro de la dispersión del listón).
 */

/** Nota media del año: candidatos = lanzados en las últimas 52 semanas. */
function yearReleases(state: GameState): ReleasedGame[] {
  const from = state.week - balance.awards.intervalWeeks;
  return state.releasedGames.filter((g) => g.releaseWeek > from && g.releaseWeek <= state.week);
}

/**
 * Tu candidato de una categoría: el mejor del año que PASE el umbral, por el
 * eje que define esa categoría. Sin candidato no hay nominación.
 */
export function pickCategoryWinner(
  category: AwardCategoryDef['id'],
  candidates: readonly ReleasedGame[],
): ReleasedGame | null {
  const t = balance.awards.thresholds;
  const best = (games: ReleasedGame[], score: (g: ReleasedGame) => number): ReleasedGame | null =>
    games.length === 0 ? null : games.reduce((a, b) => (score(b) > score(a) ? b : a));

  switch (category) {
    case 'goty':
      return best(
        candidates.filter((g) => g.review >= t.goty.minReview),
        (g) => g.review,
      );
    case 'innovacion':
      return best(
        candidates.filter(
          (g) =>
            g.breakdown.innovationMod >= t.innovacion.minInnovation &&
            g.review >= t.innovacion.minReview,
        ),
        (g) => g.breakdown.innovationMod,
      );
    case 'tecnica':
      return best(
        candidates.filter(
          (g) => g.breakdown.polishScore >= t.tecnica.minPolish && g.review >= t.tecnica.minReview,
        ),
        (g) => g.breakdown.polishScore,
      );
    case 'diseno':
      return best(
        candidates.filter(
          (g) => g.breakdown.fit >= t.diseno.minFit && g.review >= t.diseno.minReview,
        ),
        (g) => g.breakdown.fit,
      );
    case 'pueblo':
      return best(
        candidates.filter((g) => (g.reviewsBySegment.casual ?? 0) >= t.pueblo.minCasualReview),
        (g) => g.reviewsBySegment.casual ?? 0,
      );
  }
}

/** El listón de una categoría en una era (docs/18 V7): sube con la era. */
export function categoryBar(category: AwardCategoryDef, era: EraId): number {
  return balance.awards.competition.barByEra[era] + category.barOffset;
}

/**
 * Prestigio: hasta +`prestigeWeight` puntos por la reputación de crítica y
 * prensa, que son quienes votan la gala. Es lo que separa al estudio querido
 * del que solo fabrica: la fábrica cínica llega con escala pero sin votos.
 */
export function prestigeBonus(state: GameState): number {
  const c = balance.awards.competition;
  const rep = state.studio.reputation;
  const mixed = c.prestigeMix.critica * rep.critica + c.prestigeMix.prensa * rep.prensa;
  return (c.prestigeWeight * mixed) / 100;
}

/**
 * Tu puntuación en una categoría: reseña + prestigio + escala (docs/18 V7).
 * La escala pesa según la categoría: mucho en el GOTY, casi nada en Innovación.
 */
export function studioScore(
  state: GameState,
  game: ReleasedGame,
  category: AwardCategoryDef,
): number {
  const c = balance.awards.competition;
  const scale = category.scaleWeight * c.sizeBonus[game.size];
  return round2(game.review + prestigeBonus(state) + scale);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Los nominados ficticios de una categoría: nombres con sabor y puntuaciones
 * repartidas alrededor del listón. Sin rivales simulados (docs/04 §9 sigue
 * diferido), esto es lo que hace que la industria se sienta viva.
 */
function fictionalNominees(
  category: AwardCategoryDef,
  era: EraId,
  rng: Rng,
): AwardNominee[] {
  const c = balance.awards.competition;
  const bar = categoryBar(category, era);
  const studios = [...rivalStudios];
  const titles = [...rivalTitles];
  const nominees: AwardNominee[] = [];

  for (let i = 0; i < c.nomineeCount; i++) {
    // Sin repetir estudio ni título dentro de la misma categoría.
    const studio = studios.splice(rng.int(0, studios.length - 1), 1)[0];
    const gameName = titles.splice(rng.int(0, titles.length - 1), 1)[0];
    const jitter = (rng.next() * 2 - 1) * c.nomineeSpread;
    nominees.push({ studio, gameName, score: round2(bar + jitter), isPlayer: false });
  }
  return nominees;
}

/** Resuelve una categoría: nominados ficticios, tu puntuación y tu puesto. */
function resolveCategory(
  state: GameState,
  category: AwardCategoryDef,
  candidates: readonly ReleasedGame[],
  rng: Rng,
): AwardCategoryResult {
  const nominees = fictionalNominees(category, state.era, rng);
  const mine = pickCategoryWinner(category.id, candidates);

  if (mine) {
    nominees.push({
      studio: playerStudioLabel,
      gameName: mine.name,
      score: studioScore(state, mine, category),
      isPlayer: true,
    });
  }
  // Ranking de mejor a peor; el puesto es la posición del jugador.
  nominees.sort((a, b) => b.score - a.score);
  const rank = mine ? nominees.findIndex((n) => n.isPlayer) + 1 : null;

  return {
    categoryId: category.id,
    bar: categoryBar(category, state.era),
    nominees,
    rank,
    gameId: mine?.id ?? null,
    gameName: mine?.name ?? null,
  };
}

/** Año de calendario de una semana (presentación estable para el save). */
function yearOfWeek(week: number): number {
  return balance.time.startYear + Math.floor((week - balance.time.startWeek) / 52);
}

/** Ordinal en español para el puesto: 1.º, 2.º… (presentación, docs/10). */
export function rankLabel(rank: number): string {
  return `${rank}.º`;
}

/**
 * Tick semanal: si toca gala (semana múltiplo de 52), nomina, calcula puestos
 * y reparte premios. Sin lanzamientos propios, la gala pasa de largo.
 */
export function advanceAwards(state: GameState, rng: Rng): GameState {
  if (state.week % balance.awards.intervalWeeks !== 0) return state;
  const candidates = yearReleases(state);
  if (candidates.length === 0) return state;

  const rewards = balance.awards.rewards;
  const year = yearOfWeek(state.week);
  const results = awardCategories.map((c) => resolveCategory(state, c, candidates, rng));
  const nominatedIn = results.filter((r) => r.rank !== null);

  // Sin una sola nominación no hay ceremonia: la gala pasa de largo.
  if (nominatedIn.length === 0) return state;

  const ceremony: AwardCeremony = {
    week: state.week,
    year,
    era: state.era,
    categories: results,
    nominated: true,
  };

  const won: Award[] = nominatedIn
    .filter((r) => r.rank === 1)
    .map((r) => ({
      week: state.week,
      year,
      categoryId: r.categoryId,
      gameId: r.gameId as string,
      gameName: r.gameName as string,
    }));

  let next = appendLog(
    state,
    'premios',
    `🏆 Gala anual de ${year}: la industria reparte sus premios.`,
  );

  for (const result of nominatedIn) {
    const category = awardCategories.find((c) => c.id === result.categoryId) as AwardCategoryDef;
    const rank = result.rank as number;
    if (rank === 1) {
      next = appendLog(next, 'premios', `🏆 ${category.name}: «${result.gameName}». ¡Es tuyo!`);
    } else {
      const winner = result.nominees[0];
      next = appendLog(
        next,
        'premios',
        `${category.name}: «${result.gameName}» queda ${rankLabel(rank)}. Gana ${winner.studio} con «${winner.gameName}».`,
      );
    }
  }

  // Recompensas (docs/06 §7): ganar da reputación, hype y atractivo laboral;
  // quedarse en la nominación da un empujón pequeño (docs/18 V7).
  let studio = next.studio;
  for (const result of nominatedIn) {
    studio =
      result.rank === 1
        ? withReputationDeltas(studio, rewards.repDeltas)
        : withReputationDeltas(studio, rewards.nominationRepDeltas);
  }
  studio = {
    ...studio,
    awards: [...studio.awards, ...won],
    lastCeremony: ceremony,
    awardHype: Math.min(
      rewards.hypeCap,
      Math.round((studio.awardHype + rewards.hypePerAward * won.length) * 100) / 100,
    ),
  };
  next = { ...next, studio };

  return appendLog(
    next,
    'premios',
    won.length > 0
      ? 'Los premios dan alas: la crítica te mira mejor y tu próximo anuncio nacerá con hype.'
      : 'Estar en la conversación ya es algo: la crítica y la prensa toman nota para el año que viene.',
  );
}
