import { useGameStore } from '../../state/store';
import { formatWeek } from '../format';
import { GameOverSplash } from './HeroArt';

/**
 * Fin de partida: bancarrota (docs/06 §1) o retiro. Modal por encima de todo,
 * salvo en la pantalla de Legado (el cierre se contempla allí, docs/06 §6).
 */
export function GameOverOverlay() {
  const gameOver = useGameStore((s) => s.game.gameOver);
  const releasedCount = useGameStore((s) => s.game.releasedGames.length);
  const screen = useGameStore((s) => s.screen);
  const newGame = useGameStore((s) => s.newGame);
  const goTo = useGameStore((s) => s.goTo);

  if (!gameOver || screen === 'legado') return null;

  const bankrupt = gameOver.reason === 'bancarrota';

  return (
    <div
      role="alertdialog"
      aria-label="Fin de la partida"
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-6"
    >
      <div
        className={`review-pop flex max-w-md flex-col items-center gap-4 rounded-lg border p-8 text-center ${
          bankrupt ? 'border-danger/30' : 'border-line-hi'
        } bg-panel`}
      >
        {/* La viñeta hero del cierre (Fase 7G, docs/10 §9). */}
        <GameOverSplash
          variant={bankrupt ? 'bancarrota' : 'retiro'}
          className="-mt-2 w-full max-w-sm"
        />
        <h2 className={`text-2xl font-bold ${bankrupt ? 'text-danger' : 'text-ink'}`}>
          {bankrupt ? 'Bancarrota' : 'El estudio cierra'}
        </h2>
        <p className="text-ink">
          {bankrupt
            ? `La caja aguantó en rojo hasta la ${formatWeek(gameOver.week).toLowerCase()}. El estudio cierra tras ${
                releasedCount === 1 ? 'un juego lanzado' : `${releasedCount} juegos lanzados`
              }.`
            : `Cerraste por decisión propia en la ${formatWeek(gameOver.week).toLowerCase()}, con ${
                releasedCount === 1 ? 'un juego lanzado' : `${releasedCount} juegos lanzados`
              }. Queda lo que dejaste.`}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => goTo('legado')}
            className="rounded-md bg-control px-4 py-2 text-sm font-medium text-ink hover:bg-control-hi"
          >
            🏛️ Ver legado
          </button>
          <button
            type="button"
            onClick={() => newGame()}
            className="btn btn-primary px-4 py-2"
          >
            ✨ Nueva partida
          </button>
        </div>
      </div>
    </div>
  );
}
