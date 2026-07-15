import { type ReactNode } from 'react';
import { projectCap, projectProgress, projectTotalWeeks, visibleReview } from '../../core';
import { useGameStore } from '../../state/store';
import { getDevPhase } from '../../data/devPhases';
import { getGenre } from '../../data/genres';
import { getTheme } from '../../data/themes';
import { formatMoney } from '../format';
import { CommunityFeed } from '../components/CommunityFeed';
import { EmptyState } from '../components/EmptyState';
import { StaggerGroup, StaggerItem } from '../components/Motion';
import { OfficeScene } from '../components/OfficeScene';
import { ReputationRadar } from '../components/ReputationRadar';
import { SentimentMeter } from '../components/SentimentMeter';
import { Sparkline } from '../components/Sparkline';
import { skinFor } from '../theme/eraSkins';

/**
 * Vista principal del estudio (docs/10 §10.1, jerarquía de la Fase 7A): un
 * escenario HERO central protagonista —donde en la 7B vivirá la Oficina
 * Viva— con el proyecto en curso como marquesina, una fila compacta de
 * accesos, los juegos que AÚN SE VENDEN con su cola de ventas, y el lateral
 * social. Desde la Fase 8.5 (docs/17 U2) la estantería completa, el historial
 * y las opciones de partida viven en el menú de la barra superior: la pantalla
 * principal enseña solo lo vivo. La UI solo muestra; el estado viene de core/.
 */

/** Lo más popular ahora mismo (solo presentación; el estado viene de core/). */
function hottest(trends: Record<string, { pop: number }>): string | null {
  const entries = Object.entries(trends);
  if (entries.length === 0) return null;
  return entries.reduce((best, cur) => (cur[1].pop > best[1].pop ? cur : best))[0];
}

export function StudioScreen() {
  const market = useGameStore((s) => s.game.market);
  const community = useGameStore((s) => s.game.community);
  const goTo = useGameStore((s) => s.goTo);

  const hotGenre = hottest(market.genres);
  const hotTheme = hottest(market.themes);

  return (
    <main className="grid flex-1 items-start gap-6 px-6 py-6 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-6">
        <HeroStage />

        {/* Accesos rápidos: lo demás se demota frente al escenario (7A). */}
        <section className="card">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickAccess
              caption="Equipo"
              detail={<TeamCaption />}
              button="👥 Ver equipo"
              onClick={() => goTo('equipo')}
            />
            <QuickAccess
              caption="Mercado"
              detail={
                hotGenre && hotTheme
                  ? `De moda: ${getGenre(hotGenre).name} y ${getTheme(hotTheme).name}.`
                  : 'El mercado despierta.'
              }
              button="📈 Ver tendencias"
              onClick={() => goTo('mercado')}
            />
            <QuickAccess
              caption="Caja y campañas"
              detail={<FinanceCaption />}
              button="💰 Finanzas"
              onClick={() => goTo('finanzas')}
              extra={
                <button type="button" onClick={() => goTo('creadores')} className="btn btn-quiet">
                  📣 Creadores
                </button>
              }
            />
            <QuickAccess
              caption="I+D"
              detail="Nuevas tecnologías y features."
              button={<ResearchButtonLabel />}
              onClick={() => goTo('investigacion')}
            />
          </div>
        </section>

        <OnSaleShelf />
      </div>

      <aside className="flex flex-col gap-6">
        <section className="card">
          <h2 className="card-title">Reputación</h2>
          <ReputationCard />
        </section>
        {/* El hub de la Comunidad (docs/07 §2): termómetro + feed "Chirp". */}
        <section className="card">
          <h2 className="card-title">Comunidad</h2>
          <SentimentMeter sentiment={community.sentiment} />
          <div className="mt-4 max-h-80 overflow-y-auto border-t border-line pt-3">
            <CommunityFeed
              posts={community.feed}
              urgent={
                community.bombs.length > 0 ||
                community.crises.some((c) => c.status === 'abierta')
              }
            />
          </div>
        </section>
      </aside>
    </main>
  );
}

