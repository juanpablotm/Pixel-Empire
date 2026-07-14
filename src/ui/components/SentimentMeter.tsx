/**
 * Termómetro de sentimiento de la Comunidad (docs/07 §2 y docs/10 §7.3):
 * el humor del público, 0..100. Solo presentación; el valor viene de core/.
 */
export function SentimentMeter({ sentiment }: { sentiment: number }) {
  const pct = Math.round(sentiment);
  const mood = pct >= 62 ? 'caliente y feliz' : pct <= 38 ? 'encendida (mal)' : 'expectante';
  const color = pct >= 62 ? 'bg-action-hi' : pct <= 38 ? 'bg-danger' : 'bg-warn-hi';
  const emoji = pct >= 62 ? '😊' : pct <= 38 ? '😡' : '😐';

  return (
    <div className="review-pop flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span
          tabIndex={0}
          className="tip cursor-help font-semibold uppercase tracking-wide text-ink-mute"
          data-tip="El humor de la comunidad a corto plazo: reacciona a lanzamientos, crisis y gestos, y multiplica (o hunde) las ventas semanales. A la larga revierte hacia tu reputación."
        >
          <span className={pct <= 38 ? 'inline-block animate-pulse' : 'inline-block'}>{emoji}</span>{' '}
          Sentimiento
        </span>
        <span className="tabular-nums text-ink">{pct}/100</span>
      </div>
      <div
        role="meter"
        aria-label="Sentimiento de la comunidad"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-raised"
      >
        <div
          className={`meter-fill h-full rounded-full ${color}`}
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
      <p className="text-xs text-ink-faint">La comunidad está {mood}. El boca a boca mueve ventas.</p>
    </div>
  );
}
