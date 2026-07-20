import { create } from 'zustand';
import {
  acquireStudio,
  assignCreatorKey,
  buyResearch,
  confirmContestedRelease,
  createGameLoop,
  createInitialState,
  createSandboxState,
  delayContestedRelease,
  expandBlockReason,
  expandStudio,
  fireEmployee,
  hireCandidate,
  launchEarlyAccess,
  launchLiveService,
  launchMarketingCampaign,
  motivateEmployee,
  repayLoan,
  researchInsight,
  researchTheme,
  resolveDilemma,
  resolvePoachOffer,
  respondToCrisis,
  retireStudio,
  sellSubsidiary,
  setSubsidiaryDirective,
  sunsetLiveService,
  toggleLiveServiceAssignment,
  assignSquadToProject,
  createSquad,
  disbandSquad,
  renameSquad,
  setCrunch,
  setFocus,
  setSquadMembers,
  scaleUpgradeCost,
  setPolicies,
  startEngineBuild,
  startProject,
  takeLoan,
  tick,
  toggleAssignment,
  toggleFeature,
  toggleResearchAssignment,
  trainEmployee,
  withdrawTeam,
  type CrisisResponseId,
  type DevPhaseNumber,
  type DilemmaChoice,
  type DilemmaKind,
  type EngineBuildSpec,
  type EraId,
  type FocusAllocation,
  type GameState,
  type LiveServiceConfig,
  type MotivationKind,
  type PoachResolution,
  type ProjectConcept,
  type ScaleStage,
  type Specialty,
  type Speed,
  type StudioPolicies,
  type SubsidiaryDirective,
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
  /** Lo que generó en toda su vida (ingresos NETOS, incluye MTX). */
  revenue: number;
  /** Lo que costó (desarrollo + licencia + marketing QUE PAGASTE; docs/17 U4). */
  cost: number;
  units: number;
  /**
   * El trato del publisher en el P&L (9.6): el adelanto suma al "generó" y la
   * tajada acumulada se enseña aparte — el precio de la muleta, en cifras.
   * Opcionales: los juegos auto-publicados no los llevan.
   */
  publisherName?: string;
  publisherAdvance?: number;
  publisherPaid?: number;
  /** Ingresos del acceso anticipado (9.6): entraron antes de la 1.0. */
  eaRevenue?: number;
}
/** La liberación ganada (9.6, docs/19 §9.6): el hito narrativo del arco. */
export interface IndependenceNotice {
  id: number;
  kind: 'independence';
  gameName: string;
  /** Lo que los publishers se llevaron de tus ventas hasta hoy. */
  publisherPaidTotal: number;
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
/**
 * Desde 8.8 la etapa se COMPRA (docs/18 V4-c): este aviso ya no celebra una
 * subida automática, sino que CUMPLES LOS REQUISITOS para ampliar — te manda
 * a la cronología de escala, donde vive el botón "Ampliar estudio".
 */
export interface ScaleUpNotice {
  id: number;
  kind: 'scaleUp';
  /** La etapa que puedes comprar (la siguiente a la actual). */
  stage: ScaleStage;
  stageName: string;
  /** El desembolso de la ampliación (para decidir con datos). */
  cost: number;
}
export type ImportantNotice =
  | MarketExitNotice
  | StaffLeftNotice
  | BankruptcyNotice
  | ScaleUpNotice
  | IndependenceNotice;

/**
 * Pantallas de las Fases 1–6 (docs/10 §10.1–10.10). Desde la Fase 8.5 ni la
 * concepción ni el desarrollo son pantallas: son modales (docs/17 U3,
 * `conceptionOpen` y `devProjectId`).
 */
export type Screen =
  | 'estudio'
  | 'resena'
  | 'equipo'
  | 'mercado'
  | 'industria'
  | 'creadores'
  | 'investigacion'
  | 'finanzas'
  | 'legado';

/**
 * Modal abierto desde el menú de la barra superior (docs/17 U2). Presentación
 * pura: saca de la pantalla principal lo que no hace falta ver siempre.
 */
export type MenuModal = 'juegos' | 'historial' | 'partida';

/**
 * Cronología abierta, o null (docs/17 U1): la de las 7 eras o la de las 4
 * etapas de escala. Los dos ejes de progreso de docs/16 §3, cada uno con su
 * overlay. Presentación pura; se abre desde su chip de la barra superior.
 */
export type TimelineKind = 'eras' | 'escala';

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
  /**
   * true si el modal de concepción está abierto (docs/17 U3). Abrirlo pausa el
   * tiempo: ninguna decisión importante se toma con el reloj corriendo
   * (docs/02 §1). Presentación pura; el proyecto lo crea `startProject`.
   */
  conceptionOpen: boolean;
  /**
   * Proyecto cuyo modal de desarrollo está abierto, o null (Fase 8.5). El
   * desarrollo se juega por FASES: el modal se abre al concebir y cada vez que
   * el núcleo cambia de fase (el tick ya pausa ahí), se decide el reparto de
   * esa fase y "Continuar desarrollo" lo cierra y reanuda a x1 — entonces se
   * ve trabajar a la Oficina Viva hasta el siguiente hito (docs/02 §2).
   */
  devProjectId: string | null;
  /**
   * Modal del menú de la barra superior visible, o null (docs/17 U2). No pausa:
   * lo abre el jugador cuando quiere, no interrumpe como los avisos de U4.
   */
  menuModal: MenuModal | null;
  /**
   * Cronología visible, o null (docs/17 U1). Como los modales del menú, no
   * pausa: se mira cuando apetece. Se abre sola tras el beat de era para
   * celebrar el hito (docs/10 §7.6).
   */
  timeline: TimelineKind | null;
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
  /** Abre el modal de concepción (docs/17 U3) y pausa el tiempo. */
  openConception: () => void;
  /** Cierra el modal de concepción sin crear nada (deja el tiempo en pausa). */
  closeConception: () => void;
  /** Abre el modal de desarrollo de un proyecto y pausa (Fase 8.5). */
  openDev: (projectId: string) => void;
  /** Cierra el modal de desarrollo (sin tocar el reloj). */
  closeDev: () => void;
  /** "Continuar desarrollo": cierra el modal y reanuda el tiempo a x1. */
  continueDev: () => void;
  /** Abre un modal del menú de la barra superior (docs/17 U2). */
  openMenuModal: (modal: MenuModal) => void;
  /** Cierra el modal del menú. */
  closeMenuModal: () => void;
  /** Abre una cronología (eras o escala) desde su chip de la barra (docs/17 U1). */
  openTimeline: (kind: TimelineKind) => void;
  /** Cierra la cronología. */
  closeTimeline: () => void;
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
  /**
   * Compra la ampliación a la etapa siguiente (docs/18 V4-c). Vive en la
   * cronología de escala: el botón "Ampliar estudio (coste: X 💰)".
   */
  expandStudio: () => void;
  train: (employeeId: string, specialty: Specialty) => void;
  motivate: (employeeId: string, kind: MotivationKind) => void;
  toggleAssignment: (employeeId: string, projectId?: string) => void;
  setCrunch: (active: boolean, projectId?: string) => void;
  /**
   * Subequipos y asignación en bloque (docs/18 V5; core/systems/squads.ts).
   * `withdrawTeam` retira a todo el equipo de un proyecto: descansan y el
   * proyecto queda en pausa.
   */
  createSquad: (name: string, memberIds?: string[]) => void;
  renameSquad: (squadId: string, name: string) => void;
  setSquadMembers: (squadId: string, memberIds: string[]) => void;
  disbandSquad: (squadId: string) => void;
  assignSquadToProject: (squadId: string, projectId: string) => void;
  withdrawTeam: (projectId: string) => void;
  /** Acciones de investigación (docs/02 §3; delegan en core/systems/research.ts). */
  toggleResearch: (employeeId: string) => void;
  buyResearch: (nodeId: string) => void;
  /** Encarga la obra de un motor propio, nuevo o mejora (Fase 9.2). */
  startEngineBuild: (spec: EngineBuildSpec) => void;
  /** Desbloquea un tema con 💡 (docs/17 P1). */
  researchTheme: (themeId: string) => void;
  /** "Investigar resultados" de un juego lanzado: aprende su combo (docs/17 P2). */
  researchInsight: (gameId: string) => void;
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
  /**
   * Ventana disputada (Fase 9.5, docs/19 §9.5): lanzar igual (con el pico
   * aplastado) o retrasar hasta que pase el bombazo del gigante.
   */
  confirmContestedRelease: (projectId: string) => void;
  delayContestedRelease: (projectId: string) => void;
  /**
   * Early Access (Fase 9.6, docs/19 §9.6): abre el acceso anticipado de un
   * proyecto auto-publicado en Pulido. El núcleo valida (earlyAccessBlockReason).
   */
  launchEarlyAccess: (projectId: string) => void;
  /** Caza de talento (Fase 9.5): igualar la oferta del rival o dejarle ir. */
  resolvePoachOffer: (resolution: PoachResolution) => void;
  /**
   * Servicios en vivo (Fase 9.7, docs/19 §9.7; delegan en
   * core/systems/liveService.ts): operar un juego lanzado como servicio,
   * dotarlo de equipo y cerrarlo.
   */
  launchLiveService: (gameId: string, config: LiveServiceConfig) => void;
  toggleLiveServiceAssignment: (gameId: string, employeeId: string) => void;
  sunsetLiveService: (gameId: string) => void;
  /**
   * Adquisiciones (Fase 9.7; delegan en core/systems/subsidiaries.ts):
   * comprar un rival, dirigir la filial y venderla.
   */
  acquireStudio: (rivalId: string) => void;
  setSubsidiaryDirective: (subsidiaryId: string, directive: SubsidiaryDirective) => void;
  sellSubsidiary: (subsidiaryId: string) => void;
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
  conceptionOpen: false,
  devProjectId: null,
  menuModal: null,
  timeline: null,
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
    // El proyecto que acaba de cambiar de fase: su ventana de desarrollo se
    // reabre para repartir el esfuerzo de la fase nueva (Fase 8.5, docs/02 §2).
    // Con varios proyectos en paralelo manda el primero que cruza el hito; los
    // demás siguen a un clic en sus pestañas dentro del propio modal.
    const phaseChangedId =
      after.projects.find((p) => {
        const prev = before.projects.find((q) => q.id === p.id);
        return prev !== undefined && prev.phase !== p.phase;
      })?.id ?? null;
    const phaseChanged = phaseChangedId !== null;
    const justEnded = after.gameOver !== null && before.gameOver === null;
    const staffLost = after.staff.length < before.staff.length;
    // La capa social también pausa (docs/07): crisis con reloj y dilemas.
    const openCrises = (s: GameState) =>
      s.community.crises.filter((c) => c.status === 'abierta').length;
    const crisisErupted = openCrises(after) > openCrises(before);
    const dilemmaFired = after.community.dilemmas.length > before.community.dilemmas.length;
    // Ventana disputada (9.5): un proyecto terminado queda retenido pidiendo
    // decisión (lanzar igual o esquivar al gigante) — pausa con modal.
    const pendingCount = (s: GameState) =>
      s.projects.filter((p) => p.pendingRelease !== undefined).length;
    const releaseContested = pendingCount(after) > pendingCount(before);
    // Caza de talento (9.5): un rival tienta a un empleado — pausa con modal.
    const poachFired =
      after.rivals?.poachOffer != null && before.rivals?.poachOffer == null;
    // Los beats de la Fase 6: transición de era (docs/10 §7.6) y gala anual.
    const eraChanged = after.era !== before.era;
    // La gala se celebra si te NOMINARON, aunque no ganes (docs/18 V7): el
    // puesto es el momento señal, no solo el trofeo.
    const ceremonyHeld = after.studio.lastCeremony !== before.studio.lastCeremony;

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
          // El trato del publisher y el EA entran al P&L (9.6): el adelanto y
          // lo vendido en acceso anticipado también fueron ingresos del juego.
          publisherName: g.publisherName,
          publisherAdvance: g.publisherAdvance,
          publisherPaid: g.publisherPaid,
          eaRevenue: g.earlyAccessInfo?.revenue,
        });
      }
    }

    // La liberación ganada (9.6): el núcleo fija stats.independenceWeek una
    // sola vez; el flanco de subida se celebra con su modal.
    if (
      before.stats.independenceWeek === undefined &&
      after.stats.independenceWeek !== undefined
    ) {
      const latest = after.releasedGames[after.releasedGames.length - 1];
      notices.push({
        id: nextNoticeId++,
        kind: 'independence',
        gameName: latest?.name ?? '',
        publisherPaidTotal: after.stats.publisherPaidTotal ?? 0,
      });
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

    // La ampliación de estudio pasa a estar DISPONIBLE (docs/18 V4-c): desde
    // 8.8 la etapa se compra, así que el hito notificable es cruzar el umbral
    // (capital + plantilla). Solo el flanco de subida: sin repetir cada semana.
    if (expandBlockReason(before) !== null && expandBlockReason(after) === null) {
      const target = (after.studio.scaleStage + 1) as ScaleStage;
      notices.push({
        id: nextNoticeId++,
        kind: 'scaleUp',
        stage: target,
        stageName: stageLabels[target],
        cost: scaleUpgradeCost(target as Exclude<ScaleStage, 1>),
      });
    }

    if (
      released ||
      justEnded ||
      staffLost ||
      crisisErupted ||
      dilemmaFired ||
      releaseContested ||
      poachFired ||
      eraChanged ||
      ceremonyHeld ||
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
    if (ceremonyHeld && after.studio.lastCeremony) {
      set({ awardsWeek: after.studio.lastCeremony.week });
    }
    // Fin de fase → se reabre la ventana de desarrollo con la fase nueva ya
    // cargada (Fase 8.5): el jugador reparte el esfuerzo y vuelve a continuar.
    if (phaseChangedId !== null) {
      set({ devProjectId: phaseChangedId, activeProjectId: phaseChangedId });
    }
    if (released) {
      const latest = after.releasedGames[after.releasedGames.length - 1];
      // El juego ya está en la calle: su ventana de desarrollo no pinta nada.
      set({ screen: 'resena', reviewGameId: latest.id, devProjectId: null });
    }
  },

  setSpeed: (speed) => {
    gameLoop.setSpeed(speed);
    set({ speed });
  },

  goTo: (screen) => set({ screen }),

  openConception: () => {
    gameLoop.setSpeed(0);
    set({ conceptionOpen: true, speed: 0 });
  },

  closeConception: () => set({ conceptionOpen: false }),

  openDev: (projectId) => {
    gameLoop.setSpeed(0);
    set({ devProjectId: projectId, activeProjectId: projectId, speed: 0 });
  },

  closeDev: () => set({ devProjectId: null }),

  continueDev: () => {
    // El hito ya está decidido: se cierra la ventana y el mundo echa a andar
    // (x1) para ver trabajar al equipo hasta la siguiente fase (docs/02 §2).
    gameLoop.setSpeed(1);
    set({ devProjectId: null, speed: 1 });
  },

  openMenuModal: (modal) => set({ menuModal: modal }),

  closeMenuModal: () => set({ menuModal: null }),

  openTimeline: (kind) => set({ timeline: kind }),

  closeTimeline: () => set({ timeline: null }),

  openReview: (gameId) => set({ screen: 'resena', reviewGameId: gameId }),

  selectProject: (projectId) => set({ activeProjectId: projectId }),

  // El beat de era encadena con la cronología (docs/17 U1): entrar en la era
  // nueva transforma la piel y abre la línea del tiempo con el nodo recién
  // conquistado encendido. Celebrar el hito es el remate del beat de §7.6,
  // no un segundo overlay peleándose con él.
  dismissEraTransition: () => set({ eraTransition: null, timeline: 'eras' }),

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
      // Al dar luz verde, la concepción cierra y se abre el desarrollo en la
      // fase de Concepto (docs/17 U3 + Fase 8.5): primera decisión del ciclo,
      // en pausa, sobre el estudio.
      return {
        game,
        screen: 'estudio',
        conceptionOpen: false,
        devProjectId: created.id,
        activeProjectId: created.id,
      };
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

  expandStudio: () => {
    set((s) => ({ game: expandStudio(s.game) }));
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

  createSquad: (name, memberIds) => {
    set((s) => ({ game: createSquad(s.game, name, memberIds) }));
  },

  renameSquad: (squadId, name) => {
    set((s) => ({ game: renameSquad(s.game, squadId, name) }));
  },

  setSquadMembers: (squadId, memberIds) => {
    set((s) => ({ game: setSquadMembers(s.game, squadId, memberIds) }));
  },

  disbandSquad: (squadId) => {
    set((s) => ({ game: disbandSquad(s.game, squadId) }));
  },

  assignSquadToProject: (squadId, projectId) => {
    set((s) => ({ game: assignSquadToProject(s.game, squadId, projectId) }));
  },

  withdrawTeam: (projectId) => {
    set((s) => ({ game: withdrawTeam(s.game, projectId) }));
  },

  toggleResearch: (employeeId) => {
    set((s) => ({ game: toggleResearchAssignment(s.game, employeeId) }));
  },

  buyResearch: (nodeId) => {
    set((s) => ({ game: buyResearch(s.game, nodeId) }));
  },

  startEngineBuild: (spec) => {
    set((s) => ({ game: startEngineBuild(s.game, spec) }));
  },

  researchTheme: (themeId) => {
    set((s) => ({ game: researchTheme(s.game, themeId) }));
  },

  researchInsight: (gameId) => {
    set((s) => ({ game: researchInsight(s.game, gameId) }));
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

  confirmContestedRelease: (projectId) => {
    set((s) => ({ game: confirmContestedRelease(s.game, projectId) }));
  },

  delayContestedRelease: (projectId) => {
    set((s) => ({ game: delayContestedRelease(s.game, projectId) }));
  },

  launchEarlyAccess: (projectId) => {
    set((s) => ({ game: launchEarlyAccess(s.game, projectId) }));
  },

  resolvePoachOffer: (resolution) => {
    set((s) => ({ game: resolvePoachOffer(s.game, resolution) }));
  },

  launchLiveService: (gameId, config) => {
    set((s) => ({ game: launchLiveService(s.game, gameId, config) }));
  },

  toggleLiveServiceAssignment: (gameId, employeeId) => {
    set((s) => ({ game: toggleLiveServiceAssignment(s.game, gameId, employeeId) }));
  },

  sunsetLiveService: (gameId) => {
    set((s) => ({ game: sunsetLiveService(s.game, gameId) }));
  },

  acquireStudio: (rivalId) => {
    set((s) => ({ game: acquireStudio(s.game, rivalId) }));
  },

  setSubsidiaryDirective: (subsidiaryId, directive) => {
    set((s) => ({ game: setSubsidiaryDirective(s.game, subsidiaryId, directive) }));
  },

  sellSubsidiary: (subsidiaryId) => {
    set((s) => ({ game: sellSubsidiary(s.game, subsidiaryId) }));
  },

  retire: () => {
    gameLoop.setSpeed(0);
    markSandboxUnlocked();
    set((s) => ({
      game: retireStudio(s.game),
      speed: 0,
      screen: 'legado',
      menuModal: null,
      timeline: null,
      conceptionOpen: false,
      devProjectId: null,
    }));
  },

  enterGame: () => set({ appMode: 'game', sessionActive: true }),

  enterTitle: () => {
    gameLoop.setSpeed(0);
    set({
      appMode: 'title',
      speed: 0,
      menuModal: null,
      timeline: null,
      conceptionOpen: false,
      devProjectId: null,
    });
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
      conceptionOpen: false,
      devProjectId: null,
      menuModal: null,
      timeline: null,
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
      conceptionOpen: false,
      devProjectId: null,
      menuModal: null,
      timeline: null,
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
        conceptionOpen: false,
        devProjectId: null,
        menuModal: null,
        timeline: null,
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
