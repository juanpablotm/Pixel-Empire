import { IMPORTANT_NOTICES, type NoticeAccent } from '../../data/notifications';
import { useGameStore, type ImportantNotice } from '../../state/store';
import { formatMoney } from '../format';
import { PopIn } from './Motion';

/**
 * Modal de aviso IMPORTANTE (docs/17 U4): las notificaciones que el jugador no
 * debe perderse y que PAUSAN el tiempo (la pausa la dispara el store al
 * encolarlas; el tiempo no se reanuda hasta que el jugador lo retoma). Muestra
 * el frente de la cola `pendingNotices` y lo descarta con "Aceptar/Continuar".
 *
 * Presentación pura (docs/08): no calcula reglas de juego; solo lee la cola que
 * arma el store y despacha `dismissNotice`. La clasificación y los textos de
 * cabecera viven, data-driven, en data/notifications.ts. Entra con PopIn
 * (spring de 7D) y sin AnimatePresence (seguro con StrictMode).
 *
 * Cede el paso a las decisiones duras y a los beats con superficie propia
 * (crisis, dilema, game over, transición de era, gala): espera en la cola hasta
 * que se cierren, de modo que nunca hay dos modales compitiendo.
 */

/** Acento → clases del borde de la tarjeta y del color de cabecera. */
const ACCENT_STYLES: Record<NoticeAccent, { border: string; head: string }> = {
  danger: { border: 'border-danger/40', head: 'text-danger' },
  capital: { border: 'border-capital/50', head: 'text-capital' },
  ok: { border: 'border-ok/40', head: 'text-ok' },
  info: { border: 'border-line-hi', head: 'text-ink-hi' },
};

/** Acento → clases del botón de descarte (variantes AA de tokens.css). */
function acceptButtonClass(accent: NoticeAccent): string {
  if (accent === 'danger') return 'btn btn-danger px-6 py-2.5';
  if (accent === 'capital') {
    return 'rounded-md bg-capital px-6 py-2.5 text-sm font-semibold text-onbright hover:bg-capital/90';
  }
  return 'btn btn-primary px-6 py-2.5';
}

/** Subtítulo bajo el título de cabecera (el «qué» concreto del aviso). */
function noticeSubtitle(notice: ImportantNotice): string | null {
  switch (notice.kind) {
    case 'marketExit':
      return `«${notice.gameName}»`;
    case 'staffLeft':
      return `${notice.employeeName} · ${notice.role}`;
    case 'scaleUp':
      return notice.stageName;
    case 'bankruptcyWarning':
      return null;
  }
}

/** Fila del P&L: etiqueta a la izquierda, importe tabular a la derecha. */
function PnlRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-sm text-ink-mute">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

/** Cuerpo del aviso "sale del mercado": el P&L (generó vs costó) — Pilar 2. */
function MarketExitBody({ notice }: { notice: Extract<ImportantNotice, { kind: 'marketExit' }> }) {
  const net = notice.revenue - notice.cost;
  return (
    <div className="mt-4">
      <div className="rounded-md border border-line bg-raised/60 px-4 py-2">
        <PnlRow label="Generó (ingresos)" value={formatMoney(notice.revenue)} tone="text-ok" />
        <PnlRow label="Costó (desarrollo)" value={`−${formatMoney(notice.cost)}`} tone="text-ink" />
        <div className="my-1 border-t border-line" />
        <PnlRow
          label="Balance neto"
          value={`${net >= 0 ? '+' : '−'}${formatMoney(Math.abs(net))}`}
          tone={net >= 0 ? 'text-ok' : 'text-danger'}
        />
      </div>
      <p className="mt-3 text-sm text-ink">
        Vendió {notice.units.toLocaleString('es-ES')} copias en total. A partir de ahora{' '}
        <span className="font-semibold text-warn">deja de generar ingresos</span>.
      </p>
      <p className="mt-2 text-xs text-ink-faint">
        Coste = desarrollo + licencia + marketing de este juego (sin la nómina general del estudio,
        que es un gasto compartido).
      </p>
    </div>
  );
}

/** Cuerpo según el tipo de aviso. */
function NoticeBody({ notice }: { notice: ImportantNotice }) {
  switch (notice.kind) {
    case 'marketExit':
      return <MarketExitBody notice={notice} />;
    case 'staffLeft':
      return (
        <p className="mt-4 text-sm text-ink">
          <span className="font-semibold text-ink-hi">{notice.employeeName}</span> ({notice.role})
          deja el estudio, harto del trato recibido. Su plaza queda libre y el resto del equipo acusa
          el golpe de moral. Cuida a los que quedan.
        </p>
      );
    case 'bankruptcyWarning':
      return (
        <p className="mt-4 text-sm text-ink">
          La caja está en <span className="font-semibold text-danger">números rojos</span>. Si sigue
          así {notice.graceWeeks} semanas seguidas, el estudio quiebra. Recorta costes, cobra ventas
          o pide un préstamo para enderezar el rumbo.
        </p>
      );
    case 'scaleUp':
      return (
        <p className="mt-4 text-sm text-ink">
          Cumples los requisitos para convertir el estudio en{' '}
          <span className="font-semibold text-ok">{notice.stageName}</span>. La ampliación no es
          gratis: cuesta <span className="font-semibold text-capital">{formatMoney(notice.cost)}</span>{' '}
          y subirá los gastos fijos semanales. Cuando quieras dar el paso, el botón está en la
          cronología de escala.
        </p>
      );
  }
}

export function ImportantNoticeModal() {
  const notice = useGameStore((s) => s.pendingNotices[0] ?? null);
  const dismiss = useGameStore((s) => s.dismissNotice);
  const openTimeline = useGameStore((s) => s.openTimeline);
  // "Ver la cronología": el aviso de ampliación encadena con la superficie
  // donde vive el botón de compra (docs/18 V4-c), como el beat de era con la
  // cronología de eras. Presentación pura: solo navegación.
  const accept = () => {
    if (notice?.kind === 'scaleUp') openTimeline('escala');
    dismiss();
  };
  // Cede el paso a decisiones duras y beats con superficie propia: espera.
  const blocked = useGameStore(
    (s) =>
      s.game.gameOver !== null ||
      s.eraTransition !== null ||
      s.awardsWeek !== null ||
      s.game.community.crises.some((c) => c.status === 'abierta') ||
      s.game.community.dilemmas.length > 0,
  );

  if (!notice || blocked) return null;

  const spec = IMPORTANT_NOTICES[notice.kind];
  const accent = ACCENT_STYLES[spec.accent];
  const subtitle = noticeSubtitle(notice);

  return (
    <div
      role="alertdialog"
      aria-label={spec.title}
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-scrim px-6 py-10"
    >
      <PopIn className={`modal-panel w-full max-w-md rounded-lg border ${accent.border} p-6 shadow-2xl`}>
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-3xl leading-none">
            {spec.icon}
          </span>
          <div className="min-w-0">
            <h2 className={`text-lg font-bold ${accent.head}`}>{spec.title}</h2>
            {subtitle && <p className="truncate text-sm text-ink-mute">{subtitle}</p>}
          </div>
        </div>

        <NoticeBody notice={notice} />

        <div className="mt-6 flex justify-end">
          <button type="button" autoFocus onClick={accept} className={acceptButtonClass(spec.accent)}>
            {spec.acceptLabel}
          </button>
        </div>
      </PopIn>
    </div>
  );
}
