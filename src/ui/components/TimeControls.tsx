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
 * x4. El estado activo usa el verde de acción (tokens 7A). El paso manual
 * ("+1 semana") se retiró en la Fase 8.5: el reloj se gobierna con la
 * velocidad, y el juego pausa solo cuando toca decidir.
 */
export function TimeControls() {
  const speed = useGameStore((s) => s.speed);
  const setSpeed = useGameStore((s) => s.setSpeed);

  return (
    <div className="flex flex-wrap items-center gap-2" data-tour="time-controls">
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
    </div>
  );
}
