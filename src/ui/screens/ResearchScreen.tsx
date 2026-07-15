import { useState } from 'react';
import {
  researchableThemes,
  researchNodeStatus,
  themeResearchCost,
  themeResearchStatus,
  type MarketKnowledge,
} from '../../core';
import { eraOrder, getEra } from '../../data/eras';
import { researchNodes, researchNodeUnlocks } from '../../data/research';
import { features } from '../../data/features';
import { genres } from '../../data/genres';
import { useGameStore } from '../../state/store';
import { EmptyState } from '../components/EmptyState';
import { RollingNumber } from '../components/Motion';

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
