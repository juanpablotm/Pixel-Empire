import { balance } from '../../data/balance';
import { eraAtLeast } from '../../data/eras';
import { getGenre } from '../../data/genres';
import { getResearchNode, researchNodes, researchNodeUnlocks } from '../../data/research';
import { getTheme } from '../../data/themes';
import { appendLog } from '../engine/log';
import type { GameState } from '../model/gameState';
import type { MarketKnowledge, ResearchState, StudioCapability } from '../model/research';
import { dropFromLiveServices } from './liveService';

/**
 * Investigación (docs/02 §3): puntos 💡 por persona·semana en I+D y por
 * lanzar juegos; se gastan en el árbol de data/research.ts, gateado por era.
 * Los nodos dan capacidades de estudio (bonus aplicados en los sistemas),
 * desbloquean contenido (géneros/features con `requiresResearch`) o revelan
 * conocimiento de mercado (docs/17 P2). Además, los temas se desbloquean con
 * 💡 (docs/17 P1). Todo puro; los datos viven en data/.
 */

export function initialResearchState(): ResearchState {
  return { points: 0, unlocked: [], rdStaff: [], themes: [], insights: [], featureInsights: [] };
}

/** Clave del combo para las pistas por combo (docs/17 P2): tema|género. */
export function insightKey(themeId: string, genreId: string): string {
  return `${themeId}|${genreId}`;
}

/** Bonus total de una capacidad de estudio (1 + Σ effects de los nodos comprados). */
export function capabilityBonus(state: GameState, capability: StudioCapability): number {
  return (
    1 +
    state.research.unlocked.reduce(
      (sum, id) => sum + (getResearchNode(id).effects?.[capability] ?? 0),
      0,
    )
  );
}

/** ¿Se puede investigar el nodo ahora? (era llegada, prerrequisitos, no repetido). */
export function researchNodeStatus(
  state: GameState,
  nodeId: string,
): 'comprado' | 'disponible' | 'sinPuntos' | 'bloqueado' {
  const node = getResearchNode(nodeId);
  if (state.research.unlocked.includes(nodeId)) return 'comprado';
  const eraOk = eraAtLeast(state.era, node.era);
  const prereqsOk = (node.requiresNodes ?? []).every((id) =>
    state.research.unlocked.includes(id),
  );
  if (!eraOk || !prereqsOk) return 'bloqueado';
  return state.research.points >= node.cost ? 'disponible' : 'sinPuntos';
}

/** Acción: gastar 💡 en un nodo del árbol (docs/02 §3). */
export function buyResearch(state: GameState, nodeId: string): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const node = getResearchNode(nodeId);
  const status = researchNodeStatus(state, nodeId);
  if (status === 'comprado') throw new Error(`${node.name} ya está investigado`);
  if (status === 'bloqueado') {
    throw new Error(`${node.name} aún no se puede investigar (era o requisitos pendientes)`);
  }
  if (status === 'sinPuntos') {
    throw new Error(`Faltan puntos de investigación (${node.cost} 💡 necesarios)`);
  }

  const next: GameState = {
    ...state,
    research: {
      ...state.research,
      points: state.research.points - node.cost,
      unlocked: [...state.research.unlocked, nodeId],
    },
  };
  const unlocks = researchNodeUnlocks(nodeId);
  const extras = [...unlocks.genres, ...unlocks.features];
  return appendLog(
    next,
    'investigacion',
    `💡 Investigado: ${node.name}.${extras.length > 0 ? ' Nuevo contenido desbloqueado.' : ''}`,
  );
}

// --- P1: Temas gateados por investigación (docs/17) ------------------------

/** ¿Un tema es libre desde el inicio? (balance.research.knowledge.starterThemes). */
export function isStarterTheme(themeId: string): boolean {
  return balance.research.knowledge.starterThemes.includes(themeId);
}

/** Coste en 💡 de investigar un tema, por la era en que se puede investigar. */
export function themeResearchCost(themeId: string): number {
  return balance.research.knowledge.themeCostByEra[getTheme(themeId).appearsInEra];
}

/**
 * Estado de un tema para la UI (docs/17 P1). 'usable' = ya puedes hacer juegos
 * con él (starter o investigado); el resto son estados de investigación.
 */
export function themeResearchStatus(
  state: GameState,
  themeId: string,
): 'usable' | 'disponible' | 'sinPuntos' | 'bloqueado' {
  const theme = getTheme(themeId);
  if (isStarterTheme(themeId) || (state.research.themes ?? []).includes(themeId)) return 'usable';
  if (!eraAtLeast(state.era, theme.appearsInEra)) return 'bloqueado';
  return state.research.points >= themeResearchCost(themeId) ? 'disponible' : 'sinPuntos';
}

