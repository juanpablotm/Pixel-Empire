import { availableCreators, creatorFit, keysAllowed, visibleReview, type Project } from '../../core';
import { archetypeLabels, type CreatorDef } from '../../data/creators';
import { balance } from '../../data/balance';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
import { EmptyState } from '../components/EmptyState';
import { HypeGauge } from '../components/HypeGauge';
import { StreamPanel } from '../components/StreamPanel';

/**
 * Marketing y creadores (docs/10 §10.5): el roster como tarjetas, el reparto
 * de claves limitadas y el resultado del último directo. El marketing es una
 * decisión de casting con riesgo (docs/07 §3): fit × calidad × bugs. Con
 * varios proyectos, la campaña es la del proyecto activo (pestañas).
 */

/** Afinidad estimada sin exponer el número crudo (docs/10 §10.2, criterio Fit). */
function fitBandOf(fit: number): { label: string; className: string } {
  if (fit >= 0.7) return { label: 'afinidad alta', className: 'bg-ok/20 text-ok' };
  if (fit >= 0.5) return { label: 'afinidad media', className: 'bg-warn/15 text-capital' };
  return { label: 'afinidad baja', className: 'bg-danger/15 text-danger-hi' };
}

function CreatorCard({ creator, project }: { creator: CreatorDef; project?: Project }) {
  const capital = useGameStore((s) => s.game.studio.capital);
  const assign = useGameStore((s) => s.assignCreatorKey);

  const assigned = project?.creatorCampaign.includes(creator.id) ?? false;
  const tooEarly = project !== undefined && project.phase < balance.market.hype.startPhase;
  const noKeys =
    project !== undefined && project.creatorCampaign.length >= keysAllowed(project.size);
  const noCash = capital < creator.acquisitionCost;
  const disabled = !project || assigned || tooEarly || noKeys || noCash;

  const band = project ? fitBandOf(creatorFit(creator, project.genreId, project.audience)) : null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="font-semibold text-ink-hi">{creator.name}</p>
          <p className="text-xs text-ink-faint">{archetypeLabels[creator.archetype]}</p>
        </div>
        <span className="text-sm tabular-nums text-ink-mute" title="Alcance de audiencia">
          👥 {creator.reach.toLocaleString('es-ES')}
        </span>
      </div>

      <p className="text-xs text-ink-mute">{creator.description}</p>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-raised px-2 py-0.5 text-ink-mute" title="Cuán duro juzga">
          exigencia {Math.round(creator.demandingness * 100)} %
        </span>
        {band && (
          <span
            className={`rounded px-2 py-0.5 font-semibold ${band.className}`}
            title="Afinidad estimada entre su público y tu proyecto actual"
          >
            {band.label}
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => project && assign(creator.id, project.id)}
        title={
          !project
            ? 'No hay proyecto en desarrollo'
            : assigned
              ? 'Ya tiene clave para este lanzamiento'
              : tooEarly
                ? 'Las claves se reparten desde la Producción (el anuncio)'
                : noKeys
                  ? 'No quedan claves para este lanzamiento'
                  : noCash
                    ? 'No hay caja suficiente'
                    : 'Darle una clave de acceso anticipado'
        }
        className={`mt-auto rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          assigned
            ? 'bg-ok/15 text-ok'
            : disabled
              ? 'cursor-not-allowed bg-raised text-ink-faint opacity-60'
              : 'bg-fuchsia-700 text-oncolor hover:bg-fuchsia-600'
        }`}
      >
        {assigned ? '✔ Clave entregada' : `🔑 Dar clave · ${formatMoney(creator.acquisitionCost)}`}
      </button>
    </div>
  );
}

export function CreatorsScreen() {
  const projects = useGameStore((s) => s.game.projects);
  const activeProjectId = useGameStore((s) => s.activeProjectId);
  const selectProject = useGameStore((s) => s.selectProject);
  const era = useGameStore((s) => s.game.era);
  const lastGame = useGameStore((s) => s.game.releasedGames[s.game.releasedGames.length - 1]);
  const community = useGameStore((s) => s.game.community);
  const goTo = useGameStore((s) => s.goTo);

  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const roster = availableCreators(era);
  const keysTotal = project ? keysAllowed(project.size) : 0;
  const keysUsed = project?.creatorCampaign.length ?? 0;

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">📣 Marketing y creadores</h2>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-raised px-3 py-1.5 text-sm text-ink hover:bg-control"
        >
          ← Volver al estudio
        </button>
      </div>

      {projects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === project?.id}
              onClick={() => selectProject(p.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                p.id === project?.id
                  ? 'bg-fuchsia-600 text-oncolor'
                  : 'bg-raised text-ink hover:bg-control'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <section className="card">
        {project ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-ink">
                Campaña de <span className="font-semibold">«{project.name}»</span>
              </p>
              <p className="text-sm tabular-nums text-ink-mute" title="Recurso limitado por lanzamiento">
                🔑 Claves: {keysUsed} de {keysTotal} repartidas
              </p>
            </div>
            <HypeGauge hype={project.hype} />
            <p className="text-xs text-ink-faint">
              El resultado de cada clave = fit(juego, su público) × calidad × estado de bugs. Un mal
              casting (o un juego roto) puede salir muy caro en directo.
            </p>
          </div>
        ) : (
          <EmptyState icon="📣">
            Sin campaña activa: cuando un proyecto entre en la fase de Producción,
            repartirás aquí sus claves entre los creadores para encender el hype.
          </EmptyState>
        )}
      </section>

      <section>
        <h3 className="card-title">
          Roster disponible
        </h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roster.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} project={project} />
          ))}
        </div>
      </section>

      {lastGame && (
        <section className="card">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-mute">
            El directo del último lanzamiento
          </h3>
          <p className="mb-3 text-xs text-ink-faint">
            «{lastGame.name}» · nota visible {visibleReview(lastGame, community)}/100
          </p>
          <StreamPanel game={lastGame} />
        </section>
      )}
    </main>
  );
}
