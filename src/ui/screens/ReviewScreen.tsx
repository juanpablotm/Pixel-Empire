import { useEffect, useState } from 'react';
import { insightKnown, type FactorTone, type ReleasedGame } from '../../core';
import { balance } from '../../data/balance';
import { reviewSegments } from '../../data/segments';
import { useGameStore } from '../../state/store';
import { celebrateHit } from '../confetti';
import { formatMoney } from '../format';
import { GameCover } from '../components/GameCover';
import { HIT_REVIEW } from '../components/OfficeScene';
import { motionDisabled, useCountUpWhen } from '../motion';

/**
 * La Reseña como gala (docs/10 §7.1, innovación I6): (1) redoble, (2) la nota
 * sube contando, (3) los factores ✔/~/✘ entran escalonados (docs/03 §5),
 * (4) las notas por segmento voltean como chips (docs/04 §5), (5) veredicto
 * — y confeti si es un hitazo. Un clic salta la ceremonia. Con movimiento
 * reducido (o en tests) todo se muestra al instante: mismo contenido.
 */

const TONE_ICON: Record<FactorTone, string> = { good: '✔', ok: '~', bad: '✘' };
const TONE_COLOR: Record<FactorTone, string> = {
  good: 'text-ok',
  ok: 'text-warn',
  bad: 'text-danger',
};

/** Actos de la ceremonia: 0 redoble · 1 nota · 2 segmentos · 3 desglose · 4 veredicto. */
const FINAL_ACT = 4;

