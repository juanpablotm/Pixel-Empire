import type { EraId } from '../../core';

/**
 * Arte hero por código (Fase 7G, docs/10 §9): pocas piezas flat SVG para los
 * momentos grandes — el splash de cada era (transición/beat, docs/10 §7.6),
 * la gala de premios y el fin de partida. Decorativas (aria-hidden), dibujadas
 * con tokens del tema para leerse sobre cualquier piel, y prescindibles: si
 * un día se sustituyen por ilustración externa, nada más cambia.
 *
 * Paleta: tinta del tema (--text-strong/--text-mute vía --hero-*) + el acento
 * de era (--skin-accent). El dorado queda reservado a la gala (eje Capital).
 */

const INK = 'var(--hero-ink, var(--text-strong))';
const DIM = 'var(--hero-dim, var(--text-mute))';
const FAINT = 'color-mix(in oklab, var(--hero-ink, var(--text-strong)) 16%, transparent)';
const ACCENT = 'var(--skin-accent, #34d399)';

interface SplashProps {
  era: EraId;
  className?: string;
}

/** Marco común: suelo + halo del acento; cada era pinta su escena encima. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ellipse cx="180" cy="120" rx="152" ry="22" fill={ACCENT} opacity="0.08" />
      <line x1="44" y1="120" x2="316" y2="120" stroke={FAINT} strokeWidth="2" />
      {children}
    </>
  );
}

/** E1 — La chispa: un garaje, un terminal de fósforo y cintas de casete. */
function GarageScene() {
  return (
    <Frame>
      {/* Puerta basculante del garaje, al fondo. */}
      {[18, 34, 50].map((y) => (
        <line key={y} x1="60" y1={y} x2="300" y2={y} stroke={FAINT} strokeWidth="3" />
      ))}
      {/* Mesa de trabajo. */}
      <rect x="96" y="92" width="168" height="7" rx="2" fill={DIM} />
      <rect x="106" y="99" width="7" height="21" fill={DIM} />
      <rect x="247" y="99" width="7" height="21" fill={DIM} />
      {/* CRT con prompt vivo. */}
      <rect x="146" y="40" width="72" height="50" rx="6" fill="none" stroke={INK} strokeWidth="4" />
      <rect x="154" y="48" width="56" height="34" rx="2" fill={ACCENT} opacity="0.14" />
      <rect x="159" y="55" width="26" height="4" rx="1" fill={ACCENT} />
      <rect x="159" y="63" width="36" height="4" rx="1" fill={ACCENT} opacity="0.7" />
      <rect x="159" y="71" width="5" height="6" fill={ACCENT} className="hero-blink" />
      <rect x="172" y="90" width="20" height="4" fill={INK} opacity="0.6" />
      {/* Cintas de casete apiladas. */}
      <rect x="112" y="84" width="26" height="8" rx="1.5" fill="none" stroke={DIM} strokeWidth="2.5" />
      <rect x="118" y="76" width="26" height="8" rx="1.5" fill="none" stroke={DIM} strokeWidth="2.5" />
      {/* Flexo encendido. */}
      <line x1="252" y1="92" x2="240" y2="66" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 232 66 L 248 60 L 252 72 Z" fill={INK} />
      <path d="M 236 70 L 214 92 L 246 92 Z" fill={ACCENT} opacity="0.16" />
    </Frame>
  );
}

