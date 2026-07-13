import { useGameStore } from '../../state/store';

/**
 * La Balanza "El Precio" (docs/10 §7.4, innovación I2): una balanza ⭐⚖️💰 de
 * verdad en el HUD que SE INCLINA con cada palanca moral. Lee solo
 * studio.moralDrift (−1 codicia … +1 integridad, calculado en
 * core/systems/morale.ts); la inclinación es una transición CSS (docs/10 §4).
 * Su hermana MoralTint tiñe sutilmente toda la interfaz con la deriva.
 */

/** Inclinación máxima del astil, en grados. */
const MAX_TILT = 10;

export function MoralScale() {
  const drift = useGameStore((s) => s.game.studio.moralDrift);

  // drift < 0 (codicia) hunde el platillo del 💰; drift > 0, el de la ⭐.
  const angle = Math.round(drift * MAX_TILT * 10) / 10;
  const leaning =
    drift <= -0.15 ? 'hacia la codicia' : drift >= 0.15 ? 'hacia la integridad' : 'en equilibrio';
  const beamColor =
    drift <= -0.15
      ? 'var(--accent-capital)'
      : drift >= 0.15
        ? 'var(--accent-action-hi)'
        : 'var(--text-mute)';

  return (
    <div
      className="flex items-center"
      title={`La Balanza "El Precio": la conciencia del estudio está ${leaning}.`}
      role="meter"
      aria-label="Balanza El Precio: codicia frente a integridad"
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={drift}
    >
      <svg width="112" height="38" viewBox="0 0 112 38" aria-hidden className="shrink-0">
        {/* pie y columna */}
        <path d="M 48 36 h 16 l -3 -5 h -10 z" fill="var(--surface-control-hi)" />
        <rect x="54.4" y="11" width="3.2" height="21" rx="1.6" fill="var(--surface-control-hi)" />
        <circle cx="56" cy="11.5" r="2.6" fill={beamColor} />

        {/* astil + platillos: el conjunto rota; cada platillo contra-rota y cuelga a plomo */}
        <g className="moral-beam" style={{ transform: `rotate(${angle}deg)`, transformOrigin: '56px 11.5px' }}>
          <rect x="18" y="10" width="76" height="3" rx="1.5" fill={beamColor} />

          {/* platillo de la codicia 💰 */}
          <g className="moral-beam" style={{ transform: `rotate(${-angle}deg)`, transformOrigin: '22px 11.5px' }}>
            <line x1="22" y1="12" x2="15" y2="24" stroke={beamColor} strokeWidth="1" />
            <line x1="22" y1="12" x2="29" y2="24" stroke={beamColor} strokeWidth="1" />
            <path d="M 13 24 a 9 9 0 0 0 18 0 z" fill="var(--surface-control)" stroke={beamColor} strokeWidth="1" />
            <text x="22" y="24.5" textAnchor="middle" fontSize="8.5">💰</text>
          </g>

          {/* platillo de la integridad ⭐ */}
          <g className="moral-beam" style={{ transform: `rotate(${-angle}deg)`, transformOrigin: '90px 11.5px' }}>
            <line x1="90" y1="12" x2="83" y2="24" stroke={beamColor} strokeWidth="1" />
            <line x1="90" y1="12" x2="97" y2="24" stroke={beamColor} strokeWidth="1" />
            <path d="M 81 24 a 9 9 0 0 0 18 0 z" fill="var(--surface-control)" stroke={beamColor} strokeWidth="1" />
            <text x="90" y="24.5" textAnchor="middle" fontSize="8.5">⭐</text>
          </g>
        </g>
      </svg>
    </div>
  );
}

/**
 * El "grado" de color de la deriva moral (docs/10 §7.4): un velo fijo,
 * imperceptible de puro sutil, que enfría la app hacia el dorado con la
 * codicia y la calienta hacia el verde con la integridad. Nunca bloquea
 * clics ni tapa modales.
 */
export function MoralTint() {
  const drift = useGameStore((s) => s.game.studio.moralDrift);
  const strength = Math.min(1, Math.abs(drift));

  return (
    <div
      aria-hidden
      className="moral-tint pointer-events-none fixed inset-0 z-30"
      style={{
        opacity: strength < 0.05 ? 0 : 0.05 + strength * 0.09,
        background:
          drift < 0
            ? 'linear-gradient(175deg, color-mix(in oklab, var(--accent-capital) 60%, transparent) 0%, transparent 62%)'
            : 'linear-gradient(175deg, color-mix(in oklab, var(--accent-action-hi) 50%, transparent) 0%, transparent 62%)',
      }}
    />
  );
}
