/**
 * Avatar procedural determinista por semilla (docs/05 §1 y docs/10 §9):
 * SVG por capas (fondo, cara, pelo, camiseta) derivadas de un hash del
 * avatarSeed. Solo presentación: mismo seed → mismo avatar, sin PRNG de juego.
 */

const SKIN_TONES = ['#f2c9a0', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const HAIR_COLORS = ['#2f2f2f', '#5b3a1e', '#a86b2d', '#c9c9c9', '#7b3f00', '#1f3a5f'];
const SHIRT_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899'];
const BG_COLORS = ['#1e293b', '#312e81', '#134e4a', '#4a044e', '#422006', '#0c4a6e'];

/** Hash simple y estable (FNV-1a) para derivar rasgos del avatar. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function Avatar({ seed, size = 48 }: { seed: string; size?: number }) {
  const h = hashSeed(seed);
  const skin = SKIN_TONES[h % SKIN_TONES.length];
  const hair = HAIR_COLORS[(h >> 3) % HAIR_COLORS.length];
  const shirt = SHIRT_COLORS[(h >> 6) % SHIRT_COLORS.length];
  const bg = BG_COLORS[(h >> 9) % BG_COLORS.length];
  const hairStyle = (h >> 12) % 4;
  const hasGlasses = (h >> 14) % 3 === 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`Avatar ${seed}`}
      className="shrink-0 rounded-md"
    >
      <rect width="48" height="48" rx="6" fill={bg} />
      {/* camiseta */}
      <path d="M10 48 q14 -14 28 0 z" fill={shirt} />
      {/* cara */}
      <circle cx="24" cy="22" r="11" fill={skin} />
      {/* pelo, 4 estilos */}
      {hairStyle === 0 && <path d="M13 22 a11 11 0 0 1 22 0 l-2 -6 -18 0 z" fill={hair} />}
      {hairStyle === 1 && <path d="M13 20 a11 11 0 0 1 22 0 q-11 -14 -22 0 z" fill={hair} />}
      {hairStyle === 2 && (
        <path d="M12 24 q-2 -16 12 -14 q14 -2 12 14 l-3 -8 q-9 4 -18 0 z" fill={hair} />
      )}
      {hairStyle === 3 && <ellipse cx="24" cy="13" rx="9" ry="4" fill={hair} />}
      {/* ojos */}
      <circle cx="20" cy="22" r="1.6" fill="#1f2937" />
      <circle cx="28" cy="22" r="1.6" fill="#1f2937" />
      {hasGlasses && (
        <g stroke="#1f2937" strokeWidth="1" fill="none">
          <circle cx="20" cy="22" r="3.4" />
          <circle cx="28" cy="22" r="3.4" />
          <path d="M23.4 22 h1.2" />
        </g>
      )}
      {/* boca */}
      <path d="M21 27 q3 2.4 6 0" stroke="#7c2d12" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
