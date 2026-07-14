import { create } from 'zustand';
import {
  assignCreatorKey,
  buyResearch,
  createGameLoop,
  createInitialState,
  createSandboxState,
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
  type ScaleStage,
  type Specialty,
  type Speed,
  type StudioPolicies,
} from '../core';
import { balance } from '../data/balance';
import { specialtyLabels, stageLabels } from '../data/staffTexts';
import { loadFromLocalStorage, saveToLocalStorage } from '../save/saveLoad';

/**
 * Store Zustand (docs/08 §6): contiene el GameState y expone acciones que
 * delegan en core/. Ningún cálculo de juego vive aquí ni en la UI; el store
 * añade solo estado de presentación (pantalla actual, proyecto activo,
 * overlays de era/premios y preferencia de piel) y navegación.
 */

/** Frente de la app (Fase 7F, docs/13 7F): pantalla de título o partida. */
export type AppMode = 'title' | 'game';

/**
 * Aviso importante encolado (docs/17 U4): estado de PRESENTACIÓN que el
 * ImportantNoticeModal drena de uno en uno. La clasificación menor/importante
 * vive en data/notifications.ts; el store solo detecta los eventos por diff del
 * estado puro y los encola (la pausa la dispara el store/UI, no el núcleo).
 */
export interface MarketExitNotice {
  id: number;
  kind: 'marketExit';
  gameId: string;
  gameName: string;
  /** Lo que generó en toda su vida (ingresos, incluye MTX). */
  revenue: number;
  /** Lo que costó (desarrollo + licencia + marketing; docs/17 U4). */
  cost: number;
  units: number;
}
export interface StaffLeftNotice {
  id: number;
  kind: 'staffLeft';
  employeeName: string;
  /** Etiqueta de la especialidad, para el texto del aviso. */
  role: string;
}
export interface BankruptcyNotice {
  id: number;
  kind: 'bankruptcyWarning';
  /** Semanas de gracia antes de la bancarrota (docs/06 §1). */
  graceWeeks: number;
}
export interface ScaleUpNotice {
  id: number;
  kind: 'scaleUp';
  stage: ScaleStage;
  stageName: string;
}
export type ImportantNotice =
  | MarketExitNotice
  | StaffLeftNotice
  | BankruptcyNotice
  | ScaleUpNotice;

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
  /** Frente visible (Fase 7F): título o partida. Presentación pura. */
  appMode: AppMode;
  /** true si hay una partida viva en la sesión (habilita "Continuar" en el título). */
  sessionActive: boolean;
  /**
   * Paso actual del tutorial guiado (índice en ui/onboarding/steps.ts);
   * null = apagado. Capa de GUÍA (Fase 7F): observa el estado real y resalta
   * acciones reales, nunca crea lógica de juego.
   */
  tutorialStep: number | null;
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
  /**
   * Cola de avisos importantes pendientes (docs/17 U4): el modal los muestra de
   * uno en uno y el jugador los descarta con "Aceptar/Continuar". Mientras haya
   * avisos, el tiempo está en pausa.
   */
  pendingNotices: ImportantNotice[];
  /** Toggle "UI moderna siempre": desactiva las pieles de era (docs/10 §8). */
  modernUi: boolean;
  /** Tema base claro/oscuro (Fase 7A, docs/10 §2). Preferencia de UI pura. */
  colorTheme: ColorTheme;
  /**
   * Toggle "Reducir animaciones" (docs/10 §4.3, Fase 7D): apaga lo no
   * esencial (partículas, desplazamientos) además de `prefers-reduced-motion`.
   */
  reduceMotion: boolean;
  /** Sonido procedural activado (docs/10 §12, Fase 7G). El juego es perfecto muteado. */
  soundOn: boolean;
  /** Volumen maestro 0..1 (docs/10 §12): mezcla sutil por defecto. */
  soundVolume: number;
  /**
   * Escalado de fuente (docs/10 §13, Fase 7G): multiplicador sobre el tamaño
   * base del documento. Accesibilidad pura; lo aplica EraSkinProvider.
   */
  fontScale: FontScale;
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
  /** Descarta el aviso importante del frente de la cola (docs/17 U4). */
  dismissNotice: () => void;
  /** Activa/desactiva las pieles de era (docs/10 §8: "UI moderna siempre"). */
  setModernUi: (modern: boolean) => void;
  /** Cambia el tema base claro/oscuro (persistido en localStorage). */
  setColorTheme: (theme: ColorTheme) => void;
  /** Activa/desactiva "Reducir animaciones" (persistido en localStorage). */
  setReduceMotion: (reduce: boolean) => void;
  /** Activa/desactiva el sonido (persistido en localStorage). */
  setSoundOn: (on: boolean) => void;
  /** Fija el volumen maestro 0..1 (persistido en localStorage). */
  setSoundVolume: (volume: number) => void;
  /** Cambia el escalado de fuente (persistido en localStorage). */
  setFontScale: (scale: FontScale) => void;
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
  /** Entra a la partida desde el título (Fase 7F). */
  enterGame: () => void;
  /** Vuelve al título (pausa; la partida sigue viva en memoria). */
  enterTitle: () => void;
  /** Arranca el tutorial guiado desde el primer paso (Fase 7F). */
  startTutorial: () => void;
  /** Avanza un paso; lo despacha la capa de guía al cumplirse la acción real. */
  advanceTutorial: () => void;
  /** Cierra el tutorial (completado o saltado): no vuelve a autoarrancar. */
  endTutorial: () => void;
  /** Empieza una partida nueva (pausada). */
  newGame: (seed?: number) => void;
  /**
   * Empieza una partida sandbox (Fase 7G, docs/01 §7): caja y 💡 de sobra,
   * en la era elegida. Se desbloquea al terminar una partida (retiro o
   * quiebra); el desbloqueo persiste en este navegador.
   */
  newSandbox: (era: EraId, seed?: number) => void;
  /** Guarda la partida en localStorage. */
  saveGame: () => void;
  /** Carga desde localStorage (pausada). Devuelve false si no hay guardado válido. */
  loadGame: () => boolean;
}

