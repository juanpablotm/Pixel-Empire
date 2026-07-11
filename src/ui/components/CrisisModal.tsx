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
    return <span className="text-xs text-slate-500">El desenlace depende de tu reputación.</span>;
  }
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
      {entries.map(([seg, v]) => (
        <span key={seg} className={v > 0 ? 'text-emerald-400' : 'text-red-400'}>
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
    <div className="w-full max-w-2xl rounded-lg border border-red-800 bg-slate-900 p-6 shadow-2xl">
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-red-400">
        🔥 Crisis en curso · severidad {severityPct} %
      </p>
      <h2 className="text-xl font-bold text-slate-100">{def.headline}</h2>
      <p className="mt-1 text-sm text-slate-400">
        {def.causeText}
        {gameName && (
          <>
            {' '}
            Juego señalado: <span className="text-slate-200">«{gameName}»</span>.
          </>
        )}
      </p>

      <p
        className={`mt-3 rounded-md px-3 py-2 text-sm font-semibold ${
          weeksLeft <= 1 ? 'animate-pulse bg-red-950 text-red-300' : 'bg-slate-800 text-amber-300'
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
              className={`flex flex-col items-start gap-1 rounded-md border border-slate-700 bg-slate-800 px-4 py-3 text-left transition-colors hover:border-slate-500 hover:bg-slate-700 ${
                noCash ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="font-semibold text-slate-100">{response.name}</span>
                {cost > 0 && (
                  <span className={`text-sm tabular-nums ${noCash ? 'text-red-400' : 'text-amber-300'}`}>
                    −{formatMoney(cost)}
                  </span>
                )}
              </span>
              <span className="text-xs text-slate-400">{response.description}</span>
              {backfires && (
                <span className="text-xs font-semibold text-red-400">
                  ⚠ La crisis es demasiado grande: la mentira se destaparía.
                </span>
              )}
              <EffectHints deltas={deltas} />
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">
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
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-6">
      <CrisisCard crisis={crisis} />
    </div>
  );
}
