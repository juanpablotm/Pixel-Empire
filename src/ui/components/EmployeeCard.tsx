import { salaryTierOf, type Employee } from '../../core';
import { balance } from '../../data/balance';
import { specialtyLabels, tierLabels } from '../../data/staffTexts';
import { getTrait } from '../../data/traits';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
import { Avatar } from './Avatar';
import { StatBar } from './StatBar';

/**
 * Tarjeta de empleado (docs/10 §10.6): avatar procedural, moral/energía/
 * lealtad, skills, rasgos y acciones (asignar, formar, motivar, despedir).
 * Solo muestra y despacha; los efectos viven en core/systems/staff.ts.
 */

function ActionButton({
  onClick,
  disabled,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? 'bg-danger/15 text-danger-hi hover:bg-danger/25'
          : 'bg-control text-ink hover:bg-control-hi'
      }`}
    >
      {children}
    </button>
  );
}

export function EmployeeCard({ employee }: { employee: Employee }) {
  const projects = useGameStore((s) => s.game.projects);
  const rdStaff = useGameStore((s) => s.game.research.rdStaff);
  const activeProjectId = useGameStore((s) => s.activeProjectId);
  const capital = useGameStore((s) => s.game.studio.capital);
  const fire = useGameStore((s) => s.fire);
  const train = useGameStore((s) => s.train);
  const motivate = useGameStore((s) => s.motivate);
  const toggleAssignment = useGameStore((s) => s.toggleAssignment);
  const toggleResearch = useGameStore((s) => s.toggleResearch);

  // Con multi-proyecto (docs/02 §4): la acción asigna al proyecto activo.
  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const assignedProject = projects.find((p) => p.assignedStaff.includes(employee.id));
  const assigned = project !== undefined && project.assignedStaff.includes(employee.id);
  const inResearch = rdStaff.includes(employee.id);
  const tier = salaryTierOf(employee);
  const b = balance.staff;
  const bonusCost = Math.max(b.motivation.bonusMinCost, b.motivation.bonusWeeks * employee.salary);
  const severance = b.severanceWeeks * employee.salary;

  return (
    <article
      aria-label={`Empleado ${employee.name}`}
      className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4"
    >
      <div className="flex items-start gap-3">
        <Avatar seed={employee.avatarSeed} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{employee.name}</span>
            {employee.founder && (
              <span className="rounded bg-warn/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-capital">
                Fundador
              </span>
            )}
            {employee.burnedOut && (
              <span className="rounded bg-danger/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-danger-hi">
                Burnout
              </span>
            )}
            {assignedProject && (
              <span
                className="rounded bg-ok/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ok"
                title={assignedProject.name}
              >
                {projects.length > 1 ? `En «${assignedProject.name}»` : 'En proyecto'}
              </span>
            )}
            {inResearch && (
              <span className="rounded bg-warn/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-capital">
                En I+D
              </span>
            )}
          </div>
          <p className="text-xs text-ink-mute">
            {specialtyLabels[employee.specialty]} · {tierLabels[tier]} · Nivel {employee.level}
            {employee.founder ? '' : ` · ${formatMoney(employee.salary)}/sem`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <StatBar label="Moral" value={employee.morale} />
        <StatBar label="Energía" value={employee.energy} />
        <StatBar label="Lealtad" value={employee.loyalty} />
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-mute">
        {(Object.entries(specialtyLabels) as [keyof typeof specialtyLabels, string][]).map(
          ([spec, label]) => (
            <span key={spec} className={spec === employee.specialty ? 'text-ink' : ''}>
              {label} <span className="tabular-nums">{Math.round(employee.skills[spec])}</span>
            </span>
          ),
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {employee.traits.map((id) => {
          const trait = getTrait(id);
          return (
            <span
              key={id}
              title={trait.description}
              className="cursor-help rounded-full bg-raised px-2 py-0.5 text-[11px] text-ink"
            >
              {trait.name}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
        {project && (
          <ActionButton
            onClick={() => toggleAssignment(employee.id, project.id)}
            title={projects.length > 1 ? `Proyecto activo: «${project.name}»` : undefined}
          >
            {assigned ? 'Retirar del proyecto' : 'Asignar al proyecto'}
          </ActionButton>
        )}
        <ActionButton
          onClick={() => toggleResearch(employee.id)}
          title={inResearch ? 'Sacar de I+D' : 'Mover a I+D (~1 💡/semana)'}
        >
          {inResearch ? 'Sacar de I+D' : '💡 A I+D'}
        </ActionButton>
        <ActionButton
          onClick={() => train(employee.id, employee.specialty)}
          disabled={capital < b.training.cost}
          title={`+${b.training.skillGain} en ${specialtyLabels[employee.specialty]} por ${formatMoney(b.training.cost)}`}
        >
          Formar ({formatMoney(b.training.cost)})
        </ActionButton>
        <ActionButton
          onClick={() => motivate(employee.id, 'bonus')}
          disabled={capital < bonusCost}
          title={`+${b.motivation.bonusMorale} moral, +${b.motivation.bonusLoyalty} lealtad`}
        >
          Bonus ({formatMoney(bonusCost)})
        </ActionButton>
        {!employee.founder && (
          <>
            <ActionButton
              onClick={() => motivate(employee.id, 'aumento')}
              title={`Salario +${Math.round(b.motivation.raisePct * 100)} % permanente; +moral y +lealtad`}
            >
              Aumento
            </ActionButton>
            <ActionButton
              danger
              onClick={() => fire(employee.id)}
              title={`Finiquito: ${formatMoney(severance)}. Golpea la moral del resto.`}
            >
              Despedir
            </ActionButton>
          </>
        )}
      </div>
    </article>
  );
}
