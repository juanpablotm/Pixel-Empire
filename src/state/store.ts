import { create } from 'zustand';
import {
  createGameLoop,
  createInitialState,
  setFocus,
  startProject,
  tick,
  toggleFeature,
  type DevPhaseNumber,
  type FocusAllocation,
  type GameState,
  type ProjectConcept,
  type Speed,
} from '../core';
import { balance } from '../data/balance';
import { loadFromLocalStorage, saveToLocalStorage } from '../save/saveLoad';

/**
 * Store Zustand (docs/08 §6): contiene el GameState y expone acciones que
 * delegan en core/. Ningún cálculo de juego vive aquí ni en la UI; el store
 * añade solo estado de presentación (pantalla actual) y navegación.
 */

/** Pantallas de la Fase 1 (docs/10 §10.1–10.4). */
export type Screen = 'estudio' | 'concepcion' | 'desarrollo' | 'resena';

export interface GameStore {
  game: GameState;
  /** Velocidad de simulación actual (0 = pausa). */
  speed: Speed;
  /** Pantalla visible. */
  screen: Screen;
  /** Juego cuya reseña se muestra en la pantalla de reseña. */
  reviewGameId: string | null;
  /** Avanza 1 semana (1 tick) inmediatamente. */
  advanceWeek: () => void;
  /** Cambia la velocidad del bucle: 0 = pausa, 1/2/4 = multiplicador. */
  setSpeed: (speed: Speed) => void;
  /** Navega a una pantalla. */
  goTo: (screen: Screen) => void;
  /** Abre la reseña de un juego lanzado. */
  openReview: (gameId: string) => void;
  /** Acciones del proyecto (delegan en core/). */
  startProject: (concept: ProjectConcept) => void;
  setFocus: (phase: DevPhaseNumber, allocation: FocusAllocation) => void;
  toggleFeature: (featureId: string) => void;
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
  screen: 'estudio',
  reviewGameId: null,

  advanceWeek: () => {
    const before = get().game;
    const after = tick(before);

    // Momentos que piden decisión: el juego pausa y navega (docs/02 §1:
    // "el juego nunca fuerza una decisión importante sin pausa").
    const released = after.releasedGames.length > before.releasedGames.length;
    const phaseChanged = after.projects[0]?.phase !== before.projects[0]?.phase;
    const justEnded = after.gameOver !== null && before.gameOver === null;

    if (released || justEnded || (phaseChanged && after.projects.length > 0)) {
      gameLoop.setSpeed(0);
      set({ game: after, speed: 0 });
    } else {
      set({ game: after });
    }

    if (released) {
      const latest = after.releasedGames[after.releasedGames.length - 1];
      set({ screen: 'resena', reviewGameId: latest.id });
    }
  },

  setSpeed: (speed) => {
    gameLoop.setSpeed(speed);
    set({ speed });
  },

  goTo: (screen) => set({ screen }),

  openReview: (gameId) => set({ screen: 'resena', reviewGameId: gameId }),

  startProject: (concept) => {
    set((s) => ({ game: startProject(s.game, concept), screen: 'desarrollo' }));
  },

  setFocus: (phase, allocation) => {
    set((s) => ({ game: setFocus(s.game, phase, allocation) }));
  },

  toggleFeature: (featureId) => {
    set((s) => ({ game: toggleFeature(s.game, featureId) }));
  },

  newGame: (seed = defaultSeed()) => {
    gameLoop.setSpeed(0);
    set({ game: createInitialState(seed), speed: 0, screen: 'estudio', reviewGameId: null });
  },

  saveGame: () => {
    saveToLocalStorage(get().game);
  },

  loadGame: () => {
    try {
      const loaded = loadFromLocalStorage();
      if (loaded === null) return false;
      gameLoop.setSpeed(0);
      set({ game: loaded, speed: 0, screen: 'estudio', reviewGameId: null });
      return true;
    } catch {
      return false;
    }
  },
}));
