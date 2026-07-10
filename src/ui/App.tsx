import { useGameStore } from '../state/store';
import { SavePanel } from './components/SavePanel';
import { TimeControls } from './components/TimeControls';

/**
 * Pantalla única de la Fase 0: muestra el estado mínimo y los controles de
 * tiempo y guardado. Solo lee estado con selectores finos y despacha acciones;
 * nunca calcula reglas de juego (docs/08 §6).
 */
export function App() {
  const week = useGameStore((s) => s.game.week);
  const era = useGameStore((s) => s.game.era);
  const capital = useGameStore((s) => s.game.studio.capital);
  const seed = useGameStore((s) => s.game.seed);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">
          Pixel Empire{' '}
          <span className="font-normal text-slate-400">— Game Studio Tycoon</span>
        </h1>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-6 py-8">
        <section className="flex flex-wrap gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-400">Semana</div>
            <div className="text-2xl font-semibold tabular-nums">{week}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-400">Era</div>
            <div className="text-2xl font-semibold">{era}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-400">Capital</div>
            <div className="text-2xl font-semibold tabular-nums">
              {capital.toLocaleString('es-ES')} 💰
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Tiempo
          </h2>
          <TimeControls />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Partida
          </h2>
          <SavePanel />
        </section>
      </main>

      <footer className="border-t border-slate-800 px-6 py-3 text-xs text-slate-500">
        Fase 0 — Andamiaje · semilla {seed}
      </footer>
    </div>
  );
}
