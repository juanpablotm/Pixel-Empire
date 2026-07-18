import {
  availableFeatures,
  balanceRevealed,
  computeBugLevel,
  computeTeamFactor,
  computeTeamOutput,
  engineHasCapability,
  featureFitRevealed,
  policiesUnlocked,
  projectProgress,
  projectTotalWeeks,
  realDesignShare,
  type Feature,
  type FeatureAffinity,
  type GameState,
  type Project,
} from '../../core';
import { balance } from '../../data/balance';
import { devPhases, getDevPhase } from '../../data/devPhases';
import { featureGenreAffinity } from '../../data/features';
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

/** Una entrada del panel de features: tarjeta suelta o grupo de variantes (9.3). */
type FeatureEntry =
  | { kind: 'single'; feature: Feature }
  | { kind: 'group'; group: string; variants: Feature[] };

/**
 * Badge de encaje feature×género (9.3): banda cualitativa verde/ámbar/rojo,
 * nunca el número. Oculto hasta conocerse (nodo Teoría del diseño o haberlo
 * vivido en un lanzamiento — docs/17 P2: el conocimiento se gana).
 */
function affinityBadge(
  known: boolean,
  affinity: FeatureAffinity,
  genreName: string,
): { text: string; color: string } {
  if (!known) return { text: '❓ Encaje por descubrir', color: 'text-ink-faint' };
  if (affinity === 'encaja') return { text: `● Encaja con ${genreName}`, color: 'text-ok' };
  if (affinity === 'noEncaja') return { text: `● No pega con ${genreName}`, color: 'text-danger' };
  return { text: `● Ni fu ni fa en ${genreName}`, color: 'text-warn' };
}

/** Tarjeta de una feature en el Concepto: el núcleo decide (encaje, motor,
 *  revelado); aquí solo se muestra y se despacha el toggle (docs/08 §6). */
