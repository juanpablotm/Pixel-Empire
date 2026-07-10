import { balance } from '../../data/balance';
import { appendLog } from '../engine/log';
import type { GameState } from '../model/gameState';

/**
 * Economía mínima de la Fase 1 (docs/06 §4): costes fijos + coste de
 * desarrollo; capital negativo sostenido = bancarrota = fin de partida.
 * Los ingresos los aplica advanceSales; aquí solo se paga y se vigila la caja.
 */
export function advanceEconomy(state: GameState): GameState {
  // En el garaje trabaja solo el fundador: 1 persona·semana mientras hay proyecto.
  const devCost = state.projects.length > 0 ? balance.economy.devCostPerPersonWeek : 0;
  const costs = balance.economy.weeklyUpkeep + devCost;
  const capital = state.studio.capital - costs;

  let next: GameState = { ...state, studio: { ...state.studio, capital } };

  if (capital >= 0) {
    return next.negativeWeeks === 0 ? next : { ...next, negativeWeeks: 0 };
  }

  const negativeWeeks = next.negativeWeeks + 1;
  next = { ...next, negativeWeeks };

  if (negativeWeeks === 1) {
    next = appendLog(
      next,
      'economia',
      `Números rojos: si la caja sigue en negativo ${balance.economy.bankruptcyGraceWeeks} semanas, es la bancarrota.`,
    );
  }

  if (negativeWeeks >= balance.economy.bankruptcyGraceWeeks) {
    next = {
      ...next,
      gameOver: { week: next.week, reason: 'bancarrota' },
    };
    next = appendLog(next, 'fin', 'Bancarrota: el estudio cierra sus puertas.');
  }

  return next;
}
