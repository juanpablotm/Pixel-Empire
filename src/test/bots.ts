import { balance } from '../data/balance';
import { eraIndex, getEra } from '../data/eras';
import { researchNodes } from '../data/research';
import { createInitialState } from '../core/engine/initialState';
import { tick } from '../core/engine/tick';
import type { CrisisResponseId, DilemmaKind } from '../core/model/community';
import type { GameState } from '../core/model/gameState';
import type { MonetizationConfig } from '../core/model/moral';
import type { ProjectSize } from '../core/model/project';
import type { Employee } from '../core/model/staff';
import { resolveDilemma, respondToCrisis, type DilemmaChoice } from '../core/systems/community';
import { weeklyFixedCosts } from '../core/systems/economy';
import { lootBoxesBanned } from '../core/systems/morale';
import { sizeBlockReason, startProject, toggleFeature } from '../core/systems/projects';
import { computeFit } from '../core/systems/quality';
import {
  buyResearch,
  researchNodeStatus,
  researchTheme,
  themeResearchCost,
  themeResearchStatus,
} from '../core/systems/research';
import {
  hireCandidate,
  hiringCost,
  motivateEmployee,
  toggleAssignment,
  trainEmployee,
} from '../core/systems/staff';
import {
  availableFeatures,
  availableGenres,
  availableMonetizationModels,
  availableThemes,
  monetizationFlagAvailable,
  researchableThemes,
} from '../core/systems/unlocks';

/**
 * Bots de balance de PARTIDA COMPLETA (docs/08 §8, Fase 7G): cada filosofía
 * de docs/01 §5 juega desde el garaje de 1980 hasta dos años dentro de E7,
 * tomando cada semana las decisiones de su arquetipo (tamaño, monetización,
 * plantilla, cuidado del equipo, crisis y dilemas). Los usan el test de CA
 * (core/systems/fullGame.test.ts) y los diagnósticos de balance.
 */

export const BOT_SEED = 4242;
/** Dos años dentro de E7: la partida completa de docs/02 §6. */
export const FINAL_WEEK = getEra('E7').startWeek + 104;

export interface Philosophy {
  name: string;
  /** Multiplicador sobre el precio recomendado (docs/06 §2). */
  priceMult: number;
  /** Agresividad MTX cuando el modelo existe (docs/09 §9). */
  aggressiveness: number;
  /** Mete loot boxes en cuanto se inventan (hasta que la ley las mate). */
  useLootBoxes: boolean;
  /** Usa premium+dlc honesto cuando existe (E4+). */
  useDlc: boolean;
  /** Forma y motiva al equipo con regularidad (palanca de integridad). */
  care: boolean;
  /** Plantilla objetivo por índice de era (0..6): la ambición del arquetipo. */
  teamTargetByEra: readonly number[];
  /** Techo de tamaño de proyecto que este arquetipo persigue. */
  sizeAmbition: 'indie' | 'media' | 'aaa';
  crisisResponse: CrisisResponseId;
  dilemma: Record<DilemmaKind, DilemmaChoice>;
}

/** Indie de culto: pequeño, honesto, mimando al equipo y al público. */
export const INDIE: Philosophy = {
  name: 'indie de culto',
  priceMult: 0.8,
  aggressiveness: 0,
  useLootBoxes: false,
  useDlc: false,
  care: true,
  // Con el gate de tamaños (docs/17 E1) el mediano exige 3 personas: el indie
  // llega a 3 pronto para no quedarse encerrado en pequeños, y sigue siendo de
  // culto (≤6). Es la adaptación que haría un jugador listo al nuevo baseline.
  teamTargetByEra: [1, 3, 3, 4, 5, 6, 6],
  sizeAmbition: 'indie',
  crisisResponse: 'disculpa',
  dilemma: { leakAlpha: 'transparencia', sobreHype: 'moderar' },
};

/** Fábrica AAA: crecer agresivo y exprimir la monetización (sin suicidarse). */
export const FACTORY: Philosophy = {
  name: 'fábrica AAA',
  priceMult: 1.1,
  aggressiveness: 0.7,
  useLootBoxes: true,
  useDlc: true,
  care: false,
  teamTargetByEra: [1, 3, 6, 9, 12, 13, 14],
  sizeAmbition: 'aaa',
  crisisResponse: 'silencio',
  dilemma: { leakAlpha: 'capitalizar', sobreHype: 'prometer' },
};

