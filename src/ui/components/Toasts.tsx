import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../../core';
import { TOAST_HIDDEN_TYPES } from '../../data/notifications';
import { useGameStore } from '../../state/store';
import { useMotionDisabled } from '../motion';
import { ease, motionSec, TOAST_HOLD_MS, TOASTS_MAX } from '../theme/motionTokens';

/**
 * Toasts de notificación (docs/10 §6): las notificaciones MENORES (docs/17 U4).
 * Los eventos nuevos del historial entran deslizándose y se auto-descartan.
 * Presentación pura: observa `game.log` (que escribe el núcleo) y no calcula
 * nada. Los eventos IMPORTANTES tienen su propia superficie (beat dedicado o
 * modal de aviso que pausa) y no se duplican aquí: la lista de tipos ocultos
 * vive, data-driven, en data/notifications.ts (TOAST_HIDDEN_TYPES).
 */

const ICONS: Record<LogEntry['type'], string> = {
  proyecto: '🎮',
  fase: '🛠️',
  lanzamiento: '🚀',
  ventas: '📈',
  economia: '🏦',
  moral: '⚖️',
  staff: '👥',
  estudio: '🏢',
  mercado: '🌍',
  comunidad: '💬',
  era: '🌍',
  investigacion: '💡',
  premios: '🏆',
  fin: '🏛️',
};

interface Toast {
  id: number;
  entry: LogEntry;
}

const entryKey = (e: LogEntry): string => `${e.week}|${e.type}|${e.text}`;

let nextToastId = 1;

export function Toasts() {
  const log = useGameStore((s) => s.game.log);
  const week = useGameStore((s) => s.game.week);
  const seed = useGameStore((s) => s.game.seed);
  const off = useMotionDisabled();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const lastSeed = useRef(seed);

  // Detectar entradas nuevas del historial. La primera pasada (montaje o
  // partida nueva/cargada) solo registra lo existente: nada de toasts
  // retroactivos.
  useEffect(() => {
    if (seen.current === null || lastSeed.current !== seed) {
      seen.current = new Set(log.map(entryKey));
      lastSeed.current = seed;
      return;
    }
    const known = seen.current;
    const fresh = log.filter(
      (e) => !known.has(entryKey(e)) && !TOAST_HIDDEN_TYPES.has(e.type) && e.week >= week - 1,
    );
    log.forEach((e) => known.add(entryKey(e)));
    if (fresh.length === 0) return;
    setToasts((current) =>
      [...current, ...fresh.map((entry) => ({ id: nextToastId++, entry }))].slice(-TOASTS_MAX),
    );
  }, [log, week, seed]);

  // Auto-descarte: el toast más antiguo se va solo pasada su vida útil.
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(
      () => setToasts((current) => current.slice(1)),
      TOAST_HOLD_MS,
    );
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const dismiss = (id: number) => setToasts((current) => current.filter((t) => t.id !== id));
  const toastClass =
    'pointer-events-auto flex w-full items-start gap-2.5 rounded-md border border-line-hi bg-raised px-3 py-2 text-left text-sm text-ink shadow-[var(--shadow-flat-raised)]';
  const body = (entry: LogEntry) => (
    <>
      <span aria-hidden className="mt-px shrink-0">
        {ICONS[entry.type]}
      </span>
      <span className="min-w-0 flex-1">{entry.text}</span>
    </>
  );

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-14 right-4 z-40 flex w-80 max-w-[calc(100vw-2rem)] flex-col items-end gap-2"
    >
      {off ? (
        // Sin movimiento: mismos toasts, entrada/salida instantáneas.
        toasts.map(({ id, entry }) => (
          <button key={id} type="button" title="Descartar" onClick={() => dismiss(id)} className={toastClass}>
            {body(entry)}
          </button>
        ))
      ) : (
        <AnimatePresence initial={false}>
          {toasts.map(({ id, entry }) => (
            <motion.button
              key={id}
              type="button"
              layout
              initial={{ opacity: 0, x: 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 48 }}
              transition={{ duration: motionSec.fast, ease: ease.decel }}
              onClick={() => dismiss(id)}
              title="Descartar"
              className={toastClass}
            >
              {body(entry)}
            </motion.button>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
