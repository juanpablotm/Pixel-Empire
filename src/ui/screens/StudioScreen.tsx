import { useState } from 'react';
import { projectProgress, projectTotalWeeks } from '../../core';
import { useGameStore } from '../../state/store';
import { getDevPhase } from '../../data/devPhases';
import { getGenre } from '../../data/genres';
import { getTheme } from '../../data/themes';
import { formatMoney } from '../format';
import { ReputationRadar } from '../components/ReputationRadar';
import { SavePanel } from '../components/SavePanel';

/**
 * Vista principal del estudio (docs/10 §10.1, versión garaje de Fase 1):
 * proyecto en curso, pulso del mercado, catálogo de juegos lanzados y el
 * historial de eventos.
 */

/** Lo más popular ahora mismo (solo presentación; el estado viene de core/). */
function hottest(trends: Record<string, { pop: number }>): string | null {
  const entries = Object.entries(trends);
  if (entries.length === 0) return null;
  return entries.reduce((best, cur) => (cur[1].pop > best[1].pop ? cur : best))[0];
}

export function StudioScreen() {
  const project = useGameStore((s) => s.game.projects[0]);
  const releasedGames = useGameStore((s) => s.game.releasedGames);
  const staffCount = useGameStore((s) => s.game.staff.length);
  const candidateCount = useGameStore((s) => s.game.candidates.length);
  const market = useGameStore((s) => s.game.market);
  const log = useGameStore((s) => s.game.log);
  const goTo = useGameStore((s) => s.goTo);
  const openReview = useGameStore((s) => s.openReview);

  const hotGenre = hottest(market.genres);
  const hotTheme = hottest(market.themes);

  return (
    <main className="grid flex-1 gap-6 px-6 py-6 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-6">
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Proyecto en curso
          </h2>
          {project ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xl font-semibold">{project.name}</span>
                <span className="text-sm text-slate-400">
                  Fase de {getDevPhase(project.phase).name} · semana{' '}
                  {Math.floor(project.weeksSpent)} de {projectTotalWeeks(project)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.round(projectProgress(project) * 100)}%` }}
                />
              </div>
              <button
                type="button"
                onClick={() => goTo('desarrollo')}
                className="self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Ver desarrollo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-slate-400">
                El garaje está en silencio. Toca inventar el próximo éxito.
              </p>
              <button
                type="button"
                onClick={() => goTo('concepcion')}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                💡 Nuevo juego
              </button>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Equipo
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-slate-400">
              {staffCount === 1 ? 'La plantilla eres tú.' : `${staffCount} personas en plantilla.`}
              {candidateCount > 0 && ` ${candidateCount} candidatos esperando.`}
            </p>
            <button
              type="button"
              onClick={() => goTo('equipo')}
              className="rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-600"
            >
              👥 Ver equipo
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Mercado
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-slate-400">
              {hotGenre && hotTheme
                ? `Lo que está de moda: ${getGenre(hotGenre).name} y ${getTheme(hotTheme).name}.`
                : 'El mercado despierta.'}
            </p>
            <button
              type="button"
              onClick={() => goTo('mercado')}
              className="rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-600"
            >
              📈 Ver tendencias
            </button>
            <button
              type="button"
              onClick={() => goTo('finanzas')}
              className="rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-600"
            >
              💰 Finanzas
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Juegos lanzados
          </h2>
          {releasedGames.length === 0 ? (
            <p className="text-slate-500">Todavía ninguno.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {[...releasedGames].reverse().map((game) => (
                <li
                  key={game.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-slate-800/60 px-3 py-2"
                >
                  <span className="font-medium">{game.name}</span>
                  <span className="text-sm text-slate-400">Reseña {game.review}/100</span>
                  <span className="text-sm text-slate-400">
                    {game.totalUnits.toLocaleString('es-ES')} uds ·{' '}
                    {formatMoney(game.totalRevenue)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {game.salesActive ? 'a la venta' : 'fuera de tiendas'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openReview(game.id)}
                    className="ml-auto rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-600"
                  >
                    Ver reseña
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Partida
          </h2>
          <SavePanel />
          <RetireButton />
        </section>
      </div>

      <aside className="flex flex-col gap-6">
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Reputación
          </h2>
          <ReputationCard />
        </section>
        <section className="flex-1 rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Historial
          </h2>
        {log.length === 0 ? (
          <p className="text-slate-500">Sin novedades por ahora.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {[...log].reverse().map((entry, i) => (
              <li key={`${entry.week}-${i}`} className="flex gap-2">
                <span className="shrink-0 tabular-nums text-slate-500">S{entry.week}</span>
                <span className={entry.type === 'moral' ? 'text-amber-200' : 'text-slate-300'}>
                  {entry.text}
                </span>
              </li>
            ))}
          </ul>
        )}
        </section>
      </aside>
    </main>
  );
}

/** Constelación de reputación con leyenda (docs/10 I3, versión tarjeta). */
function ReputationCard() {
  const reputation = useGameStore((s) => s.game.studio.reputation);
  return (
    <div className="flex justify-center">
      <ReputationRadar reputation={reputation} size={150} labels />
    </div>
  );
}

/** Cerrar el estudio para contemplar el Legado (docs/06 §6), con confirmación. */
function RetireButton() {
  const retire = useGameStore((s) => s.retire);
  const gameOver = useGameStore((s) => s.game.gameOver);
  const [confirming, setConfirming] = useState(false);
  if (gameOver) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-3">
      {confirming ? (
        <>
          <span className="text-sm text-slate-400">¿Cerrar el estudio para siempre?</span>
          <button
            type="button"
            onClick={retire}
            className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
          >
            Sí, ver el Legado
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
          >
            Cancelar
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-700"
        >
          🏛️ Retirarse y ver el Legado
        </button>
      )}
    </div>
  );
}
