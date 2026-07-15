import {
  availableFeatures,
  balanceRevealed,
  computeBugLevel,
  computeTeamFactor,
  computeTeamOutput,
  projectProgress,
  projectTotalWeeks,
  realDesignShare,
} from '../../core';
import { balance } from '../../data/balance';
import { devPhases, getDevPhase } from '../../data/devPhases';
import { getGenre } from '../../data/genres';
import { marketingLevelNames } from '../../data/marketTexts';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { HypeGauge } from '../components/HypeGauge';

/**
 * Pantalla de desarrollo (docs/10 §10.3): reparto de esfuerzo por fase con
 * lectura del balance Diseño/Técnica frente al ideal del género, features como
 * tarjetas (solo en Concepto, filtradas por era/investigación) y estado de
 * bugs. Con varios proyectos en paralelo (docs/02 §4) se elige con pestañas.
 * Los cálculos viven en core/.
 */

function bugLabel(level: number): { text: string; color: string } {
  if (level <= 0.05) return { text: 'Impecable', color: 'text-ok' };
  if (level < 0.3) return { text: 'Algunos bugs', color: 'text-warn' };
  return { text: 'Plaga de bugs', color: 'text-danger' };
}

/** Lectura legible del balance actual frente al ideal del género. */
function balanceLabel(diff: number): { text: string; color: string } {
  if (diff < 0.08) return { text: 'cerca del ideal', color: 'text-ok' };
  if (diff < 0.18) return { text: 'algo desviado', color: 'text-warn' };
  return { text: 'lejos del ideal', color: 'text-danger' };
}

/** Lectura legible de un factor multiplicador (1 = neutro). */
function factorColor(value: number): string {
  if (value >= 1.0) return 'text-ok';
  if (value >= 0.85) return 'text-warn';
  return 'text-danger';
}

