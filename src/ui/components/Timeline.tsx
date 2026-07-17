import { useState, type ReactNode } from 'react';
import { expandBlockReason, scaleStageInfo, eraNovelties } from '../../core';
import { eraIndex, eraOrder, eras, getEra } from '../../data/eras';
import { stageFocus, stageLabels, stageRoles } from '../../data/staffTexts';
import { useGameStore, type TimelineKind } from '../../state/store';
import { celebrateExpansion } from '../confetti';
import { formatMoney } from '../format';
import { PopIn } from './Motion';

/**
 * Las cronologías de los dos ejes de progreso (docs/17 U1, docs/16 §3):
 * las 7 ERAS históricas y las 5 ETAPAS de escala. Overlay sobre el estudio
 * (telón semitransparente: el mundo sigue ahí detrás), barra de nodos
 * hexagonales y panel inferior con el detalle del nodo elegido.
 *
 * Estados del nodo: superado (verde), actual (acento de la era, con pulso) y
 * futuro (punteado). Las eras futuras son "???" —el misterio se mantiene—;
 * las etapas futuras SÍ enseñan sus requisitos: son un objetivo al que apuntar.
 * Desde 8.8 la etapa se COMPRA (docs/18 V4-c): el nodo de la etapa siguiente
 * lleva el botón "Ampliar estudio (coste: X 💰)", habilitado cuando el núcleo
 * dice que se cumplen los requisitos (expandBlockReason).
 *
 * Presentación pura (docs/08 §6): lee estado con selectores finos y deriva el
 * contenido de cada nodo del núcleo (`eraNovelties`, `scaleStageInfo`,
 * `expandBlockReason`), la misma fuente que valida `expandStudio`. No calcula
 * ninguna regla de juego. No pausa el tiempo (criterio de la Fase 8.5: lo abre
 * el jugador; solo los avisos de U4 interrumpen).
 */

type NodeStatus = 'past' | 'current' | 'future';

interface TimelineNode {
  key: string;
  /** Marca del hexágono ("E3", "3"…); las futuras se pintan con "?". */
  badge: string;
  /** Etiqueta bajo el nodo. */
  caption: string;
  status: NodeStatus;
  /** Título del panel inferior. */
  title: string;
  /** Subtítulo (años de la era / rol de la etapa). */
  subtitle: string;
  details: ReactNode;
}

const statusLabels: Record<NodeStatus, string> = {
  past: 'superada',
  current: 'estás aquí',
  future: 'bloqueada',
};

function statusOf(index: number, currentIndex: number): NodeStatus {
  if (index < currentIndex) return 'past';
  if (index === currentIndex) return 'current';
  return 'future';
}

/** Lista de novedades del panel ("Plataformas: …"). */
function Novelty({ label, names }: { label: string; names: string[] }) {
  if (names.length === 0) return null;
  return (
    <p className="text-sm text-ink">
      <span className="text-ink-faint">{label}:</span> {names.join(', ')}
    </p>
  );
}

