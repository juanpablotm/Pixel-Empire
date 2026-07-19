import { useGameStore } from '../../state/store';
import { balance } from '../../data/balance';

/**
 * Ventana disputada (Fase 9.5, docs/19 §9.5): un proyecto terminado coincide
 * con el bombazo anunciado de un gigante en su mismo género. Modal con dos
 * salidas legibles — lanzar igual (pico aplastado, el castigo se enseña antes)
 * o esperar a que pase (el precio es la nómina corriendo). Presentación pura:
 * lee project.pendingRelease (lo fija el núcleo) y despacha acciones.
 */
export function ReleaseWindowModal() {
  const project = useGameStore((s) => s.game.projects.find((p) => p.pendingRelease));
  const week = useGameStore((s) => s.game.week);
  const launch = useGameStore((s) => s.confirmContestedRelease);
  const delay = useGameStore((s) => s.delayContestedRelease);
  if (!project?.pendingRelease) return null;

  const pending = project.pendingRelease;
  const crushPct = Math.round(balance.rivals.window.crushPenalty * 100);
  const waitWeeks = Math.max(1, pending.windowEndWeek + 1 - week);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-scrim p-6">
      <div className="review-pop modal-panel w-full max-w-xl rounded-lg border border-warn/60 p-6 shadow-2xl">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-warn">
          Ventana disputada · «{project.name}»
        </p>
        <h2 className="text-xl font-bold text-ink-hi">🏬 {pending.rivalName} lanza contra ti</h2>
        <p className="mt-2 text-sm text-ink-mute">
          Tu juego está listo, pero «{pending.gameName}» — el bombazo de {pending.rivalName}, de tu
          mismo género — sale con campaña masiva en esta misma ventana. Su ruido aplastaría tu
          estreno. Lo sabías por el calendario de Industria: ahora toca decidir.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => delay(project.id)}
            className="flex flex-col items-start gap-1 rounded-md border border-ok/40 bg-ok/10 px-4 py-3 text-left transition-colors hover:border-action"
          >
            <span className="font-semibold text-ink-hi">Esperar a que pase (~{waitWeeks} sem.)</span>
            <span className="text-xs text-ink-mute">
              El juego espera en el cajón y sale solo al cerrarse la ventana. La nómina sigue
              corriendo y el mercado no te espera — pero estrenas con los focos libres.
            </span>
          </button>
          <button
            type="button"
            onClick={() => launch(project.id)}
            className="flex flex-col items-start gap-1 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-left transition-colors hover:border-warn"
          >
            <span className="font-semibold text-ink-hi">Lanzar igual</span>
            <span className="text-xs text-ink-mute">
              Sales hoy, en plena campaña del gigante: tu pico de salida cae ~{crushPct} %. La cola
              (el boca a boca) sigue intacta — si el juego es muy bueno, puede compensar.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
