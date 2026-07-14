import { balance } from '../../data/balance';

/**
 * El Manómetro de Hype (docs/10 §7.5, innovación I8): aguja de presión
 * semicircular con zona roja de sobre-hype. El doble filo (docs/04 §4): más
 * ventas de salida, pero reseñas más duras si las expectativas no se cumplen.
 * La aguja se mueve por transición CSS y TIEMBLA dentro de la zona roja.
 */

const CX = 60;
const CY = 64;
const R = 44;

/** Punto del arco para un hype 0..1 (0 = izquierda, 1 = derecha). */
function arcPoint(v: number, r = R): [number, number] {
  const angle = Math.PI * (1 - v);
  return [CX + r * Math.cos(angle), CY - r * Math.sin(angle)];
}

function arcPath(from: number, to: number, r = R): string {
  const [x0, y0] = arcPoint(from, r);
  const [x1, y1] = arcPoint(to, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function HypeGauge({ hype }: { hype: number }) {
  const threshold = balance.market.hype.overHypeThreshold;
  const overHyped = hype >= threshold;
  const pct = Math.round(hype * 100);
  const needleDeg = -90 + Math.min(1, Math.max(0, hype)) * 180;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span
          tabIndex={0}
          className="tip cursor-help font-semibold uppercase tracking-wide text-ink-mute"
          data-tip="Expectación del público: sube ventas de salida, pero en zona roja el juego se compara con lo prometido — si no cumple, la reseña y la comunidad lo castigan."
        >
          📣 Hype
        </span>
        <span className={`tabular-nums ${overHyped ? 'font-semibold text-danger' : 'text-ink'}`}>
          {pct} %{overHyped && ' — ¡sobre-hype!'}
        </span>
      </div>

      <div
        role="meter"
        aria-label="Hype"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="flex justify-center"
      >
        <svg width="150" height="86" viewBox="0 0 120 70" aria-hidden>
          {/* esfera */}
          <path d={arcPath(0, 1)} fill="none" stroke="var(--surface-raised)" strokeWidth="9" strokeLinecap="round" />
          {/* antesala ámbar y zona roja del manómetro (docs/04 §4) */}
          <path
            d={arcPath(Math.max(0, threshold - 0.15), threshold)}
            fill="none"
            stroke="var(--accent-warn)"
            strokeWidth="9"
            opacity="0.55"
          />
          <path
            d={arcPath(threshold, 1)}
            fill="none"
            stroke="var(--accent-danger)"
            strokeWidth="9"
            strokeLinecap="round"
            opacity="0.85"
          />
          {/* presión acumulada */}
          {hype > 0.005 && (
            <path
              d={arcPath(0, Math.min(1, hype))}
              fill="none"
              stroke="#d946ef"
              strokeWidth="4.5"
              strokeLinecap="round"
              opacity="0.9"
            />
          )}
          {/* marcas */}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => {
            const [x0, y0] = arcPoint(v, R - 7);
            const [x1, y1] = arcPoint(v, R - 12);
            return <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--text-faint)" strokeWidth="1.4" />;
          })}
          {(() => {
            const [x0, y0] = arcPoint(threshold, R - 6);
            const [x1, y1] = arcPoint(threshold, R - 14);
            return <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--accent-danger)" strokeWidth="2" />;
          })()}

          {/* la aguja: transición suave; temblor en la zona roja */}
          <g
            className="hype-needle"
            style={{ transform: `rotate(${needleDeg}deg)`, transformOrigin: `${CX}px ${CY}px` }}
          >
            <g className={overHyped ? 'hype-tremble' : undefined}>
              <polygon
                points={`${CX - 2.4},${CY} ${CX + 2.4},${CY} ${CX},${CY - 34}`}
                fill={overHyped ? 'var(--accent-danger-hi)' : 'var(--text-strong)'}
              />
            </g>
          </g>
          <circle cx={CX} cy={CY} r="4.5" fill="var(--surface-control-hi)" stroke="var(--border-line-hi)" />
        </svg>
      </div>

      <p className="text-xs text-ink-faint">
        Más hype = más ventas de salida, pero el público juzgará el juego con más dureza.
      </p>
    </div>
  );
}
