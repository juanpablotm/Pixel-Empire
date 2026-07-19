import { useGameStore } from '../../state/store';
import { balance } from '../../data/balance';
import { getRivalDef } from '../../data/rivals';
import { specialtyLabels } from '../../data/staffTexts';

/**
 * Caza de talento (Fase 9.5, docs/19 §9.5 + docs/05 §7): un rival tienta a un
 * empleado con la lealtad hundida. Dos salidas legibles — igualar la oferta
 * (salario nuevo PARA SIEMPRE) o dejarle ir (el rival se fortalece). El coste
 * se enseña antes de decidir. Presentación pura: lee rivals.poachOffer.
 */
export function PoachModal() {
  const offer = useGameStore((s) => s.game.rivals?.poachOffer ?? null);
  const employee = useGameStore((s) =>
    s.game.staff.find((e) => e.id === s.game.rivals?.poachOffer?.employeeId),
  );
  const resolve = useGameStore((s) => s.resolvePoachOffer);
  if (!offer || !employee) return null;

  const rival = getRivalDef(offer.rivalId);
  const star = employee.skills[employee.specialty] >= balance.rivals.poach.starSkill;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-scrim p-6">
      <div className="review-pop modal-panel w-full max-w-xl rounded-lg border border-warn/60 p-6 shadow-2xl">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-warn">
          Caza de talento · {rival.name}
        </p>
        <h2 className="text-xl font-bold text-ink-hi">
          🎯 Quieren llevarse a {employee.name}
          {star ? ' — tu estrella' : ''}
        </h2>
        <p className="mt-2 text-sm text-ink-mute">
          {rival.name} ha puesto sobre la mesa {offer.offeredSalary} 💰/semana por{' '}
          {employee.name} ({specialtyLabels[employee.specialty]}, skill{' '}
          {employee.skills[employee.specialty]}). Su lealtad estaba baja: el descontento abre la
          puerta y la competencia la cruza.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => resolve('igualar')}
            className="flex flex-col items-start gap-1 rounded-md border border-ok/40 bg-ok/10 px-4 py-3 text-left transition-colors hover:border-action"
          >
            <span className="font-semibold text-ink-hi">
              Igualar la oferta ({offer.offeredSalary} 💰/sem., antes {employee.salary})
            </span>
            <span className="text-xs text-ink-mute">
              Se queda con la lealtad reforzada — y con el salario nuevo PARA SIEMPRE. Retener
              cuesta cada semana.
            </span>
          </button>
          <button
            type="button"
            onClick={() => resolve('dejar')}
            className="flex flex-col items-start gap-1 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-left transition-colors hover:border-warn"
          >
            <span className="font-semibold text-ink-hi">Dejarle ir</span>
            <span className="text-xs text-ink-mute">
              {star
                ? 'Pierdes a una estrella (el techo de tus obras maestras la necesitaba) y el rival se fortalece a lo grande.'
                : 'Ahorras el salario; el rival se fortalece con tu gente y tu fama de empleador se resiente.'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