export function DevelopmentScreen() {
  const game = useGameStore((s) => s.game);
  const activeProjectId = useGameStore((s) => s.activeProjectId);
  const selectProject = useGameStore((s) => s.selectProject);
  const projects = game.projects;
  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const staff = game.staff;
  const capital = game.studio.capital;
  const antiCrunch = game.policies.antiCrunch && game.studio.scaleStage >= 3;
  const setFocus = useGameStore((s) => s.setFocus);
  const toggleFeature = useGameStore((s) => s.toggleFeature);
  const setCrunch = useGameStore((s) => s.setCrunch);
  const launchMarketing = useGameStore((s) => s.launchMarketing);
  const goTo = useGameStore((s) => s.goTo);

  if (!project) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <EmptyState
          icon="🎮"
          actionLabel="💡 Nuevo juego"
          onAction={() => goTo('concepcion')}
        >
          La mesa de desarrollo está libre: en cuanto concibas un juego, aquí vivirán
          sus fases, su reparto de esfuerzo y sus bugs.
        </EmptyState>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="btn btn-ghost"
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
  // El ideal del género es una PISTA PREDICTIVA (docs/17 P2): se investiga. El
  // balance propio (dReal) siempre se ve —es tu juego—; lo que se paga es saber
  // hacia dónde apuntar antes de lanzar (Estudio de géneros, o "Investigar
  // resultados" de un juego de este género).
  const balanceKnown = balanceRevealed(game, project.genreId);

  const bugLevel = computeBugLevel(project.bugDebt, project.qaInvested);
  const bugs = bugLabel(bugLevel);

  const featuresShown = availableFeatures(game);

  const onSlider = (aspectId: string, value: number) => {
    setFocus(project.phase, { ...allocation, [aspectId]: value / 100 }, project.id);
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{project.name}</h2>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-raised px-3 py-1.5 text-sm text-ink hover:bg-control"
        >
          Volver al estudio
        </button>
      </div>

      {/* Pestañas de proyecto (multi-proyecto, docs/02 §4 y docs/10 §14). */}
      {projects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === project.id}
              onClick={() => selectProject(p.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                p.id === project.id
                  ? 'bg-action-hi text-onbright'
                  : 'bg-raised text-ink hover:bg-control'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Fases y progreso */}
      <section className="card">
        <div className="mb-3 flex gap-2">
          {devPhases.map((p) => (
            <span
              key={p.phase}
              aria-current={p.phase === project.phase ? 'step' : undefined}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                p.phase === project.phase
                  ? 'bg-action-hi text-onbright'
                  : p.phase < project.phase
                    ? 'bg-control text-ink'
                    : 'bg-raised text-ink-faint'
              }`}
            >
              {p.phase}. {p.name}
            </span>
          ))}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-raised">
          <div
            className="meter-fill h-full rounded-full bg-action-hi"
            style={{ transform: `scaleX(${projectProgress(project)})` }}
          />
        </div>
        <p className="mt-2 text-sm text-ink-mute">
          Semana {Math.floor(project.weeksSpent)} de {projectTotalWeeks(project)} · deja correr el
          tiempo para avanzar
        </p>
        {/* Manómetro de Hype (docs/04 §4): crece desde Producción, más con la moda. */}
        <div className="mt-4 border-t border-line pt-4">
          <HypeGauge hype={project.hype} />
        </div>
        {/* Marketing como coste (docs/06 §4): campañas que compran hype. */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <span className="text-sm font-semibold uppercase tracking-wide text-ink-mute">
            Marketing
          </span>
          {balance.economy.marketing.levels.map((campaign, level) => {
            const used = project.marketingUsed.includes(level);
            const tooEarly = project.phase < balance.market.hype.startPhase;
            const noCash = capital < campaign.cost;
            return (
              <button
                key={level}
                type="button"
                disabled={used || tooEarly || noCash}
                title={
                  tooEarly
                    ? 'Disponible desde la fase de Producción (el anuncio)'
                    : used
                      ? 'Campaña ya lanzada'
                      : `+${Math.round(campaign.hypeBoost * 100)} % hype a cambio de ${formatMoney(campaign.cost)}`
                }
                onClick={() => launchMarketing(level, project.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  used
                    ? 'bg-raised text-ink-faint'
                    : 'bg-warn text-onbright hover:bg-warn-hi'
                } ${used || tooEarly || noCash ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {used ? '✔ ' : '📣 '}
                {marketingLevelNames[level] ?? `Nivel ${level + 1}`} · {formatMoney(campaign.cost)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => goTo('creadores')}
            className="rounded-md bg-fuchsia-700 px-3 py-1.5 text-sm font-medium text-oncolor hover:bg-fuchsia-600"
          >
            🔑 Campaña de creadores
          </button>
          <p className="text-xs text-ink-faint">
            Campañas escalonadas: las caras son muy caras pero muy efectivas. El hype vende de
            salida… pero en <span className="text-danger">zona de riesgo</span> el juego se compara
            con lo prometido: si no cumple, la cola de ventas y la reputación se hunden.
          </p>
        </div>
      </section>

      {/* Equipo asignado: el Factor E legible (docs/03 factor E, docs/10 §10.6) */}
      <section className="flex flex-col gap-3 card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-mute">
            Equipo asignado
          </h3>
          <button
            type="button"
            onClick={() => goTo('equipo')}
            className="rounded bg-raised px-2 py-1 text-xs text-ink hover:bg-control"
          >
            Gestionar equipo
          </button>
        </div>

        {team.length === 0 ? (
          <p className="text-sm text-danger">
            Nadie trabaja en el proyecto: no avanzará hasta que asignes a alguien.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {team.map((e) => (
                <span
                  key={e.id}
                  title={`${e.name}${e.burnedOut ? ' (burnout)' : ''}`}
                  className="flex items-center gap-1.5 rounded-full bg-raised py-0.5 pl-0.5 pr-2 text-xs text-ink"
                >
                  <Avatar seed={e.avatarSeed} size={20} />
                  {e.name}
                  {e.burnedOut && <span aria-hidden>🔥</span>}
                </span>
              ))}
              <span className="text-xs text-ink-faint">
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

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <button
            type="button"
            aria-pressed={project.crunch}
            disabled={antiCrunch && !project.crunch}
            title={antiCrunch ? 'La política anti-crunch del estudio lo prohíbe' : undefined}
            onClick={() => setCrunch(!project.crunch, project.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              project.crunch
                ? 'bg-danger-deep text-oncolor hover:bg-danger-deep'
                : 'bg-raised text-ink hover:bg-control'
            } ${antiCrunch && !project.crunch ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {project.crunch
              ? 'Crunch activo — desactivar'
              : antiCrunch
                ? 'Crunch prohibido (política)'
                : 'Activar crunch'}
          </button>
          <p className="text-xs text-ink-faint">
            El crunch acelera el desarrollo a costa de moral, energía y lealtad; los quemados
            rinden la mitad.
          </p>
        </div>
      </section>

      {/* Reparto de esfuerzo de la fase actual */}
      <section className="flex flex-col gap-4 card" data-tour="focus-sliders">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-mute">
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
                className="flex-1 accent-action-hi"
              />
              <span className="w-12 text-right text-sm tabular-nums text-ink-mute">
                {Math.round(share * 100)} %
              </span>
            </label>
          );
        })}
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-sm">
          {dReal !== null ? (
            <span>
              Diseño {Math.round(dReal * 100)} % / Técnica {Math.round((1 - dReal) * 100)} %
              {balanceKnown && balanceInfo ? (
                <>
                  {' '}
                  — ideal de {genre.name}: {Math.round(genre.idealDesign * 100)} %/
                  {Math.round(genre.idealTech * 100)} % ·{' '}
                  <span className={balanceInfo.color}>{balanceInfo.text}</span>
                </>
              ) : (
                <span className="text-ink-faint">
                  {' '}
                  — ❓ ideal de {genre.name} por investigar (Estudio de géneros, en I+D)
                </span>
              )}
            </span>
          ) : (
            <span className="text-ink-faint">
              El balance Diseño/Técnica se medirá con las primeras semanas de trabajo.
            </span>
          )}
          <span>
            Bugs: <span className={bugs.color}>{bugs.text}</span>
          </span>
        </div>
      </section>

      {/* Features (solo durante el Concepto) */}
      <section className="flex flex-col gap-3 card">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-mute">
          Features {project.phase !== 1 && '(cerradas al salir del Concepto)'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {featuresShown.map((feature) => {
            const chosen = project.chosenFeatureIds.includes(feature.id);
            const disabled = project.phase !== 1;
            return (
              <button
                key={feature.id}
                type="button"
                disabled={disabled}
                aria-pressed={chosen}
                onClick={() => toggleFeature(feature.id, project.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  chosen
                    ? 'border-action-hi bg-ok/10'
                    : 'border-line-hi bg-raised/60 hover:border-line-hi'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{feature.name}</span>
                  {chosen && <span aria-hidden>✔</span>}
                </div>
                <p className="mt-1 text-xs text-ink-mute">{feature.description}</p>
                <p className="mt-2 text-xs text-ink-faint">
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
