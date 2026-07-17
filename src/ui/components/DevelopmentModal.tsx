import {
  availableFeatures,
  balanceRevealed,
  computeBugLevel,
  computeTeamFactor,
  computeTeamOutput,
  policiesUnlocked,
  projectProgress,
  projectTotalWeeks,
  realDesignShare,
  type Project,
} from '../../core';
import { balance } from '../../data/balance';
import { devPhases, getDevPhase } from '../../data/devPhases';
import { getGenre } from '../../data/genres';
import { marketingLevelNames } from '../../data/marketTexts';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
import { Avatar } from './Avatar';
import { HypeGauge } from './HypeGauge';
import { PopIn } from './Motion';

/**
 * Ventana de desarrollo (docs/10 §10.3), en MODAL y por FASES desde la Fase
 * 8.5: el desarrollo deja de ser una pantalla-columna infinita y pasa a ser el
 * HITO de cada fase (docs/02 §2, paso 3). Se abre al concebir y cada vez que el
 * núcleo cambia de fase (el tick pausa ahí); se decide el reparto de esa fase y
 * "Continuar desarrollo" cierra y reanuda a x1 — entonces se ve trabajar a la
 * Oficina Viva hasta el siguiente hito.
 *
 * Estructura en dos columnas: a la izquierda LA DECISIÓN de esta fase (reparto
 * de esfuerzo con su lectura, y las features en Concepto); a la derecha el
 * CONTEXTO (equipo y, desde Producción, marketing). Los cálculos viven en
 * core/; la UI solo muestra y despacha (docs/08 §6).
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

/** Tarjeta de sección dentro del modal (más compacta que las `.card`). */
function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-raised/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-mute">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DevelopmentModal() {
  const devProjectId = useGameStore((s) => s.devProjectId);
  const projects = useGameStore((s) => s.game.projects);
  // Cede el paso a lo que exige decisión: nunca dos modales compitiendo.
  const blocked = useGameStore(
    (s) =>
      s.game.gameOver !== null ||
      s.eraTransition !== null ||
      s.awardsWeek !== null ||
      s.pendingNotices.length > 0 ||
      s.conceptionOpen ||
      s.game.community.crises.some((c) => c.status === 'abierta') ||
      s.game.community.dilemmas.length > 0,
  );

  const project = projects.find((p) => p.id === devProjectId) ?? null;
  if (project === null || blocked) return null;
  return <DevelopmentBody project={project} />;
}

