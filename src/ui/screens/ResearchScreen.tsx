import { useState } from 'react';
import {
  availableLicensedEngines,
  buildableCapabilities,
  engineBuildBlockReason,
  engineBuildCost,
  engineReferenceAdequacy01,
  maxBuildableGeneration,
  researchableThemes,
  researchNodeStatus,
  themeResearchCost,
  themeResearchStatus,
  type EngineCapabilityId,
  type GameState,
  type MarketKnowledge,
  type OwnedEngine,
} from '../../core';
import { eraOrder, getEra } from '../../data/eras';
import { engineCapabilities, getEngineCapability } from '../../data/engines';
import { researchNodes, researchNodeUnlocks } from '../../data/research';
import { features } from '../../data/features';
import { genres } from '../../data/genres';
import { useGameStore } from '../../state/store';
import { EmptyState } from '../components/EmptyState';
import { RollingNumber } from '../components/Motion';
import { formatMoney } from '../format';

/**
 * Pantalla de investigación (docs/02 §3): puntos 💡, asignación de personal a
 * I+D, los temas por desbloquear (docs/17 P1) y el árbol de desbloqueos
 * agrupado por era —capacidades, contenido y conocimiento de mercado (docs/17
 * P2)—. La UI solo muestra; los estados los decide core.
 */

const nameOfGenre = (id: string): string => genres.find((g) => g.id === id)?.name ?? id;
const nameOfFeature = (id: string): string => features.find((f) => f.id === id)?.name ?? id;

/** Qué revela cada faceta de conocimiento de mercado (docs/17 P2), para la UI. */
const revealsLabel: Record<MarketKnowledge, string> = {
  price: 'el precio recomendado al concebir',
  balance: 'el balance Diseño/Técnica ideal del género',
  fit: 'el medidor de Fit de cualquier combinación',
};

/** Estado cualitativo de un motor frente a la época (adecuación de referencia). */
function freshnessLabel(adequacy: number): { text: string; color: string } {
  if (adequacy >= 0.85) return { text: 'al día', color: 'text-ok' };
  if (adequacy >= 0.55) return { text: 'se queda justo', color: 'text-warn' };
  return { text: 'desfasado', color: 'text-danger' };
}

/**
 * El taller de motores (Fase 9.2, docs/19 §9.2): motores propios con su
 * estado frente a la época, la obra en curso, el formulario de construir /
 * mejorar (💰 + 💡 + semanas) y el catálogo licenciable (informativo: el motor
 * licenciado se elige al concebir, con royalty). El núcleo decide qué se
 * puede (engineBuildBlockReason); la UI solo muestra.
 */
