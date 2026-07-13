import type { ReactNode } from 'react';

/**
 * Estado vacío invitador (Fase 7F, docs/13 7F): en vez de disculparse
 * ("Todavía ninguno"), nombra el espacio y señala la siguiente acción.
 * Presentación pura; la acción opcional despacha una acción real del store.
 */
export function EmptyState({
  icon,
  children,
  actionLabel,
  onAction,
  compact = false,
}: {
  icon: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  const action = actionLabel && onAction && (
    <button
      type="button"
      onClick={onAction}
      className={`btn btn-quiet ${compact ? 'shrink-0 px-2 py-1 text-xs' : 'mt-1'}`}
    >
      {actionLabel}
    </button>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed border-line px-3 py-2.5">
        <span aria-hidden className="text-lg opacity-80">
          {icon}
        </span>
        <p className="flex-1 text-sm text-ink-mute">{children}</p>
        {action}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line px-4 py-6 text-center">
      <span aria-hidden className="text-2xl opacity-80">
        {icon}
      </span>
      <p className="max-w-sm text-sm text-ink-mute">{children}</p>
      {action}
    </div>
  );
}
