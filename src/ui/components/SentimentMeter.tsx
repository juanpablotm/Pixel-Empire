/**
 * Termómetro de sentimiento de la Comunidad (docs/07 §2 y docs/10 §7.3):
 * el humor del público, 0..100. Solo presentación; el valor viene de core/.
 */
export function SentimentMeter({ sentiment }: { sentiment: number }) {
  const pct = Math.round(sentiment);
  const mood = pct >= 62 ? 'caliente y feliz' : pct <= 38 ? 'encendida (mal)' : 'expectante';
  const color = pct >= 62 ? 'bg-emerald-500' : pct <= 38 ? 'bg-red-500' : 'bg-amber-400';
  const emoji = pct >= 62 ? '😊' : pct <= 38 ? '😡' : '😐';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold uppercase tracking-wide text-slate-400">
          {emoji} Sentimiento
        </span>
        <span className="tabular-nums text-slate-300">{pct}/100</span>
      </div>
      <div
        role="meter"
        aria-label="Sentimiento de la comunidad"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-slate-800"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">La comunidad está {mood}. El boca a boca mueve ventas.</p>
    </div>
  );
}
