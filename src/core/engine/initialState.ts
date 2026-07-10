import { balance } from '../../data/balance';
import type { GameState } from '../model/gameState';

/** Crea el estado inicial de una partida nueva. Los valores vienen de data/balance.ts. */
export function createInitialState(seed: number): GameState {
  return {
    seed,
    week: balance.time.startWeek,
    era: balance.time.startEra,
    studio: {
      capital: balance.economy.initialCapital,
    },
    projects: [],
    releasedGames: [],
    projectCounter: 0,
    negativeWeeks: 0,
    gameOver: null,
    log: [],
  };
}
