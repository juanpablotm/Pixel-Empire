import { balance } from '../../data/balance';

/**
 * Manómetro de Hype (docs/10 §7.5, versión base de Fase 3): barra de presión
 * con zona roja de sobre-hype. El doble filo (docs/04 §4): más ventas de
 * salida, pero reseñas más duras si las expectativas no se cumplen.
 */
export function HypeGauge({ hype }: { hype: number }) {
  const threshold = balance.market.hype.overHypeThreshold;
  const overHyped = hype >= threshold;
  const pct = Math.round(hype * 100);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold uppercase tracking-wide text-slate-400">📣 Hype</span>
        <span className={`tabular-nums ${overHyped ? 'font-semibold text-red-400' : 'text-slate-300'}`}>
          {pct} %{overHyped && ' — ¡sobre-hype!'}
        </span>
      </div>
      <div
        role="meter"
        aria-label="Hype"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2 overflow-hidden rounded-full bg-slate-800"
      >
        {/* Zona roja del manómetro: expectativas peligrosas a partir de aquí. */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 bg-red-500/20"
          style={{ width: `${Math.round((1 - threshold) * 100)}%` }}
        />
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            overHyped ? 'bg-red-500' : 'bg-fuchsia-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        Más hype = más ventas de salida, pero el público juzgará el juego con más dureza.
      </p>
    </div>
  );
}
