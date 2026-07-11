import { balance } from '../../data/balance';
import { appendLog } from '../engine/log';
import type { GameState } from '../model/gameState';

/**
 * Economía de las Fases 1–2 (docs/06 §4): costes fijos (con alquiler por
 * etapa de escala), coste de desarrollo del fundador y salarios semanales de
 * la plantilla contratada; capital negativo sostenido = bancarrota = fin de
 * partida. Los ingresos los aplica advanceSales; aquí se paga y se vigila.
 */
export function advanceEconomy(state: GameState): GameState {
  // El fundador no cobra salario: su coste es la persona·semana de desarrollo.
  const devCost = state.projects.length > 0 ? balance.economy.devCostPerPersonWeek : 0;
  const salaries = state.staff.reduce((sum, e) => sum + e.salary, 0);
  const upkeep =
    balance.economy.weeklyUpkeep + balance.economy.upkeepExtraByStage[state.studio.scaleStage];
  const costs = upkeep + devCost + salaries;
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
