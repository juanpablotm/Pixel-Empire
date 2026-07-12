import { researchNodeStatus } from '../../core';
import { eraOrder, getEra } from '../../data/eras';
import { researchNodes, researchNodeUnlocks } from '../../data/research';
import { features } from '../../data/features';
import { genres } from '../../data/genres';
import { useGameStore } from '../../state/store';

/**
 * Pantalla de investigación (docs/02 §3): puntos 💡, asignación de personal a
 * I+D y el árbol de desbloqueos agrupado por era. La UI solo muestra; los
 * estados ('comprado'/'disponible'/'sinPuntos'/'bloqueado') los decide core.
 */

const nameOfGenre = (id: string): string => genres.find((g) => g.id === id)?.name ?? id;
const nameOfFeature = (id: string): string => features.find((f) => f.id === id)?.name ?? id;

export function ResearchScreen() {
  const game = useGameStore((s) => s.game);
  const goTo = useGameStore((s) => s.goTo);
  const buy = useGameStore((s) => s.buyResearch);
  const toggleResearch = useGameStore((s) => s.toggleResearch);

  const points = Math.floor(game.research.points);
  const rdStaff = game.research.rdStaff;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          Investigación <span className="ml-2 text-amber-300">💡 {points}</span>
        </h2>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
        >
          Volver al estudio
        </button>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Personal en I+D (~1 💡 por persona y semana)
        </h3>
        {game.staff.length === 0 ? (
          <p className="text-slate-500">No hay plantilla.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {game.staff.map((e) => {
              const inRd = rdStaff.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={inRd}
                  onClick={() => toggleResearch(e.id)}
                  title={
                    inRd
                      ? 'En I+D: genera puntos cada semana'
                      : 'Mover a I+D (sale de su proyecto)'
                  }
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    inRd
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {inRd ? '💡 ' : ''}
                  {e.name}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Lanzar juegos también da puntos (los grandes, más). Quien investiga no desarrolla.
        </p>
      </section>

      {eraOrder.map((eraId) => {
        const nodes = researchNodes.filter((n) => n.era === eraId);
        if (nodes.length === 0) return null;
        const era = getEra(eraId);
        return (
          <section key={eraId} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              {era.name} <span className="normal-case text-slate-500">({era.period})</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {nodes.map((node) => {
                const status = researchNodeStatus(game, node.id);
                const unlocks = researchNodeUnlocks(node.id);
                const extras = [
                  ...unlocks.genres.map(nameOfGenre),
                  ...unlocks.features.map(nameOfFeature),
                ];
                return (
                  <li
                    key={node.id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md px-4 py-3 ${
                      status === 'comprado' ? 'bg-emerald-950/40' : 'bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {status === 'comprado' ? '✅ ' : ''}
                        {node.name}{' '}
                        <span className="text-xs text-slate-500">({node.cost} 💡)</span>
                      </p>
                      <p className="text-sm text-slate-400">{node.description}</p>
                      {extras.length > 0 && (
                        <p className="text-xs text-slate-500">Desbloquea: {extras.join(', ')}</p>
                      )}
                      {node.requiresNodes && node.requiresNodes.length > 0 && (
                        <p className="text-xs text-slate-500">
                          Requiere:{' '}
                          {node.requiresNodes
                            .map((id) => researchNodes.find((n) => n.id === id)?.name ?? id)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                    {status === 'disponible' && (
                      <button
                        type="button"
                        onClick={() => buy(node.id)}
                        className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
                      >
                        Investigar
                      </button>
                    )}
                    {status === 'sinPuntos' && (
                      <span className="text-sm text-slate-500">Faltan 💡</span>
                    )}
                    {status === 'bloqueado' && (
                      <span className="text-sm text-slate-600">🔒 Bloqueado</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