function useGalaAct(gameId: string): [number, () => void] {
  const [act, setAct] = useState(() => (motionDisabled() ? FINAL_ACT : 0));

  useEffect(() => {
    if (motionDisabled()) {
      setAct(FINAL_ACT);
      return;
    }
    setAct(0);
    const cues: [number, number][] = [
      [1100, 1], // fin del redoble: la nota empieza a contar
      [2500, 2], // notas por segmento
      [3200, 3], // desglose factor a factor
      [4600, 4], // veredicto y cierre
    ];
    const timers = cues.map(([ms, next]) => window.setTimeout(() => setAct(next), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [gameId]);

  return [act, () => setAct(FINAL_ACT)];
}

function GalaCeremony({ game }: { game: ReleasedGame }) {
  const goTo = useGameStore((s) => s.goTo);
  const [act, skip] = useGalaAct(game.id);
  const counted = useCountUpWhen(act >= 1, game.review, 1300);
  const shownReview = act >= FINAL_ACT ? game.review : Math.round(counted);
  const isHit = game.review >= HIT_REVIEW;

  // El hitazo encadena con confeti real (canvas-confetti, docs/10 §7.1).
  // La UI observa el acto final y celebra; el tick no sabe nada de esto.
  useEffect(() => {
    if (act >= FINAL_ACT && isHit) celebrateHit();
  }, [act, isHit]);

  return (
    <main
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8"
      onClick={act < FINAL_ACT ? skip : undefined}
    >
      <section className="review-pop relative flex flex-col items-center gap-2 overflow-hidden rounded-lg border border-line bg-panel p-8 text-center">

        <div className="flex w-full items-center justify-center gap-6">
          <GameCover game={game} width={84} />
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm uppercase tracking-wide text-ink-mute">Reseña media</span>
            {act === 0 ? (
              <span className="flex h-[3.75rem] items-center gap-2 text-2xl text-ink-faint" aria-hidden>
                <span className="gala-dot">●</span>
                <span className="gala-dot" style={{ animationDelay: '0.15s' }}>●</span>
                <span className="gala-dot" style={{ animationDelay: '0.3s' }}>●</span>
              </span>
            ) : (
              <span className="text-6xl font-bold tabular-nums leading-none text-ink-hi">
                {shownReview}
                <span className="text-2xl font-normal text-ink-faint"> / 100</span>
              </span>
            )}
            <p className="text-sm text-ink-faint">{game.name}</p>
          </div>
        </div>

        {act === 0 && <p className="text-sm italic text-ink-mute">La crítica delibera…</p>}
        {act >= FINAL_ACT && <p className="gala-verdict text-lg text-ink">«{game.verdict}»</p>}

        {/* Reencuadre de trayectoria (9.1): un 45 temprano es un logro. La
            nota se compara con TU historia, no con un absoluto (docs/19). */}
        {act >= FINAL_ACT && <TrajectoryChip game={game} />}

        {/* Cada público juzga distinto (docs/04 §5): chips que voltean. */}
        {act >= 2 && (
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {reviewSegments.map((segment, i) => {
              const score = game.reviewsBySegment[segment.id];
              if (score === undefined) return null;
              return (
                <li
                  key={segment.id}
                  className="gala-chip rounded-full bg-raised px-3 py-1 text-sm text-ink"
                  style={{ animationDelay: `${i * 110}ms` }}
                >
                  {segment.name} <span className="font-semibold tabular-nums">{score}</span>
                </li>
              );
            })}
          </ul>
        )}

        {act < FINAL_ACT && (
          <p className="absolute bottom-2 right-3 text-xs text-ink-faint">clic para saltar ⏭</p>
        )}
      </section>

      {act >= 3 && (
        <section className="review-pop card" data-tour="review-breakdown">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-mute">
            Por qué esta nota
          </h3>
          <ul className="flex flex-col gap-3">
            {game.lines.map((line, i) => (
              <li
                key={line.factor}
                className="review-line flex gap-3"
                style={{ animationDelay: `${i * 140}ms` }}
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
          {act >= FINAL_ACT && (
            <div className="review-line mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-sm text-ink-mute">
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
              {/* Fatiga de fórmula y banda de gusto (9.1): números pequeños y
                  SIEMPRE visibles — la banda existe pero se explica (Pilar 2).
                  El listón de la época no se muestra en cifra: queda en su
                  línea cualitativa del desglose (docs/19 §9.1). */}
              {(game.reviewMarket.fatiga ?? 0) > 0 && (
                <span>
                  Fatiga de fórmula{' '}
                  <span className="font-semibold tabular-nums text-danger">
                    −{game.reviewMarket.fatiga}
                  </span>
                </span>
              )}
              {game.reviewMarket.banda !== undefined && (
                <span>
                  Gusto del momento{' '}
                  <span
                    className={`font-semibold tabular-nums ${
                      game.reviewMarket.banda > 0
                        ? 'text-ok'
                        : game.reviewMarket.banda < 0
                          ? 'text-danger'
                          : 'text-ink'
                    }`}
                  >
                    {game.reviewMarket.banda > 0 ? '+' : ''}
                    {game.reviewMarket.banda}
                  </span>
                </span>
              )}
            </div>
          )}
        </section>
      )}

      {act >= FINAL_ACT && <InsightCard game={game} />}

      {act >= FINAL_ACT && (
        <section className="review-line flex flex-wrap items-center justify-between gap-4 card">
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
      )}
    </main>
  );
}

/**
 * Reencuadre de trayectoria (Fase 9.1, docs/19 §9.1): la gala celebra "tu
 * mejor juego hasta ahora" — relativo a tu historia, no al absoluto. Eres una
 * persona con un casete en un garaje: un 45 es un buen primer juego.
 */
function TrajectoryChip({ game }: { game: ReleasedGame }) {
  if (game.personalBest === undefined) return null; // juegos de saves previos
  if (game.personalBest && game.previousBestReview === undefined) {
    return (
      <p className="gala-chip rounded-full bg-raised px-4 py-1.5 text-sm font-medium text-ink">
        🌱 Tu primer lanzamiento: aquí empieza la leyenda
      </p>
    );
  }
  if (game.personalBest) {
    return (
      <p className="gala-chip rounded-full bg-raised px-4 py-1.5 text-sm font-medium text-ok">
        🏆 ¡Tu mejor juego hasta ahora! (superas tu {game.previousBestReview})
      </p>
    );
  }
  const gap = (game.previousBestReview ?? 0) - game.review;
  if (gap > 0 && gap <= 5) {
    return (
      <p className="gala-chip rounded-full bg-raised px-4 py-1.5 text-sm text-ink-mute">
        A {gap} {gap === 1 ? 'punto' : 'puntos'} de tu récord ({game.previousBestReview})
      </p>
    );
  }
  return null;
}

/**
 * "Investigar resultados" (docs/17 P2): el atajo predictivo POR COMBO. El
 * desglose de arriba SIEMPRE es legible (Pilar 2); esto solo compra saber la
 * próxima vez —antes de lanzar— el Fit de este tema×género y el balance ideal
 * de este género. Barato: aprender de lo que ya hiciste no debe ser un muro.
 */
function InsightCard({ game }: { game: ReleasedGame }) {
  const known = useGameStore((s) => insightKnown(s.game, game.themeId, game.genreId));
  const points = useGameStore((s) => s.game.research.points);
  const researchInsight = useGameStore((s) => s.researchInsight);
  const cost = balance.research.knowledge.insightCost;

  if (known) {
    return (
      <section className="review-line card flex flex-wrap items-center gap-3">
        <span className="font-medium text-ok">✓ Combinación dominada</span>
        <span className="text-sm text-ink-mute">
          Ya conoces el encaje y el balance ideal de esta mezcla: los verás al concebir.
        </span>
      </section>
    );
  }

  const canAfford = points >= cost;
  return (
    <section className="review-line card flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-md text-sm text-ink-mute">
        <span className="font-medium text-ink">¿Investigar resultados?</span> Aprende de este
        lanzamiento: revela el Fit de esta combinación y el balance ideal de su género para tus
        próximos juegos.
      </p>
      <button
        type="button"
        disabled={!canAfford}
        title={canAfford ? undefined : `Faltan puntos de investigación (${cost} 💡)`}
        onClick={() => researchInsight(game.id)}
        className="btn btn-quiet px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        💡 Investigar resultados ({cost})
      </button>
    </section>
  );
}

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

  return <GalaCeremony key={game.id} game={game} />;
}
