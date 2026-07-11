import { balance } from '../../data/balance';
import { appendLog } from '../engine/log';
import type { Rng } from '../engine/rng';
import type { GameState } from '../model/gameState';
import type { ReleasedGame } from '../model/release';
import { recordIncome } from './economy';
import { expectedWeeklyUnits } from './market';
import { lootBoxesBanned, scandalSalesFactor } from './morale';
import { communitySalesModifier } from './reputation';

/**
 * Ventas por tick (docs/04 §6 y docs/06 §4): la curva pico + cola larga se
 * recalcula cada semana con el mercado ACTUAL (core/systems/market.ts) y los
 * modificadores del estudio (colchón de comunidad, escándalos activos). Aquí
 * se aplica el ruido determinista del PRNG, se convierte cada unidad en
 * ingresos según el factorMonetización (docs/12 §6) y se retiran los juegos
 * agotados.
 */

/**
 * Ingresos semanales de un juego según su modelo de negocio (docs/12 §6):
 *   premium 1.0 · premium+dlc 1.15 · premium+mtx 1 + 0.6·agg · f2p 0.3 + 0.8·agg
 * Si la regulación prohibió las loot boxes, los juegos que dependían de ellas
 * pierden sus MTX de golpe (docs/06 §5).
 */
export function weeklyRevenue(
  game: ReleasedGame,
  units: number,
  lootBoxBan: boolean,
): { sales: number; mtx: number } {
  const m = balance.monetization;
  const mon = game.monetization;
  const sales = units * game.price * m.salesFactor[mon.model];
  const mtxCut = lootBoxBan && mon.hasLootBoxes;
  const mtx = mtxCut ? 0 : units * game.price * m.mtxCoef[mon.model] * mon.aggressiveness;
  return { sales: Math.round(sales), mtx: Math.round(mtx) };
}

/** Una semana de ventas para todos los juegos vivos; ingresa la recaudación al capital. */
export function advanceSales(state: GameState, rng: Rng): GameState {
  let capital = state.studio.capital;
  let income = 0;
  let next = state;

  // Modificadores del estudio, comunes a todo el catálogo esta semana.
  const communityFactor = communitySalesModifier(state.studio);
  const scandalFactor = scandalSalesFactor(state.scandals);
  const banned = lootBoxesBanned(state);

  const games = state.releasedGames.map((game) => {
    if (!game.salesActive) return game;

    const t = state.week - game.releaseWeek;
    const noise = 1 + (rng.next() * 2 - 1) * balance.sales.weeklyNoise;
    const units = Math.round(
      expectedWeeklyUnits(game, t, state.market, { communityFactor, scandalFactor }) * noise,
    );

    if (units < balance.sales.cutoffUnits) {
      next = appendLog(next, 'ventas', `«${game.name}» sale de las tiendas.`);
      return { ...game, salesActive: false };
    }

    const revenue = weeklyRevenue(game, units, banned);
    const total = revenue.sales + revenue.mtx;
    capital += total;
    income += total;
    return {
      ...game,
      weeklySales: [...game.weeklySales, units],
      totalUnits: game.totalUnits + units,
      totalRevenue: game.totalRevenue + total,
      mtxRevenue: game.mtxRevenue + revenue.mtx,
    };
  });

  next = {
    ...next,
    studio: { ...next.studio, capital },
    releasedGames: games,
    stats: { ...next.stats, totalRevenue: next.stats.totalRevenue + income },
  };
  return recordIncome(next, income);
}
