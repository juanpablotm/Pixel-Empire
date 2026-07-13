import { create } from 'zustand';
import {
  assignCreatorKey,
  buyResearch,
  createGameLoop,
  createInitialState,
  fireEmployee,
  hireCandidate,
  launchMarketingCampaign,
  motivateEmployee,
  repayLoan,
  resolveDilemma,
  respondToCrisis,
  retireStudio,
  setCrunch,
  setFocus,
  setPolicies,
  startProject,
  takeLoan,
  tick,
  toggleAssignment,
  toggleFeature,
  toggleResearchAssignment,
  trainEmployee,
  type CrisisResponseId,
  type DevPhaseNumber,
  type DilemmaChoice,
  type DilemmaKind,
  type EraId,
  type FocusAllocation,
  type GameState,
  type MotivationKind,
  type ProjectConcept,
  type Specialty,
  type Speed,
  type StudioPolicies,
} from '../core';
import { balance } from '../data/balance';
import { loadFromLocalStorage, saveToLocalStorage } from '../save/saveLoad';

/**
 * Store Zustand (docs/08 §6): contiene el GameState y expone acciones que
 * delegan en core/. Ningún cálculo de juego vive aquí ni en la UI; el store
 * añade solo estado de presentación (pantalla actual, proyecto activo,
 * overlays de era/premios y preferencia de piel) y navegación.
 */

/** Pantallas de las Fases 1–6 (docs/10 §10.1–10.10). */
export type Screen =
  | 'estudio'
  | 'concepcion'
  | 'desarrollo'
  | 'resena'
  | 'equipo'
  | 'mercado'
  | 'creadores'
  | 'investigacion'
  | 'finanzas'
  | 'legado';

export interface GameStore {
  game: GameState;
  /** Velocidad de simulación actual (0 = pausa). */
  speed: Speed;
  /** Pantalla visible. */
  screen: Screen;
  /** Juego cuya reseña se muestra en la pantalla de reseña. */
  reviewGameId: string | null;
  /** Proyecto seleccionado en las pantallas de desarrollo/creadores (multi-proyecto). */
  activeProjectId: string | null;
  /** Transición de era pendiente de mostrar a pantalla completa (docs/10 §7.6). */
  eraTransition: EraId | null;
  /** Semana de la última gala de premios pendiente de mostrar (docs/06 §7). */
  awardsWeek: number | null;
  /** Toggle "UI moderna siempre": desactiva las pieles de era (docs/10 §8). */
  modernUi: boolean;
  /** Tema base claro/oscuro (Fase 7A, docs/10 §2). Preferencia de UI pura. */
  colorTheme: ColorTheme;
  /**
   * Toggle "Reducir animaciones" (docs/10 §4.3, Fase 7D): apaga lo no
   * esencial (partículas, desplazamientos) además de `prefers-reduced-motion`.
   */
  reduceMotion: boolean;
  /** Avanza 1 semana (1 tick) inmediatamente. */
  advanceWeek: () => void;
  /** Cambia la velocidad del bucle: 0 = pausa, 1/2/4 = multiplicador. */
  setSpeed: (speed: Speed) => void;
  /** Navega a una pantalla. */
  goTo: (screen: Screen) => void;
  /** Abre la reseña de un juego lanzado. */
  openReview: (gameId: string) => void;
  /** Selecciona el proyecto activo para las pantallas de proyecto. */
  selectProject: (projectId: string) => void;
  /** Cierra el beat de transición de era. */
  dismissEraTransition: () => void;
  /** Cierra el modal de la gala de premios. */
  dismissAwards: () => void;
  /** Activa/desactiva las pieles de era (docs/10 §8: "UI moderna siempre"). */
  setModernUi: (modern: boolean) => void;
  /** Cambia el tema base claro/oscuro (persistido en localStorage). */
  setColorTheme: (theme: ColorTheme) => void;
  /** Activa/desactiva "Reducir animaciones" (persistido en localStorage). */
  setReduceMotion: (reduce: boolean) => void;
  /** Acciones del proyecto (delegan en core/). */
  startProject: (concept: ProjectConcept) => void;
  setFocus: (phase: DevPhaseNumber, allocation: FocusAllocation, projectId?: string) => void;
  toggleFeature: (featureId: string, projectId?: string) => void;
  /** Acciones de personal (docs/05 §6; delegan en core/systems/staff.ts). */
  hire: (candidateId: string) => void;
  fire: (employeeId: string) => void;
  train: (employeeId: string, specialty: Specialty) => void;
  motivate: (employeeId: string, kind: MotivationKind) => void;
  toggleAssignment: (employeeId: string, projectId?: string) => void;
  setCrunch: (active: boolean, projectId?: string) => void;
  /** Acciones de investigación (docs/02 §3; delegan en core/systems/research.ts). */
  toggleResearch: (employeeId: string) => void;
  buyResearch: (nodeId: string) => void;
  /** Gestión por políticas (docs/02 §4; delegan en core/systems/policies.ts). */
  setPolicies: (patch: Partial<StudioPolicies>) => void;
  /** Acciones de economía (docs/06 §4; delegan en core/systems/economy.ts). */
  takeLoan: (amount: number) => void;
  repayLoan: (amount: number) => void;
  launchMarketing: (level: number, projectId?: string) => void;
  /** Acciones sociales (docs/07; delegan en core/systems/community.ts). */
  assignCreatorKey: (creatorId: string, projectId?: string) => void;
  respondToCrisis: (crisisId: string, responseId: CrisisResponseId) => void;
  resolveDilemma: (kind: DilemmaKind, choice: DilemmaChoice) => void;
  /** Cierra el estudio para contemplar el Legado (docs/06 §6). */
  retire: () => void;
  /** Empieza una partida nueva (pausada). */
  newGame: (seed?: number) => void;
  /** Guarda la partida en localStorage. */
  saveGame: () => void;
  /** Carga desde localStorage (pausada). Devuelve false si no hay guardado válido. */
  loadGame: () => boolean;
}

