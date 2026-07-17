import { balance } from '../../data/balance';
import { squadTexts } from '../../data/staffTexts';
import { appendLog } from '../engine/log';
import type { GameState } from '../model/gameState';
import type { Squad } from '../model/squad';

/**
 * Subequipos y asignación en bloque (docs/18 V5). Con 25–100 empleados y hasta
 * 8 proyectos en paralelo (docs/02 §4), asignar persona a persona es un
 * engorro: esto agrupa gente bajo un nombre y la mueve de una acción.
 *
 * Regla que no se rompe: los subequipos son COMODIDAD, no simulación. Nada del
 * rendimiento (output, química, teamFactor, burnout) los lee; siguen contando
 * las personas reales de `Project.assignedStaff`. Asignar un subequipo es
 * exactamente asignar a sus miembros uno por uno, en una sola acción.
 *
 * Funciones puras; todo número de balance vive en data/balance.ts.
 */

/** Los subequipos son ruido hasta que hay gente y proyectos que repartir. */
export function squadsUnlocked(state: GameState): boolean {
  return state.studio.scaleStage >= balance.staff.squads.minStage;
}

/** Lectura segura: los saves previos no traen el campo (docs/08 §7). */
export function getSquads(state: GameState): Squad[] {
  return state.squads ?? [];
}

/** El subequipo de un empleado, si está en alguno. */
export function squadOf(state: GameState, employeeId: string): Squad | null {
  return getSquads(state).find((s) => s.memberIds.includes(employeeId)) ?? null;
}

function requireSquad(state: GameState, squadId: string): Squad {
  const squad = getSquads(state).find((s) => s.id === squadId);
  if (!squad) throw new Error(`Subequipo desconocido: ${squadId}`);
  return squad;
}

function requireName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') throw new Error(squadTexts.needsName);
  return trimmed;
}

/**
 * Miembros que siguen en plantilla, en el orden del subequipo. Los subequipos
 * se sanean al despedir/renunciar (`dropFromSquads`), pero un save manipulado o
 * una migración podrían dejar ids muertos: leerlos así los ignora sin romper.
 */
export function squadMembers(state: GameState, squad: Squad): string[] {
  const alive = new Set(state.staff.map((e) => e.id));
  return squad.memberIds.filter((id) => alive.has(id));
}

function withSquads(state: GameState, squads: Squad[]): GameState {
  return { ...state, squads };
}

/** Acción: crear un subequipo vacío o con miembros iniciales. */
export function createSquad(state: GameState, name: string, memberIds: string[] = []): GameState {
  const squads = getSquads(state);
  if (squads.length >= balance.staff.squads.maxSquads) {
    throw new Error(squadTexts.tooMany(balance.staff.squads.maxSquads));
  }
  const clean = requireName(name);
  for (const id of memberIds) requireStaff(state, id);

  const squad: Squad = { id: `subequipo-${nextSquadNumber(squads)}`, name: clean, memberIds: [] };
  // Los miembros entran por setSquadMembers: un empleado, un subequipo.
  const next = withSquads(state, [...squads, squad]);
  return memberIds.length > 0
    ? setSquadMembers(next, squad.id, memberIds)
    : appendLog(next, 'staff', squadTexts.created(clean));
}

function requireStaff(state: GameState, employeeId: string): void {
  if (!state.staff.some((e) => e.id === employeeId)) {
    throw new Error(`Empleado desconocido: ${employeeId}`);
  }
}

/** Id determinista y estable: el menor número libre (docs/08 §2, sin RNG). */
function nextSquadNumber(squads: Squad[]): number {
  const used = new Set(squads.map((s) => s.id));
  let n = 1;
  while (used.has(`subequipo-${n}`)) n += 1;
  return n;
}

/** Acción: renombrar un subequipo. */
export function renameSquad(state: GameState, squadId: string, name: string): GameState {
  requireSquad(state, squadId);
  const clean = requireName(name);
  return withSquads(
    state,
    getSquads(state).map((s) => (s.id === squadId ? { ...s, name: clean } : s)),
  );
}

/**
 * Acción: fijar los miembros de un subequipo (añadir/quitar en una pasada).
 * Un empleado pertenece a un subequipo como mucho: entrar en este lo saca del
 * anterior. NO toca asignaciones de proyecto ni de I+D — agrupar no es asignar.
 */
