import { useEffect, useRef, useState } from 'react';
import { useGameStore, type MenuModal } from '../../state/store';

/**
 * Menú desplegable de la barra superior (docs/17 U2, docs/10 §10.1): saca de la
 * pantalla principal lo que no hace falta ver siempre —la estantería completa,
 * el historial y las opciones de partida— y lo abre en modales bajo demanda.
 *
 * Presentación pura (docs/08): abre/cierra estado de presentación del store; no
 * calcula nada del juego. Se cierra con Esc, con un clic fuera o al elegir.
 */

const ENTRIES: { modal: MenuModal; label: string; hint: string }[] = [
  { modal: 'juegos', label: '🕹️ Juegos lanzados', hint: 'Toda tu estantería, incluidos los retirados' },
  { modal: 'historial', label: '📜 Historial', hint: 'El diario del estudio, semana a semana' },
  { modal: 'partida', label: '💾 Partida', hint: 'Guardar, cargar, retirarse, ver el Legado' },
];

export function StudioMenu() {
  const openMenuModal = useGameStore((s) => s.openMenuModal);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Un menú abierto se cierra como todo el mundo espera: Esc o clic fuera.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-quiet"
      >
        ☰ Menú
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-lg border border-line-hi bg-panel shadow-2xl"
        >
          {ENTRIES.map((entry) => (
            <button
              key={entry.modal}
              type="button"
              role="menuitem"
              onClick={() => {
                openMenuModal(entry.modal);
                setOpen(false);
              }}
              className="flex w-full flex-col gap-0.5 border-b border-line px-4 py-2.5 text-left last:border-b-0 hover:bg-raised"
            >
              <span className="text-sm font-medium text-ink-hi">{entry.label}</span>
              <span className="text-xs text-ink-faint">{entry.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