/** E2 — Las consolas: la tele del salón, el pong y el mando con cable. */
function ConsoleScene() {
  return (
    <Frame>
      {/* Antena de cuernos. */}
      <line x1="180" y1="34" x2="164" y2="14" stroke={DIM} strokeWidth="3" strokeLinecap="round" />
      <line x1="180" y1="34" x2="198" y2="16" stroke={DIM} strokeWidth="3" strokeLinecap="round" />
      {/* Tele de sobremesa. */}
      <rect x="128" y="32" width="104" height="72" rx="8" fill="none" stroke={INK} strokeWidth="4" />
      <rect x="137" y="41" width="70" height="54" rx="3" fill={ACCENT} opacity="0.12" />
      {/* Pong en pantalla. */}
      <rect x="142" y="56" width="4" height="16" fill={ACCENT} />
      <rect x="198" y="64" width="4" height="16" fill={ACCENT} />
      <rect x="169" y="64" width="5" height="5" fill={INK} />
      <line x1="172" y1="43" x2="172" y2="93" stroke={FAINT} strokeWidth="2" strokeDasharray="3 5" />
      {/* Diales. */}
      <circle cx="220" cy="52" r="5" fill="none" stroke={DIM} strokeWidth="2.5" />
      <circle cx="220" cy="68" r="5" fill="none" stroke={DIM} strokeWidth="2.5" />
      {/* Patas + consola + cartucho. */}
      <line x1="146" y1="104" x2="140" y2="118" stroke={DIM} strokeWidth="3.5" />
      <line x1="214" y1="104" x2="220" y2="118" stroke={DIM} strokeWidth="3.5" />
      <rect x="248" y="102" width="52" height="16" rx="3" fill="none" stroke={INK} strokeWidth="3.5" />
      <rect x="262" y="94" width="24" height="8" rx="1.5" fill={ACCENT} opacity="0.85" />
      {/* Mando: cable hasta la consola. */}
      <path d="M 248 110 C 200 128 150 96 108 108" fill="none" stroke={DIM} strokeWidth="2.5" />
      <rect x="72" y="100" width="40" height="22" rx="5" fill="none" stroke={INK} strokeWidth="3.5" />
      <line x1="84" y1="106" x2="84" y2="116" stroke={INK} strokeWidth="3.5" />
      <line x1="79" y1="111" x2="89" y2="111" stroke={INK} strokeWidth="3.5" />
      <circle cx="102" cy="111" r="3" fill={ACCENT} />
    </Frame>
  );
}

/** E3 — El salto 3D: el CD-ROM y el low-poly naciendo de la rejilla. */
function PolygonScene() {
  return (
    <Frame>
      {/* Rejilla en perspectiva. */}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={`h${i}`}
          x1={112 - i * 20}
          y1={118 - i * 13}
          x2={248 + i * 20}
          y2={118 - i * 13}
          stroke={FAINT}
          strokeWidth="2"
        />
      ))}
      {[-2, -1, 0, 1, 2].map((i) => (
        <line
          key={`v${i}`}
          x1={180 + i * 34}
          y1="79"
          x2={180 + i * 56}
          y2="118"
          stroke={FAINT}
          strokeWidth="2"
        />
      ))}
      {/* Pirámide wireframe (el "salto"). */}
      <path d="M 180 24 L 132 100 L 228 100 Z" fill={ACCENT} opacity="0.1" />
      <path d="M 180 24 L 132 100 L 228 100 Z" fill="none" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <line x1="180" y1="24" x2="180" y2="100" stroke={INK} strokeWidth="2.5" />
      <line x1="180" y1="24" x2="204" y2="100" stroke={DIM} strokeWidth="2" />
      {/* CD con brillo. */}
      <circle cx="272" cy="58" r="26" fill="none" stroke={INK} strokeWidth="3.5" />
      <circle cx="272" cy="58" r="7" fill="none" stroke={DIM} strokeWidth="3" />
      <path d="M 254 46 A 22 22 0 0 1 272 36" fill="none" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" />
      <path d="M 289 71 A 22 22 0 0 1 279 77" fill="none" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" opacity="0.6" />
    </Frame>
  );
}