/** Acción: gastar 💡 en desbloquear un tema (docs/17 P1). */
export function researchTheme(state: GameState, themeId: string): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const theme = getTheme(themeId);
  if (isStarterTheme(themeId)) throw new Error(`${theme.name} ya es un tema libre`);
  if ((state.research.themes ?? []).includes(themeId)) {
    throw new Error(`${theme.name} ya está investigado`);
  }
  if (!eraAtLeast(state.era, theme.appearsInEra)) {
    throw new Error(`${theme.name} aún no se puede investigar en esta era`);
  }
  const cost = themeResearchCost(themeId);
  if (state.research.points < cost) {
    throw new Error(`Faltan puntos de investigación (${cost} 💡 necesarios)`);
  }
  const next: GameState = {
    ...state,
    research: {
      ...state.research,
      points: state.research.points - cost,
      themes: [...(state.research.themes ?? []), themeId],
    },
  };
  return appendLog(next, 'investigacion', `💡 Nuevo tema desbloqueado: ${theme.name}.`);
}

// --- P2: Conocimiento de mercado que se gana (docs/17) ---------------------

/** Qué facetas de conocimiento de mercado están reveladas globalmente (por nodos). */
export function marketKnowledge(state: GameState): Record<MarketKnowledge, boolean> {
  const revealed: Record<MarketKnowledge, boolean> = {
    fit: false,
    balance: false,
    price: false,
    featureFit: false,
  };
  for (const id of state.research.unlocked) {
    const reveals = getResearchNode(id).reveals;
    if (reveals) revealed[reveals] = true;
  }
  return revealed;
}

/**
 * Regla de revelado (docs/17 P2): **TODO empieza oculto**. Ninguna pista
 * predictiva se regala: el estudio novato de 1980 no sabe qué combina con qué,
 * cuánto vale un juego ni qué pide cada género. Se aprenden de dos formas:
 *   · investigando el **nodo global** de esa faceta (la revela para todo), o
 *   · lanzando un juego y pagando **"Investigar resultados"** de ese combo.
 * Aun con la pista oculta SIEMPRE se puede concebir y lanzar; y el **desglose
 * de reseña a posteriori nunca se paga** (Pilar 2, docs/03): de tus propios
 * juegos siempre aprendes. Descubrir es la mecánica, no un muro.
 */

/** ¿El precio recomendado es visible? (solo tras investigar Análisis de mercado). */
export function priceRevealed(state: GameState): boolean {
  return marketKnowledge(state).price;
}

/** ¿El Fit de un combo es preciso? (nodo global de fit O pista de ese combo). */
export function fitRevealed(state: GameState, themeId: string, genreId: string): boolean {
  if (marketKnowledge(state).fit) return true;
  return (state.research.insights ?? []).includes(insightKey(themeId, genreId));
}

/** ¿El balance ideal de un género es visible? (nodo global O pista de ese género). */
export function balanceRevealed(state: GameState, genreId: string): boolean {
  if (marketKnowledge(state).balance) return true;
  return (state.research.insights ?? []).some((key) => key.split('|')[1] === genreId);
}

/** ¿Ya se aprendió la pista predictiva de este combo lanzado? */
export function insightKnown(state: GameState, themeId: string, genreId: string): boolean {
  return (state.research.insights ?? []).includes(insightKey(themeId, genreId));
}

// --- 9.3: el encaje feature×género se gana (docs/19 §9.3) -------------------

/** Clave del encaje conocido de una feature con un género: feature|género. */
export function featureInsightKey(featureId: string, genreId: string): string {
  return `${featureId}|${genreId}`;
}

/**
 * ¿Se conoce el ENCAJE de esta feature con este género? (badge verde/ámbar/
 * rojo al elegir features, 9.3). Global con el nodo 'teoriaDiseno', u
 * orgánico: lanzaste un juego de ese género con esa feature y el desglose te
 * lo contó (Pilar 2) — ese conocimiento ya es tuyo. Nunca se muestra el
 * número, solo la banda.
 */
export function featureFitRevealed(state: GameState, featureId: string, genreId: string): boolean {
  if (marketKnowledge(state).featureFit) return true;
  return (state.research.featureInsights ?? []).includes(featureInsightKey(featureId, genreId));
}

/**
 * Aprendizaje orgánico al lanzar (9.3): el desglose nombra qué features
 * encajaban con el género y cuáles no, así que sus encajes quedan conocidos.
 * Gratis y silencioso — es la vía "aprendes de tus propios juegos" de 8.4.
 */
