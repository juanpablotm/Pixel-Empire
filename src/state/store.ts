import { create } from 'zustand';
import {
  createGameLoop,
  createInitialState,
  tick,
  type GameState,
  type Speed,
} from '../core';
import { balance } from '../data/balance';
import { loadFromLocalStorage, saveToLocalStorage } from '../save/saveLoad';

/**
 * Store Zustand (docs/08 §6): contiene el GameState y expone acciones que
 * delegan en core/. Ningún cálculo de juego vive aquí ni en la UI.
 */
export interface GameStore {
  game: GameState;
  /** Velocidad de simulación actual (0 = pausa). */
  speed: Speed;
  /** Avanza 1 semana (1 tick) inmediatamente. */
  advanceWeek: () => void;
  /** Cambia la velocidad del bucle: 0 = pausa, 1/2/4 = multiplicador. */
  setSpeed: (speed: Speed) => void;
  /** Empieza una partida nueva (pausada). */
  newGame: (seed?: number) => void;
  /** Guarda la partida en localStorage. */
  saveGame: () => void;
  /** Carga desde localStorage (pausada). Devuelve false si no hay guardado válido. */
  loadGame: () => boolean;
}

/** Semilla por defecto para partidas nuevas (fuera de core; no es lógica de juego). */
const defaultSeed = (): number => Date.now() >>> 0;

/** Bucle real (timers) fuera de React; despacha ticks contra el store. */
const gameLoop = createGameLoop(
  () => useGameStore.getState().advanceWeek(),
  balance.time.baseTickMs,
);

export const useGameStore = create<GameStore>()((set, get) => ({
  game: createInitialState(defaultSeed()),
  speed: 0,

  advanceWeek: () => set((s) => ({ game: tick(s.game) })),

  setSpeed: (speed) => {
    gameLoop.setSpeed(speed);
    set({ speed });
  },

  newGame: (seed = defaultSeed()) => {
    gameLoop.setSpeed(0);
    set({ game: createInitialState(seed), speed: 0 });
  },

  saveGame: () => {
    saveToLocalStorage(get().game);
  },

  loadGame: () => {
    try {
      const loaded = loadFromLocalStorage();
      if (loaded === null) return false;
      gameLoop.setSpeed(0);
      set({ game: loaded, speed: 0 });
      return true;
    } catch {
      return false;
    }
  },
}));
