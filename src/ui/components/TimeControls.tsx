import { SPEEDS, type Speed } from '../../core';
import { useGameStore } from '../../state/store';

const LABELS: Record<Speed, string> = {
  0: '⏸ Pausa',
  1: '▶ x1',
  2: '▶▶ x2',
  4: '▶▶▶ x4',
};

/** Controles de tiempo (docs/02 §1): Pausa / x1 / x2 / x4 + paso manual. */
export function TimeControls() {
  const speed = useGameStore((s) => s.speed);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const advanceWeek = useGameStore((s) => s.advanceWeek);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {SPEEDS.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={speed === s}
          onClick={() => setSpeed(s)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            speed === s
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {LABELS[s]}
        </button>
      ))}
      <button
        type="button"
        onClick={advanceWeek}
        className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-700"
      >
        +1 semana
      </button>
    </div>
  );
}
