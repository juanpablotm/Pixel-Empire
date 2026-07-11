import { hiringCost, salaryTierOf, staffCap, type Employee } from '../../core';
import { balance } from '../../data/balance';
import { specialtyLabels, stageLabels, tierLabels } from '../../data/staffTexts';
import { getTrait } from '../../data/traits';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
import { Avatar } from '../components/Avatar';
import { EmployeeCard } from '../components/EmployeeCard';

/**
 * Pantalla de equipo (docs/10 §10.6): plantilla con tarjetas de empleado y
 * pool de contratación (bloqueado en el garaje). La UI solo muestra estado
 * y despacha acciones; la lógica vive en core/systems/staff.ts.
 */

function CandidateCard({ candidate }: { candidate: Employee }) {
  const capital = useGameStore((s) => s.game.studio.capital);
  const staffCount = useGameStore((s) => s.game.staff.length);
  const cap = useGameStore((s) => staffCap(s.game));
  const hire = useGameStore((s) => s.hire);

  const cost = hiringCost(candidate);
  const full = staffCount >= cap;

  return (
    <article
      aria-label={`Candidato ${candidate.name}`}
      className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex items-start gap-3">
        <Avatar seed={candidate.avatarSeed} size={48} />
        <div className="min-w-0 flex-1">
          <span className="font-semibold">{candidate.name}</span>
          <p className="text-xs text-slate-400">
            {specialtyLabels[candidate.specialty]} · {tierLabels[salaryTierOf(candidate)]} · Nivel{' '}
            {candidate.level}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
        {(Object.entries(specialtyLabels) as [keyof typeof specialtyLabels, string][]).map(
          ([spec, label]) => (
            <span key={spec} className={spec === candidate.specialty ? 'text-slate-200' : ''}>
              {label} <span className="tabular-nums">{Math.round(candidate.skills[spec])}</span>
            </span>
          ),
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {candidate.traits.map((id) => {
          const trait = getTrait(id);
          return (
            <span
              key={id}
              title={trait.description}
              className="cursor-help rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300"
            >
              {trait.name}
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-3 text-sm">
        <span className="text-slate-400">
          {formatMoney(candidate.salary)}/sem · contratar: {formatMoney(cost)}
        </span>
        <button
          type="button"
          onClick={() => hire(candidate.id)}
          disabled={full || capital < cost}
          title={full ? 'La oficina está llena' : undefined}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          Contratar
        </button>
      </div>
    </article>
  );
}

export function TeamScreen() {
  const staff = useGameStore((s) => s.game.staff);
  const candidates = useGameStore((s) => s.game.candidates);
  const scaleStage = useGameStore((s) => s.game.studio.scaleStage);
  const cap = useGameStore((s) => staffCap(s.game));
  const goTo = useGameStore((s) => s.goTo);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          Equipo{' '}
          <span className="text-sm font-normal text-slate-400">
            {stageLabels[scaleStage]} · {staff.length}/{cap}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
        >
          Volver al estudio
        </button>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Plantilla</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {staff.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Candidatos
        </h3>
        {scaleStage === 1 ? (
          <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
            En el garaje no cabe nadie más. Reúne{' '}
            {formatMoney(balance.staff.scale.stage2CapitalThreshold)} para mudarte a una oficina
            pequeña y empezar a contratar.
          </p>
        ) : candidates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
            No queda nadie en el pool. Nuevos candidatos cada{' '}
            {balance.staff.candidates.refreshWeeks} semanas.
          </p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {candidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
            <p className="text-xs text-slate-500">
              El pool se renueva cada {balance.staff.candidates.refreshWeeks} semanas. Coste de
              contratación: {balance.staff.hiringCostWeeks} semanas de salario.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
