import { getCrisisDef, getCrisisResponse } from '../../data/crises';
import { balance } from '../../data/balance';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
import type { ActiveCrisis, Segment } from '../../core';

/**
 * Gestión de crisis (docs/07 §5 y docs/10 §10.8): modal con reloj en cuenta
 * atrás, la causa (siempre trazable a una decisión) y el menú de respuestas
 * con sus efectos estimados por segmento. Solo muestra y despacha.
 */

const segmentNames: Partial<Record<Segment, string>> = {
  critica: 'Crítica',
  prensa: 'Prensa',
  hardcore: 'Hardcore',
  casual: 'Casual',
  comunidad: 'Comunidad',
  empleador: 'Empleador',
};

function EffectHints({ deltas }: { deltas: Partial<Record<Segment, number>> }) {
  const entries = Object.entries(deltas) as [Segment, number][];
  if (entries.length === 0) {
    return <span className="text-xs text-ink-faint">El desenlace depende de tu reputación.</span>;
  }
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
      {entries.map(([seg, v]) => (
        <span key={seg} className={v > 0 ? 'text-ok' : 'text-danger'}>
          {segmentNames[seg]} {v > 0 ? '▲' : '▼'}
        </span>
      ))}
    </span>
  );
}

function CrisisCard({ crisis }: { crisis: ActiveCrisis }) {
  const week = useGameStore((s) => s.game.week);
  const capital = useGameStore((s) => s.game.studio.capital);
  const respond = useGameStore((s) => s.respondToCrisis);
  const gameName = useGameStore(
    (s) => s.game.releasedGames.find((g) => g.id === crisis.gameId)?.name ?? null,
  );

  const def = getCrisisDef(crisis.cause);
  const weeksLeft = Math.max(0, crisis.deadlineWeek - week);
  const severityPct = Math.round(crisis.severity * 100);
  const backfireThreshold = balance.community.crisis.culparBackfireSeverity;

  return (
    <div className="w-full max-w-2xl rounded-lg border border-danger/40 bg-panel p-6 shadow-2xl">
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-danger">
        🔥 Crisis en curso · severidad {severityPct} %
      </p>
      <h2 className="text-xl font-bold text-ink-hi">{def.headline}</h2>
      <p className="mt-1 text-sm text-ink-mute">
        {def.causeText}
        {gameName && (
          <>
            {' '}
            Juego señalado: <span className="text-ink">«{gameName}»</span>.
          </>
        )}
      </p>

      <p
        className={`mt-3 rounded-md px-3 py-2 text-sm font-semibold ${
          weeksLeft <= 1 ? 'animate-pulse bg-danger/20 text-danger-hi' : 'bg-raised text-warn'
        }`}
      >
        ⏱ {weeksLeft === 0 ? 'Última oportunidad: el desenlace se fuerza esta semana.' : `${weeksLeft} semana${weeksLeft === 1 ? '' : 's'} para responder antes de que se pudra sola.`}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {def.responses.map((id) => {
          const response = getCrisisResponse(id);
          const cost = Math.round(response.costFactor * crisis.severity);
          const noCash = cost > 0 && capital < cost;
          const backfires = id === 'culpar' && crisis.severity >= backfireThreshold;
          const deltas = backfires ? response.backfireRepDeltas ?? {} : response.repDeltas;
          return (
            <button
              key={id}
              type="button"
              disabled={noCash}
              onClick={() => respond(crisis.id, id)}
              className={`flex flex-col items-start gap-1 rounded-md border border-line-hi bg-raised px-4 py-3 text-left transition-colors hover:border-line-hi hover:bg-control ${
                noCash ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="font-semibold text-ink-hi">{response.name}</span>
                {cost > 0 && (
                  <span className={`text-sm tabular-nums ${noCash ? 'text-danger' : 'text-capital'}`}>
                    −{formatMoney(cost)}
                  </span>
                )}
              </span>
              <span className="text-xs text-ink-mute">{response.description}</span>
              {backfires && (
                <span className="text-xs font-semibold text-danger">
                  ⚠ La crisis es demasiado grande: la mentira se destaparía.
                </span>
              )}
              <EffectHints deltas={deltas} />
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        Tu reputación previa amortigua o amplifica el desenlace: a un estudio querido se le perdona
        antes (docs/07 §5).
      </p>
    </div>
  );
}

/** Se muestra sobre todo lo demás mientras haya una crisis abierta. */
export function CrisisModal() {
  const crisis = useGameStore((s) =>
    s.game.community.crises.find((c) => c.status === 'abierta'),
  );
  if (!crisis) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-scrim p-6">
      <CrisisCard crisis={crisis} />
    </div>
  );
}