/** Tema base de la UI (Fase 7A). Oscuro por defecto: es el look de juego. */
export type ColorTheme = 'dark' | 'light';

/** Escalado de fuente (docs/10 §13): base 100 %, grande 112,5 %, enorme 125 %. */
export type FontScale = 'base' | 'grande' | 'enorme';

/** Factor de cada escalado sobre el font-size raíz (rem-driven, docs/10 §13). */
export const FONT_SCALE_FACTOR: Record<FontScale, number> = {
  base: 1,
  grande: 1.125,
  enorme: 1.25,
};

const THEME_STORAGE_KEY = 'pixel-empire:color-theme';
const MODERN_UI_STORAGE_KEY = 'pixel-empire:modern-ui';
const REDUCE_MOTION_STORAGE_KEY = 'pixel-empire:reduce-motion';
const ONBOARDING_STORAGE_KEY = 'pixel-empire:onboarding-done';
const SANDBOX_STORAGE_KEY = 'pixel-empire:sandbox-unlocked';
const SOUND_ON_STORAGE_KEY = 'pixel-empire:sound-on';
const SOUND_VOLUME_STORAGE_KEY = 'pixel-empire:sound-volume';
const FONT_SCALE_STORAGE_KEY = 'pixel-empire:font-scale';

/**
 * true si este navegador ya terminó una partida (retiro o quiebra): el modo
 * sandbox queda desbloqueado para siempre (docs/01 §7, Fase 7G).
 */
