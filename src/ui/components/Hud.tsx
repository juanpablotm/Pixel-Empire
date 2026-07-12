import { aggregateReputation } from '../../core';
import { getEra } from '../../data/eras';
import { stageLabels } from '../../data/staffTexts';
import { useGameStore } from '../../state/store';
import { formatMoney, formatWeek } from '../format';
import { BrandLockup } from '../theme/BrandMark';
import { MoralScale } from './MoralScale';
import { ReputationRadar } from './ReputationRadar';
import { TimeControls } from './TimeControls';

/**
 * Barra superior persistente (docs/10 §10.1): marca, fecha, era, etapa,
 * capital (dorado del eje Capital), Balanza "El Precio" (§7.4), reputación
 * como constelación (I3) y controles de tiempo. Solo lee estado; los
 * cálculos viven en core/.
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
    <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line bg-panel px-6 py-3 shadow-[var(--shadow-flat)]">
      <h1 className="m-0">
        <BrandLockup />
      </h1>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="chip font-mono tabular-nums text-ink-hi">{formatWeek(week)}</span>
        <span className="chip" title={`${era} · ${getEra(era).period}`}>
          🌍 {getEra(era).name}
        </span>
        <span className="chip">{stageLabels[scaleStage]}</span>
        <button
          type="button"
          onClick={() => goTo('finanzas')}
          title={loan > 0 ? `Caja (préstamo vivo: ${formatMoney(loan)})` : 'Ver finanzas'}
          className={`font-mono text-base font-semibold tabular-nums transition-colors hover:underline ${
            inTheRed ? 'animate-pulse text-danger' : 'text-capital'
          }`}
        >
          {formatMoney(capital)}
          {loan > 0 && <span aria-hidden> 🏦</span>}
        </button>
        <MoralScale />
        <span className="flex items-center gap-1.5 text-ink" title="Reputación por segmento">
          <ReputationRadar reputation={reputation} size={34} />
          <span className="tabular-nums">⭐ {aggregate}</span>
        </span>
        {scandalActive && (
          <span
            className="chip chip-danger animate-pulse"
            title="Hay un escándalo en curso: las ventas sufren"
          >
            💥 Escándalo
          </span>
        )}
        {bombingActive && (
          <span
            className="chip chip-danger animate-pulse"
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