/** El misterio de lo que aún no ha llegado (docs/17 U1). */
function LockedDetails({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-mono text-2xl text-ink-faint">???</p>
      <p className="text-sm text-ink-mute">{children}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Los nodos de cada eje
// ---------------------------------------------------------------------------

function useEraNodes(): TimelineNode[] {
  const era = useGameStore((s) => s.game.era);
  const current = eraIndex(era);

  return eras.map((def, i) => {
    const status = statusOf(i, current);
    const { platforms, business } = eraNovelties(def.id);
    return {
      key: def.id,
      badge: status === 'future' ? '?' : def.id,
      caption: status === 'future' ? '???' : def.name,
      status,
      title: status === 'future' ? 'Era por descubrir' : def.name,
      subtitle: status === 'future' ? '???' : def.period,
      details:
        status === 'future' ? (
          <LockedDetails>
            Lo que traiga esta era se sabrá cuando llegue. El mundo cambia solo, con el tiempo.
          </LockedDetails>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-ink">{def.transitionHeadline}</p>
            <Novelty label="Plataformas" names={platforms} />
            <Novelty label="Negocio" names={business} />
          </div>
        ),
    };
  });
}

const stages = [1, 2, 3, 4, 5] as const;

/**
 * El botón de compra del nodo de la etapa SIGUIENTE (docs/18 V4-c): cumplir el
 * requisito solo habilita; ampliar se paga. El motivo del bloqueo lo elige el
 * núcleo (expandBlockReason); aquí solo se muestra y se atenúa el botón.
 */
function ExpandButton({ cost }: { cost: number }) {
  const blocked = useGameStore((s) => expandBlockReason(s.game));
  const expand = useGameStore((s) => s.expandStudio);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={blocked !== null}
        onClick={() => {
          expand();
          celebrateExpansion();
        }}
        className="btn btn-primary px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Ampliar estudio (coste: {formatMoney(cost)})
      </button>
      {blocked !== null && <span className="text-sm text-warn">{blocked}</span>}
    </div>
  );
}

function useScaleNodes(): TimelineNode[] {
  const stage = useGameStore((s) => s.game.studio.scaleStage);

  return stages.map((s, i) => {
    const status = statusOf(i, stage - 1);
    const info = scaleStageInfo(s);
    const isNext = s === stage + 1;
    return {
      key: String(s),
      // La escala no se oculta: es un objetivo al que apuntar, no un misterio.
      badge: String(s),
      caption: stageLabels[s],
      status,
      title: stageLabels[s],
      subtitle: `Eres… ${stageRoles[s]}`,
      details: (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink">{stageFocus[s]}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-mute">
            <span>
              <span className="text-ink-faint">Requisito:</span>{' '}
              {info.requires === null
                ? 'el inicio de la partida'
                : [
                    formatMoney(info.requires.capital),
                    info.requires.staff > 0 ? `${info.requires.staff} en plantilla` : null,
                  ]
                    .filter((r) => r !== null)
                    .join(' + ')}
            </span>
            {info.upgradeCost !== null && status === 'future' && (
              <span>
                <span className="text-ink-faint">Ampliación:</span> {formatMoney(info.upgradeCost)}
              </span>
            )}
            <span>
              <span className="text-ink-faint">Aforo:</span>{' '}
              {info.staffCap === 1 ? 'solo tú' : `${info.staffCap} personas`}
            </span>
            <span>
              <span className="text-ink-faint">Proyectos a la vez:</span> {info.projectCap}
            </span>
          </div>
          {isNext && info.upgradeCost !== null && <ExpandButton cost={info.upgradeCost} />}
        </div>
      ),
    };
  });
}

// ---------------------------------------------------------------------------
// El overlay
// ---------------------------------------------------------------------------

function TimelineOverlay({
  title,
  subtitle,
  nodes,
  monoSubtitle = false,
  initialSelected,
}: {
  title: string;
  subtitle: string;
  nodes: TimelineNode[];
  /** Los años de una era piden mono (son un dato); el rol de una etapa, no. */
  monoSubtitle?: boolean;
  /** Nodo seleccionado al abrir; por defecto, el actual. */
  initialSelected?: number;
}) {
  const close = useGameStore((s) => s.closeTimeline);
  const currentIndex = Math.max(
    0,
    nodes.findIndex((n) => n.status === 'current'),
  );
  // La selección es local: mirar la cronología no es un cambio de partida.
  // Arranca en el nodo actual — el hito que se acaba de celebrar — salvo que
  // quien abre pida otro (la escala arranca en el nodo comprable, 8.8).
  const [selected, setSelected] = useState(initialSelected ?? currentIndex);
  const node = nodes[selected] ?? nodes[currentIndex];

  const move = (delta: number) => {
    const next = Math.min(nodes.length - 1, Math.max(0, selected + delta));
    setSelected(next);
    document.getElementById(`hex-${nodes[next].key}`)?.focus();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-scrim px-6 py-10"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <PopIn className="modal-panel flex w-full max-w-3xl flex-col rounded-lg border border-line-hi shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-ink-hi">{title}</h2>
            <p className="text-sm text-ink-mute">{subtitle}</p>
          </div>
          <button type="button" autoFocus onClick={close} className="btn btn-quiet">
            ✕ Cerrar
          </button>
        </div>

        {/* La barra de nodos: un tablist horizontal, navegable con flechas. */}
        <div
          role="tablist"
          aria-label={title}
          aria-orientation="horizontal"
          className="scroll-slim flex items-start gap-0 overflow-x-auto px-6 py-6"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              move(1);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              move(-1);
            }
          }}
        >
          {nodes.map((n, i) => (
            <div key={n.key} className="flex flex-1 items-start">
              {i > 0 && <span className="hex-link" data-done={n.status !== 'future'} aria-hidden />}
              <div className="flex w-[5.5rem] flex-none flex-col items-center gap-1.5">
                <button
                  type="button"
                  id={`hex-${n.key}`}
                  role="tab"
                  aria-selected={i === selected}
                  tabIndex={i === selected ? 0 : -1}
                  className="hex-node"
                  data-status={n.status}
                  onClick={() => setSelected(i)}
                  onMouseEnter={() => setSelected(i)}
                  onFocus={() => setSelected(i)}
                >
                  {/* El hexágono, dibujado por código (docs/10 §9). El polígono
                      se mete 3 unidades para que el trazo no lo corte el borde
                      del viewBox. */}
                  <svg className="hex-svg" viewBox="0 0 100 112" aria-hidden focusable="false">
                    <polygon
                      points="50,5 95,31 95,81 50,107 5,81 5,31"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span className="hex-label">{n.badge}</span>
                  <span className="sr-only">
                    {n.caption} ({statusLabels[n.status]})
                  </span>
                </button>
                <span
                  className={`text-center text-xs leading-tight ${
                    n.status === 'current' ? 'font-semibold text-ink-hi' : 'text-ink-mute'
                  }`}
                  aria-hidden
                >
                  {n.caption}
                </span>
                {n.status === 'past' && (
                  <span className="text-xs leading-none text-ok" aria-hidden>
                    ✓
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Panel inferior: el detalle del nodo bajo el cursor o el foco. Es el
            tabpanel del nodo elegido, no una región viva: con hover, un
            aria-live cantaría cada nodo por el que pasa el ratón. */}
        <div
          role="tabpanel"
          aria-labelledby={`hex-${node.key}`}
          tabIndex={0}
          className="border-t border-line bg-raised px-6 py-4"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-base font-bold text-ink-hi">{node.title}</h3>
            <span className={`text-sm text-ink-mute ${monoSubtitle ? 'font-mono' : 'italic'}`}>
              {node.subtitle}
            </span>
            {node.status === 'current' && (
              <span className="chip text-xs font-semibold" style={{ color: 'var(--skin-accent)' }}>
                Estás aquí
              </span>
            )}
          </div>
          <div className="mt-2">{node.details}</div>
        </div>
      </PopIn>
    </div>
  );
}

function EraTimeline() {
  const era = useGameStore((s) => s.game.era);
  const nodes = useEraNodes();
  return (
    <TimelineOverlay
      title="Cronología de eras"
      subtitle={`De 1980 al futuro cercano. Vas por la era ${eraIndex(era) + 1} de ${eraOrder.length}: ${getEra(era).name}.`}
      nodes={nodes}
      monoSubtitle
    />
  );
}

function ScaleTimeline() {
  const stage = useGameStore((s) => s.game.studio.scaleStage);
  const canExpand = useGameStore((s) => expandBlockReason(s.game) === null);
  const nodes = useScaleNodes();
  return (
    <TimelineOverlay
      title="Cronología de escala"
      subtitle={`Del garaje a la megacorporación. Tu estudio es hoy: ${stageLabels[stage]}.`}
      nodes={nodes}
      // Con la ampliación comprable, se abre mirando el nodo con el botón
      // (docs/18 V4-c): es a lo que te manda el aviso "puedes ampliar".
      initialSelected={canExpand ? Math.min(nodes.length - 1, stage) : undefined}
    />
  );
}

const timelines: Record<TimelineKind, () => ReactNode> = {
  eras: EraTimeline,
  escala: ScaleTimeline,
};

export function Timeline() {
  const kind = useGameStore((s) => s.timeline);
  if (kind === null) return null;
  const View = timelines[kind];
  return <View />;
}
