import { computeLegacy } from '../../core';
import { legacyAxisLabels } from '../../data/legacyTexts';
import { useGameStore } from '../../state/store';
import { formatMoney, formatWeek } from '../format';

/**
 * Pantalla de Legado (docs/06 §6): perfil multi-dimensional del estudio al
 * cierre (Riqueza/Prestigio/Impacto/Obras/Ética) con su frase-retrato. El
 * Museo del Legado recorrible llega en Fase 6 (docs/10 §7.7); esta es la
 * versión básica. El cálculo vive en core/systems/legacy.ts.
 */

const AXES = ['riqueza', 'prestigio', 'impacto', 'obras', 'etica'] as const;

const axisColor: Record<(typeof AXES)[number], string> = {
  riqueza: 'bg-amber-400',
  prestigio: 'bg-sky-400',
  impacto: 'bg-fuchsia-400',
  obras: 'bg-emerald-400',
  etica: 'bg-teal-300',
};

export function LegacyScreen() {
  const game = useGameStore((s) => s.game);
  const newGame = useGameStore((s) => s.newGame);
  const goTo = useGameStore((s) => s.goTo);

  const legacy = computeLegacy(game);
  const over = game.gameOver;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="text-center">
        <p className="text-sm uppercase tracking-widest text-slate-500">
          {over
            ? over.reason === 'bancarrota'
              ? `Bancarrota · ${formatWeek(over.week)}`
              : `Retiro · ${formatWeek(over.week)}`
            : 'El legado hasta hoy'}
        </p>
        <h2 className="mt-2 text-2xl font-bold">El Legado del estudio</h2>
        <p className="mx-auto mt-3 max-w-md text-slate-300">{legacy.verdict}</p>
      </header>

      <section className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
        {AXES.map((axis) => (
          <div key={axis} className="flex items-center gap-4">
            <span className="w-36 shrink-0 text-sm text-slate-300">{legacyAxisLabels[axis]}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${axisColor[axis]} transition-all duration-700`}
                style={{ width: `${legacy[axis]}%` }}
              />
            </div>
            <span className="w-10 text-right text-sm tabular-nums text-slate-400">
              {Math.round(legacy[axis])}
            </span>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-lg font-bold tabular-nums">{game.releasedGames.length}</p>
          <p className="text-xs text-slate-500">juegos lanzados</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-lg font-bold tabular-nums">{legacy.masterpieces}</p>
          <p className="text-xs text-slate-500">obras maestras (90+)</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-lg font-bold tabular-nums">{formatMoney(game.stats.peakCapital)}</p>
          <p className="text-xs text-slate-500">capital máximo</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-lg font-bold tabular-nums">{game.stats.scandalCount}</p>
          <p className="text-xs text-slate-500">escándalos</p>
        </div>
      </section>

      <div className="flex justify-center gap-3">
        {!over && (
          <button
            type="button"
            onClick={() => goTo('estudio')}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            Volver al estudio
          </button>
        )}
        <button
          type="button"
          onClick={() => newGame()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          ✨ Nueva partida
        </button>
      </div>
    </main>
  );
}