function DevelopmentBody({ project }: { project: Project }) {
  const game = useGameStore((s) => s.game);
  const projects = game.projects;
  const staff = game.staff;
  const capital = game.studio.capital;
  // La política anti-crunch solo aplica cuando las políticas están activas
  // (etapa de escala grande): el umbral lo decide el núcleo, no la UI.
  const antiCrunch = game.policies.antiCrunch && policiesUnlocked(game);
  const openDev = useGameStore((s) => s.openDev);
  const closeDev = useGameStore((s) => s.closeDev);
  const continueDev = useGameStore((s) => s.continueDev);
  const setFocus = useGameStore((s) => s.setFocus);
  const toggleFeature = useGameStore((s) => s.toggleFeature);
  const setCrunch = useGameStore((s) => s.setCrunch);
  const launchMarketing = useGameStore((s) => s.launchMarketing);
  const goTo = useGameStore((s) => s.goTo);

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
  // hacia dónde apuntar antes de lanzar.
  const balanceKnown = balanceRevealed(game, project.genreId);

  const bugLevel = computeBugLevel(project.bugDebt, project.qaInvested);
  const bugs = bugLabel(bugLevel);

  const featuresShown = availableFeatures(game);
  const inConcept = project.phase === 1;
  // El marketing no existe hasta Producción (docs/04 §4): antes ni ocupa sitio.
  const marketingOpen = project.phase >= balance.market.hype.startPhase;

  const onSlider = (aspectId: string, value: number) => {
    setFocus(project.phase, { ...allocation, [aspectId]: value / 100 }, project.id);
  };

  /** Navegar a otra pantalla cierra el modal: si no, quedaría por delante. */
  const leaveTo = (screen: 'equipo' | 'creadores') => {
    closeDev();
    goTo(screen);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Desarrollo de ${project.name}`}
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-scrim px-4 py-8"
    >
      <PopIn className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-lg border border-line-hi bg-panel shadow-2xl">
        {/* Cabecera: qué juego, en qué fase y cuánto lleva. */}
        <div className="flex flex-col gap-3 border-b border-line px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-mono text-lg font-bold text-ink-hi">{project.name}</h2>
              <span className="text-sm text-ink-mute">
                {genre.name} · semana {Math.floor(project.weeksSpent)} de{' '}
                {projectTotalWeeks(project)}
              </span>
            </div>
            <button type="button" onClick={closeDev} className="btn btn-quiet">
              ✕ Volver al estudio
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
                  onClick={() => openDev(p.id)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
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

          <div className="flex flex-wrap items-center gap-3">
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
                {p.phase < project.phase ? '✔ ' : ''}
                {p.phase}. {p.name}
              </span>
            ))}
            <div className="h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-raised">
              <div
                className="meter-fill h-full rounded-full bg-action-hi"
                style={{ transform: `scaleX(${projectProgress(project)})` }}
              />
            </div>
          </div>
        </div>

        <div className="scroll-slim grid flex-1 gap-4 overflow-y-auto px-6 py-5 lg:grid-cols-[3fr_2fr]">
          {/* ── Columna A: LA DECISIÓN de esta fase ───────────────────── */}
          <div className="flex flex-col gap-4">
            <Panel title={`Reparto de esfuerzo — fase de ${phaseSpec.name}`}>
              <div className="flex flex-col gap-3" data-tour="focus-sliders">
                {phaseSpec.aspects.map((aspect) => {
                  const share = allocation[aspect.id] ?? 0;
                  return (
                    <label key={aspect.id} className="flex items-center gap-4">
                      <span className="w-36 shrink-0 text-sm">{aspect.name}</span>
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
              </div>
              <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
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
            </Panel>

            {/* Features: la otra decisión del Concepto (se cierran al salir). */}
            {inConcept && (
              <Panel title="Features">
                <div className="grid gap-2 sm:grid-cols-2">
                  {featuresShown.map((feature) => {
                    const chosen = project.chosenFeatureIds.includes(feature.id);
                    return (
                      <button
                        key={feature.id}
                        type="button"
                        aria-pressed={chosen}
                        onClick={() => toggleFeature(feature.id, project.id)}
                        className={`rounded-lg border p-2.5 text-left transition-colors ${
                          chosen
                            ? 'border-action-hi bg-ok/10'
                            : 'border-line-hi bg-raised/60 hover:border-line-hi'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{feature.name}</span>
                          {chosen && <span aria-hidden>✔</span>}
                        </div>
                        <p className="mt-1 text-xs text-ink-mute">{feature.description}</p>
                        <p className="mt-1.5 text-xs text-ink-faint">
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
                <p className="text-xs text-ink-faint">
                  Solo se eligen en el Concepto: al pasar a Producción, el alcance queda cerrado.
                </p>
              </Panel>
            )}
          </div>

          {/* ── Columna B: el CONTEXTO con el que se decide ───────────── */}
          <div className="flex flex-col gap-4">
            <Panel
              title="Equipo asignado"
              action={
                <button
                  type="button"
                  onClick={() => leaveTo('equipo')}
                  className="btn btn-quiet px-2 py-1 text-xs"
                >
                  Gestionar equipo
                </button>
              }
            >
              {team.length === 0 ? (
                <p className="text-sm text-danger">
                  Nadie trabaja en el proyecto: no avanzará hasta que asignes a alguien.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
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
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
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
                    <span className="text-ink-faint">output ×{output.toFixed(2)} por semana</span>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  aria-pressed={project.crunch}
                  disabled={antiCrunch && !project.crunch}
                  title={antiCrunch ? 'La política anti-crunch del estudio lo prohíbe' : undefined}
                  onClick={() => setCrunch(!project.crunch, project.id)}
                  className={`self-start rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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
                  El crunch acelera a costa de moral, energía y lealtad; los quemados rinden la
                  mitad.
                </p>
              </div>
            </Panel>

            {marketingOpen ? (
              <Panel
                title="Marketing"
                action={
                  <button
                    type="button"
                    onClick={() => leaveTo('creadores')}
                    className="rounded-md bg-fuchsia-700 px-2 py-1 text-xs font-medium text-oncolor hover:bg-fuchsia-600"
                  >
                    🔑 Creadores
                  </button>
                }
              >
                <HypeGauge hype={project.hype} />
                <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                  {balance.economy.marketing.levels.map((campaign, level) => {
                    const used = project.marketingUsed.includes(level);
                    const noCash = capital < campaign.cost;
                    return (
                      <button
                        key={level}
                        type="button"
                        disabled={used || noCash}
                        title={
                          used
                            ? 'Campaña ya lanzada'
                            : noCash
                              ? 'No hay caja para esta campaña'
                              : `+${Math.round(campaign.hypeBoost * 100)} % hype a cambio de ${formatMoney(campaign.cost)}`
                        }
                        onClick={() => launchMarketing(level, project.id)}
                        className={`flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          used ? 'bg-raised text-ink-faint' : 'bg-warn text-onbright hover:bg-warn-hi'
                        } ${used || noCash ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <span>
                          {used ? '✔ ' : '📣 '}
                          {marketingLevelNames[level] ?? `Nivel ${level + 1}`}
                        </span>
                        <span className="tabular-nums">{formatMoney(campaign.cost)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-ink-faint">
                  El hype vende de salida… pero en <span className="text-danger">zona de riesgo</span>{' '}
                  el juego se compara con lo prometido: si no cumple, la cola de ventas y la
                  reputación se hunden.
                </p>
              </Panel>
            ) : (
              <Panel title="Marketing">
                <p className="text-xs text-ink-faint">
                  Todavía no hay nada que anunciar: las campañas abren en la fase de{' '}
                  {getDevPhase(balance.market.hype.startPhase).name}, cuando el juego ya se puede
                  enseñar.
                </p>
              </Panel>
            )}
          </div>
        </div>

        {/* Pie: la acción que reanuda el mundo (docs/17 U3). */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
          <p className="text-sm text-ink-mute">
            Cuando lo tengas, deja trabajar al equipo: la ventana vuelve a abrirse al terminar la
            fase de {phaseSpec.name}.
          </p>
          <button
            type="button"
            data-tour="continue-dev"
            onClick={continueDev}
            className="btn btn-primary px-5 py-2.5"
          >
            ▶ Continuar desarrollo
          </button>
        </div>
      </PopIn>
    </div>
  );
}