/** Estudio equilibrado: crece con cabeza, DLC honesto, cuida al equipo. */
export const STUDIO: Philosophy = {
  name: 'estudio equilibrado',
  priceMult: 1,
  aggressiveness: 0,
  useLootBoxes: false,
  useDlc: true,
  care: true,
  teamTargetByEra: [1, 3, 5, 7, 9, 11, 12],
  sizeAmbition: 'media',
  crisisResponse: 'corporativo',
  dilemma: { leakAlpha: 'transparencia', sobreHype: 'moderar' },
};

/** Tamaños de menor a mayor: para bajar al mayor permitido por el gate (E1). */
const SIZE_ORDER: readonly ProjectSize[] = ['pequeno', 'mediano', 'grande', 'aaa'];

/**
 * Tamaño de proyecto según ambición, era, plantilla y caja: los arquetipos
 * crecen en TAMAÑO con las eras (docs/02 §6: un AAA de E6 dura años), no en
 * cadencia. El indie de culto se queda en pequeño/mediano por identidad. El
 * tamaño deseado se BAJA al mayor permitido por el gate (docs/17 E1: coste base,
 * plantilla y etapa mínimas), así el bot nunca intenta un tamaño bloqueado —
 * como un jugador que ve el AAA atenuado hasta ser Corporación.
 */
function pickSize(state: GameState, phil: Philosophy): ProjectSize {
  const staff = state.staff.length;
  const capital = state.studio.capital;
  const era = eraIndex(state.era);
  let desired: ProjectSize = 'pequeno';
  if (phil.sizeAmbition === 'aaa' && era >= 4 && staff >= 12 && capital > 600_000) {
    desired = 'aaa';
  } else if (phil.sizeAmbition !== 'indie' && era >= 2 && staff >= 6 && capital > 200_000) {
    desired = 'grande';
  } else if (era >= 1 && staff >= 2 && capital > 40_000) {
    desired = 'mediano';
  }
  for (let i = SIZE_ORDER.indexOf(desired); i >= 0; i--) {
    if (sizeBlockReason(state, SIZE_ORDER[i]) === null) return SIZE_ORDER[i];
  }
  return 'pequeno';
}

/**
 * Semanas de respiro tras lanzar (parches, vacaciones, preproducción). Cortas
 * a propósito: desde que el calendario es honesto, el desarrollo YA dura lo que
 * dura el tamaño (6–120 semanas) y la nómina corre mientras tanto. Quedarse
 * parado medio año más es tirar el dinero; el descanso real lo gobierna la
 * energía (REST_TO_START), no un respiro fijo.
 */
const BREATHER_BY_SIZE: Record<ProjectSize, number> = {
  pequeno: 2,
  mediano: 3,
  grande: 4,
  aaa: 6,
};

/** true si el estudio sigue de respiro tras su último lanzamiento. */
function onBreather(state: GameState): boolean {
  const last = state.releasedGames[state.releasedGames.length - 1];
  if (!last) return false;
  return state.week - last.releaseWeek < BREATHER_BY_SIZE[last.size];
}

/** Monetización del arquetipo adaptada a la era y a la ley (docs/09 §9). */
function pickMonetization(state: GameState, phil: Philosophy): MonetizationConfig {
  const models = availableMonetizationModels(state).map((m) => m.id);
  if (phil.aggressiveness > 0 && models.includes('premium+mtx')) {
    return {
      model: 'premium+mtx',
      aggressiveness: phil.aggressiveness,
      hasLootBoxes:
        phil.useLootBoxes &&
        monetizationFlagAvailable(state, 'lootBoxes') &&
        !lootBoxesBanned(state),
      hasBattlePass: false,
      dayOneDLC: false,
    };
  }
  if (phil.useDlc && models.includes('premium+dlc')) {
    return {
      model: 'premium+dlc',
      aggressiveness: 0,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    };
  }
  return {
    model: 'premium',
    aggressiveness: 0,
    hasLootBoxes: false,
    hasBattlePass: false,
    dayOneDLC: false,
  };
}

/** ¿El combo tema×género se lanzó dentro de la ventana de refrito? */
function isRehash(state: GameState, themeId: string, genreId: string): boolean {
  const windowStart = state.week - balance.moral.rehashWindowWeeks;
  return state.releasedGames.some(
    (g) => g.themeId === themeId && g.genreId === genreId && g.releaseWeek >= windowStart,
  );
}

