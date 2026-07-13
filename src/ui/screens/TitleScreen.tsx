import { useState, type CSSProperties } from 'react';
import { hasSave } from '../../save/saveLoad';
import { onboardingCompleted, useGameStore } from '../../state/store';
import { useMotionDisabled } from '../motion';
import { PopIn } from '../components/Motion';
import { PixelCrown } from '../theme/BrandMark';

/**
 * Pantalla de título (Fase 7F, docs/13 7F): el frente del juego. Marca de
 * brand/ sobre la piel del garaje (E1, fósforo CRT) y el menú Nueva partida /
 * Cargar / Opciones. Presentación pura: solo despacha acciones del store.
 * El tutorial autoarranca en la primera partida nueva (docs/10 §13) y nunca
 * más una vez completado o saltado.
 */
export function TitleScreen() {
  const newGame = useGameStore((s) => s.newGame);
  const loadGame = useGameStore((s) => s.loadGame);
  const enterGame = useGameStore((s) => s.enterGame);
  const startTutorial = useGameStore((s) => s.startTutorial);
  const sessionActive = useGameStore((s) => s.sessionActive);
  const modernUi = useGameStore((s) => s.modernUi);
  const motionOff = useMotionDisabled();

  const [showOptions, setShowOptions] = useState(false);
  // Se evalúa al montar: el título se re-monta en cada visita.
  const [saveAvailable] = useState(() => hasSave());
  const [loadFailed, setLoadFailed] = useState(false);

  const onNewGame = () => {
    newGame();
    enterGame();
    if (!onboardingCompleted()) startTutorial();
  };

  const onLoad = () => {
    if (loadGame()) enterGame();
    else setLoadFailed(true);
  };

  const onTutorial = () => {
    newGame();
    enterGame();
    startTutorial();
  };

  // Entradas escalonadas del menú (con movimiento reducido, sin animación).
  const rise = (order: number): CSSProperties | undefined =>
    motionOff ? undefined : { animationDelay: `${600 + order * 120}ms` };

  return (
    <main
      className={`title-screen relative flex min-h-screen flex-1 flex-col items-center justify-center gap-9 overflow-hidden px-6 py-10 text-ink ${
        modernUi ? '' : 'era-E1'
      }`}
    >
      {/* La marca (brand/README.md): corona ensamblada píxel a píxel + wordmark. */}
      <header className="flex flex-col items-center gap-5 text-center">
        <PixelCrown size={172} animated={!motionOff} className="title-crown" />
        <div className={motionOff ? '' : 'title-rise'} style={rise(-1)}>
          <h1 className="font-mono text-5xl font-semibold leading-none tracking-wide text-ink-hi sm:text-6xl">
            pixel<span className="text-capital"> empire</span>
          </h1>
          <p className="mt-3 flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-[0.4em] text-ink-mute">
            <span aria-hidden className="inline-block h-2 w-2 rounded-[2px] bg-action-hi" />
            game studio tycoon
          </p>
        </div>
        <p
          className={`max-w-md text-sm text-ink-mute ${motionOff ? '' : 'title-rise'}`}
          style={rise(0)}
        >
          De un garaje en 1980 a la cima de la industria. Cada éxito tiene un
          precio: Reputación ⚖ Capital.
        </p>
      </header>

      {/* El menú (docs/13 7F): Nueva partida / Cargar / Opciones. */}
      <nav
        aria-label="Menú principal"
        className={`flex w-64 flex-col gap-2.5 ${motionOff ? '' : 'title-rise'}`}
        style={rise(1)}
      >
        {sessionActive && (
          <button type="button" onClick={enterGame} className="btn btn-primary justify-center py-2.5 text-base">
            ▶ Continuar
          </button>
        )}
        <button
          type="button"
          onClick={onNewGame}
          className={`btn justify-center py-2.5 text-base ${sessionActive ? 'btn-quiet' : 'btn-primary'}`}
        >
          ✨ Nueva partida
        </button>
        <button
          type="button"
          disabled={!saveAvailable}
          title={saveAvailable ? undefined : 'Todavía no hay partida guardada en este navegador'}
          onClick={onLoad}
          className="btn btn-quiet justify-center py-2.5 text-base"
        >
          📂 Cargar partida
        </button>
        <button
          type="button"
          aria-expanded={showOptions}
          onClick={() => setShowOptions((v) => !v)}
          className="btn btn-ghost justify-center py-2.5 text-base"
        >
          ⚙️ Opciones
        </button>
        {loadFailed && (
          <p role="status" className="shake-error text-center text-sm text-danger">
            No se pudo cargar la partida guardada.
          </p>
        )}
      </nav>

      {showOptions && (
        <PopIn className="card flex w-80 max-w-full flex-col gap-3">
          <h2 className="card-title">Opciones</h2>
          <OptionToggles />
          <div className="flex flex-col gap-1 border-t border-line pt-3">
            <button type="button" onClick={onTutorial} className="btn btn-quiet justify-center">
              🎓 Jugar el tutorial (partida nueva)
            </button>
            <p className="text-xs text-ink-faint">
              El tutorial guía tu primera partida en el garaje; siempre se puede saltar.
            </p>
          </div>
        </PopIn>
      )}

      <footer
        className={`absolute inset-x-0 bottom-4 text-center font-mono text-[0.65rem] uppercase tracking-[0.25em] text-ink-faint ${
          motionOff ? '' : 'title-rise'
        }`}
        style={rise(2)}
      >
        1980 · un garaje cualquiera
      </footer>
    </main>
  );
}

/**
 * Los mismos toggles de presentación del pie de partida (App.tsx), sobre el
 * mismo store: una sola fuente de verdad para las preferencias (docs/10 §13).
 */
function OptionToggles() {
  const modernUi = useGameStore((s) => s.modernUi);
  const setModernUi = useGameStore((s) => s.setModernUi);
  const colorTheme = useGameStore((s) => s.colorTheme);
  const setColorTheme = useGameStore((s) => s.setColorTheme);
  const reduceMotion = useGameStore((s) => s.reduceMotion);
  const setReduceMotion = useGameStore((s) => s.setReduceMotion);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <label
        className="flex items-center gap-2"
        title="Tema claro de la interfaz (con las pieles de era manda la piel)"
      >
        <input
          type="checkbox"
          checked={colorTheme === 'light'}
          onChange={(e) => setColorTheme(e.target.checked ? 'light' : 'dark')}
          className="accent-action-hi"
        />
        Modo claro
      </label>
      <label className="flex items-center gap-2" title="Desactiva las pieles de era (docs/10 §8)">
        <input
          type="checkbox"
          checked={modernUi}
          onChange={(e) => setModernUi(e.target.checked)}
          className="accent-action-hi"
        />
        UI moderna siempre
      </label>
      <label
        className="flex items-center gap-2"
        title="Apaga partículas, desplazamientos y bucles; conserva los cambios de estado esenciales"
      >
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={(e) => setReduceMotion(e.target.checked)}
          className="accent-action-hi"
        />
        Reducir animaciones
      </label>
    </div>
  );
}
