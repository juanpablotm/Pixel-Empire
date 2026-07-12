/**
 * Marca de Pixel Empire (Fase 7A, brand/README.md): corona pixelada + wordmark
 * mono en minúsculas con el "empire" dorado y el cuadrado verde "greenlight".
 * Solo presentación; los colores salen de los tokens (el dorado es del eje
 * Capital, docs/10 §2).
 */

/** Path de la corona pixelada (brand/pixel-empire-mark.svg). */
export const CROWN_PATH =
  'M0,8 L12,8 L12,16 L18,16 L18,0 L30,0 L30,16 L36,16 L36,8 L48,8 L48,36 L0,36 Z';

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
