import type { GameState } from '../model/gameState';

/**
 * Avanza el mundo 1 tick (= 1 semana). Función pura: no muta `state`,
 * devuelve un estado nuevo (docs/08 §4).
 *
 * Fase 0: sin sistemas todavía; solo avanza la semana. Las fases siguientes
 * encadenarán aquí los subsistemas en el orden de docs/08 §4
 * (mercado → proyectos → personal → ventas → comunidad → economía → eventos),
 * usando `makeRng(state.seed, state.week)` para la aleatoriedad.
 */
export function tick(state: GameState): GameState {
  return {
    ...state,
    week: state.week + 1,
  };
}
