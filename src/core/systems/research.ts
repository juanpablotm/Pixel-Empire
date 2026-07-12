import { balance } from '../../data/balance';
import { eraAtLeast } from '../../data/eras';
import { getResearchNode, researchNodes, researchNodeUnlocks } from '../../data/research';
import { appendLog } from '../engine/log';
import type { GameState } from '../model/gameState';
import type { ResearchState, StudioCapability } from '../model/research';

/**
 * Investigación (docs/02 §3): puntos 💡 por persona·semana en I+D y por
 * lanzar juegos; se gastan en el árbol de data/research.ts, gateado por era.
 * Los nodos dan capacidades de estudio (bonus aplicados en los sistemas) o
 * desbloquean contenido (géneros/features con `requiresResearch`).
 */

export function initialResearchState(): ResearchState {
  return { points: 0, unlocked: [], rdStaff: [] };
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
  return {
    ...state,
    research: { ...state.research, rdStaff: [...state.research.rdStaff, employeeId] },
    projects: state.projects.map((p) =>
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