/** E4 — La red: el globo conectado y la primera ventana de navegador. */
function NetworkScene() {
  return (
    <Frame>
      {/* Globo. */}
      <circle cx="196" cy="70" r="36" fill="none" stroke={INK} strokeWidth="3.5" />
      <ellipse cx="196" cy="70" rx="36" ry="13" fill="none" stroke={DIM} strokeWidth="2" />
      <ellipse cx="196" cy="70" rx="15" ry="36" fill="none" stroke={DIM} strokeWidth="2" />
      <line x1="160" y1="70" x2="232" y2="70" stroke={DIM} strokeWidth="2" />
      {/* Nodos enlazados. */}
      <line x1="228" y1="46" x2="282" y2="30" stroke={ACCENT} strokeWidth="2.5" />
      <line x1="232" y1="82" x2="288" y2="98" stroke={ACCENT} strokeWidth="2.5" />
      <line x1="162" y1="88" x2="104" y2="104" stroke={ACCENT} strokeWidth="2.5" />
      <circle cx="282" cy="30" r="6" fill={ACCENT} />
      <circle cx="288" cy="98" r="6" fill={ACCENT} />
      <circle cx="104" cy="104" r="6" fill={ACCENT} />
      {/* Ventana de navegador. */}
      <rect x="58" y="26" width="74" height="52" rx="4" fill="none" stroke={INK} strokeWidth="3.5" />
      <line x1="58" y1="40" x2="132" y2="40" stroke={INK} strokeWidth="3" />
      <circle cx="66" cy="33" r="2.5" fill={DIM} />
      <circle cx="75" cy="33" r="2.5" fill={DIM} />
      <rect x="65" y="47" width="42" height="4" rx="1" fill={DIM} />
      <rect x="65" y="56" width="58" height="4" rx="1" fill={FAINT} />
      <rect x="65" y="65" width="50" height="4" rx="1" fill={FAINT} />
    </Frame>
  );
}

/** E5 — Digital y móvil: el smartphone, la nube y la descarga instantánea. */
function MobileScene() {
  return (
    <Frame>
      {/* Móvil. */}
      <rect x="152" y="24" width="58" height="96" rx="10" fill="none" stroke={INK} strokeWidth="4" />
      <line x1="172" y1="32" x2="190" y2="32" stroke={DIM} strokeWidth="3" strokeLinecap="round" />
      {/* Rejilla de apps. */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={162 + col * 14}
            y={44 + row * 14}
            width="10"
            height="10"
            rx="2.5"
            fill={row === 1 && col === 1 ? ACCENT : DIM}
            opacity={row === 1 && col === 1 ? 1 : 0.55}
          />
        )),
      )}
      <rect x="162" y="96" width="38" height="6" rx="3" fill={ACCENT} opacity="0.8" />
      {/* Nube de la tienda digital + descarga. */}
      <path
        d="M 66 58 a 13 13 0 0 1 12 -18 a 16 16 0 0 1 30 4 a 11 11 0 0 1 -2 22 l -34 0 a 12 12 0 0 1 -6 -8"
        fill="none"
        stroke={INK}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line x1="92" y1="72" x2="92" y2="100" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" />
      <path d="M 82 90 L 92 102 L 102 90" fill="none" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Moneditas del f2p flotando. */}
      <circle cx="266" cy="46" r="9" fill="none" stroke={DIM} strokeWidth="3" />
      <circle cx="286" cy="70" r="7" fill="none" stroke={DIM} strokeWidth="2.5" opacity="0.7" />
      <circle cx="262" cy="92" r="5" fill="none" stroke={DIM} strokeWidth="2.5" opacity="0.45" />
    </Frame>
  );
}

/** E6 — Servicios y streamers: el directo, el chat y el botón de play. */
function StreamScene() {
  return (
    <Frame>
      {/* Pantalla del directo. */}
      <rect x="86" y="30" width="128" height="80" rx="7" fill="none" stroke={INK} strokeWidth="4" />
      <rect x="94" y="38" width="112" height="64" rx="3" fill={ACCENT} opacity="0.1" />
      <path d="M 138 56 L 138 84 L 162 70 Z" fill={ACCENT} />
      {/* Badge EN VIVO. */}
      <rect x="94" y="38" width="34" height="13" rx="3" fill={INK} opacity="0.85" />
      <circle cx="102" cy="44.5" r="3" fill="#eb6a6a" className="hero-blink" />
      <rect x="108" y="42" width="16" height="5" rx="1" fill="var(--surface-panel, #171b23)" />
      {/* Chat que no para. */}
      {[
        { y: 36, w: 52 },
        { y: 56, w: 66 },
        { y: 76, w: 44 },
      ].map(({ y, w }, i) => (
        <g key={y} opacity={0.5 + i * 0.25}>
          <rect x="234" y={y} width={w} height="14" rx="4" fill="none" stroke={DIM} strokeWidth="2.5" />
          <rect x="240" y={y + 5} width={w - 14} height="4" rx="1" fill={DIM} />
        </g>
      ))}
      {/* Micro de brazo. */}
      <path d="M 60 116 L 60 96 L 78 78" fill="none" stroke={DIM} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="84" cy="72" r="10" fill={INK} />
      <line x1="76" y1="86" x2="70" y2="92" stroke={INK} strokeWidth="3" />
    </Frame>
  );
}