export function learnFeatureInsights(
  state: GameState,
  featureIds: readonly string[],
  genreId: string,
): GameState {
  const known = state.research.featureInsights ?? [];
  const learned = featureIds
    .map((id) => featureInsightKey(id, genreId))
    .filter((key) => !known.includes(key));
  if (learned.length === 0) return state;
  return {
    ...state,
    research: { ...state.research, featureInsights: [...known, ...learned] },
  };
}

/**
 * Acción: "Investigar resultados" de un juego lanzado (docs/17 P2). Gasta 💡 y
 * aprende el atajo predictivo de esa combinación: el fit del combo tema×género
 * y el balance ideal de ese género quedan visibles antes de lanzar la próxima
 * vez. El desglose de reseña a posteriori NO se paga (Pilar 2): siempre fue
 * legible; esto solo compra saberlo por adelantado.
 */
export function researchInsight(state: GameState, gameId: string): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const game = state.releasedGames.find((g) => g.id === gameId);
  if (!game) throw new Error(`Juego lanzado desconocido: ${gameId}`);
  if (insightKnown(state, game.themeId, game.genreId)) {
    throw new Error('Ya conoces esta combinación');
  }
  const cost = balance.research.knowledge.insightCost;
  if (state.research.points < cost) {
    throw new Error(`Faltan puntos de investigación (${cost} 💡 necesarios)`);
  }
  const next: GameState = {
    ...state,
    research: {
      ...state.research,
      points: state.research.points - cost,
      insights: [...(state.research.insights ?? []), insightKey(game.themeId, game.genreId)],
    },
  };
  return appendLog(
    next,
    'investigacion',
    `💡 Aprendes la lección de «${game.name}»: dominas ${getTheme(game.themeId).name} + ${getGenre(game.genreId).name}.`,
  );
}

/**
 * Acción: mover a un empleado dentro/fuera de I+D. Entrar en I+D lo retira de
 * todos los proyectos (nadie está en dos sitios a la vez).
 */
export function toggleResearchAssignment(state: GameState, employeeId: string): GameState {
  if (!state.staff.some((e) => e.id === employeeId)) {
    throw new Error(`Empleado desconocido: ${employeeId}`);
  }
  const assigned = state.research.rdStaff.includes(employeeId);
  if (assigned) {
    return {
      ...state,
      research: {
        ...state.research,
        rdStaff: state.research.rdStaff.filter((id) => id !== employeeId),
      },
    };
  }
  // Al pasar a I+D sale del proyecto y de cualquier servicio en vivo (9.7):
  // nadie está en dos sitios a la vez.
  const base = dropFromLiveServices(state, [employeeId]);
  return {
    ...base,
    research: { ...base.research, rdStaff: [...base.research.rdStaff, employeeId] },
    projects: base.projects.map((p) =>
      p.assignedStaff.includes(employeeId)
        ? { ...p, assignedStaff: p.assignedStaff.filter((id) => id !== employeeId) }
        : p,
    ),
  };
}

/** 💡 al lanzar un juego, por tamaño (docs/02 §3: "al desarrollar juegos"). */
export function addReleaseResearchPoints(
  state: GameState,
  size: keyof typeof balance.research.releasePointsBySize,
): GameState {
  const points = balance.research.releasePointsBySize[size];
  return {
    ...state,
    research: { ...state.research, points: state.research.points + points },
  };
}

/**
 * Tick semanal: ~1 💡 por persona·semana en I+D [DECIDIDO, docs/12 §6],
 * acelerado por la capacidad researchSpeed. Los empleados que ya no existen
 * (renuncias, despidos) se limpian de la asignación.
 */
export function advanceResearch(state: GameState): GameState {
  const staffIds = new Set(state.staff.map((e) => e.id));
  const rdStaff = state.research.rdStaff.filter((id) => staffIds.has(id));
  if (rdStaff.length === 0) {
    return rdStaff.length === state.research.rdStaff.length
      ? state
      : { ...state, research: { ...state.research, rdStaff } };
  }

  const gained =
    rdStaff.length *
    balance.research.pointsPerPersonWeek *
    capabilityBonus(state, 'researchSpeed');
  return {
    ...state,
    research: {
      ...state.research,
      rdStaff,
      points: Math.round((state.research.points + gained) * 100) / 100,
    },
  };
}

/** Nodos visibles en el árbol para la UI (todos; el estado dice cuáles se pueden). */
export function allResearchNodes(): typeof researchNodes {
  return researchNodes;
}
