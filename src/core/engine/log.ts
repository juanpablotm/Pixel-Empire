import { balance } from '../../data/balance';
import type { GameState, LogEntry } from '../model/gameState';

/** Añade una entrada al historial sin mutar el estado, recortando al máximo configurado. */
export function appendLog(state: GameState, type: LogEntry['type'], text: string): GameState {
  const entry: LogEntry = { week: state.week, type, text };
  const log = [...state.log, entry].slice(-balance.time.logMaxEntries);
  return { ...state, log };
}