/** E7 — El futuro cercano: el visor de realidad mixta entre auroras. */
function FutureScene() {
  return (
    <Frame>
      {/* Auroras. */}
      <path d="M 40 92 C 110 40 250 40 320 88" fill="none" stroke={ACCENT} strokeWidth="5" opacity="0.3" strokeLinecap="round" />
      <path d="M 56 104 C 120 66 240 66 304 102" fill="none" stroke={ACCENT} strokeWidth="3" opacity="0.18" strokeLinecap="round" />
      {/* Visor flotante. */}
      <path
        d="M 132 58 q 48 -14 96 0 q 6 2 6 10 l -3 18 q -1 8 -9 8 l -22 0 q -6 0 -9 -5 l -5 -8 q -6 -9 -12 0 l -5 8 q -3 5 -9 5 l -22 0 q -8 0 -9 -8 l -3 -18 q 0 -8 6 -10 Z"
        fill="none"
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M 148 66 q 14 -4 28 0" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
      <path d="M 186 66 q 14 -4 28 0" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {/* Destellos. */}
      {[
        { x: 96, y: 42, s: 6 },
        { x: 262, y: 36, s: 5 },
        { x: 292, y: 66, s: 4 },
        { x: 76, y: 74, s: 4 },
      ].map(({ x, y, s }) => (
        <path
          key={`${x}${y}`}
          d={`M ${x} ${y - s} L ${x + s * 0.35} ${y - s * 0.35} L ${x + s} ${y} L ${x + s * 0.35} ${y + s * 0.35} L ${x} ${y + s} L ${x - s * 0.35} ${y + s * 0.35} L ${x - s} ${y} L ${x - s * 0.35} ${y - s * 0.35} Z`}
          fill={DIM}
          opacity="0.8"
        />
      ))}
    </Frame>
  );
}

const SCENES: Record<EraId, () => React.ReactElement> = {
  E1: GarageScene,
  E2: ConsoleScene,
  E3: PolygonScene,
  E4: NetworkScene,
  E5: MobileScene,
  E6: StreamScene,
  E7: FutureScene,
};

/** Splash flat de una era (docs/10 §9): decorativo, temado por tokens. */
export function EraSplash({ era, className }: SplashProps) {
  const Scene = SCENES[era];
  return (
    <svg
      viewBox="0 0 360 150"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <Scene />
    </svg>
  );
}

