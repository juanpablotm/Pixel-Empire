import { makeRng } from './rng';
import type { GameState } from '../model/gameState';
import { advanceAwards } from '../systems/awards';
import { advanceCommunity } from '../systems/community';
import { advanceEconomy } from '../systems/economy';
import { advanceEngineBuild } from '../systems/engines';
import { advanceEras } from '../systems/eras';
import { advanceMarket } from '../systems/market';
import { advanceMoral } from '../systems/morale';
import { advancePolicies } from '../systems/policies';
import { advanceProjects } from '../systems/projects';
import { advanceResearch } from '../systems/research';
import { advanceSales } from '../systems/sales';
import { advanceStaff, refreshCandidatePool } from '../systems/staff';

/**
 * Streams del PRNG separados por sistema, para que un sistema no altere la
 * secuencia de otro (determinismo estable entre fases; docs/08 §1). Las
 * semanas nunca alcanzan los offsets.
 */
const STAFF_STREAM = 2 << 20;
const MARKET_STREAM = 3 << 20;
const MORAL_STREAM = 4 << 20;
const COMMUNITY_STREAM = 5 << 20;
const AWARDS_STREAM = 7 << 20;

/**
 * Avanza el mundo 1 tick (= 1 semana). Función pura: no muta `state`,
 * devuelve un estado nuevo (docs/08 §4).
 *
 * Fase 6: mercado → proyectos (todos) → personal → políticas → ventas →
 * dilema moral → comunidad → economía → investigación → premios → pool de
 * contratación, y al avanzar la semana, la transición de era (docs/02 §5). La
 * comunidad va tras el paso moral para dramatizar como crisis los escándalos
 * recién estallados (docs/06). Tras la bancarrota o el retiro, el mundo se
 * congela. La etapa de escala NO avanza aquí: se compra (expandStudio, 8.8).
 */
export function tick(state: GameState): GameState {
  if (state.gameOver) return state;

  const rng = makeRng(state.seed, state.week);
  const staffRng = makeRng(state.seed, STAFF_STREAM + state.week);
  const marketRng = makeRng(state.seed, MARKET_STREAM + state.week);
  const moralRng = makeRng(state.seed, MORAL_STREAM + state.week);
  const communityRng = makeRng(state.seed, COMMUNITY_STREAM + state.week);
  const awardsRng = makeRng(state.seed, AWARDS_STREAM + state.week);

  let s = advanceMarket(state, marketRng);
  s = advanceProjects(s);
  s = advanceStaff(s, staffRng);
  s = advancePolicies(s);
  s = advanceSales(s, rng);
  s = advanceMoral(s, moralRng);
  s = advanceCommunity(s, communityRng);
  s = advanceEconomy(s);
  s = advanceResearch(s);
  // La obra del motor avanza sola (9.2): ya se pagó al encargarla.
  s = advanceEngineBuild(s);
  s = advanceAwards(s, awardsRng);
  s = refreshCandidatePool(s);

  return advanceEras({ ...s, week: s.week + 1 });
}
