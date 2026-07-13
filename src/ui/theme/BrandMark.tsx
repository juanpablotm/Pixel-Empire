/**
 * Marca de Pixel Empire (Fase 7A, brand/README.md): corona pixelada + wordmark
 * mono en minúsculas con el "empire" dorado y el cuadrado verde "greenlight".
 * Solo presentación; los colores salen de los tokens (el dorado es del eje
 * Capital, docs/10 §2).
 */

/** Path de la corona pixelada (brand/pixel-empire-mark.svg). */
export const CROWN_PATH =
  'M0,8 L12,8 L12,16 L18,16 L18,0 L30,0 L30,16 L36,16 L36,8 L48,8 L48,36 L0,36 Z';

/**
 * La corona descompuesta en bloques "píxel" (misma silueta que CROWN_PATH),
 * en orden de montaje de abajo arriba y del centro afuera: la pantalla de
 * título (Fase 7F) la ensambla bloque a bloque con un delay por índice.
 */
const CROWN_BLOCKS: ReadonlyArray<{ x: number; y: number; w: number; h: number }> = [
  // Fila inferior de la base
  { x: 18, y: 26, w: 6, h: 10 }, { x: 24, y: 26, w: 6, h: 10 },
  { x: 12, y: 26, w: 6, h: 10 }, { x: 30, y: 26, w: 6, h: 10 },
  { x: 6, y: 26, w: 6, h: 10 }, { x: 36, y: 26, w: 6, h: 10 },
  { x: 0, y: 26, w: 6, h: 10 }, { x: 42, y: 26, w: 6, h: 10 },
  // Fila superior de la base
  { x: 18, y: 16, w: 6, h: 10 }, { x: 24, y: 16, w: 6, h: 10 },
  { x: 12, y: 16, w: 6, h: 10 }, { x: 30, y: 16, w: 6, h: 10 },
  { x: 6, y: 16, w: 6, h: 10 }, { x: 36, y: 16, w: 6, h: 10 },
  { x: 0, y: 16, w: 6, h: 10 }, { x: 42, y: 16, w: 6, h: 10 },
  // Torres laterales y central
  { x: 18, y: 8, w: 6, h: 8 }, { x: 24, y: 8, w: 6, h: 8 },
  { x: 6, y: 8, w: 6, h: 8 }, { x: 36, y: 8, w: 6, h: 8 },
  { x: 0, y: 8, w: 6, h: 8 }, { x: 42, y: 8, w: 6, h: 8 },
  // Pico central
  { x: 18, y: 0, w: 6, h: 8 }, { x: 24, y: 0, w: 6, h: 8 },
];

/** Milisegundos entre bloques del ensamblaje de la corona del título. */
const CROWN_STAGGER_MS = 45;

/**
 * Corona pixelada grande para la pantalla de título (Fase 7F): la misma
 * silueta, ensamblada bloque a bloque (clase .title-pixel, ui/index.css).
 * Con `animated=false` (movimiento reducido) se dibuja entera al instante.
 */
export function PixelCrown({
  size = 168,
  animated = false,
  className = '',
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 36"
      width={size}
      height={(size * 36) / 48}
      role="img"
      aria-label="Emblema Pixel Empire"
      shapeRendering="crispEdges"
      className={`shrink-0 ${className}`}
    >
      {CROWN_BLOCKS.map((b, i) => (
        <rect
          key={`${b.x}-${b.y}`}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          className={`fill-capital ${animated ? 'title-pixel' : ''}`}
          style={animated ? { animationDelay: `${i * CROWN_STAGGER_MS}ms` } : undefined}
        />
      ))}
    </svg>
  );
}

/** La corona pixelada (path de brand/pixel-empire-mark.svg). */
export function BrandMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 36"
      width={size}
      height={(size * 36) / 48}
      role="img"
      aria-label="Emblema Pixel Empire"
      className={`shrink-0 ${className}`}
    >
      <path d={CROWN_PATH} className="fill-capital" />
    </svg>
  );
}

/** Lockup horizontal: corona + wordmark + descriptor (para el HUD). */
export function BrandLockup() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <div className="flex flex-col leading-none">
        <span className="font-mono text-base font-semibold tracking-wide text-ink-hi">
          pixel<span className="text-capital"> empire</span>
        </span>
        <span className="mt-1 flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.28em] text-ink-faint">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-[2px] bg-action-hi" />
          game studio tycoon
        </span>
      </div>
    </div>
  );
}