function FeatureCard({
  feature,
  game,
  project,
  genreName,
  onToggle,
}: {
  feature: Feature;
  game: GameState;
  project: Project;
  genreName: string;
  onToggle: () => void;
}) {
  const chosen = project.chosenFeatureIds.includes(feature.id);
  // El motor gatea features (9.2): sin la capacidad, la tarjeta sale atenuada
  // con su motivo. El núcleo decide (engineHasCapability); la UI solo muestra.
  const engineBlocked =
    !chosen &&
    feature.requiresEngineCapability !== undefined &&
    !engineHasCapability(game, project.engineId, feature.requiresEngineCapability);
  const badge = affinityBadge(
    featureFitRevealed(game, feature.id, project.genreId),
    featureGenreAffinity(feature, project.genreId),
    genreName,
  );
  return (
    <button
      type="button"
      aria-pressed={chosen}
      disabled={engineBlocked}
      title={engineBlocked ? 'El motor de este proyecto no tiene esa capacidad' : undefined}
      onClick={onToggle}
      className={`rounded-lg border p-2.5 text-left transition-colors ${
        chosen ? 'border-action-hi bg-ok/10' : 'border-line-hi bg-raised/60 hover:border-line-hi'
      } ${engineBlocked ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{feature.name}</span>
        {chosen && <span aria-hidden>✔</span>}
        {engineBlocked && <span aria-hidden>🔒</span>}
      </div>
      <p className={`mt-0.5 text-xs ${badge.color}`}>{badge.text}</p>
      <p className="mt-1 text-xs text-ink-mute">{feature.description}</p>
      <p className="mt-1.5 text-xs text-ink-faint">
        +{feature.qualityValue} calidad · +{feature.timeCostWeeks} sem ·{' '}
        {feature.bugRisk >= 0.15
          ? 'riesgo de bugs alto'
          : feature.bugRisk >= 0.08
            ? 'riesgo de bugs medio'
            : 'riesgo de bugs bajo'}
        {engineBlocked && ' · 🔒 exige capacidad del motor'}
      </p>
    </button>
  );
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
  const withdrawTeam = useGameStore((s) => s.withdrawTeam);
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
  // Variantes de un trade-off (9.3): las disponibles del mismo grupo se
  // muestran juntas; un grupo con una sola variante desbloqueada va suelto.
  const featureEntries: FeatureEntry[] = [];
  for (const feature of featuresShown) {
    const group = feature.variantGroup;
    const existing =
      group !== undefined
        ? featureEntries.find((e): e is FeatureEntry & { kind: 'group' } => e.kind === 'group' && e.group === group)
        : undefined;
    if (existing) {
      existing.variants.push(feature);
    } else if (group !== undefined && featuresShown.filter((f) => f.variantGroup === group).length > 1) {
      featureEntries.push({ kind: 'group', group, variants: [feature] });
    } else {
      featureEntries.push({ kind: 'single', feature });
    }
  }
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
      <PopIn className="modal-panel flex max-h-[85vh] w-full max-w-5xl flex-col rounded-lg border border-line-hi shadow-2xl">
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

            {/* Features: la otra decisión del Concepto (se cierran al salir).
                Desde 9.3 cada tarjeta muestra su ENCAJE con el género (si se
                conoce — docs/17 P2) y las variantes de un trade-off van
                agrupadas: elegir una desmarca la otra. */}
            {inConcept && (
              <Panel title="Features">
                <div className="grid gap-2 sm:grid-cols-2">
                  {featureEntries.map((entry) =>
                    entry.kind === 'group' ? (
                      <div
                        key={`grupo-${entry.group}`}
                        className="rounded-lg border border-dashed border-line-hi p-2 sm:col-span-2"
                      >
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                          Trade-off: elige una variante (la otra se desmarca)
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {entry.variants.map((feature) => (
                            <FeatureCard
                              key={feature.id}
                              feature={feature}
                              game={game}
                              project={project}
                              genreName={genre.name}
                              onToggle={() => toggleFeature(feature.id, project.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <FeatureCard
                        key={entry.feature.id}
                        feature={entry.feature}
                        game={game}
                        project={project}
                        genreName={genre.name}
                        onToggle={() => toggleFeature(entry.feature.id, project.id)}
                      />
                    ),
                  )}
                </div>
                <p className="text-xs text-ink-faint">
                  Solo se eligen en el Concepto: al pasar a Producción, el alcance queda cerrado. Una
                  feature que no pega con el género no aporta calidad y trae más bugs.
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
                /* Pausa, no cancelación (docs/18 V5): decir las dos mitades del
                   trato —ni avanza, ni se pierde— es lo que hace del descanso
                   una decisión y no un susto. */
                <div className="flex flex-col gap-1.5">
                  <span className="self-start rounded bg-warn/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-capital">
                    En pausa
                  </span>
                  <p className="text-sm text-ink">
                    Nadie trabaja en «{project.name}»: el desarrollo está parado y no se pierde nada.
                    Sigue en la semana {Math.floor(project.weeksSpent)} de {projectTotalWeeks(project)}
                    , y continuará ahí en cuanto vuelvas a asignar gente.
                  </p>
                </div>
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

              {/* Las dos palancas opuestas, juntas a propósito (docs/18 V5): el
                  crunch compra plazo con desgaste; retirar al equipo paga
                  desgaste con plazo. Verlas al lado es la decisión. */}
              <div className="flex flex-col gap-2 border-t border-line pt-3">
                <div className="flex flex-wrap gap-2">
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
                  <button
                    type="button"
                    disabled={team.length === 0}
                    title={
                      team.length === 0
                        ? 'No queda nadie en el proyecto'
                        : `Saca a las ${team.length} personas del proyecto: descansan y el desarrollo queda en pausa`
                    }
                    onClick={() => withdrawTeam(project.id)}
                    className="rounded-md bg-raised px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-control disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Retirar equipo (descanso)
                  </button>
                </div>
                <p className="text-xs text-ink-faint">
                  El crunch acelera a costa de moral, energía y lealtad; los quemados rinden la
                  mitad. Retirar al equipo hace lo contrario: recuperan energía y moral mientras el
                  proyecto espera parado.
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
                  {/* 9.1: las campañas son RE-COMPRABLES (marketing sin tope,
                      docs/19): cada compra vuelve a pagar y a sumar. El
                      contador ×N enseña cuánto bombo lleva cada nivel. */}
                  {balance.economy.marketing.levels.map((campaign, level) => {
                    const timesUsed = project.marketingUsed.filter((l) => l === level).length;
                    const noCash = capital < campaign.cost;
                    return (
                      <button
                        key={level}
                        type="button"
                        disabled={noCash}
                        title={
                          noCash
                            ? 'No hay caja para esta campaña'
                            : `+${Math.round(campaign.hypeBoost * 100)} de expectación a cambio de ${formatMoney(campaign.cost)}${timesUsed > 0 ? ' (repetible: cada compra suma)' : ''}`
                        }
                        onClick={() => launchMarketing(level, project.id)}
                        className={`flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors bg-warn text-onbright hover:bg-warn-hi ${
                          noCash ? 'cursor-not-allowed opacity-60' : ''
                        }`}
                      >
                        <span>
                          📣 {marketingLevelNames[level] ?? `Nivel ${level + 1}`}
                          {timesUsed > 0 && (
                            <span className="ml-1.5 rounded-full bg-black/20 px-1.5 text-xs tabular-nums">
                              ×{timesUsed}
                            </span>
                          )}
                        </span>
                        <span className="tabular-nums">{formatMoney(campaign.cost)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-ink-faint">
                  Sin tope: cada campaña vuelve a sumar expectación… pero en{' '}
                  <span className="text-danger">zona de riesgo</span> el juego se compara con lo
                  prometido: si no cumple, la caída es tan grande como fue el bombo.
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