function EnginesWorkshop({ game }: { game: GameState }) {
  const build = useGameStore((s) => s.startEngineBuild);
  const engines = game.engines ?? [];
  const inProgress = game.engineBuild ?? null;
  const maxGen = maxBuildableGeneration(game);
  const buildable = buildableCapabilities(game);
  const [name, setName] = useState('');
  const [chosenCaps, setChosenCaps] = useState<EngineCapabilityId[]>([]);

  // La obra sensata que ofrece el taller: mejorar el mejor motor (conserva
  // capacidades) o construir el primero. La generación es la máxima que la
  // arquitectura permite hoy (los nodos del árbol la suben).
  const best = engines.reduce<OwnedEngine | null>(
    (acc, e) => (acc === null || e.techLevel > acc.techLevel ? e : acc),
    null,
  );
  const upgrading = best !== null;
  const keptCaps = best?.capabilities ?? [];
  const capsForSpec = [...new Set([...keptCaps, ...chosenCaps])];
  const spec = {
    upgradeOf: best?.id ?? null,
    name: upgrading ? undefined : name,
    generation: maxGen,
    capabilities: capsForSpec,
  };
  const cost = engineBuildCost(game, maxGen, capsForSpec, best?.id ?? null);
  const blocked = engineBuildBlockReason(game, spec);
  const pointless = upgrading && best !== null && maxGen <= best.generation && chosenCaps.length === 0;

  const toggleCap = (id: EngineCapabilityId) => {
    setChosenCaps((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  return (
    <section className="card" data-tour="motores">
      <h3 className="card-title">🔧 Motores</h3>

      {/* Los motores propios: el activo que envejece y se amortiza. */}
      {engines.length === 0 ? (
        <p className="text-sm text-ink-mute">
          Sin motor propio: programas cada juego de forma artesanal. Desde la era de las consolas,
          eso deja el techo tecnológico por los suelos — construye o licencia un motor.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {engines.map((engine) => {
            const adequacy = engineReferenceAdequacy01(game, engine.id);
            const fresh = freshnessLabel(adequacy);
            return (
              <li key={engine.id} className="rounded-md bg-raised/60 px-4 py-3">
                <p className="font-medium">
                  {engine.name}{' '}
                  <span className="text-xs text-ink-faint">
                    (gen {engine.generation} · nivel {engine.techLevel})
                  </span>{' '}
                  <span className={`text-sm ${fresh.color}`}>· {fresh.text}</span>
                </p>
                <p className="text-xs text-ink-mute">
                  {engine.capabilities.length > 0
                    ? `Capacidades: ${engine.capabilities.map((id) => getEngineCapability(id).name).join(', ')}`
                    : 'Sin capacidades extra'}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {/* La obra en curso o el formulario de encargo. */}
      {inProgress ? (
        <div className="mt-3 rounded-md border border-warn/30 bg-warn/10 px-4 py-3">
          <p className="text-sm font-medium">
            🏗️ {inProgress.upgradeOf ? 'Mejorando' : 'Construyendo'} «{inProgress.name}» (gen{' '}
            {inProgress.generation})
          </p>
          <p className="text-xs text-ink-mute">
            Quedan {inProgress.weeksLeft} de {inProgress.totalWeeks} semanas. La obra ya está pagada.
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-line-hi bg-raised/40 px-4 py-3">
          <p className="text-sm font-medium">
            {upgrading
              ? `Mejorar «${best.name}» a la generación ${maxGen}`
              : `Construir motor propio (gen ${maxGen})`}
          </p>
          {!upgrading && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del motor…"
              aria-label="Nombre del motor"
              className="w-full max-w-xs rounded-md border border-line-hi bg-raised px-3 py-1.5 text-sm text-ink-hi placeholder:text-ink-faint focus:border-action-hi focus:outline-none"
            />
          )}
          {buildable.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              {engineCapabilities
                .filter((c) => buildable.includes(c.id))
                .map((cap) => {
                  const kept = keptCaps.includes(cap.id);
                  return (
                    <label key={cap.id} className="flex items-center gap-1.5" title={cap.description}>
                      <input
                        type="checkbox"
                        checked={kept || chosenCaps.includes(cap.id)}
                        disabled={kept}
                        onChange={() => toggleCap(cap.id)}
                        className="accent-warn"
                      />
                      {cap.name}
                      {!kept && (
                        <span className="text-xs text-ink-faint">
                          (+{formatMoney(cap.buildCostMoney)} · {cap.buildCostPoints} 💡)
                        </span>
                      )}
                    </label>
                  );
                })}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={blocked !== null || pointless}
              title={blocked ?? (pointless ? 'El motor ya está en la generación máxima que sabes construir' : undefined)}
              onClick={() => {
                build(spec);
                setName('');
                setChosenCaps([]);
              }}
              className="rounded-md bg-warn px-3 py-1.5 text-sm font-semibold text-onbright hover:bg-warn-hi disabled:cursor-not-allowed disabled:opacity-50"
            >
              Encargar obra
            </button>
            <span className="text-sm text-ink-mute">
              {formatMoney(cost.money)} + {cost.points} 💡 · {cost.weeks} semanas
            </span>
            {blocked !== null && <span className="text-xs text-danger">{blocked}</span>}
          </div>
          <p className="text-xs text-ink-faint">
            Los motores envejecen: la exigencia de cada era sube y el nivel del motor no. Mejorar el
            tuyo cuesta menos que construir de cero — amortiza la inversión entre juegos.
          </p>
        </div>
      )}

      {/* Catálogo licenciable: moderno YA, pero con royalty y sin activo. */}
      {availableLicensedEngines(game).length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-mute">
            Motores de terceros (se eligen al concebir)
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {availableLicensedEngines(game).map((def) => {
              const fresh = freshnessLabel(engineReferenceAdequacy01(game, def.id));
              return (
                <li key={def.id} className="rounded-md bg-raised/40 px-4 py-2 text-sm">
                  <span className="font-medium">{def.name}</span>{' '}
                  <span className="text-xs text-ink-faint">
                    ({def.vendor} · gen {def.generation} · nivel {def.techLevel})
                  </span>{' '}
                  <span className={`text-xs ${fresh.color}`}>· {fresh.text}</span>
                  <span className="ml-2 text-xs text-capital">
                    {formatMoney(def.upfrontFee)} por juego + {Math.round(def.royaltyPct * 100)} % de
                    royalty sobre ventas
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

export function ResearchScreen() {
  const game = useGameStore((s) => s.game);
  const goTo = useGameStore((s) => s.goTo);
  const buy = useGameStore((s) => s.buyResearch);
  const researchTheme = useGameStore((s) => s.researchTheme);
  const toggleResearch = useGameStore((s) => s.toggleResearch);
  // "Pop" de recompensa (docs/10 §6) en el nodo/tema recién investigado.
  const [justBought, setJustBought] = useState<string | null>(null);

  const points = Math.floor(game.research.points);
  const rdStaff = game.research.rdStaff;
  const themesToResearch = researchableThemes(game);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          Investigación{' '}
          <span className="ml-2 text-capital">
            💡 <RollingNumber value={points} />
          </span>
        </h2>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-raised px-3 py-1.5 text-sm text-ink hover:bg-control"
        >
          Volver al estudio
        </button>
      </div>

      <section className="card">
        <h3 className="card-title">
          Personal en I+D (~1 💡 por persona y semana)
        </h3>
        {game.staff.length === 0 ? (
          <EmptyState icon="🧪" compact actionLabel="Ver equipo" onAction={() => goTo('equipo')}>
            El laboratorio está vacío: trae gente al estudio y asígnala a I+D para
            generar 💡 cada semana.
          </EmptyState>
        ) : (
          <div className="flex flex-wrap gap-2">
            {game.staff.map((e) => {
              const inRd = rdStaff.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={inRd}
                  onClick={() => toggleResearch(e.id)}
                  title={
                    inRd
                      ? 'En I+D: genera puntos cada semana'
                      : 'Mover a I+D (sale de su proyecto)'
                  }
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    inRd
                      ? 'bg-warn text-onbright'
                      : 'bg-raised text-ink hover:bg-control'
                  }`}
                >
                  {inRd ? '💡 ' : ''}
                  {e.name}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-ink-faint">
          Lanzar juegos también da puntos (los grandes, más). Quien investiga no desarrolla.
        </p>
      </section>

      {/* El taller de motores (Fase 9.2): construir/mejorar el propio o ver el
          catálogo licenciable. El motor es el techo tecnológico de cada juego. */}
      <EnginesWorkshop game={game} />

      {/* Temas por investigar (docs/17 P1): la era habilita la opción; el tema
          cuesta 💡. Empiezas con unos pocos libres y decides en qué te
          especializas. Los temas de eras futuras aún no aparecen. */}
      <section className="card">
        <h3 className="card-title">Temas por investigar</h3>
        {themesToResearch.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Dominas todos los temas disponibles por ahora. Las próximas eras traerán más.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {themesToResearch.map((theme) => {
              const status = themeResearchStatus(game, theme.id);
              const cost = themeResearchCost(theme.id);
              return (
                <li
                  key={theme.id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-raised/60 px-4 py-3 ${
                    justBought === `tema:${theme.id}` ? 'reward-pop' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {theme.name} <span className="text-xs text-ink-faint">({cost} 💡)</span>
                    </p>
                    <p className="text-sm text-ink-mute">
                      Desbloquéalo para poder crear juegos con este tema.
                    </p>
                  </div>
                  {status === 'disponible' && (
                    <button
                      type="button"
                      onClick={() => {
                        researchTheme(theme.id);
                        setJustBought(`tema:${theme.id}`);
                      }}
                      className="rounded-md bg-warn px-3 py-1.5 text-sm font-semibold text-onbright hover:bg-warn-hi"
                    >
                      Investigar
                    </button>
                  )}
                  {status === 'sinPuntos' && <span className="text-sm text-ink-faint">Faltan 💡</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {eraOrder.map((eraId) => {
        const nodes = researchNodes.filter((n) => n.era === eraId);
        if (nodes.length === 0) return null;
        const era = getEra(eraId);
        return (
          <section key={eraId} className="card">
            <h3 className="card-title">
              {era.name} <span className="normal-case text-ink-faint">({era.period})</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {nodes.map((node) => {
                const status = researchNodeStatus(game, node.id);
                const unlocks = researchNodeUnlocks(node.id);
                const extras = [
                  ...unlocks.genres.map(nameOfGenre),
                  ...unlocks.features.map(nameOfFeature),
                ];
                return (
                  <li
                    key={node.id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md px-4 py-3 ${
                      status === 'comprado' ? 'bg-ok/10' : 'bg-raised/60'
                    } ${justBought === node.id ? 'reward-pop' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {status === 'comprado' ? '✅ ' : ''}
                        {node.name}{' '}
                        <span className="text-xs text-ink-faint">({node.cost} 💡)</span>
                      </p>
                      <p className="text-sm text-ink-mute">{node.description}</p>
                      {extras.length > 0 && (
                        <p className="text-xs text-ink-faint">Desbloquea: {extras.join(', ')}</p>
                      )}
                      {node.reveals && (
                        <p className="text-xs text-info">Revela: {revealsLabel[node.reveals]}.</p>
                      )}
                      {node.requiresNodes && node.requiresNodes.length > 0 && (
                        <p className="text-xs text-ink-faint">
                          Requiere:{' '}
                          {node.requiresNodes
                            .map((id) => researchNodes.find((n) => n.id === id)?.name ?? id)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                    {status === 'disponible' && (
                      <button
                        type="button"
                        onClick={() => {
                          buy(node.id);
                          setJustBought(node.id);
                        }}
                        className="rounded-md bg-warn px-3 py-1.5 text-sm font-semibold text-onbright hover:bg-warn-hi"
                      >
                        Investigar
                      </button>
                    )}
                    {status === 'sinPuntos' && (
                      <span className="text-sm text-ink-faint">Faltan 💡</span>
                    )}
                    {status === 'bloqueado' && (
                      <span className="text-sm text-ink-faint">🔒 Bloqueado</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
