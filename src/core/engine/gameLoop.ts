/**
 * Control de velocidad/pausa del bucle de juego (docs/08 §4). TypeScript puro,
 * sin React: solo programa llamadas a `onTick` según la velocidad; la lógica
 * de avanzar el mundo vive en `tick()`.
 */

/** Velocidades de simulación [DECIDIDO, docs/02 §1]: 0 = pausa. */
export type Speed = 0 | 1 | 2 | 4;

export const SPEEDS: readonly Speed[] = [0, 1, 2, 4];

export interface GameLoop {
  getSpeed(): Speed;
  setSpeed(speed: Speed): void;
  /** Detiene el bucle y libera el timer (equivale a setSpeed(0)). */
  dispose(): void;
}

/**
 * Crea el bucle: a velocidad `s > 0` dispara `onTick` cada `baseTickMs / s`
 * milisegundos. `baseTickMs` viene de data/balance.ts (lo inyecta el store).
 */
export function createGameLoop(onTick: () => void, baseTickMs: number): GameLoop {
  let speed: Speed = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const clearTimer = (): void => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  return {
    getSpeed: () => speed,
    setSpeed(next) {
      if (next === speed) return;
      speed = next;
      clearTimer();
      if (next > 0) {
        timer = setInterval(onTick, baseTickMs / next);
      }
    },
    dispose() {
      speed = 0;
      clearTimer();
    },
  };
}
