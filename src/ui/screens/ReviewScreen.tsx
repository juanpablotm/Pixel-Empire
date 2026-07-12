import type { FactorTone } from '../../core';
import { reviewSegments } from '../../data/segments';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';

/**
 * Desglose de reseña (docs/03 §5 y docs/10 §10.4): la nota media, las notas
 * por segmento (docs/04 §5), la frase-veredicto, una línea ✔/~/✘ por factor y
 * el ajuste del mercado (moda y expectativas). Versión baseline de la "gala"
 * (docs/10 §7.1): las líneas entran escalonadas con CSS; la coreografía
 * completa llega en Fase 7.
 */

const TONE_ICON: Record<FactorTone, string> = { good: '✔', ok: '~', bad: '✘' };
const TONE_COLOR: Record<FactorTone, string> = {
  good: 'text-ok',
  ok: 'text-warn',
  bad: 'text-danger',
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
        <p className="text-ink-mute">No se encuentra la reseña ({reviewGameId ?? 'ninguna'}).</p>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-raised px-4 py-2 text-sm text-ink hover:bg-control"
        >
          Volver al estudio
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <section className="review-pop flex flex-col items-center gap-2 rounded-lg border border-line bg-panel p-8 text-center">
        <span className="text-sm uppercase tracking-wide text-ink-mute">Reseña media</span>
        <span className="text-6xl font-bold tabular-nums">
          {game.review}
          <span className="text-2xl font-normal text-ink-faint"> / 100</span>
        </span>
        <p className="text-lg text-ink">«{game.verdict}»</p>
        <p className="text-sm text-ink-faint">{game.name}</p>

        {/* Cada público juzga distinto (docs/04 §5). */}
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {reviewSegments.map((segment) => {
            const score = game.reviewsBySegment[segment.id];
            if (score === undefined) return null;
            return (
              <li
                key={segment.id}
                className="review-line rounded-full bg-raised px-3 py-1 text-sm text-ink"
              >
                {segment.name} <span className="font-semibold tabular-nums">{score}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-mute">
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
                <span className="text-ink-mute"> — {line.detail}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* El ajuste del mercado sobre Q (docs/04 §5), para que la nota sea explicable. */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-sm text-ink-mute">
          <span>
            Calidad <span className="font-semibold tabular-nums">{game.quality}</span>
          </span>
          <span>
            Moda{' '}
            <span
              className={`font-semibold tabular-nums ${
                game.reviewMarket.modaBonus >= 0 ? 'text-ok' : 'text-danger'
              }`}
            >
              {game.reviewMarket.modaBonus >= 0 ? '+' : ''}
              {game.reviewMarket.modaBonus}
            </span>
          </span>
          <span>
            Expectativas por hype{' '}
            <span
              className={`font-semibold tabular-nums ${
                game.reviewMarket.hypePenalty > 0 ? 'text-danger' : 'text-ink'
              }`}
            >
              −{game.reviewMarket.hypePenalty}
            </span>
          </span>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 card">
        <div className="text-sm text-ink-mute">
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
          className="btn btn-primary px-4 py-2"
        >
          Volver al estudio
        </button>
      </section>
    </main>
  );
}
