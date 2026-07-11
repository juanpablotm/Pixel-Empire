import { balance } from '../../data/balance';
import type { GameState } from '../model/gameState';
import { createFounder } from '../systems/staff';

/** Crea el estado inicial de una partida nueva. Los valores vienen de data/balance.ts. */
export function createInitialState(seed: number): GameState {
  return {
    seed,
    week: balance.time.startWeek,
    era: balance.time.startEra,
    studio: {
      capital: balance.economy.initialCapital,
      scaleStage: 1,
    },
    // En el garaje eres tú solo; el pool de contratación llega con la etapa 2.
    staff: [createFounder(seed)],
    candidates: [],
    projects: [],
    releasedGames: [],
    projectCounter: 0,
    negativeWeeks: 0,
    gameOver: null,
    log: [],
  };
}
