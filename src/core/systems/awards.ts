import { awardCategories, rivalWinners, type AwardCategoryId } from '../../data/awards';
import { balance } from '../../data/balance';
import { appendLog } from '../engine/log';
import type { Rng } from '../engine/rng';
import type { Award } from '../model/awards';
import type { GameState } from '../model/gameState';
import type { ReleasedGame } from '../model/release';
import { withReputationDeltas } from './reputation';

/**
 * Premios anuales (docs/06 §7): cada fin de año (52 ticks) se celebra la
 * ceremonia. La selección es determinista (el mejor candidato que supere el
 * umbral gana; sin rivales simulados, si nadie lo supera el premio se lo
 * lleva un estudio ficticio); el PRNG solo pone el sabor de quién. Ganar da
 * reputación (crítica/prensa), hype para el próximo proyecto y atractivo de
 * contratación — el contrapeso de integridad frente a la codicia.
 */

/** Nota media del año: candidatos = lanzados en las últimas 52 semanas. */
function yearReleases(state: GameState): ReleasedGame[] {
  const from = state.week - balance.awards.intervalWeeks;
  return state.releasedGames.filter((g) => g.releaseWeek > from && g.releaseWeek <= state.week);
}

/** Ganador de una categoría entre los candidatos, o null si nadie da la talla. */
export function pickCategoryWinner(
  category: AwardCategoryId,
  candidates: readonly ReleasedGame[],
): ReleasedGame | null {
  const t = balance.awards.thresholds;
  const best = (games: ReleasedGame[], score: (g: ReleasedGame) => number): ReleasedGame | null =>
    games.length === 0
      ? null
      : games.reduce((a, b) => (score(b) > score(a) ? b : a));

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

/** Año de calendario de una semana (presentación estable para el save). */
function yearOfWeek(week: number): number {
  return balance.time.startYear + Math.floor((week - balance.time.startWeek) / 52);
}

/**
 * Tick semanal: si toca gala (semana múltiplo de 52), evalúa los lanzamientos
 * del año y reparte premios. Sin lanzamientos propios, la gala pasa de largo.
 */
export function advanceAwards(state: GameState, rng: Rng): GameState {
  if (state.week % balance.awards.intervalWeeks !== 0) return state;
  const candidates = yearReleases(state);
  if (candidates.length === 0) return state;

  const rewards = balance.awards.rewards;
  const year = yearOfWeek(state.week);
  const won: Award[] = [];
  let next = appendLog(
    state,
    'premios',
    `🏆 Gala anual de ${year}: la industria reparte sus premios.`,
  );

  for (const category of awardCategories) {
    const winner = pickCategoryWinner(category.id, candidates);
    if (winner) {
      won.push({
        week: state.week,
        year,
        categoryId: category.id,
        gameId: winner.id,
        gameName: winner.name,
      });
      next = appendLog(next, 'premios', `🏆 ${category.name}: «${winner.name}». ¡Es tuyo!`);
    } else if (category.id === 'goty') {
      // Sabor: el gordo se lo lleva otro (el PRNG solo elige el nombre).
      next = appendLog(
        next,
        'premios',
        `El ${category.name} se lo lleva ${rng.pick(rivalWinners)}. Otro año será.`,
      );
    }
  }

  if (won.length === 0) return next;

  // Recompensas (docs/06 §7): reputación, hype pendiente y atractivo laboral.
  const deltas = rewards.repDeltas;
  let studio = next.studio;
  for (let i = 0; i < won.length; i++) {
    studio = withReputationDeltas(studio, deltas);
  }
  studio = {
    ...studio,
    awards: [...studio.awards, ...won],
    awardHype: Math.min(
      rewards.hypeCap,
      Math.round((studio.awardHype + rewards.hypePerAward * won.length) * 100) / 100,
    ),
  };
  next = { ...next, studio };
  return appendLog(
    next,
    'premios',
    `Los premios dan alas: la crítica te mira mejor y tu próximo anuncio nacerá con hype.`,
  );
}
