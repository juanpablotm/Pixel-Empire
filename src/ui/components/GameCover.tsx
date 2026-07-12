import type { ReleasedGame } from '../../core';

/**
 * Portada procedural y compositiva (docs/10 §9): plantilla SVG + paleta por
 * género + motivo por tema + tipografía del título. Determinista a partir de
 * los datos del juego; sin assets externos.
 */

/** Paleta [fondo arriba, fondo abajo, tinta] por género; genérica si falta. */
const genrePalettes: Record<string, [string, string, string]> = {
  rpg: ['#312e81', '#1e1b4b', '#c7d2fe'],
  estrategia: ['#14532d', '#052e16', '#bbf7d0'],
  aventura: ['#7c2d12', '#431407', '#fed7aa'],
  puzzle: ['#155e75', '#083344', '#a5f3fc'],
  shooter: ['#7f1d1d', '#450a0a', '#fecaca'],
  plataformas: ['#a16207', '#713f12', '#fef08a'],
  simulacion: ['#334155', '#0f172a', '#cbd5e1'],
  deportivo: ['#166534', '#14532d', '#dcfce7'],
  carreras: ['#9f1239', '#4c0519', '#fecdd3'],
  terror: ['#18181b', '#09090b', '#a1a1aa'],
  gestion: ['#0c4a6e', '#082f49', '#bae6fd'],
  ritmo: ['#86198f', '#4a044e', '#f5d0fe'],
  sandbox: ['#3f6212', '#1a2e05', '#d9f99d'],
  battleRoyale: ['#c2410c', '#7c2d12', '#ffedd5'],
};

/** Motivo por tema (docs/10 §9); un glifo simple y reconocible. */
const themeMotifs: Record<string, string> = {
  fantasia: '🗡️',
  cienciaFiccion: '🛸',
  espacio: '🚀',
  deportes: '🏆',
  vida: '🏡',
  piratas: '🏴‍☠️',
  medieval: '🏰',
  militar: '🎖️',
  historia: '📜',
  zombis: '🧟',
  crimen: '🕵️',
  terrorSobrenatural: '👻',
  cyberpunk: '🌆',
  postApocaliptico: '☢️',
  superheroes: '🦸',
};

export function GameCover({ game, width = 96 }: { game: ReleasedGame; width?: number }) {
  const [top, bottom, ink] = genrePalettes[game.genreId] ?? ['#334155', '#0f172a', '#e2e8f0'];
  const motif = themeMotifs[game.themeId] ?? '🎮';
  const height = Math.round(width * 1.35);
  const gradId = `cover-${game.id}`;
  // Título en 1–2 líneas cortas (tipografía de la portada).
  const words = game.name.split(' ');
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 96 130"
      role="img"
      aria-label={`Portada de ${game.name}`}
      className="rounded-sm shadow-lg"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="100%" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="96" height="130" fill={`url(#${gradId})`} />
      <rect x="3" y="3" width="90" height="124" fill="none" stroke={ink} strokeOpacity="0.35" />
      <text x="48" y="62" textAnchor="middle" fontSize="34">
        {motif}
      </text>
      <text
        x="48"
        y="96"
        textAnchor="middle"
        fontSize={line1.length > 12 ? 8 : 10}
        fontWeight="bold"
        fill={ink}
      >
        {line1}
      </text>
      {line2 && (
        <text
          x="48"
          y="108"
          textAnchor="middle"
          fontSize={line2.length > 12 ? 8 : 10}
          fontWeight="bold"
          fill={ink}
        >
          {line2}
        </text>
      )}
      <text x="48" y="122" textAnchor="middle" fontSize="7" fill={ink} fillOpacity="0.7">
        {game.review}/100
      </text>
    </svg>
  );
}
