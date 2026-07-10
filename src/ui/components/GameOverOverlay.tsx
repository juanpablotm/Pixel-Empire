import { useGameStore } from '../../state/store';
import { formatWeek } from '../format';

/** Fin de partida por bancarrota (docs/06 §1). Modal por encima de todo. */
export function GameOverOverlay() {
  const gameOver = useGameStore((s) => s.game.gameOver);
  const releasedCount = useGameStore((s) => s.game.releasedGames.length);
  const newGame = useGameStore((s) => s.newGame);

  if (!gameOver) return null;

  return (
    <div
      role="alertdialog"
      aria-label="Fin de la partida"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-6"
    >
      <div className="flex max-w-md flex-col items-center gap-4 rounded-lg border border-red-900 bg-slate-900 p-8 text-center">
        <span className="text-4xl" aria-hidden>
          📉
        </span>
        <h2 className="text-2xl font-bold text-red-400">Bancarrota</h2>
        <p className="text-slate-300">
          La caja aguantó en rojo hasta la {formatWeek(gameOver.week).toLowerCase()}. El estudio
          cierra tras {releasedCount === 1 ? 'un juego lanzado' : `${releasedCount} juegos lanzados`}
          .
        </p>
        <button
          type="button"
          onClick={() => newGame()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          ✨ Nueva partida
        </button>
      </div>
    </div>
  );
}
