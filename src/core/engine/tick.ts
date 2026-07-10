import { makeRng } from './rng';
import type { GameState } from '../model/gameState';
import { advanceEconomy } from '../systems/economy';
import { advanceProjects } from '../systems/projects';
import { advanceSales } from '../systems/sales';

/**
 * Avanza el mundo 1 tick (= 1 semana). Función pura: no muta `state`,
 * devuelve un estado nuevo (docs/08 §4).
 *
 * Fase 1: proyectos → ventas → economía, en el orden de docs/08 §4. Las fases
 * siguientes añadirán mercado, personal, comunidad y eventos a la cadena.
 * Tras la bancarrota el mundo se congela (game over).
 */
export function tick(state: GameState): GameState {
  if (state.gameOver) return state;

  const rng = makeRng(state.seed, state.week);
  let s = advanceProjects(state);
  s = advanceSales(s, rng);
  s = advanceEconomy(s);

  return { ...s, week: s.week + 1 };
}
