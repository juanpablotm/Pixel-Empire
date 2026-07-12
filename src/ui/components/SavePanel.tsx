import { useState } from 'react';
import { useGameStore } from '../../state/store';

/** Guardar / cargar / nueva partida (docs/08 §7). Solo despacha acciones del store. */
export function SavePanel() {
  const saveGame = useGameStore((s) => s.saveGame);
  const loadGame = useGameStore((s) => s.loadGame);
  const newGame = useGameStore((s) => s.newGame);
  const [message, setMessage] = useState<string | null>(null);

  const buttonClass =
    'rounded-md bg-raised px-3 py-1.5 text-sm font-medium text-ink hover:bg-control';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          saveGame();
          setMessage('Partida guardada.');
        }}
      >
        💾 Guardar
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          setMessage(loadGame() ? 'Partida cargada.' : 'No hay partida guardada.');
        }}
      >
        📂 Cargar
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          newGame();
          setMessage('Partida nueva.');
        }}
      >
        ✨ Nueva partida
      </button>
      {message && (
        <span role="status" className="text-sm text-ink-mute">
          {message}
        </span>
      )}
    </div>
  );
}