/** Empieza el siguiente juego del bot: mejor combo fresco + features al alcance. */
function startNextGame(state: GameState, phil: Philosophy, gameNumber: number): GameState {
  // Como un jugador mirando el medidor de Fit (docs/03 factor A): de los
  // combos tema×género frescos (sin refrito), el de mejor fit. Determinista.
  let combo: { themeId: string; genreId: string } | null = null;
  let bestFit = -1;
  for (const theme of availableThemes(state)) {
    for (const genre of availableGenres(state)) {
      if (isRehash(state, theme.id, genre.id)) continue;
      const { fit } = computeFit({
        themeId: theme.id,
        genreId: genre.id,
        platformId: 'pcCasero',
        audience: 'amplio',
      });
      if (fit > bestFit) {
        bestFit = fit;
        combo = { themeId: theme.id, genreId: genre.id };
      }
    }
  }
  if (combo === null) return state; // sin combo fresco: espera una semana

  const size = pickSize(state, phil);
  const recommended = balance.economy.priceBySize[size];
  let next = startProject(state, {
    name: `${phil.name} ${gameNumber + 1}`,
    themeId: combo.themeId,
    genreId: combo.genreId,
    platformId: 'pcCasero',
    audience: 'amplio',
    size,
    price: Math.round(recommended * phil.priceMult),
    monetization: pickMonetization(state, phil),
  });

  // Features hasta el objetivo de alcance del tamaño (docs/03 factor C),
  // mejores primero: misma regla para los tres bots (comparación justa).
  const project = next.projects[next.projects.length - 1];
  const target = balance.quality.featureScopeTarget[size];
  const pool = [...availableFeatures(next)].sort(
    (a, b) => b.qualityValue - a.qualityValue || a.id.localeCompare(b.id),
  );
  let scope = 0;
  for (const feature of pool) {
    if (scope >= target) break;
    next = toggleFeature(next, feature.id, project.id);
    scope += feature.qualityValue;
  }
  return next;
}

/** Contrata del pool si el arquetipo quiere crecer y la caja lo sostiene. */
function maybeHire(state: GameState, phil: Philosophy): GameState {
  const target = phil.teamTargetByEra[eraIndex(state.era)];
  if (state.studio.scaleStage < 2 || state.staff.length >= target) return state;
  if (state.candidates.length === 0) return state;
  // El más hábil en su especialidad, prefiriendo especialidades que faltan.
  const staffBySpec = new Map<string, number>();
  for (const e of state.staff) {
    staffBySpec.set(e.specialty, (staffBySpec.get(e.specialty) ?? 0) + 1);
  }
  const rank = (c: Employee) =>
    (staffBySpec.get(c.specialty) ?? 0) * 1000 - c.skills[c.specialty];
  const candidate = [...state.candidates].sort((a, b) => rank(a) - rank(b))[0];
  // Regla de prudencia compartida: contratar solo con ~medio año de nómina.
  const runwayAfter =
    state.studio.capital -
    hiringCost(candidate) -
    26 * (weeklyFixedCosts(state) + candidate.salary);
  if (runwayAfter < 0) return state;
  return hireCandidate(state, candidate.id);
}

/** Cuidado del equipo (formar/motivar): la palanca de integridad (docs/05 §6). */
function maybeCare(state: GameState, phil: Philosophy): GameState {
  if (!phil.care) return state;
  let next = state;
  if (next.week % 8 === 0 && next.studio.capital > 40_000) {
    const weakest = [...next.staff].sort(
      (a, b) => a.skills[a.specialty] - b.skills[b.specialty],
    )[0];
    next = trainEmployee(next, weakest.id, weakest.specialty);
  }
  if (next.studio.capital > 20_000) {
    const low = next.staff.find((e) => e.morale < 45);
    if (low) next = motivateEmployee(next, low.id, 'bonus');
  }
  return next;
}

/** Energía mínima de toda la plantilla para arrancar el siguiente juego. */
const REST_TO_START = 60;
/** Umbrales de rotación durante un proyecto: sale agotado, entra descansado. */
const ROTATE_OUT_ENERGY = 25;
const ROTATE_IN_ENERGY = 65;