/** La gala anual: trofeo bajo focos. El dorado es del eje Capital/gala. */
export function AwardsSplash({ className }: { className?: string }) {
  const gold = '#e8b44a';
  const goldDeep = '#c9871f';
  return (
    <svg
      viewBox="0 0 360 120"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {/* Focos cruzados. */}
      <path d="M 52 0 L 200 104 L 132 104 Z" fill={gold} opacity="0.1" />
      <path d="M 308 0 L 160 104 L 228 104 Z" fill={gold} opacity="0.1" />
      {/* Peana. */}
      <rect x="132" y="96" width="96" height="9" rx="2" fill={FAINT} />
      <rect x="146" y="87" width="68" height="9" rx="2" fill={DIM} opacity="0.5" />
      {/* Trofeo. */}
      <path
        d="M 158 34 l 44 0 l -4 26 q -3 16 -18 16 q -15 0 -18 -16 Z"
        fill={gold}
      />
      <path d="M 158 38 q -18 2 -12 18 q 4 10 16 10" fill="none" stroke={goldDeep} strokeWidth="4" />
      <path d="M 202 38 q 18 2 12 18 q -4 10 -16 10" fill="none" stroke={goldDeep} strokeWidth="4" />
      <rect x="174" y="74" width="12" height="8" fill={goldDeep} />
      <rect x="166" y="82" width="28" height="6" rx="1.5" fill={gold} />
      <rect x="176" y="46" width="5" height="14" rx="2" fill="#f7f5ec" opacity="0.55" />
      {/* Chispas. */}
      {[
        { x: 140, y: 26 },
        { x: 224, y: 20 },
        { x: 246, y: 56 },
        { x: 114, y: 60 },
      ].map(({ x, y }) => (
        <path
          key={`${x}${y}`}
          d={`M ${x} ${y - 5} L ${x + 1.8} ${y - 1.8} L ${x + 5} ${y} L ${x + 1.8} ${y + 1.8} L ${x} ${y + 5} L ${x - 1.8} ${y + 1.8} L ${x - 5} ${y} L ${x - 1.8} ${y - 1.8} Z`}
          fill={gold}
          opacity="0.85"
        />
      ))}
    </svg>
  );
}

/** Fin de partida: la persiana baja. La quiebra rompe; el retiro despide. */
export function GameOverSplash({
  variant,
  className,
}: {
  variant: 'bancarrota' | 'retiro';
  className?: string;
}) {
  const tone = variant === 'bancarrota' ? 'var(--accent-danger, #e05252)' : ACCENT;
  return (
    <svg
      viewBox="0 0 360 120"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="60" y1="112" x2="300" y2="112" stroke={FAINT} strokeWidth="2" />
      {/* El local, con la persiana a medio bajar. */}
      <rect x="118" y="18" width="124" height="94" fill="none" stroke={INK} strokeWidth="4" />
      <rect x="112" y="10" width="136" height="12" rx="3" fill={DIM} />
      {[30, 40, 50, 60].map((y) => (
        <line key={y} x1="122" y1={y} x2="238" y2={y} stroke={DIM} strokeWidth="4" />
      ))}
      <rect x="170" y="66" width="20" height="4" rx="2" fill={DIM} />
      {variant === 'bancarrota' ? (
        // Tras el escaparate, la curva que se hundió.
        <path d="M 136 100 L 158 84 L 176 92 L 200 74 L 224 102" fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        // El retiro deja columnas de museo (el Legado espera, docs/06 §6).
        <g stroke={tone} strokeWidth="4" strokeLinecap="round">
          <line x1="148" y1="78" x2="148" y2="104" />
          <line x1="180" y1="78" x2="180" y2="104" />
          <line x1="212" y1="78" x2="212" y2="104" />
          <line x1="140" y1="76" x2="220" y2="76" strokeWidth="5" />
        </g>
      )}
      {/* Cartel colgado, ligeramente torcido. */}
      <g transform="rotate(-4 288 74)">
        <line x1="278" y1="58" x2="284" y2="68" stroke={DIM} strokeWidth="2" />
        <line x1="298" y1="58" x2="292" y2="68" stroke={DIM} strokeWidth="2" />
        <rect x="262" y="68" width="52" height="20" rx="3" fill="none" stroke={INK} strokeWidth="3" />
        <line x1="270" y1="76" x2="306" y2="76" stroke={tone} strokeWidth="3.5" />
        <line x1="274" y1="82" x2="300" y2="82" stroke={DIM} strokeWidth="2.5" />
      </g>
      {/* Candado. */}
      <path d="M 88 84 v -8 a 10 10 0 0 1 20 0 v 8" fill="none" stroke={INK} strokeWidth="4" />
      <rect x="80" y="84" width="36" height="26" rx="4" fill={INK} />
      <circle cx="98" cy="95" r="3.5" fill="var(--surface-panel, #171b23)" />
    </svg>
  );
}