/** Tema base de la UI (Fase 7A). Oscuro por defecto: es el look de juego. */
export type ColorTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'pixel-empire:color-theme';
const MODERN_UI_STORAGE_KEY = 'pixel-empire:modern-ui';
const REDUCE_MOTION_STORAGE_KEY = 'pixel-empire:reduce-motion';

/** Preferencia de tema guardada, si existe y es válida. */
function storedColorTheme(): ColorTheme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  } catch {
    return 'dark';
  }
}

/** Preferencia "UI moderna siempre" guardada (docs/10 §8). */
function storedModernUi(): boolean {
  try {
    return localStorage.getItem(MODERN_UI_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Preferencia "Reducir animaciones" guardada (docs/10 §4.3). */
function storedReduceMotion(): boolean {
  try {
    return localStorage.getItem(REDUCE_MOTION_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
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
  activeProjectId: null,
  eraTransition: null,
  awardsWeek: null,
  modernUi: storedModernUi(),
  colorTheme: storedColorTheme(),
  reduceMotion: storedReduceMotion(),

  advanceWeek: () => {
    const before = get().game;
    const after = tick(before);

    // Momentos que piden decisión: el juego pausa y navega (docs/02 §1:
    // "el juego nunca fuerza una decisión importante sin pausa").
    const released = after.releasedGames.length > before.releasedGames.length;
    const phaseChanged = after.projects.some((p) => {
      const prev = before.projects.find((q) => q.id === p.id);
      return prev !== undefined && prev.phase !== p.phase;
    });
    const justEnded = after.gameOver !== null && before.gameOver === null;
    const staffLost = after.staff.length < before.staff.length;
    const stageChanged = after.studio.scaleStage !== before.studio.scaleStage;
    // La capa social también pausa (docs/07): crisis con reloj y dilemas.
    const openCrises = (s: GameState) =>
      s.community.crises.filter((c) => c.status === 'abierta').length;
    const crisisErupted = openCrises(after) > openCrises(before);
    const dilemmaFired = after.community.dilemmas.length > before.community.dilemmas.length;
    // Los beats de la Fase 6: transición de era (docs/10 §7.6) y gala anual.
    const eraChanged = after.era !== before.era;
    const awardsWon = after.studio.awards.length > before.studio.awards.length;

    if (
      released ||
      justEnded ||
      staffLost ||
      stageChanged ||
      crisisErupted ||
      dilemmaFired ||
      eraChanged ||
      awardsWon ||
      phaseChanged
    ) {
      gameLoop.setSpeed(0);
      set({ game: after, speed: 0 });
    } else {
      set({ game: after });
    }

    // El proyecto activo pudo lanzarse esta semana: limpiar la selección.
    if (
      get().activeProjectId !== null &&
      !after.projects.some((p) => p.id === get().activeProjectId)
    ) {
      set({ activeProjectId: after.projects[0]?.id ?? null });
    }

    if (eraChanged) {
      set({ eraTransition: after.era });
    }
    if (awardsWon) {
      const latest = after.studio.awards[after.studio.awards.length - 1];
      set({ awardsWeek: latest.week });
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

  selectProject: (projectId) => set({ activeProjectId: projectId }),

  dismissEraTransition: () => set({ eraTransition: null }),

  dismissAwards: () => set({ awardsWeek: null }),

  setModernUi: (modern) => {
    try {
      localStorage.setItem(MODERN_UI_STORAGE_KEY, String(modern));
    } catch {
      // Sin almacenamiento disponible: la preferencia vive solo en la sesión.
    }
    set({ modernUi: modern });
  },

  setColorTheme: (theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Sin almacenamiento disponible: la preferencia vive solo en la sesión.
    }
    set({ colorTheme: theme });
  },

  setReduceMotion: (reduce) => {
    try {
      localStorage.setItem(REDUCE_MOTION_STORAGE_KEY, String(reduce));
    } catch {
      // Sin almacenamiento disponible: la preferencia vive solo en la sesión.
    }
    set({ reduceMotion: reduce });
  },

  startProject: (concept) => {
    set((s) => {
      const game = startProject(s.game, concept);
      const created = game.projects[game.projects.length - 1];
      return { game, screen: 'desarrollo', activeProjectId: created.id };
    });
  },

  setFocus: (phase, allocation, projectId) => {
    set((s) => ({ game: setFocus(s.game, phase, allocation, projectId) }));
  },

  toggleFeature: (featureId, projectId) => {
    set((s) => ({ game: toggleFeature(s.game, featureId, projectId) }));
  },

  hire: (candidateId) => {
    set((s) => ({ game: hireCandidate(s.game, candidateId) }));
  },

  fire: (employeeId) => {
    set((s) => ({ game: fireEmployee(s.game, employeeId) }));
  },

  train: (employeeId, specialty) => {
    set((s) => ({ game: trainEmployee(s.game, employeeId, specialty) }));
  },

  motivate: (employeeId, kind) => {
    set((s) => ({ game: motivateEmployee(s.game, employeeId, kind) }));
  },

  toggleAssignment: (employeeId, projectId) => {
    set((s) => ({ game: toggleAssignment(s.game, employeeId, projectId) }));
  },

  setCrunch: (active, projectId) => {
    set((s) => ({ game: setCrunch(s.game, active, projectId) }));
  },

  toggleResearch: (employeeId) => {
    set((s) => ({ game: toggleResearchAssignment(s.game, employeeId) }));
  },

  buyResearch: (nodeId) => {
    set((s) => ({ game: buyResearch(s.game, nodeId) }));
  },

  setPolicies: (patch) => {
    set((s) => ({ game: setPolicies(s.game, patch) }));
  },

  takeLoan: (amount) => {
    set((s) => ({ game: takeLoan(s.game, amount) }));
  },

  repayLoan: (amount) => {
    set((s) => ({ game: repayLoan(s.game, amount) }));
  },

  launchMarketing: (level, projectId) => {
    set((s) => ({ game: launchMarketingCampaign(s.game, level, projectId) }));
  },

  assignCreatorKey: (creatorId, projectId) => {
    set((s) => ({ game: assignCreatorKey(s.game, creatorId, projectId) }));
  },

  respondToCrisis: (crisisId, responseId) => {
    set((s) => ({ game: respondToCrisis(s.game, crisisId, responseId) }));
  },

  resolveDilemma: (kind, choice) => {
    set((s) => ({ game: resolveDilemma(s.game, kind, choice) }));
  },

  retire: () => {
    gameLoop.setSpeed(0);
    set((s) => ({ game: retireStudio(s.game), speed: 0, screen: 'legado' }));
  },

  newGame: (seed = defaultSeed()) => {
    gameLoop.setSpeed(0);
    set({
      game: createInitialState(seed),
      speed: 0,
      screen: 'estudio',
      reviewGameId: null,
      activeProjectId: null,
      eraTransition: null,
      awardsWeek: null,
    });
  },

  saveGame: () => {
    saveToLocalStorage(get().game);
  },

  loadGame: () => {
    try {
      const loaded = loadFromLocalStorage();
      if (loaded === null) return false;
      gameLoop.setSpeed(0);
      set({
        game: loaded,
        speed: 0,
        screen: 'estudio',
        reviewGameId: null,
        activeProjectId: loaded.projects[0]?.id ?? null,
        eraTransition: null,
        awardsWeek: null,
      });
      return true;
    } catch {
      return false;
    }
  },
}));
