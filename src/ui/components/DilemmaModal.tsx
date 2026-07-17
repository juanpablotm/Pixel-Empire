import { useGameStore } from '../../state/store';
import type { DilemmaChoice, DilemmaKind } from '../../core';

/**
 * Dilemas de pre-lanzamiento (docs/07 §4): leak de la alpha y sobre-hype.
 * Modal con dos salidas legibles; la decisión queda registrada y sus
 * consecuencias son trazables (capitalizar/prometer marcan la promesa).
 */

interface ChoiceSpec {
  choice: DilemmaChoice;
  name: string;
  detail: string;
  tone: 'integrity' | 'greed';
}

const dilemmaSpecs: Record<
  DilemmaKind,
  { title: string; body: string; choices: ChoiceSpec[] }
> = {
  leakAlpha: {
    title: '💾 Se ha filtrado una build alpha',
    body: 'Un empleado ha filtrado por accidente una alpha del juego en un foro. La comunidad ya la está diseccionando. ¿Cómo responde el estudio?',
    choices: [
      {
        choice: 'transparencia',
        name: 'Comunicado de disculpa y transparencia',
        detail: 'Pierdes algo de sorpresa (−hype), ganas confianza de la comunidad.',
        tone: 'integrity',
      },
      {
        choice: 'capitalizar',
        name: 'Capitalizar el hype («¡ya que está fuera…!»)',
        detail:
          '+hype gratis… y una promesa pública: si el juego final no cumple, el backlash se amplifica.',
        tone: 'greed',
      },
    ],
  },
  sobreHype: {
    title: '📣 El hype entra en zona roja',
    body: 'La expectación supera lo que ningún juego puede cumplir con seguridad. Marketing pregunta: ¿frenamos o pisamos el acelerador?',
    choices: [
      {
        choice: 'moderar',
        name: 'Moderar la campaña',
        detail: 'Baja el hype a niveles sanos; la comunidad agradece las expectativas realistas.',
        tone: 'integrity',
      },
      {
        choice: 'prometer',
        name: 'Prometer la luna',
        detail:
          'Hype al máximo y ventas de salida récord… si cumples. Si no, crisis de promesa rota casi garantizada.',
        tone: 'greed',
      },
    ],
  },
};

/** Se muestra mientras haya un dilema pendiente (el juego queda en pausa). */
export function DilemmaModal() {
  const dilemma = useGameStore((s) => s.game.community.dilemmas[0]);
  const projectName = useGameStore((s) => s.game.projects[0]?.name ?? '');
  const resolve = useGameStore((s) => s.resolveDilemma);
  if (!dilemma) return null;

  const spec = dilemmaSpecs[dilemma.kind];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-scrim p-6">
      <div className="review-pop modal-panel w-full max-w-xl rounded-lg border border-warn/60 p-6 shadow-2xl">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-warn">
          Dilema de pre-lanzamiento · «{projectName}»
        </p>
        <h2 className="text-xl font-bold text-ink-hi">{spec.title}</h2>
        <p className="mt-2 text-sm text-ink-mute">{spec.body}</p>

        <div className="mt-4 flex flex-col gap-2">
          {spec.choices.map((c) => (
            <button
              key={c.choice}
              type="button"
              onClick={() => resolve(dilemma.kind, c.choice)}
              className={`flex flex-col items-start gap-1 rounded-md border px-4 py-3 text-left transition-colors ${
                c.tone === 'integrity'
                  ? 'border-ok/40 bg-ok/10 hover:border-action'
                  : 'border-warn/40 bg-warn/10 hover:border-warn'
              }`}
            >
              <span className="font-semibold text-ink-hi">{c.name}</span>
              <span className="text-xs text-ink-mute">{c.detail}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
