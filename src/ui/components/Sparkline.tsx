/**
 * Mini-gráfico de una serie (docs/17 U2): la cola de ventas de un juego a la
 * venta, dibujada como línea + relleno en SVG por código (docs/10 §9: todo el
 * aspecto se genera con código; aquí no hace falta el peso de Recharts).
 *
 * Presentación pura (docs/08): solo escala a píxeles la serie que ya calculó
 * core/systems/sales.ts. No decide nada del juego.
 */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  className,
  title,
}: {
  values: readonly number[];
  width?: number;
  height?: number;
  className?: string;
  /** Texto accesible: el gráfico es decorativo si ya hay cifras al lado. */
  title?: string;
}) {
  if (values.length === 0) return null;

  // Con un solo punto no hay línea que dibujar: se pinta plano en el centro.
  const pad = 2;
  const top = pad;
  const bottom = height - pad;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;

  const points = values.map((value, i) => {
    const x = pad + i * stepX;
    // Serie plana (o de un punto): a media altura, sin división por cero.
    const ratio = span === 0 ? 0.5 : (value - min) / span;
    const y = bottom - ratio * (bottom - top);
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const lastX = points[points.length - 1].x;
  const area = `${line} L${lastX.toFixed(1)} ${bottom} L${pad} ${bottom} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      <path d={area} fill="var(--skin-accent, #34d399)" opacity={0.15} />
      <path
        d={line}
        fill="none"
        stroke="var(--skin-accent, #34d399)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* La última semana marcada: dónde está la cola AHORA (Pilar 2). */}
      <circle cx={last.x} cy={last.y} r={2} fill="var(--skin-accent, #34d399)" />
    </svg>
  );
}
