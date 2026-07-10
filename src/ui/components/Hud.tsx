import { useGameStore } from '../../state/store';
import { formatMoney, formatWeek } from '../format';
import { TimeControls } from './TimeControls';

/** Barra superior persistente: fecha, era, capital y controles de tiempo (docs/10 §10.1). */
export function Hud() {
  const week = useGameStore((s) => s.game.week);
  const era = useGameStore((s) => s.game.era);
  const capital = useGameStore((s) => s.game.studio.capital);
  const inTheRed = capital < 0;

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-800 px-6 py-3">
      <h1 className="text-lg font-bold tracking-tight">
        Pixel Empire <span className="font-normal text-slate-400">— Game Studio Tycoon</span>
      </h1>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="text-slate-300">{formatWeek(week)}</span>
        <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">Era {era}</span>
        <span
          className={`font-semibold tabular-nums ${inTheRed ? 'animate-pulse text-red-400' : 'text-amber-300'}`}
        >
          {formatMoney(capital)}
        </span>
      </div>
      <div className="ml-auto">
        <TimeControls />
      </div>
    </header>
  );
}