export function setSquadMembers(state: GameState, squadId: string, memberIds: string[]): GameState {
  requireSquad(state, squadId);
  for (const id of memberIds) requireStaff(state, id);
  const members = [...new Set(memberIds)];
  const incoming = new Set(members);

  return withSquads(
    state,
    getSquads(state).map((s) =>
      s.id === squadId
        ? { ...s, memberIds: members }
        : // Exclusividad: quien entra aquí sale de cualquier otro subequipo.
          s.memberIds.some((id) => incoming.has(id))
          ? { ...s, memberIds: s.memberIds.filter((id) => !incoming.has(id)) }
          : s,
    ),
  );
}

/** Acción: disolver un subequipo. No despide ni desasigna a nadie. */
export function disbandSquad(state: GameState, squadId: string): GameState {
  const squad = requireSquad(state, squadId);
  const next = withSquads(
    state,
    getSquads(state).filter((s) => s.id !== squadId),
  );
  return appendLog(next, 'staff', squadTexts.disbanded(squad.name));
}

/**
 * Saneado: sacar a empleados que ya no están (despido, renuncia) de todos los
 * subequipos. Se llama donde ya se les saca de assignedStaff y rdStaff, para
 * que no queden ids muertos. Si el estado no tiene subequipos, no toca nada.
 */
export function dropFromSquads(state: GameState, employeeIds: readonly string[]): GameState {
  if (state.squads === undefined || employeeIds.length === 0) return state;
  const gone = new Set(employeeIds);
  return withSquads(
    state,
    state.squads.map((s) =>
      s.memberIds.some((id) => gone.has(id))
        ? { ...s, memberIds: s.memberIds.filter((id) => !gone.has(id)) }
        : s,
    ),
  );
}

/**
 * Acción: asignar un subequipo ENTERO a un proyecto de una sola vez (docs/18
 * V5). Aplica a cada miembro la misma regla que `toggleAssignment`: nadie está
 * en dos sitios a la vez, así que entrar aquí lo saca de cualquier otro
 * proyecto y de I+D. Sin duplicados y con un único log.
 */
export function assignSquadToProject(
  state: GameState,
  squadId: string,
  projectId: string,
): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const squad = requireSquad(state, squadId);
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) throw new Error('No hay proyecto en desarrollo');

  const members = squadMembers(state, squad);
  if (members.length === 0) throw new Error(squadTexts.emptySquad);
  const incoming = new Set(members);

  const next: GameState = {
    ...state,
    projects: state.projects.map((p) => {
      if (p.id === project.id) {
        const already = new Set(p.assignedStaff);
        return {
          ...p,
          assignedStaff: [...p.assignedStaff, ...members.filter((id) => !already.has(id))],
        };
      }
      // Nadie en dos proyectos a la vez: los que vienen salen de los demás.
      return p.assignedStaff.some((id) => incoming.has(id))
        ? { ...p, assignedStaff: p.assignedStaff.filter((id) => !incoming.has(id)) }
        : p;
    }),
    research: {
      ...state.research,
      rdStaff: state.research.rdStaff.filter((id) => !incoming.has(id)),
    },
  };
  return appendLog(
    next,
    'staff',
    squadTexts.assigned(squad.name, members.length, project.name),
  );
}

/**
 * Acción: retirar a TODO el equipo de un proyecto (docs/18 V5). Es el
 * contrapeso del crunch (docs/05 §4): al quedarse sin proyecto ni I+D, esa
 * gente pasa a DESCANSAR y recupera energía y moral cada semana en
 * `advanceStaff` — no hace falta un estado de "descansando", descansar ES no
 * estar asignado.
 *
 * El proyecto se PAUSA, no se cancela: sin nadie trabajando no avanza
 * (`advanceOneProject`), y al reasignar continúa donde estaba. También se apaga
 * el crunch: no hay a quién crunchear, y así no revive por sorpresa al volver.
 */
export function withdrawTeam(state: GameState, projectId: string): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) throw new Error('No hay proyecto en desarrollo');
  if (project.assignedStaff.length === 0) return state;

  const resting = project.assignedStaff.length;
  const next: GameState = {
    ...state,
    projects: state.projects.map((p) =>
      p.id === project.id ? { ...p, assignedStaff: [], crunch: false } : p,
    ),
  };
  return appendLog(next, 'staff', squadTexts.withdrawn(resting, project.name));
}
