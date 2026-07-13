/**
 * Tokens de movimiento en JS (docs/10 §4.2 [DECIDIDO · baseline v1]).
 *
 * Espejo exacto de las variables `--motion-*` / `--ease-*` de tokens.css para
 * las animaciones que corren en JS (framer-motion, canvas-confetti, rAF).
 * Cambiar un tiempo = tocar aquí Y en tokens.css bajo el mismo nombre.
 *
 * También vive aquí el presupuesto de partículas (docs/10 §4.3): las
 * celebraciones se degradan con elegancia en equipos lentos. Es configuración
 * de presentación, no balance de juego (por eso no está en data/balance.ts).
 */

/** Duraciones en milisegundos (rAF, setTimeout, CSS inline). */
export const motionMs = {
  instant: 80,
  fast: 140,
  base: 220,
  slow: 400,
  dramatic: 900,
} as const;

/** Duraciones en segundos (el formato que espera framer-motion). */
export const motionSec = {
  instant: motionMs.instant / 1000,
  fast: motionMs.fast / 1000,
  base: motionMs.base / 1000,
  slow: motionMs.slow / 1000,
  dramatic: motionMs.dramatic / 1000,
} as const;

/** Curvas de easing como bezier (formato framer-motion). */
export const ease: Record<'standard' | 'decel' | 'accel', [number, number, number, number]> = {
  standard: [0.2, 0, 0, 1],
  decel: [0, 0, 0, 1],
  accel: [0.3, 0, 1, 1],
};

/** Spring de elementos "vivos" (docs/10 §4.2): pops, balanzas, recompensas. */
export const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

/**
 * Escala del presupuesto de partículas según la máquina (docs/10 §4.3):
 * 1 en equipos holgados, menos partículas en equipos modestos, 0 si no hay
 * entorno de navegador. Los emisores multiplican su recuento por esto.
 */
export function particleScale(): number {
  if (typeof navigator === 'undefined') return 0;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (cores >= 8) return 1;
  if (cores >= 4) return 0.6;
  return 0.35;
}

/** Vida de un toast de notificación antes de auto-descartarse (docs/10 §6). */
export const TOAST_HOLD_MS = 4500;

/** Máximo de toasts apilados a la vez (densidad gestionada, docs/10 §1). */
export const TOASTS_MAX = 4;
