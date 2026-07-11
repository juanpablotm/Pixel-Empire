import { createFounder, type GameState } from '../core';

/**
 * Serialización y carga de partidas (docs/08 §7): JSON plano + localStorage,
 * con `saveVersion` y migraciones para cambios futuros de esquema.
 */

export const SAVE_VERSION = 3;
export const SAVE_STORAGE_KEY = 'pixel-empire:save';

/** Formato del guardado: el GameState envuelto con metadatos de versión. */
export interface SaveFile {
  saveVersion: number;
  state: GameState;
}

/**
 * Migraciones: la entrada N transforma un save de versión N a N+1.
 * Al cambiar el esquema de GameState: subir SAVE_VERSION y añadir aquí la
 * migración desde la versión anterior.
 */
const migrations: Record<number, (file: SaveFile) => SaveFile> = {
  // v1 (Fase 0) → v2 (Fase 1): aparecen proyectos, juegos lanzados, historial y game over.
  1: (file) => ({
    saveVersion: 2,
    state: {
      ...file.state,
      projects: [],
      releasedGames: [],
      projectCounter: 0,
      negativeWeeks: 0,
      gameOver: null,
      log: [],
    },
  }),
  // v2 (Fase 1) → v3 (Fase 2): plantilla con el fundador, pool de candidatos,
  // etapa de escala y asignación/crunch en los proyectos.
  2: (file) => {
    const founder = createFounder(file.state.seed);
    return {
      saveVersion: 3,
      state: {
        ...file.state,
        studio: { ...file.state.studio, scaleStage: 1 },
        staff: [founder],
        candidates: [],
        projects: file.state.projects.map((p) => ({
          ...p,
          assignedStaff: [founder.id],
          crunch: false,
        })),
      },
    };
  },
};

function isSaveFile(value: unknown): value is SaveFile {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as Record<string, unknown>;
  if (typeof file['saveVersion'] !== 'number') return false;
  const state = file['state'];
  if (typeof state !== 'object' || state === null) return false;
  const s = state as Record<string, unknown>;
  return typeof s['seed'] === 'number' && typeof s['week'] === 'number';
}

export function serializeSave(state: GameState): string {
  const file: SaveFile = { saveVersion: SAVE_VERSION, state };
  return JSON.stringify(file);
}

export function deserializeSave(json: string): GameState {
  const parsed: unknown = JSON.parse(json);
  if (!isSaveFile(parsed)) {
    throw new Error('Guardado inválido: formato desconocido');
  }
  let file = parsed;
  if (file.saveVersion > SAVE_VERSION) {
    throw new Error(
      `Guardado de una versión futura (v${file.saveVersion} > v${SAVE_VERSION})`,
    );
  }
  while (file.saveVersion < SAVE_VERSION) {
    const migrate = migrations[file.saveVersion];
    if (!migrate) {
      throw new Error(`No hay migración desde la versión v${file.saveVersion}`);
    }
    file = migrate(file);
  }
  return file.state;
}

export function saveToLocalStorage(state: GameState, key = SAVE_STORAGE_KEY): void {
  localStorage.setItem(key, serializeSave(state));
}

/** Devuelve el estado guardado, o null si no hay guardado. Lanza si está corrupto. */
export function loadFromLocalStorage(key = SAVE_STORAGE_KEY): GameState | null {
  const json = localStorage.getItem(key);
  return json === null ? null : deserializeSave(json);
}
