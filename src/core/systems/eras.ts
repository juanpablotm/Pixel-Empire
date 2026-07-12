import { eraForWeek, eraIndex, getEra } from '../../data/eras';
import { appendLog } from '../engine/log';
import type { GameState } from '../model/gameState';

/**
 * Avance de eras (docs/02 §5): el paso de era es automático por el avance del
 * tiempo, con un evento de transición que resume qué cambia. Las 7 eras y sus
 * semanas de inicio viven en data/eras.ts (data-driven, nada hardcodeado);
 * el listón de calidad por era, en data/balance.ts.
 */

/**
 * Último paso del tick (tras avanzar la semana): si la semana ya pertenece a
 * una era posterior, el mundo cambia. Nunca retrocede: los estados de test o
 * de sandbox que fuerzan una era futura se respetan.
 */
export function advanceEras(state: GameState): GameState {
  const target = eraForWeek(state.week);
  if (eraIndex(target) <= eraIndex(state.era)) return state;

  const def = getEra(target);
  let next: GameState = { ...state, era: target };
  next = appendLog(
    next,
    'era',
    `🌍 NUEVA ERA — ${def.name} (${def.period}): ${def.transitionHeadline}`,
  );
  return next;
}
