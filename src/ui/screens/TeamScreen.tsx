import {
  hiringCost,
  policiesUnlocked,
  salaryTierOf,
  staffCap,
  type Employee,
  type SalaryPolicy,
} from '../../core';
import { balance } from '../../data/balance';
import { specialtyLabels, stageLabels, tierLabels } from '../../data/staffTexts';
import { getTrait } from '../../data/traits';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
import { Avatar } from '../components/Avatar';
import { EmployeeCard } from '../components/EmployeeCard';

/**
 * Pantalla de equipo (docs/10 §10.6): plantilla con tarjetas de empleado y
 * pool de contratación (bloqueado en el garaje). En la escala grande aparece
 * la gestión por políticas (docs/02 §4 y docs/10 §14): dejas de gestionar
 * persona a persona. La lógica vive en core/systems/staff.ts y policies.ts.
 */

const SALARY_POLICIES: { id: SalaryPolicy; label: string; hint: string }[] = [
  { id: 'austera', label: 'Austera', hint: 'Nómina más barata; la moral y la lealtad se erosionan.' },
  { id: 'mercado', label: 'De mercado', hint: 'Ni frío ni calor: el statu quo.' },
  { id: 'generosa', label: 'Generosa', hint: 'Nómina más cara; el equipo se queda y sonríe.' },
];

/** Vista de políticas (docs/10 §10.6: "En corporación, vista de políticas"). */
function PoliciesPanel() {
  const policies = useGameStore((s) => s.game.policies);
  const setPolicies = useGameStore((s) => s.setPolicies);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Políticas del estudio (se aplican solas cada semana)
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-40 shrink-0 text-sm text-slate-300">Política salarial</span>
        {SALARY_POLICIES.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={policies.salary === p.id}
            title={p.hint}
            onClick={() => setPolicies({ salary: p.id })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              policies.salary === p.id
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <label className="flex items-center gap-2" title="Prohíbe el crunch en todo el estudio; el equipo respira mejor.">
          <input
            type="checkbox"
            checked={policies.antiCrunch}
            onChange={(e) => setPolicies({ antiCrunch: e.target.checked })}
            className="accent-emerald-500"
          />
          Anti-crunch
        </label>
        <label
          className="flex items-center gap-2"
          title={`Cada ${balance.policies.autoTraining.intervalWeeks} semanas forma al empleado más flojo (${formatMoney(balance.staff.training.cost)}).`}
        >
          <input
            type="checkbox"
            checked={policies.autoTraining}
            onChange={(e) => setPolicies({ autoTraining: e.target.checked })}
            className="accent-emerald-500"
          />
          Formación automática
        </label>
        <label
          className="flex items-center gap-2"
          title={`Bonus automático a quien baje de ${balance.policies.autoBonus.moraleThreshold} de moral (máx. ${balance.policies.autoBonus.maxPerWeek}/semana).`}
        >
          <input
            type="checkbox"
            checked={policies.autoBonus}
            onChange={(e) => setPolicies({ autoBonus: e.target.checked })}
            className="accent-emerald-500"
          />
          Bonus automáticos
        </label>
      </div>
      <p className="text-xs text-slate-500">
        A esta escala ya no gestionas persona a persona: fijas la política y el estudio la ejecuta
        (docs/02 §4).
      </p>
    </section>
  );
}

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
  const showPolicies = useGameStore((s) => policiesUnlocked(s.game));
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

      {/* Gestión por políticas en la escala grande (docs/02 §4). */}
      {showPolicies && <PoliciesPanel />}

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
