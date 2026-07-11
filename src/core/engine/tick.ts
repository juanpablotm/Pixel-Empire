import { makeRng } from './rng';
import type { GameState } from '../model/gameState';
import { advanceEconomy } from '../systems/economy';
import { advanceMarket } from '../systems/market';
import { advanceMoral } from '../systems/morale';
import { advanceProjects } from '../systems/projects';
import { advanceSales } from '../systems/sales';
import { advanceScale, advanceStaff } from '../systems/staff';

/**
 * Streams del PRNG separados por sistema, para que un sistema no altere la
 * secuencia de otro (determinismo estable entre fases; docs/08 §1). Las
 * semanas nunca alcanzan los offsets.
 */
const STAFF_STREAM = 2 << 20;
const MARKET_STREAM = 3 << 20;
const MORAL_STREAM = 4 << 20;

/**
 * Avanza el mundo 1 tick (= 1 semana). Función pura: no muta `state`,
 * devuelve un estado nuevo (docs/08 §4).
 *
 * Fase 4: mercado → proyectos → personal → ventas → dilema moral → economía →
 * escala, en el orden de docs/08 §4 (el paso moral cubre escándalos y
 * regulación de docs/06; la comunidad de docs/07 llega en Fase 5). Tras la
 * bancarrota o el retiro, el mundo se congela (game over).
 */
export function tick(state: GameState): GameState {
  if (state.gameOver) return state;

  const rng = makeRng(state.seed, state.week);
  const staffRng = makeRng(state.seed, STAFF_STREAM + state.week);
  const marketRng = makeRng(state.seed, MARKET_STREAM + state.week);
  const moralRng = makeRng(state.seed, MORAL_STREAM + state.week);

  let s = advanceMarket(state, marketRng);
  s = advanceProjects(s);
  s = advanceStaff(s, staffRng);
  s = advanceSales(s, rng);
  s = advanceMoral(s, moralRng);
  s = advanceEconomy(s);
  s = advanceScale(s);

  return { ...s, week: s.week + 1 };
}
