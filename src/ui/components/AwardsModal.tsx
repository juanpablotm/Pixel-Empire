import { getAwardCategory } from '../../data/awards';
import { useGameStore } from '../../state/store';

/**
 * La gala anual de premios (docs/06 §7): modal que celebra las categorías
 * ganadas esta semana. Solo muestra estado; la ceremonia la resolvió el tick
 * (core/systems/awards.ts).
 */
export function AwardsModal() {
  const awardsWeek = useGameStore((s) => s.awardsWeek);
  const dismiss = useGameStore((s) => s.dismissAwards);
  const awards = useGameStore((s) => s.game.studio.awards);
  if (awardsWeek === null) return null;

  const won = awards.filter((a) => a.week === awardsWeek);
  if (won.length === 0) return null;
  const year = won[0].year;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-scrim px-6">
      <div className="w-full max-w-lg rounded-lg border border-capital/50 bg-panel p-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-capital">
          Gala anual · {year}
        </p>
        <h2 className="review-pop mt-2 text-3xl font-black text-capital">🏆 ¡Premiados!</h2>
        <ul className="mt-5 flex flex-col gap-3">
          {won.map((award, i) => (
            <li
              key={award.categoryId}
              className="review-line flex items-center justify-between gap-4 rounded-md bg-raised/60 px-4 py-2.5 text-left"
              style={{ animationDelay: `${200 + i * 150}ms` }}
            >
              <span className="text-sm font-semibold text-capital">
                {getAwardCategory(award.categoryId).name}
              </span>
              <span className="text-sm text-ink">«{award.gameName}»</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink-mute">
          La crítica y la prensa te miran mejor, el talento quiere trabajar contigo y tu próximo
          anuncio nacerá con hype (docs/06 §7).
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-5 rounded-md bg-capital px-6 py-2.5 text-sm font-semibold text-onbright hover:bg-capital/90"
        >
          Recoger los premios
        </button>
      </div>
    </div>
  );
}