export function sandboxUnlocked(): boolean {
  try {
    return localStorage.getItem(SANDBOX_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markSandboxUnlocked(): void {
  try {
    localStorage.setItem(SANDBOX_STORAGE_KEY, 'true');
  } catch {
    // Sin almacenamiento: se volverá a desbloquear al terminar otra partida.
  }
}

/**
 * true si el tutorial ya se completó o saltó en este navegador (Fase 7F):
 * al experto no se le vuelve a autoarrancar (docs/10 §13).
 */
export function onboardingCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch {
    // Sin almacenamiento: el tutorial podrá volver a ofrecerse otra sesión.
  }
}

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

/** Preferencia de sonido guardada (docs/10 §12). Encendido por defecto. */
function storedSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_ON_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

/** Volumen maestro guardado, 0..1 (docs/10 §12: mezcla sutil por defecto). */
function storedSoundVolume(): number {
  try {
    const stored = localStorage.getItem(SOUND_VOLUME_STORAGE_KEY);
    // Ojo: Number(null) === 0 — sin preferencia guardada, el defecto es 0.5.
    if (stored === null) return 0.5;
    const parsed = Number(stored);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0.5;
  } catch {
    return 0.5;
  }
}

/** Escalado de fuente guardado (docs/10 §13). */
function storedFontScale(): FontScale {
  try {
    const stored = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    return stored === 'grande' || stored === 'enorme' ? stored : 'base';
  } catch {
    return 'base';
  }
}

/** Semilla por defecto para partidas nuevas (fuera de core; no es lógica de juego). */
const defaultSeed = (): number => Date.now() >>> 0;

/** Ids incrementales para los avisos importantes (clave estable de React). */
let nextNoticeId = 1;

/** Bucle real (timers) fuera de React; despacha ticks contra el store. */
const gameLoop = createGameLoop(
  () => useGameStore.getState().advanceWeek(),
  balance.time.baseTickMs,
);

export const useGameStore = create<GameStore>()((set, get) => ({
  game: createInitialState(defaultSeed()),
  speed: 0,
  appMode: 'title',
  sessionActive: false,
  tutorialStep: null,
  screen: 'estudio',
  reviewGameId: null,
  activeProjectId: null,
  eraTransition: null,
  awardsWeek: null,
  pendingNotices: [],
  modernUi: storedModernUi(),
  colorTheme: storedColorTheme(),
  reduceMotion: storedReduceMotion(),
  soundOn: storedSoundOn(),
  soundVolume: storedSoundVolume(),
  fontScale: storedFontScale(),

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

    // Avisos importantes de dos niveles (docs/17 U4): se detectan por diff del
    // estado puro (sin animación) y se encolan como estado de presentación; el
    // ImportantNoticeModal los drena de uno en uno. La clasificación vive en
    // data/notifications.ts. Los beats con superficie propia (crisis, era,
    // premios) no pasan por aquí: ya tienen su momento señal.
    const notices: ImportantNotice[] = [];

    // Un juego cae bajo el umbral y sale del mercado → P&L (generó vs costó).
    for (const g of after.releasedGames) {
      const prev = before.releasedGames.find((p) => p.id === g.id);
      if (prev && prev.salesActive && !g.salesActive) {
        notices.push({
          id: nextNoticeId++,
          kind: 'marketExit',
          gameId: g.id,
          gameName: g.name,
          revenue: g.totalRevenue,
          cost: g.cost ?? 0,
          units: g.totalUnits,
        });
      }
    }

    // Renuncias: quien estaba y ya no, durante el tick, se ha ido por su pie
    // (los despidos son otra acción y no pasan por advanceWeek).
    const afterStaffIds = new Set(after.staff.map((e) => e.id));
    for (const e of before.staff) {
      if (!afterStaffIds.has(e.id)) {
        notices.push({
          id: nextNoticeId++,
          kind: 'staffLeft',
          employeeName: e.name,
          role: specialtyLabels[e.specialty],
        });
      }
    }

    // Primera semana en números rojos: aviso de bancarrota inminente (docs/06 §1).
    if (before.negativeWeeks === 0 && after.negativeWeeks >= 1 && after.gameOver === null) {
      notices.push({
        id: nextNoticeId++,
        kind: 'bankruptcyWarning',
        graceWeeks: balance.economy.bankruptcyGraceWeeks,
      });
    }

    // Desbloqueo de etapa de escala (docs/02 §4).
    if (after.studio.scaleStage > before.studio.scaleStage) {
      notices.push({
        id: nextNoticeId++,
        kind: 'scaleUp',
        stage: after.studio.scaleStage,
        stageName: stageLabels[after.studio.scaleStage],
      });
    }

    if (
      released ||
      justEnded ||
      staffLost ||
      stageChanged ||
      crisisErupted ||
      dilemmaFired ||
      eraChanged ||
      awardsWon ||
      phaseChanged ||
      notices.length > 0
    ) {
      gameLoop.setSpeed(0);
      set((s) => ({
        game: after,
        speed: 0,
        pendingNotices:
          notices.length > 0 ? [...s.pendingNotices, ...notices] : s.pendingNotices,
      }));
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

    // Terminar una partida (como sea) desbloquea el sandbox (docs/01 §7).
    if (justEnded) {
      markSandboxUnlocked();
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

  dismissNotice: () => set((s) => ({ pendingNotices: s.pendingNotices.slice(1) })),

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

  setSoundOn: (on) => {
    try {
      localStorage.setItem(SOUND_ON_STORAGE_KEY, String(on));
    } catch {
      // Sin almacenamiento disponible: la preferencia vive solo en la sesión.
    }
    set({ soundOn: on });
  },

  setSoundVolume: (volume) => {
    const clamped = Math.min(1, Math.max(0, volume));
    try {
      localStorage.setItem(SOUND_VOLUME_STORAGE_KEY, String(clamped));
    } catch {
      // Sin almacenamiento disponible: la preferencia vive solo en la sesión.
    }
    set({ soundVolume: clamped });
  },

  setFontScale: (scale) => {
    try {
      localStorage.setItem(FONT_SCALE_STORAGE_KEY, scale);
    } catch {
      // Sin almacenamiento disponible: la preferencia vive solo en la sesión.
    }
    set({ fontScale: scale });
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
    markSandboxUnlocked();
    set((s) => ({ game: retireStudio(s.game), speed: 0, screen: 'legado' }));
  },

  enterGame: () => set({ appMode: 'game', sessionActive: true }),

  enterTitle: () => {
    gameLoop.setSpeed(0);
    set({ appMode: 'title', speed: 0 });
  },

  startTutorial: () => set({ tutorialStep: 0 }),

  advanceTutorial: () =>
    set((s) => (s.tutorialStep === null ? {} : { tutorialStep: s.tutorialStep + 1 })),

  endTutorial: () => {
    markOnboardingDone();
    set({ tutorialStep: null });
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
      pendingNotices: [],
      tutorialStep: null,
    });
  },

  newSandbox: (era, seed = defaultSeed()) => {
    gameLoop.setSpeed(0);
    set({
      game: createSandboxState(seed, era),
      speed: 0,
      screen: 'estudio',
      reviewGameId: null,
      activeProjectId: null,
      eraTransition: null,
      awardsWeek: null,
      pendingNotices: [],
      tutorialStep: null,
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
        pendingNotices: [],
        tutorialStep: null,
      });
      return true;
    } catch {
      return false;
    }
  },
}));
