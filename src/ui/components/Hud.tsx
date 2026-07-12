import { aggregateReputation } from '../../core';
import { getEra } from '../../data/eras';
import { stageLabels } from '../../data/staffTexts';
import { useGameStore } from '../../state/store';
import { formatMoney, formatWeek } from '../format';
import { MoralScale } from './MoralScale';
import { ReputationRadar } from './ReputationRadar';
import { TimeControls } from './TimeControls';

/**
 * Barra superior persistente (docs/10 §10.1): fecha, era, etapa, capital,
 * Balanza "El Precio" (§7.4), reputación como constelación (I3) y controles
 * de tiempo. Solo lee estado; los cálculos viven en core/.
 */
export function Hud() {
  const week = useGameStore((s) => s.game.week);
  const era = useGameStore((s) => s.game.era);
  const scaleStage = useGameStore((s) => s.game.studio.scaleStage);
  const capital = useGameStore((s) => s.game.studio.capital);
  const reputation = useGameStore((s) => s.game.studio.reputation);
  const loan = useGameStore((s) => s.game.loanPrincipal);
  const scandalActive = useGameStore((s) => s.game.scandals.some((sc) => sc.weeksLeft > 0));
  const bombingActive = useGameStore((s) => s.game.community.bombs.length > 0);
  const goTo = useGameStore((s) => s.goTo);
  const inTheRed = capital < 0;
  const aggregate = Math.round(aggregateReputation(reputation));

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-800 px-6 py-3">
      <h1 className="text-lg font-bold tracking-tight">
        Pixel Empire <span className="font-normal text-slate-400">— Game Studio Tycoon</span>
      </h1>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="text-slate-300">{formatWeek(week)}</span>
        <span
          className="rounded bg-slate-800 px-2 py-0.5 text-slate-300"
          title={`${era} · ${getEra(era).period}`}
        >
          🌍 {getEra(era).name}
        </span>
        <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
          {stageLabels[scaleStage]}
        </span>
        <button
          type="button"
          onClick={() => goTo('finanzas')}
          title={loan > 0 ? `Caja (préstamo vivo: ${formatMoney(loan)})` : 'Ver finanzas'}
          className={`font-semibold tabular-nums transition-colors hover:underline ${
            inTheRed ? 'animate-pulse text-red-400' : 'text-amber-300'
          }`}
        >
          {formatMoney(capital)}
          {loan > 0 && <span aria-hidden> 🏦</span>}
        </button>
        <MoralScale />
        <span className="flex items-center gap-1.5 text-slate-300" title="Reputación por segmento">
          <ReputationRadar reputation={reputation} size={34} />
          <span className="tabular-nums">⭐ {aggregate}</span>
        </span>
        {scandalActive && (
          <span
            className="animate-pulse rounded bg-red-900/70 px-2 py-0.5 font-semibold text-red-300"
            title="Hay un escándalo en curso: las ventas sufren"
          >
            💥 Escándalo
          </span>
        )}
        {bombingActive && (
          <span
            className="animate-pulse rounded bg-red-900/70 px-2 py-0.5 font-semibold text-red-300"
            title="Review bombing en curso: nota visible y ventas hundidas hasta que amaine o lo gestiones"
          >
            💣 Review bombing
          </span>
        )}
      </div>
      <div className="ml-auto">
        <TimeControls />
      </div>
    </header>
  );
}
