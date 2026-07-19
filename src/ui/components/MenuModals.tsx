import { useState, type ReactNode } from 'react';
import { visibleReview } from '../../core';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
import { EmptyState } from './EmptyState';
import { PopIn } from './Motion';
import { SavePanel } from './SavePanel';

/**
 * Los modales del menú de la barra superior (docs/17 U2): la estantería
 * completa, el historial y las opciones de partida. Antes ocupaban sitio fijo
 * en la pantalla principal; ahora se abren cuando el jugador los pide.
 *
 * No pausan el tiempo (a diferencia de los avisos importantes de docs/17 U4):
 * los abre el jugador, no le interrumpen. Presentación pura (docs/08): leen el
 * estado con selectores finos y despachan acciones del store. Entran con PopIn
 * (spring de 7D) y sin AnimatePresence.
 */

/** Telón + tarjeta con cabecera y cierre: el chasis común de los tres. */
function MenuModalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const close = useGameStore((s) => s.closeMenuModal);
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
      <PopIn className="modal-panel flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-line-hi shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-ink-hi">{title}</h2>
            {subtitle && <p className="text-sm text-ink-mute">{subtitle}</p>}
          </div>
          <button type="button" autoFocus onClick={close} className="btn btn-quiet">
            ✕ Cerrar
          </button>
        </div>
        <div className="scroll-slim flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </PopIn>
    </div>
  );
}

/** La estantería completa (docs/17 U2): también los que ya no se venden. */
function GamesModalBody() {
  const releasedGames = useGameStore((s) => s.game.releasedGames);
  const community = useGameStore((s) => s.game.community);
  const openReview = useGameStore((s) => s.openReview);
  const closeMenuModal = useGameStore((s) => s.closeMenuModal);
  const openConception = useGameStore((s) => s.openConception);

  if (releasedGames.length === 0) {
    return (
      <EmptyState
        icon="🕹️"
        actionLabel="💡 Nuevo juego"
        onAction={() => {
          closeMenuModal();
          openConception();
        }}
      >
        La estantería espera tu primer lanzamiento. Concibe un juego y ponle nombre.
      </EmptyState>
    );
  }

  return (
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
            {game.totalUnits.toLocaleString('es-ES')} uds · {formatMoney(game.totalRevenue)}
          </span>
          {/* El trato del publisher, siempre a la vista (9.6): quién publica,
              cuánto se ha llevado ya y si la IP es suya (Pilar 2). */}
          {game.publisherName !== undefined && (
            <span
              className="text-xs text-capital"
              title={`${game.publisherName} se queda el ${Math.round((game.publisherShare ?? 0) * 100)} % de las ventas; lleva ${formatMoney(game.publisherPaid ?? 0)}`}
            >
              📜 {game.publisherName}
              {game.ipOwner === 'publisher' && ' (IP suya)'}
            </span>
          )}
          {game.earlyAccessInfo !== undefined && (
            <span
              className="text-xs text-ink-faint"
              title={`${game.earlyAccessInfo.weeks} semanas en acceso anticipado: ${game.earlyAccessInfo.units.toLocaleString('es-ES')} uds y ${formatMoney(game.earlyAccessInfo.revenue)} antes de la 1.0`}
            >
              🚧 pasó por EA
            </span>
          )}
          <span className={`text-xs ${game.salesActive ? 'text-ok' : 'text-ink-faint'}`}>
            {game.salesActive ? 'a la venta' : 'fuera de tiendas'}
          </span>
          <button
            type="button"
            onClick={() => {
              openReview(game.id);
              closeMenuModal();
            }}
            className="btn btn-quiet ml-auto px-2 py-1 text-xs"
          >
            Ver reseña
          </button>
        </li>
      ))}
    </ul>
  );
}

/** El diario del estudio (docs/17 U2): sale del lateral y vive aquí. */
function HistoryModalBody() {
  const log = useGameStore((s) => s.game.log);

  if (log.length === 0) {
    // Sin acción: un modal informativo no mueve el reloj (y desde la Fase 8.5
    // el tiempo se gobierna solo con la velocidad, sin paso manual).
    return (
      <EmptyState icon="📜">
        El diario del estudio está en blanco: cada semana que avances escribirá aquí su línea.
      </EmptyState>
    );
  }

  return (
    <ul className="flex flex-col gap-2 text-sm">
      {[...log].reverse().map((entry, i) => (
        <li key={`${entry.week}-${i}`} className="flex gap-2">
          <span className="shrink-0 tabular-nums text-ink-faint">S{entry.week}</span>
          <span className={entry.type === 'moral' ? 'text-warn' : 'text-ink'}>{entry.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Cerrar el estudio para contemplar el Legado (docs/06 §6), con confirmación. */
function RetireRow() {
  const retire = useGameStore((s) => s.retire);
  const gameOver = useGameStore((s) => s.game.gameOver);
  const [confirming, setConfirming] = useState(false);
  if (gameOver) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
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

/** Opciones de partida (docs/17 U2): guardar/cargar/nueva/título + legado. */
function GameMenuModalBody() {
  const goTo = useGameStore((s) => s.goTo);
  const closeMenuModal = useGameStore((s) => s.closeMenuModal);

  return (
    <div className="flex flex-col gap-4">
      <SavePanel />
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => {
            goTo('legado');
            closeMenuModal();
          }}
          className="btn btn-quiet"
          title="Mira el museo de lo que llevas construido; la partida sigue viva"
        >
          🏛️ Ver legado
        </button>
        <p className="text-xs text-ink-faint">
          El museo se puede visitar cuando quieras: retirarse es otra cosa (cierra el estudio).
        </p>
      </div>
      <div className="border-t border-line pt-4">
        <RetireRow />
      </div>
    </div>
  );
}

export function MenuModals() {
  const menuModal = useGameStore((s) => s.menuModal);
  // Cede el paso a lo que exige decisión: nunca dos modales compitiendo.
  const blocked = useGameStore(
    (s) =>
      s.game.gameOver !== null ||
      s.eraTransition !== null ||
      s.awardsWeek !== null ||
      s.pendingNotices.length > 0 ||
      s.game.community.crises.some((c) => c.status === 'abierta') ||
      s.game.community.dilemmas.length > 0,
  );

  if (menuModal === null || blocked) return null;

  if (menuModal === 'juegos') {
    return (
      <MenuModalShell title="Juegos lanzados" subtitle="Tu estantería al completo">
        <GamesModalBody />
      </MenuModalShell>
    );
  }
  if (menuModal === 'historial') {
    return (
      <MenuModalShell title="Historial" subtitle="El diario del estudio">
        <HistoryModalBody />
      </MenuModalShell>
    );
  }
  return (
    <MenuModalShell title="Partida" subtitle="Guardar, cargar y cerrar el estudio">
      <GameMenuModalBody />
    </MenuModalShell>
  );
}
