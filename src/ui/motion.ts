import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useGameStore } from '../state/store';

/**
 * Utilidades de movimiento (docs/10 §4): tweens con requestAnimationFrame,
 * SIEMPRE desacoplados del tick del núcleo (docs/08). Son presentación pura:
 * interpolan hacia valores que ya viven en el estado, nunca los calculan.
 *
 * Si el usuario pide menos movimiento (prefers-reduced-motion o el toggle
 * "Reducir animaciones", Fase 7D) o el entorno no anima (jsdom en tests: sin
 * matchMedia ni rAF fiables), los valores saltan directamente a su destino —
 * el contenido final es idéntico.
 */

/** Preferencia del SO (`prefers-reduced-motion`); false si no hay matchMedia. */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * true si el usuario pide menos movimiento: el toggle propio "Reducir
 * animaciones" (store) o la preferencia del sistema. Es la señal que estampa
 * `data-motion` en la raíz (las reglas CSS cuelgan de ese atributo).
 */
export function reducedMotionPreferred(): boolean {
  return useGameStore.getState().reduceMotion || prefersReducedMotion();
}

/** true si las animaciones JS deben saltarse (preferencia o entorno de test). */
export function motionDisabled(): boolean {
  if (typeof window === 'undefined') return true;
  if (typeof window.requestAnimationFrame !== 'function') return true;
  if (typeof window.matchMedia !== 'function') return true;
  return reducedMotionPreferred();
}

/** Suscripción combinada: cambia el store o la media query → re-evaluar. */
function subscribeReducedMotion(onChange: () => void): () => void {
  const unsubscribe = useGameStore.subscribe(onChange);
  const query =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  query?.addEventListener('change', onChange);
  return () => {
    unsubscribe();
    query?.removeEventListener('change', onChange);
  };
}

/**
 * Hook reactivo de `reducedMotionPreferred()` (toggle ∨ preferencia del SO).
 * Para el atributo `data-motion` y variantes de presentación.
 */
export function useReducedMotionPref(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, reducedMotionPreferred);
}

/** Hook reactivo de `motionDisabled()`: además apaga en entornos sin animación. */
export function useMotionDisabled(): boolean {
  return useReducedMotionPref() || motionDisabled();
}

/**
 * Contador que "rueda" hasta `target` (docs/10 §6) cuando `active` pasa a
 * true. Ease-out cúbico; con movimiento reducido devuelve `target` al
 * instante.
 */
export function useCountUpWhen(active: boolean, target: number, durationMs = 1300): number {
  const [value, setValue] = useState(() => (motionDisabled() ? target : 0));

  useEffect(() => {
    if (motionDisabled()) {
      setValue(target);
      return;
    }
    if (!active) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, durationMs]);

  return value;
}

/**
 * Suaviza un vector de valores hacia sus objetivos (radar de reputación,
 * medidores): easing exponencial por frame. Con movimiento reducido, los
 * valores saltan al objetivo.
 */
export function useEasedValues(targets: readonly number[], tau = 220): number[] {
  const key = targets.join('|');
  const [values, setValues] = useState<number[]>(() => [...targets]);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    if (motionDisabled()) {
      setValues([...targets]);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const k = 1 - Math.exp(-dt / tau);
      let done = true;
      const next = valuesRef.current.map((v, i) => {
        const t = targets[i] ?? v;
        const nv = v + (t - v) * k;
        if (Math.abs(t - nv) > 0.2) done = false;
        return nv;
      });
      setValues(done ? [...targets] : next);
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key resume los objetivos
  }, [key, tau]);

  return values;
}

/** Hash estable FNV-1a para desfases y variantes deterministas por semilla. */
export function hashString(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Fracción 0..1 determinista derivada de una semilla (para delays CSS). */
export function hashFraction(seed: string): number {
  return (hashString(seed) % 1000) / 1000;
}
