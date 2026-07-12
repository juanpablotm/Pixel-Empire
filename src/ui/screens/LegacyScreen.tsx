import { computeLegacy } from '../../core';
import { getAwardCategory } from '../../data/awards';
import { eras } from '../../data/eras';
import { legacyAxisLabels } from '../../data/legacyTexts';
import { useGameStore } from '../../state/store';
import { GameCover } from '../components/GameCover';
import { formatMoney, formatWeek } from '../format';

/**
 * El Museo del Legado (docs/10 §7.7, innovación I9): la pantalla de cierre
 * recorrible — estanterías con las portadas procedurales de todos los juegos,
 * la pared de premios, la línea de tiempo de hitos y el retrato del perfil
 * moral (docs/06 §6). El cálculo vive en core/systems/legacy.ts.
 */

const AXES = ['riqueza', 'prestigio', 'impacto', 'obras', 'etica'] as const;

const axisColor: Record<(typeof AXES)[number], string> = {
  riqueza: 'bg-amber-400',
  prestigio: 'bg-sky-400',
  impacto: 'bg-fuchsia-400',
  obras: 'bg-emerald-400',
  etica: 'bg-teal-300',
};

/** Estanterías: los juegos agrupados en filas de museo (más recientes arriba). */
const SHELF_SIZE = 6;

export function LegacyScreen() {
  const game = useGameStore((s) => s.game);
  const newGame = useGameStore((s) => s.newGame);
  const goTo = useGameStore((s) => s.goTo);
  const openReview = useGameStore((s) => s.openReview);

  const legacy = computeLegacy(game);
  const over = game.gameOver;

  // Hitos de la partida: eras vividas, transiciones de escala implícitas en
  // el log no hacen falta — el museo cuenta la historia con datos derivados.
  const erasLived = eras.filter((e) => e.startWeek <= game.week);
  const shelves: (typeof game.releasedGames)[] = [];
  const ordered = [...game.releasedGames].reverse();
  for (let i = 0; i < ordered.length; i += SHELF_SIZE) {
    shelves.push(ordered.slice(i, i + SHELF_SIZE));
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="text-center">
        <p className="text-sm uppercase tracking-widest text-slate-500">
          {over
            ? over.reason === 'bancarrota'
              ? `Bancarrota · ${formatWeek(over.week)}`
              : `Retiro · ${formatWeek(over.week)}`
            : 'El legado hasta hoy'}
        </p>
        <h2 className="mt-2 text-3xl font-black">🏛️ El Museo del Legado</h2>
        <p className="mx-auto mt-3 max-w-md text-lg text-slate-300">{legacy.verdict}</p>
      </header>

      {/* El retrato moral (docs/06 §6): el perfil multi-dimensional. */}
      <section className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Retrato del estudio
        </h3>
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

      {/* La pared de premios (docs/06 §7). */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Pared de premios
        </h3>
        {game.studio.awards.length === 0 ? (
          <p className="text-slate-500">Ninguna estatuilla… todavía.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {game.studio.awards.map((award, i) => (
              <li
                key={`${award.week}-${award.categoryId}-${i}`}
                className="rounded-md border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-sm"
                title={`${getAwardCategory(award.categoryId).name} · ${award.year}`}
              >
                🏆 {getAwardCategory(award.categoryId).name} {award.year}
                <span className="ml-2 text-xs text-slate-400">«{award.gameName}»</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Las estanterías: portadas procedurales de todos los juegos (docs/10 §9). */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          La colección ({game.releasedGames.length} juegos)
        </h3>
        {shelves.length === 0 ? (
          <p className="text-slate-500">Las vitrinas están vacías: nunca lanzaste un juego.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {shelves.map((shelf, i) => (
              <div key={i} className="border-b-4 border-slate-800 pb-2">
                <div className="flex flex-wrap items-end gap-4">
                  {shelf.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => openReview(g.id)}
                      title={`${g.name} · reseña ${g.review}/100 · ${g.totalUnits.toLocaleString('es-ES')} uds`}
                      className="transition-transform hover:-translate-y-1"
                    >
                      <GameCover game={g} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Línea de tiempo de hitos (docs/10 §7.7). */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Línea de tiempo
        </h3>
        <ul className="flex flex-col gap-1.5 text-sm">
          {erasLived.map((era) => (
            <li key={era.id} className="flex gap-3">
              <span className="w-28 shrink-0 tabular-nums text-slate-500">{era.period}</span>
              <span className="text-slate-300">
                🌍 {era.name}
                {era.id === game.era ? ' (tu era final)' : ''}
              </span>
            </li>
          ))}
          <li className="flex gap-3">
            <span className="w-28 shrink-0 tabular-nums text-slate-500">Total</span>
            <span className="text-slate-300">
              {Math.floor((game.week - 1) / 52)} años, {game.staff.length} personas al cierre
            </span>
          </li>
        </ul>
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
