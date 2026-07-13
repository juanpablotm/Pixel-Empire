import confetti from 'canvas-confetti';
import { motionDisabled } from './motion';
import { motionMs, particleScale } from './theme/motionTokens';

/**
 * Celebraciones con canvas-confetti (docs/10 §4.4 [DECIDIDO], Fase 7D).
 * Presentación pura: las dispara la UI al observar un cambio de estado
 * (nunca el tick del núcleo, docs/08). Con "Reducir animaciones" /
 * prefers-reduced-motion no se emite ni una partícula, y el recuento se
 * degrada con elegancia en equipos lentos (particleScale, docs/10 §4.3).
 */

/** Paleta festiva de marca (la misma que usaba el confeti CSS de la gala). */
const BRAND_COLORS = ['#5b8ef5', '#43b96f', '#a06bf0', '#f09a3f', '#e8b44a', '#eb6a6a'];

/** Oro de la gala de premios (el dorado queda reservado al eje Capital/gala). */
const GOLD_COLORS = ['#e8b44a', '#c9871f', '#e3b95e', '#f7f5ec'];

function burst(options: confetti.Options): void {
  if (motionDisabled()) return;
  // Doble cinturón: canvas-confetti también respeta la preferencia del SO.
  void confetti({ disableForReducedMotion: true, ...options });
}

/**
 * El hitazo (docs/10 §7.1): dos cañones laterales y un eco central, como un
 * final de gala. ~2×90+55 partículas a escala 1.
 */
export function celebrateHit(): void {
  const count = Math.round(90 * particleScale());
  if (count === 0) return;
  burst({ particleCount: count, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors: BRAND_COLORS });
  burst({ particleCount: count, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors: BRAND_COLORS });
  window.setTimeout(() => {
    burst({
      particleCount: Math.round(count * 0.6),
      spread: 110,
      startVelocity: 38,
      origin: { x: 0.5, y: 0.35 },
      colors: BRAND_COLORS,
    });
  }, motionMs.dramatic);
}

/**
 * La gala anual de premios (docs/06 §7): una lluvia dorada, más ceremonia
 * que fiesta. ~70 partículas a escala 1.
 */
export function celebrateAwards(): void {
  const count = Math.round(70 * particleScale());
  if (count === 0) return;
  burst({
    particleCount: count,
    spread: 90,
    startVelocity: 30,
    gravity: 0.85,
    scalar: 0.9,
    origin: { x: 0.5, y: 0.3 },
    colors: GOLD_COLORS,
  });
}
