/**
 * API pública del núcleo de simulación (docs/08 §3). Todo lo que esté fuera
 * de core/ (state/, save/, ui/) importa desde aquí, no de los módulos internos.
 */
export type { EraId, GameState, Studio } from './model/gameState';
export { makeRng } from './engine/rng';
export type { Rng } from './engine/rng';
export { tick } from './engine/tick';
export { createInitialState } from './engine/initialState';
export { createGameLoop, SPEEDS } from './engine/gameLoop';
export type { GameLoop, Speed } from './engine/gameLoop';
