import { useState, type ReactNode } from 'react';
import { projectCap, projectProgress, projectTotalWeeks, visibleReview } from '../../core';
import { useGameStore } from '../../state/store';
import { getDevPhase } from '../../data/devPhases';
import { getGenre } from '../../data/genres';
import { getTheme } from '../../data/themes';
import { formatMoney } from '../format';
import { CommunityFeed } from '../components/CommunityFeed';
import { ReputationRadar } from '../components/ReputationRadar';
import { SavePanel } from '../components/SavePanel';
import { SentimentMeter } from '../components/SentimentMeter';
import { CROWN_PATH } from '../theme/BrandMark';
import { skinFor } from '../theme/eraSkins';

/**
 * Vista principal del estudio (docs/10 §10.1, jerarquía de la Fase 7A): un
 * escenario HERO central protagonista —donde en la 7B vivirá la Oficina
 * Viva— con el proyecto en curso como marquesina, una fila compacta de
 * accesos, la estantería de juegos lanzados y el lateral social. La UI solo
 * muestra; el estado viene de core/.
 */

/** Lo más popular ahora mismo (solo presentación; el estado viene de core/). */
function hottest(trends: Record<string, { pop: number }>): string | null {
  const entries = Object.entries(trends);
  if (entries.length === 0) return null;
  return entries.reduce((best, cur) => (cur[1].pop > best[1].pop ? cur : best))[0];
}

export function StudioScreen() {
  const releasedGames = useGameStore((s) => s.game.releasedGames);
  const market = useGameStore((s) => s.game.market);
  const community = useGameStore((s) => s.game.community);
  const log = useGameStore((s) => s.game.log);
  const goTo = useGameStore((s) => s.goTo);
  const openReview = useGameStore((s) => s.openReview);

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

        <section className="card">
          <h2 className="card-title">Juegos lanzados</h2>
          {releasedGames.length === 0 ? (
            <p className="text-ink-faint">Todavía ninguno.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {[...releasedGames].reverse().map((game) => (
                <li
                  key={game.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-line bg-raised/60 px-3 py-2"
                >
                  <span className="font-medium text-ink-hi">{game.name}</span>
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
                  <span className="text-sm text-ink-mute">
                    {game.totalUnits.toLocaleString('es-ES')} uds ·{' '}
                    {formatMoney(game.totalRevenue)}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {game.salesActive ? 'a la venta' : 'fuera de tiendas'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openReview(game.id)}
                    className="btn btn-quiet px-2 py-1 text-xs ml-auto"
                  >
                    Ver reseña
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">Partida</h2>
          <SavePanel />
          <RetireButton />
        </section>
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
            <CommunityFeed posts={community.feed} />
          </div>
        </section>
        <section className="card flex-1">
          <h2 className="card-title">Historial</h2>
          {log.length === 0 ? (
            <p className="text-ink-faint">Sin novedades por ahora.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {[...log].reverse().map((entry, i) => (
                <li key={`${entry.week}-${i}`} className="flex gap-2">
                  <span className="shrink-0 tabular-nums text-ink-faint">S{entry.week}</span>
                  <span className={entry.type === 'moral' ? 'text-warn' : 'text-ink'}>
                    {entry.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </main>
  );
}

/**
 * El escenario del estudio (Fase 7A): área hero protagonista. En la 7B la
 * Oficina Viva ocupará este telón; hoy lo visten el gradiente de la piel de
 * era, la rejilla pixel y la corona como marca de agua.
 */
function HeroStage() {
  const projects = useGameStore((s) => s.game.projects);
  const cap = useGameStore((s) => projectCap(s.game));
  const era = useGameStore((s) => s.game.era);
  const modernUi = useGameStore((s) => s.modernUi);
  const selectProject = useGameStore((s) => s.selectProject);
  const goTo = useGameStore((s) => s.goTo);
  const idle = projects.length === 0;

  return (
    <section className="hero-stage card relative flex min-h-[26rem] flex-col overflow-hidden">
      {/* La corona como marca de agua en contorno, teñida por la piel de era. */}
      <svg
        viewBox="-1 -1 50 38"
        aria-hidden
        className="pointer-events-none absolute right-8 top-10 w-48 opacity-[0.08]"
      >
        <path
          d={CROWN_PATH}
          fill="none"
          stroke="var(--skin-accent, #34d399)"
          strokeWidth={1.25}
          strokeLinejoin="round"
        />
      </svg>
      <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="card-title mb-0">
          El estudio{cap > 1 ? ` · proyectos ${projects.length}/${cap}` : ''}
        </h2>
        <span className="text-xs italic text-ink-faint">{skinFor(era, modernUi).flavor}</span>
      </div>

      {idle ? (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
          <p className="max-w-sm text-lg text-ink-mute">
            El estudio está en silencio. Toca inventar el próximo éxito.
          </p>
          <button
            type="button"
            onClick={() => goTo('concepcion')}
            className="btn btn-primary px-6 py-3 text-base"
          >
            💡 Nuevo juego
          </button>
        </div>
      ) : (
        <div className="relative mt-auto flex flex-col gap-4 pt-8">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg border border-line bg-panel/60 p-4 shadow-[var(--shadow-flat)]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="font-mono text-2xl font-bold tracking-tight text-ink-hi">
                  {project.name}
                </span>
                <span className="text-sm text-ink-mute">
                  Fase de {getDevPhase(project.phase).name} · semana{' '}
                  {Math.floor(project.weeksSpent)} de {projectTotalWeeks(project)} ·{' '}
                  {project.assignedStaff.length} 👥
                </span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full rounded-full bg-action-hi transition-all duration-500"
                  style={{ width: `${Math.round(projectProgress(project) * 100)}%` }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  selectProject(project.id);
                  goTo('desarrollo');
                }}
                className="btn btn-primary mt-3"
              >
                Ver desarrollo
              </button>
            </div>
          ))}
          {projects.length < cap && (
            <button
              type="button"
              onClick={() => goTo('concepcion')}
              className="btn btn-ghost self-start"
            >
              💡 Nuevo juego
            </button>
          )}
        </div>
      )}
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

/** Cerrar el estudio para contemplar el Legado (docs/06 §6), con confirmación. */
function RetireButton() {
  const retire = useGameStore((s) => s.retire);
  const gameOver = useGameStore((s) => s.game.gameOver);
  const [confirming, setConfirming] = useState(false);
  if (gameOver) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
      {confirming ? (
        <>
          <span className="text-sm text-ink-mute">¿Cerrar el estudio para siempre?</span>
          <button type="button" onClick={retire} className="btn btn-danger">
            Sí, ver el Legado
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="btn btn-quiet">
            Cancelar
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="btn btn-ghost">
          🏛️ Retirarse y ver el Legado
        </button>
      )}
    </div>
  );
}
