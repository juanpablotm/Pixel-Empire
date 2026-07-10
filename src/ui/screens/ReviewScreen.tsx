import type { FactorTone } from '../../core';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';

/**
 * Desglose de reseña (docs/03 §5 y docs/10 §10.4): la nota, la frase-veredicto
 * y una línea ✔/~/✘ por factor. Versión baseline de la "gala" (docs/10 §7.1):
 * las líneas entran escalonadas con CSS; la coreografía completa llega en Fase 7.
 */

const TONE_ICON: Record<FactorTone, string> = { good: '✔', ok: '~', bad: '✘' };
const TONE_COLOR: Record<FactorTone, string> = {
  good: 'text-emerald-400',
  ok: 'text-amber-400',
  bad: 'text-red-400',
};

export function ReviewScreen() {
  const reviewGameId = useGameStore((s) => s.reviewGameId);
  const game = useGameStore((s) =>
    s.game.releasedGames.find((g) => g.id === s.reviewGameId),
  );
  const goTo = useGameStore((s) => s.goTo);

  if (!game) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-slate-400">No se encuentra la reseña ({reviewGameId ?? 'ninguna'}).</p>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
        >
          Volver al estudio
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <section className="review-pop flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-8 text-center">
        <span className="text-sm uppercase tracking-wide text-slate-400">Reseña</span>
        <span className="text-6xl font-bold tabular-nums">
          {game.review}
          <span className="text-2xl font-normal text-slate-500"> / 100</span>
        </span>
        <p className="text-lg text-slate-300">«{game.verdict}»</p>
        <p className="text-sm text-slate-500">{game.name}</p>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Por qué esta nota
        </h3>
        <ul className="flex flex-col gap-3">
          {game.lines.map((line, i) => (
            <li
              key={line.factor}
              className="review-line flex gap-3"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <span aria-hidden className={`w-5 text-center font-bold ${TONE_COLOR[line.tone]}`}>
                {TONE_ICON[line.tone]}
              </span>
              <div>
                <span className={`font-medium ${TONE_COLOR[line.tone]}`}>{line.title}</span>
                <span className="text-slate-400"> — {line.detail}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="text-sm text-slate-400">
          {game.totalUnits > 0 ? (
            <>
              {game.totalUnits.toLocaleString('es-ES')} unidades ·{' '}
              {formatMoney(game.totalRevenue)} hasta hoy
            </>
          ) : (
            'A la venta desde esta semana: deja correr el tiempo para ver las ventas.'
          )}
        </div>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Volver al estudio
        </button>
      </section>
    </main>
  );
}
