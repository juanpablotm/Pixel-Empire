import { useGameStore } from '../../state/store';
import { formatWeek } from '../format';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-6"
    >
      <div
        className={`flex max-w-md flex-col items-center gap-4 rounded-lg border p-8 text-center ${
          bankrupt ? 'border-red-900' : 'border-slate-700'
        } bg-slate-900`}
      >
        <span className="text-4xl" aria-hidden>
          {bankrupt ? '📉' : '🏛️'}
        </span>
        <h2 className={`text-2xl font-bold ${bankrupt ? 'text-red-400' : 'text-slate-200'}`}>
          {bankrupt ? 'Bancarrota' : 'El estudio cierra'}
        </h2>
        <p className="text-slate-300">
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
            onClick={() => goTo('legado')}
            className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600"
          >
            🏛️ Ver legado
          </button>
          <button
            type="button"
            onClick={() => newGame()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            ✨ Nueva partida
          </button>
        </div>
      </div>
    </div>
  );
}
