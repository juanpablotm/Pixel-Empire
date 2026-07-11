import {
  computeBugLevel,
  computeTeamFactor,
  computeTeamOutput,
  projectProgress,
  projectTotalWeeks,
  realDesignShare,
} from '../../core';
import { devPhases, getDevPhase } from '../../data/devPhases';
import { features } from '../../data/features';
import { getGenre } from '../../data/genres';
import { useGameStore } from '../../state/store';
import { Avatar } from '../components/Avatar';

/**
 * Pantalla de desarrollo (docs/10 §10.3): reparto de esfuerzo por fase con
 * lectura del balance Diseño/Técnica frente al ideal del género, features como
 * tarjetas (solo en Concepto) y estado de bugs. Los cálculos viven en core/.
 */

function bugLabel(level: number): { text: string; color: string } {
  if (level <= 0.05) return { text: 'Impecable', color: 'text-emerald-400' };
  if (level < 0.3) return { text: 'Algunos bugs', color: 'text-amber-400' };
  return { text: 'Plaga de bugs', color: 'text-red-400' };
}

/** Lectura legible del balance actual frente al ideal del género. */
function balanceLabel(diff: number): { text: string; color: string } {
  if (diff < 0.08) return { text: 'cerca del ideal', color: 'text-emerald-400' };
  if (diff < 0.18) return { text: 'algo desviado', color: 'text-amber-400' };
  return { text: 'lejos del ideal', color: 'text-red-400' };
}

/** Lectura legible de un factor multiplicador (1 = neutro). */
function factorColor(value: number): string {
  if (value >= 1.0) return 'text-emerald-400';
  if (value >= 0.85) return 'text-amber-400';
  return 'text-red-400';
}

