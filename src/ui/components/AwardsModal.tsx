import { useEffect, useRef } from 'react';
import { getAwardCategory } from '../../data/awards';
import { rankLabel, type AwardCategoryResult } from '../../core';
import { useGameStore } from '../../state/store';
import { celebrateAwards } from '../confetti';
import { AwardsSplash } from './HeroArt';
import { PopIn } from './Motion';

/**
 * La gala anual de premios (docs/06 §7 + docs/18 V7): modal que revela el
 * RANKING de cada categoría en la que te nominaron — desde la 9.5, los
 * nominados son los lanzamientos RIVALES REALES del año (docs/19 §9.5) — y tu
 * puesto entre ellos. Solo muestra estado: el puesto lo calculó el tick
 * (core/systems/awards.ts), aquí no se decide nada (docs/08 §1).
 */

/** El ranking de una categoría, con el jugador resaltado. */
function CategoryRanking({ result, delay }: { result: AwardCategoryResult; delay: number }) {
  const category = getAwardCategory(result.categoryId);
  const rank = result.rank as number;
  const won = rank === 1;

  return (
    <li
      className="review-line rounded-md bg-raised/60 px-4 py-3 text-left"
      style={{ animationDelay: `${delay}ms` }}
      data-award-category={result.categoryId}
      data-award-rank={rank}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-capital">{category.name}</span>
        <span
          className={`text-sm font-black tabular-nums ${won ? 'text-capital' : 'text-ink'}`}
          data-testid={`rank-${result.categoryId}`}
        >
          {won ? '🏆 1.º' : rankLabel(rank)}
        </span>
      </div>
      <ol className="mt-2 flex flex-col gap-1">
        {result.nominees.map((nominee, i) => (
          <li
            key={`${nominee.studio}-${nominee.gameName}`}
            className={`flex items-baseline justify-between gap-3 rounded px-2 py-1 text-xs ${
              nominee.isPlayer ? 'bg-capital/15 font-semibold text-ink' : 'text-ink-mute'
            }`}
          >
            <span className="tabular-nums text-ink-mute">{i + 1}.</span>
            <span className="flex-1 truncate">
              «{nominee.gameName}» <span className="text-ink-mute">· {nominee.studio}</span>
            </span>
            <span className="tabular-nums text-ink-mute">{nominee.score.toFixed(1)}</span>
          </li>
        ))}
      </ol>
    </li>
  );
}

export function AwardsModal() {
  const awardsWeek = useGameStore((s) => s.awardsWeek);
  const dismiss = useGameStore((s) => s.dismissAwards);
  const ceremony = useGameStore((s) => s.game.studio.lastCeremony);
  const closeRef = useRef<HTMLButtonElement>(null);

  const show = awardsWeek !== null && ceremony !== null && ceremony.week === awardsWeek;
  const nominated = show ? ceremony.categories.filter((c) => c.rank !== null) : [];
  const wins = nominated.filter((c) => c.rank === 1).length;

  // El confeti lo dispara la UI al abrirse el modal, nunca el tick (docs/08),
  // y solo si hay algo que celebrar de verdad: un puesto 1.
  useEffect(() => {
    if (show && wins > 0) celebrateAwards();
  }, [show, wins]);

  // El foco va al botón de cierre, pero SIN arrastrar el scroll: con varias
  // categorías el ranking desborda, y un autoFocus normal abría la gala ya
  // scrollada, cortando el titular con tu puesto — justo lo que hay que leer.
  useEffect(() => {
    if (show) closeRef.current?.focus({ preventScroll: true });
  }, [show]);

  if (!show) return null;

  // El titular es tu mejor puesto del año: el GOTY manda si te nominaron ahí.
  const headline = nominated.find((c) => c.categoryId === 'goty') ?? nominated[0];
  const headlineRank = headline.rank as number;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-scrim px-6 py-8"
      role="dialog"
      aria-label="Gala anual de premios"
      data-testid="awards-modal"
    >
      <PopIn className="modal-panel max-h-full w-full max-w-lg overflow-y-auto rounded-lg border border-capital/50 p-6 text-center shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-capital">
          Gala anual · {ceremony.year}
        </p>
        {/* La viñeta hero de la gala (Fase 7G, docs/10 §9). */}
        <AwardsSplash className="review-pop mx-auto -mb-2 mt-1 w-full max-w-xs" />
        <h2 className="review-pop mt-2 text-3xl font-black text-capital" data-testid="awards-headline">
          {wins > 0
            ? wins === 1
              ? '¡Un premio es tuyo!'
              : `¡${wins} premios son tuyos!`
            : `${getAwardCategory(headline.categoryId).name}: ${rankLabel(headlineRank)}`}
        </h2>
        <p className="review-pop mt-1 text-xs text-ink-mute">
          {wins > 0
            ? 'La industria entera mira hacia tu estudio.'
            : 'Estás en la conversación. Ganar es otra cosa.'}
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {nominated.map((result, i) => (
            <CategoryRanking key={result.categoryId} result={result} delay={200 + i * 150} />
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink-mute">
          {wins > 0
            ? 'La crítica y la prensa te miran mejor, el talento quiere trabajar contigo y tu próximo anuncio nacerá con hype (docs/06 §7).'
            : 'Cada nominación deja poso en la crítica y la prensa. El listón de la industria sube con cada era: hace falta escala y prestigio para ganar (docs/18 V7).'}
        </p>
        <button
          type="button"
          ref={closeRef}
          onClick={dismiss}
          className="mt-5 rounded-md bg-capital px-6 py-2.5 text-sm font-semibold text-onbright hover:bg-capital/90"
        >
          {wins > 0 ? 'Recoger los premios' : 'Volver al trabajo'}
        </button>
      </PopIn>
    </div>
  );
}
