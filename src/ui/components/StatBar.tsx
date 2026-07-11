/**
 * Barra de estado 0–100 con etiqueta y color semántico (docs/10 §11):
 * verde = bien, ámbar = precaución, rojo = peligro. Solo presentación.
 */
export function StatBar({ label, value }: { label: string; value: number }) {
  const rounded = Math.round(value);
  const color =
    rounded >= 60 ? 'bg-emerald-500' : rounded >= 35 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 shrink-0 text-slate-400">{label}</span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"
        role="meter"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${rounded}`}
      >
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${rounded}%` }}
        />
      </div>
      <span className="w-7 shrink-0 text-right tabular-nums text-slate-400">{rounded}</span>
    </div>
  );
}