export function DevelopmentScreen() {
  const project = useGameStore((s) => s.game.projects[0]);
  const staff = useGameStore((s) => s.game.staff);
  const setFocus = useGameStore((s) => s.setFocus);
  const toggleFeature = useGameStore((s) => s.toggleFeature);
  const setCrunch = useGameStore((s) => s.setCrunch);
  const goTo = useGameStore((s) => s.goTo);

  if (!project) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-slate-400">No hay ningún proyecto en desarrollo.</p>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
        >
          Volver al estudio
        </button>
      </main>
    );
  }

  const genre = getGenre(project.genreId);
  const phaseSpec = getDevPhase(project.phase);
  const allocation = project.focus[project.phase - 1];

  // Lectura legible del equipo (los cálculos viven en core/systems/staff.ts).
  const team = staff.filter((e) => project.assignedStaff.includes(e.id));
  const teamResult = computeTeamFactor(team, project.genreId);
  const output = computeTeamOutput(team, project.crunch);

  const hasWork = project.designPoints + project.techPoints > 0;
  const dReal = hasWork ? realDesignShare(project.designPoints, project.techPoints) : null;
  const balanceInfo = dReal !== null ? balanceLabel(Math.abs(dReal - genre.idealDesign)) : null;

  const bugLevel = computeBugLevel(project.bugDebt, project.qaInvested);
  const bugs = bugLabel(bugLevel);

  const onSlider = (aspectId: string, value: number) => {
    setFocus(project.phase, { ...allocation, [aspectId]: value / 100 });
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{project.name}</h2>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
        >
          Volver al estudio
        </button>
      </div>

      {/* Fases y progreso */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="mb-3 flex gap-2">
          {devPhases.map((p) => (
            <span
              key={p.phase}
              aria-current={p.phase === project.phase ? 'step' : undefined}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                p.phase === project.phase
                  ? 'bg-emerald-500 text-slate-950'
                  : p.phase < project.phase
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-slate-800 text-slate-500'
              }`}
            >
              {p.phase}. {p.name}
            </span>
          ))}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.round(projectProgress(project) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Semana {Math.floor(project.weeksSpent)} de {projectTotalWeeks(project)} · deja correr el
          tiempo para avanzar
        </p>
      </section>

      {/* Equipo asignado: el Factor E legible (docs/03 factor E, docs/10 §10.6) */}
      <section className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Equipo asignado
          </h3>
          <button
            type="button"
            onClick={() => goTo('equipo')}
            className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
          >
            Gestionar equipo
          </button>
        </div>

        {team.length === 0 ? (
          <p className="text-sm text-red-400">
            Nadie trabaja en el proyecto: no avanzará hasta que asignes a alguien.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {team.map((e) => (
                <span
                  key={e.id}
                  title={`${e.name}${e.burnedOut ? ' (burnout)' : ''}`}
                  className="flex items-center gap-1.5 rounded-full bg-slate-800 py-0.5 pl-0.5 pr-2 text-xs text-slate-300"
                >
                  <Avatar seed={e.avatarSeed} size={20} />
                  {e.name}
                  {e.burnedOut && <span aria-hidden>🔥</span>}
                </span>
              ))}
              <span className="text-xs text-slate-500">
                output ×{output.toFixed(2)} por semana
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                Competencia{' '}
                <span className={factorColor(teamResult.competenceFactor)}>
                  ×{teamResult.competenceFactor.toFixed(2)}
                </span>
              </span>
              <span>
                Moral{' '}
                <span className={factorColor(teamResult.moraleFactor)}>
                  ×{teamResult.moraleFactor.toFixed(2)}
                </span>
              </span>
              <span>
                Sinergia{' '}
                <span className={factorColor(teamResult.synergyFactor)}>
                  ×{teamResult.synergyFactor.toFixed(2)}
                </span>
              </span>
              <span>
                Factor de equipo{' '}
                <span className={`font-semibold ${factorColor(teamResult.teamFactor)}`}>
                  ×{teamResult.teamFactor.toFixed(2)}
                </span>
              </span>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-3">
          <button
            type="button"
            aria-pressed={project.crunch}
            onClick={() => setCrunch(!project.crunch)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              project.crunch
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {project.crunch ? 'Crunch activo — desactivar' : 'Activar crunch'}
          </button>
          <p className="text-xs text-slate-500">
            El crunch acelera el desarrollo a costa de moral, energía y lealtad; los quemados
            rinden la mitad.
          </p>
        </div>
      </section>

      {/* Reparto de esfuerzo de la fase actual */}
      <section className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Reparto de esfuerzo — fase de {phaseSpec.name}
        </h3>
        {phaseSpec.aspects.map((aspect) => {
          const share = allocation[aspect.id] ?? 0;
          return (
            <label key={aspect.id} className="flex items-center gap-4">
              <span className="w-48 shrink-0 text-sm">{aspect.name}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(share * 100)}
                onChange={(e) => onSlider(aspect.id, Number(e.target.value))}
                aria-label={`Esfuerzo en ${aspect.name}`}
                className="flex-1 accent-emerald-500"
              />
              <span className="w-12 text-right text-sm tabular-nums text-slate-400">
                {Math.round(share * 100)} %
              </span>
            </label>
          );
        })}
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-800 pt-3 text-sm">
          {dReal !== null && balanceInfo ? (
            <span>
              Diseño {Math.round(dReal * 100)} % / Técnica {Math.round((1 - dReal) * 100)} % —{' '}
              ideal de {genre.name}: {Math.round(genre.idealDesign * 100)} %/
              {Math.round(genre.idealTech * 100)} % ·{' '}
              <span className={balanceInfo.color}>{balanceInfo.text}</span>
            </span>
          ) : (
            <span className="text-slate-500">
              El balance Diseño/Técnica se medirá con las primeras semanas de trabajo.
            </span>
          )}
          <span>
            Bugs: <span className={bugs.color}>{bugs.text}</span>
          </span>
        </div>
      </section>

      {/* Features (solo durante el Concepto) */}
      <section className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Features {project.phase !== 1 && '(cerradas al salir del Concepto)'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {features.map((feature) => {
            const chosen = project.chosenFeatureIds.includes(feature.id);
            const disabled = project.phase !== 1;
            return (
              <button
                key={feature.id}
                type="button"
                disabled={disabled}
                aria-pressed={chosen}
                onClick={() => toggleFeature(feature.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  chosen
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{feature.name}</span>
                  {chosen && <span aria-hidden>✔</span>}
                </div>
                <p className="mt-1 text-xs text-slate-400">{feature.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  +{feature.qualityValue} calidad · +{feature.timeCostWeeks} sem ·{' '}
                  {feature.bugRisk >= 0.15
                    ? 'riesgo de bugs alto'
                    : feature.bugRisk >= 0.08
                      ? 'riesgo de bugs medio'
                      : 'riesgo de bugs bajo'}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