/**
 * Los juegos que AÚN SE VENDEN (docs/17 U2), cada uno con el mini-gráfico de
 * copias por semana: la cola de ventas de docs/04 §6, a la vista (Pilar 2). Lo
 * retirado no ocupa sitio aquí: vive en el modal "Juegos lanzados" del menú.
 * `salesActive` lo decide core/systems/sales.ts; la UI solo filtra por él.
 */
function OnSaleShelf() {
  // El selector devuelve la referencia del estado y el filtro vive en el render:
  // filtrar DENTRO del selector crearía un array nuevo por render y Zustand,
  // que compara por referencia, re-renderizaría en bucle.
  const releasedGames = useGameStore((s) => s.game.releasedGames);
  const firstProject = useGameStore((s) => s.game.projects[0] ?? null);
  const community = useGameStore((s) => s.game.community);
  const openReview = useGameStore((s) => s.openReview);
  const openMenuModal = useGameStore((s) => s.openMenuModal);

  // `salesActive` lo decide el núcleo al caer bajo el umbral de ventas.
  const onSale = releasedGames.filter((g) => g.salesActive);
  const releasedCount = releasedGames.length;

  return (
    <section className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="card-title mb-0">A la venta</h2>
        {releasedCount > 0 && (
          <button
            type="button"
            onClick={() => openMenuModal('juegos')}
            className="btn btn-quiet px-2 py-1 text-xs"
          >
            🕹️ Ver los {releasedCount} lanzados
          </button>
        )}
      </div>

      <div className="mt-3">
        {onSale.length === 0 ? (
          <EmptyState icon="🕹️">
            {releasedCount > 0 ? (
              <>
                Ningún juego sigue en tiendas: la caja depende de lo próximo que lances. Tu
                catálogo entero está en el menú, en «Juegos lanzados».
              </>
            ) : firstProject !== null ? (
              <>
                El mostrador espera su primer juego: «{firstProject.name}» está en el horno y
                estrenará el hueco.
              </>
            ) : (
              'El mostrador espera tu primer lanzamiento. Concibe un juego en el escenario de arriba y ponle nombre.'
            )}
          </EmptyState>
        ) : (
          <StaggerGroup tag="ul" className="flex flex-col gap-2">
            {[...onSale].reverse().map((game) => {
              const lastWeek = game.weeklySales[game.weeklySales.length - 1] ?? 0;
              return (
                <StaggerItem
                  tag="li"
                  key={game.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-line bg-raised/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-hi">{game.name}</p>
                    {visibleReview(game, community) < game.review ? (
                      <span
                        className="text-sm font-semibold text-danger"
                        title={`Review bombing en curso: la nota real es ${game.review}/100`}
                      >
                        💣 Nota visible {visibleReview(game, community)}/100
                      </span>
                    ) : (
                      <span className="font-mono text-sm tabular-nums text-ink-mute">
                        Reseña {game.review}/100
                      </span>
                    )}
                  </div>

                  <div className="ml-auto flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-mono text-sm tabular-nums text-ink">
                        {lastWeek.toLocaleString('es-ES')} uds
                      </p>
                      <p className="text-xs text-ink-faint">esta semana</p>
                    </div>
                    <Sparkline
                      values={game.weeklySales}
                      title={`Copias por semana de ${game.name}`}
                    />
                  </div>

                  <div className="w-full text-xs text-ink-faint sm:w-auto">
                    {game.totalUnits.toLocaleString('es-ES')} uds · {formatMoney(game.totalRevenue)}{' '}
                    en total
                  </div>
                  <button
                    type="button"
                    onClick={() => openReview(game.id)}
                    className="btn btn-quiet px-2 py-1 text-xs"
                  >
                    Ver reseña
                  </button>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        )}
      </div>
    </section>
  );
}

/**
 * El escenario del estudio (Fase 7B, docs/10 §5): la Oficina Viva ocupa el
 * telón hero. Encima, como HUD diegético, la marquesina del proyecto en
 * curso con su progreso; en silencio, la llamada a inventar el próximo éxito.
 */
function HeroStage() {
  const projects = useGameStore((s) => s.game.projects);
  const cap = useGameStore((s) => projectCap(s.game));
  const era = useGameStore((s) => s.game.era);
  const modernUi = useGameStore((s) => s.modernUi);
  const selectProject = useGameStore((s) => s.selectProject);
  const goTo = useGameStore((s) => s.goTo);
  // La concepción es un modal desde la Fase 8.5 (docs/17 U3): abrirlo pausa.
  const openConception = useGameStore((s) => s.openConception);
  const idle = projects.length === 0;

  return (
    <section className="hero-stage card relative flex min-h-[26rem] flex-col overflow-hidden">
      <div className="relative z-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="card-title mb-0">
          El estudio{cap > 1 ? ` · proyectos ${projects.length}/${cap}` : ''}
        </h2>
        <span className="text-xs italic text-ink-faint">{skinFor(era, modernUi).flavor}</span>
      </div>

      {/* La escena sangra hasta los bordes de la tarjeta: es el foco (docs/13 7B). */}
      <div className="relative -mx-5 -mb-5 mt-3 flex flex-1 flex-col justify-end">
        <OfficeScene />

        {idle ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
            <p className="max-w-sm rounded-lg border border-line bg-panel/90 px-4 py-2 text-lg text-ink-mute shadow-[var(--shadow-flat)]">
              El estudio está en silencio. Toca inventar el próximo éxito.
            </p>
            <button
              type="button"
              data-tour="new-game"
              onClick={openConception}
              className="btn btn-primary px-6 py-3 text-base"
            >
              💡 Nuevo juego
            </button>
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-panel/85 px-4 py-2.5 shadow-[var(--shadow-flat)] backdrop-blur-sm"
              >
                <span className="font-mono text-lg font-bold tracking-tight text-ink-hi">
                  {project.name}
                </span>
                <span className="text-xs text-ink-mute">
                  Fase de {getDevPhase(project.phase).name} · semana{' '}
                  {Math.floor(project.weeksSpent)} de {projectTotalWeeks(project)} ·{' '}
                  {project.assignedStaff.length} 👥
                </span>
                <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-raised">
                  <div
                    className="meter-fill h-full rounded-full bg-action-hi"
                    style={{ transform: `scaleX(${projectProgress(project)})` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    selectProject(project.id);
                    goTo('desarrollo');
                  }}
                  className="btn btn-primary px-3 py-1.5 text-xs"
                >
                  Ver desarrollo
                </button>
              </div>
            ))}
            {projects.length < cap && (
              <button
                type="button"
                onClick={openConception}
                className="btn btn-ghost self-start border-line bg-panel/85"
              >
                💡 Nuevo juego
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Acceso rápido demotado: leyenda + botón (misma navegación de siempre). */
function QuickAccess({
  caption,
  detail,
  button,
  onClick,
  extra,
}: {
  caption: string;
  detail: ReactNode;
  button: ReactNode;
  onClick: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-raised/60 p-3">
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {caption}
      </p>
      <p className="flex-1 text-sm text-ink-mute">{detail}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onClick} className="btn btn-quiet">
          {button}
        </button>
        {extra}
      </div>
    </div>
  );
}

function TeamCaption() {
  const staffCount = useGameStore((s) => s.game.staff.length);
  const candidateCount = useGameStore((s) => s.game.candidates.length);
  return (
    <>
      {staffCount === 1 ? 'La plantilla eres tú.' : `${staffCount} personas en plantilla.`}
      {candidateCount > 0 && ` ${candidateCount} candidatos esperando.`}
    </>
  );
}

function FinanceCaption() {
  const capital = useGameStore((s) => s.game.studio.capital);
  return (
    <>{capital < 0 ? 'Números rojos: la caja pide decisiones.' : 'Flujo de caja y préstamos.'}</>
  );
}

function ResearchButtonLabel() {
  const researchPoints = useGameStore((s) => s.game.research.points);
  return <>💡 Investigación ({Math.floor(researchPoints)})</>;
}

/** Constelación de reputación con leyenda (docs/10 I3, versión tarjeta). */
function ReputationCard() {
  const reputation = useGameStore((s) => s.game.studio.reputation);
  return (
    <div className="flex justify-center">
      <ReputationRadar reputation={reputation} size={150} labels />
    </div>
  );
}

