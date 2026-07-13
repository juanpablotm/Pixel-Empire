/**
 * Barra de estado 0–100 con etiqueta y color semántico (docs/10 §11):
 * verde = bien, ámbar = precaución, rojo = peligro. Solo presentación.
 */
export function StatBar({ label, value }: { label: string; value: number }) {
  const rounded = Math.round(value);
  const color =
    rounded >= 60 ? 'bg-action-hi' : rounded >= 35 ? 'bg-warn' : 'bg-danger';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 shrink-0 text-ink-mute">{label}</span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised"
        role="meter"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${rounded}`}
      >
        {/* Solo transform (docs/10 §4.3): la barra escala, no re-mide layout. */}
        <div
          className={`meter-fill h-full rounded-full ${color}`}
          style={{ transform: `scaleX(${rounded / 100})` }}
        />
      </div>
      <span className="w-7 shrink-0 text-right tabular-nums text-ink-mute">{rounded}</span>
    </div>
  );
}
