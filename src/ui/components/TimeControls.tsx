import { SPEEDS, type Speed } from '../../core';
import { useGameStore } from '../../state/store';

const LABELS: Record<Speed, string> = {
  0: '⏸ Pausa',
  1: '▶ x1',
  2: '▶▶ x2',
  4: '▶▶▶ x4',
};

/**
 * Controles de tiempo (docs/02 §1) como control segmentado: Pausa / x1 / x2 /
 * x4 + paso manual. El estado activo usa el verde de acción (tokens 7A).
 */
export function TimeControls() {
  const speed = useGameStore((s) => s.speed);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const advanceWeek = useGameStore((s) => s.advanceWeek);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-md border border-line bg-raised shadow-[var(--shadow-flat)]">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={speed === s}
            onClick={() => setSpeed(s)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              speed === s
                ? 'bg-action-hi text-onbright'
                : 'text-ink-mute hover:bg-control hover:text-ink'
            }`}
          >
            {LABELS[s]}
          </button>
        ))}
      </div>
      <button type="button" onClick={advanceWeek} className="btn btn-quiet">
        +1 semana
      </button>
    </div>
  );
}
