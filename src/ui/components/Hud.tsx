import { aggregateReputation } from '../../core';
import { getEra } from '../../data/eras';
import { stageLabels } from '../../data/staffTexts';
import { useGameStore } from '../../state/store';
import { formatMoney, formatWeek } from '../format';
import { BrandLockup } from '../theme/BrandMark';
import { MoralScale } from './MoralScale';
import { RollingNumber } from './Motion';
import { ReputationRadar } from './ReputationRadar';
import { StudioMenu } from './StudioMenu';
import { TimeControls } from './TimeControls';

/**
 * Barra superior persistente (docs/10 §10.1): marca, fecha, era, etapa,
 * capital (dorado del eje Capital), Balanza "El Precio" (§7.4), reputación
 * como constelación (I3), controles de tiempo y el menú desplegable de la
 * Fase 8.5 (docs/17 U2: juegos, historial y partida en modales, para que no
 * ocupen la pantalla principal). Solo lee estado; los cálculos viven en core/.
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

      {/* Cada métrica explica qué es en su tooltip (docs/10 §13: transparencia);
          los tooltips también salen con el teclado (tabIndex + :focus-visible). */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        {/* key={week}: el chip re-monta y "late" con cada tick (docs/10 §6). */}
        <span
          key={week}
          tabIndex={0}
          className="tip chip tick-beat cursor-help font-mono tabular-nums text-ink-hi"
          data-tip="El tiempo avanza por semanas (1 tick = 1 semana; 52 = 1 año). Controla la velocidad a la derecha o pausa con Espacio."
        >
          {formatWeek(week)}
        </span>
        <span
          tabIndex={0}
          className="tip chip cursor-help"
          data-tip={`${era} · ${getEra(era).period}. Cada era trae plataformas, géneros y modelos nuevos — y sube el listón de calidad del público.`}
        >
          🌍 {getEra(era).name}
        </span>
        <span
          tabIndex={0}
          className="tip chip cursor-help"
          data-tip="Etapa de escala: Garaje → Estudio → Consolidado → Corporación. Se sube con capital y plantilla; cada etapa da aforo y proyectos en paralelo."
        >
          {stageLabels[scaleStage]}
        </span>
        <button
          type="button"
          onClick={() => goTo('finanzas')}
          data-tip={`Caja del estudio${loan > 0 ? ` (préstamo vivo: ${formatMoney(loan)})` : ''}. Paga sueldos, desarrollo y marketing; en rojo sostenido = bancarrota. Clic para ver Finanzas.`}
          className={`tip font-mono text-base font-semibold tabular-nums transition-colors hover:underline ${
            inTheRed ? 'animate-pulse text-danger' : 'text-capital'
          }`}
        >
          <RollingNumber value={capital} format={formatMoney} />
          {loan > 0 && <span aria-hidden> 🏦</span>}
        </button>
        <MoralScale />
        <span
          tabIndex={0}
          className="tip flex cursor-help items-center gap-1.5 text-ink"
          data-tip="Reputación media ponderada de los 5 segmentos (hardcore, casual, crítica, comunidad, empleador). El radar enseña el detalle: cada palanca tiene víctimas concretas."
        >
          <ReputationRadar reputation={reputation} size={34} />
          <span className="tabular-nums">⭐ {aggregate}</span>
        </span>
        {scandalActive && (
          <span
            tabIndex={0}
            className="tip chip chip-danger animate-pulse cursor-help"
            data-tip="Hay un escándalo en curso: la deuda de reputación acumulada estalló y las ventas sufren."
          >
            💥 Escándalo
          </span>
        )}
        {bombingActive && (
          <span
            tabIndex={0}
            className="tip chip chip-danger animate-pulse cursor-help"
            data-tip="Review bombing en curso: nota visible y ventas hundidas hasta que amaine o lo gestiones."
          >
            💣 Review bombing
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <TimeControls />
        <StudioMenu />
      </div>
    </header>
  );
}
