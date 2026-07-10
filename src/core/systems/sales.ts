import { balance } from '../../data/balance';
import { getPlatform } from '../../data/platforms';
import { appendLog } from '../engine/log';
import type { Rng } from '../engine/rng';
import type { GameState } from '../model/gameState';
import type { ReleasedGame } from '../model/release';

/**
 * Ventas simples de la Fase 1 (docs/11): demanda base × reseña, con pico
 * inicial y cola larga. Sin modas, saturación, hype ni segmentos (docs/04,
 * Fase 3). El ruido semanal usa el PRNG con semilla: mismo seed → misma curva.
 *
 *   unidades(t) = demandaBase(plataforma) × factorTamaño × (reseña/100)^k × decay^t
 */

/** Unidades esperadas (sin ruido) del juego en su semana t desde el lanzamiento. */
export function expectedUnits(game: ReleasedGame, weeksSinceRelease: number): number {
  const s = balance.sales;
  const reviewFactor = (game.review / 100) ** s.reviewExponent;
  const decay = s.decayMin + (s.decayMax - s.decayMin) * (game.review / 100);
  return (
    getPlatform(game.platformId).baseMarketSize *
    s.sizeDemandFactor[game.size] *
    reviewFactor *
    decay ** weeksSinceRelease
  );
}

/** Una semana de ventas para todos los juegos vivos; ingresa la recaudación al capital. */
export function advanceSales(state: GameState, rng: Rng): GameState {
  let capital = state.studio.capital;
  let next = state;
  const games = state.releasedGames.map((game) => {
    if (!game.salesActive) return game;

    const t = state.week - game.releaseWeek;
    const noise = 1 + (rng.next() * 2 - 1) * balance.sales.weeklyNoise;
    const units = Math.round(expectedUnits(game, t) * noise);

    if (units < balance.sales.cutoffUnits) {
      next = appendLog(next, 'ventas', `«${game.name}» sale de las tiendas.`);
      return { ...game, salesActive: false };
    }

    capital += units * game.price;
    return {
      ...game,
      weeklySales: [...game.weeklySales, units],
      totalUnits: game.totalUnits + units,
      totalRevenue: game.totalRevenue + units * game.price,
    };
  });

  return {
    ...next,
    studio: { ...next.studio, capital },
    releasedGames: games,
  };
}
