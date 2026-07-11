import type { ReputationVector } from '../../core';
import { segments } from '../../data/segments';

/**
 * Reputación como constelación (docs/10 §3, innovación I3): radar SVG de los
 * 6 segmentos (docs/06 §1). De un vistazo se ve a quién amas y a quién
 * traicionas. Solo presentación: los valores vienen del estado.
 */

interface Props {
  reputation: ReputationVector;
  /** Diámetro en px. Compacto (HUD) o grande (tarjeta). */
  size?: number;
  /** Con etiquetas de segmento alrededor (para la versión grande). */
  labels?: boolean;
}

function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

export function ReputationRadar({ reputation, size = 40, labels = false }: Props) {
  const pad = labels ? 30 : 2;
  const cx = size / 2 + pad;
  const cy = size / 2 + pad;
  const r = size / 2;
  const total = size + pad * 2;

  const points = segments.map((segment, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / segments.length;
    const value = (reputation[segment.id] ?? 50) / 100;
    return { segment, angle, value };
  });

  const polygon = points
    .map(({ angle, value }) => polar(cx, cy, r * value, angle).join(','))
    .join(' ');
  const outline = points.map(({ angle }) => polar(cx, cy, r, angle).join(',')).join(' ');
  const midline = points.map(({ angle }) => polar(cx, cy, r * 0.5, angle).join(',')).join(' ');

  const summary = points
    .map(({ segment }) => `${segment.name}: ${Math.round(reputation[segment.id] ?? 50)}`)
    .join(' · ');

  return (
    <svg
      width={total}
      height={total}
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label={`Reputación por segmento — ${summary}`}
      className="shrink-0"
    >
      <title>{summary}</title>
      <polygon points={outline} fill="none" stroke="currentColor" strokeOpacity={0.25} />
      <polygon points={midline} fill="none" stroke="currentColor" strokeOpacity={0.15} />
      <polygon
        points={polygon}
        fill="rgb(52 211 153 / 0.35)"
        stroke="rgb(52 211 153)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {points.map(({ segment, angle, value }) => {
        const [x, y] = polar(cx, cy, r * value, angle);
        return <circle key={segment.id} cx={x} cy={y} r={size > 60 ? 3 : 1.5} fill="rgb(52 211 153)" />;
      })}
      {labels &&
        points.map(({ segment, angle }) => {
          const [x, y] = polar(cx, cy, r + 14, angle);
          return (
            <text
              key={segment.id}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-400"
              fontSize={11}
            >
              {segment.name} {Math.round(reputation[segment.id] ?? 50)}
            </text>
          );
        })}
    </svg>
  );
}