/**
 * Gestión de energía como la haría un jugador (docs/05 §4): el que se agota
 * sale a descansar y el descansado vuelve al tajo. Sin esto, encadenar juegos
 * lleva a toda la plantilla al burnout — y eso es diseño, no un bug.
 */
function manageEnergy(state: GameState): GameState {
  const project = state.projects[0];
  if (!project) return state;
  let next = state;
  for (const employee of next.staff) {
    const assigned = next.projects[0].assignedStaff.includes(employee.id);
    if (assigned && employee.energy < ROTATE_OUT_ENERGY) {
      next = toggleAssignment(next, employee.id, project.id);
    } else if (
      !assigned &&
      employee.energy >= ROTATE_IN_ENERGY &&
      !next.research.rdStaff.includes(employee.id)
    ) {
      next = toggleAssignment(next, employee.id, project.id);
    }
  }
  return next;
}

/**
 * Investigación del bot (misma regla los tres). Variedad primero pero con
 * mesura (docs/17 P1): un jugador listo desbloquea unos cuantos temas para no
 * repetirse (el refrito castiga) y luego destina los 💡 a las capacidades del
 * árbol. El bot NO paga el atajo predictivo (nodos `reveals`, docs/17 P2): ya
 * "ve" el mercado con computeFit, así que esas pistas no le aportan nada.
 */
function maybeResearch(state: GameState): GameState {
  // Capacidades primero: motores/QA/marketing componen ingreso y calidad, así
  // que rinden más que la variedad (un jugador listo invierte ahí antes). El
  // bot NO paga el atajo predictivo (nodos `reveals`, docs/17 P2): ya "ve" el
  // mercado con computeFit. Con los 💡 que sobren, desbloquea temas para no
  // repetirse (el refrito castiga, docs/17 P1).
  for (const node of researchNodes) {
    if (node.reveals) continue;
    if (researchNodeStatus(state, node.id) === 'disponible') {
      return buyResearch(state, node.id);
    }
  }
  const theme = researchableThemes(state)
    .filter((t) => themeResearchStatus(state, t.id) === 'disponible')
    .sort(
      (a, b) => themeResearchCost(a.id) - themeResearchCost(b.id) || a.id.localeCompare(b.id),
    )[0];
  if (theme) return researchTheme(state, theme.id);
  return state;
}

/** Un paso de decisiones del bot (sin tick): visible para diagnósticos. */
export function botDecide(state: GameState, phil: Philosophy, gamesStarted: number): {
  state: GameState;
  gamesStarted: number;
} {
  // 1. La capa social no espera: dilemas y crisis según el arquetipo.
  for (const dilemma of [...state.community.dilemmas]) {
    state = resolveDilemma(state, dilemma.kind, phil.dilemma[dilemma.kind]);
  }
  for (const crisis of state.community.crises.filter((c) => c.status === 'abierta')) {
    state = respondToCrisis(state, crisis.id, phil.crisisResponse);
  }
  // 2. Estudio: investigación, plantilla, cuidado y rotación de energía.
  state = maybeResearch(state);
  state = maybeHire(state, phil);
  state = maybeCare(state, phil);
  state = manageEnergy(state);
  // 3. Un juego en marcha casi siempre (docs/02 §2), pero entre juego y
  // juego el estudio respira (energía + semanas de respiro post-lanzamiento):
  // sin descanso, el burnout hunde la calidad — y eso es diseño.
  if (
    state.projects.length === 0 &&
    !onBreather(state) &&
    state.staff.every((e) => e.energy >= REST_TO_START)
  ) {
    const before = state.projects.length;
    state = startNextGame(state, phil, gamesStarted);
    if (state.projects.length > before) gamesStarted++;
  }
  return { state, gamesStarted };
}

/** Juega la partida completa con la filosofía dada (decisiones → tick). */
export function runFullGame(
  phil: Philosophy,
  onYear?: (state: GameState) => void,
): GameState {
  let state = createInitialState(BOT_SEED);
  let gamesStarted = 0;
  while (state.week < FINAL_WEEK && state.gameOver === null) {
    const step = botDecide(state, phil, gamesStarted);
    state = step.state;
    gamesStarted = step.gamesStarted;
    state = tick(state);
    if (onYear && state.week % 52 === 0) onYear(state);
  }
  return state;
}
