import { balance } from '../../data/balance';
import { appendLog } from '../engine/log';
import type { Rng } from '../engine/rng';
import type { GameState } from '../model/gameState';
import { expectedWeeklyUnits } from './market';

/**
 * Ventas por tick (docs/04 §6): la curva pico + cola larga se recalcula cada
 * semana con el mercado ACTUAL (popularidades, saturación y base instalada),
 * en core/systems/market.ts. Aquí solo se aplica el ruido determinista del
 * PRNG, se ingresa la recaudación y se retiran los juegos agotados.
 */

/** Una semana de ventas para todos los juegos vivos; ingresa la recaudación al capital. */
export function advanceSales(state: GameState, rng: Rng): GameState {
  let capital = state.studio.capital;
  let next = state;
  const games = state.releasedGames.map((game) => {
    if (!game.salesActive) return game;

    const t = state.week - game.releaseWeek;
    const noise = 1 + (rng.next() * 2 - 1) * balance.sales.weeklyNoise;
    const units = Math.round(expectedWeeklyUnits(game, t, state.market) * noise);

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
