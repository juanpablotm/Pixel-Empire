import type { LogEntry } from '../core/model/gameState';

/**
 * Notificaciones de dos niveles (docs/17 U4, docs/10 §6–§7). Fuente de verdad
 * única y data-driven: para mover un evento entre "menor" e "importante", o
 * cambiar su presentación, se edita AQUÍ, no la lógica.
 *
 * - **Menores → toast** (abajo-derecha, no interrumpen): el resto del historial
 *   que no tenga una superficie importante (ventas rutinarias, cambios leves).
 * - **Importantes → pausan el tiempo**: el jugador NO debe perdérselas.
 *   Algunas tienen un **modal genérico** de aviso (este archivo lo describe);
 *   otras ya tienen su **beat dedicado** (momentos señal de docs/10 §7) y solo
 *   se documentan aquí para tener la clasificación completa en un sitio.
 *
 * La pausa la dispara el estado/UI (state/store.ts), nunca el núcleo (docs/08).
 */

/** Los avisos importantes: los que paran el tiempo. */
export type NoticeKind =
  | 'marketExit' // un juego sale del mercado → P&L (generó vs costó)
  | 'staffLeft' // renuncia de un empleado (cualquiera; docs/17 U4 ajustado)
  | 'bankruptcyWarning' // primera semana en números rojos (docs/06 §1)
  | 'scaleUp' // desbloqueo de etapa de escala (docs/02 §4)
  | 'crisis' // escándalo/crisis (beat: CrisisModal, docs/07 §5)
  | 'era' // cambio de era (beat: EraTransition, docs/10 §7.6)
  | 'award'; // premio ganado (beat: AwardsModal, docs/06 §7)

/** Dónde se presenta un aviso importante. */
export type NoticeSurface =
  | 'modal' // modal genérico de aviso (ImportantNoticeModal)
  | 'beat'; // su propio momento señal, ya existente

/** Acento visual del modal genérico (mapea a tokens de color de la piel). */
export type NoticeAccent = 'danger' | 'capital' | 'ok' | 'info';

export interface NoticeSpec {
  /** Nivel: todos estos son importantes (los menores son toasts, sin entrada). */
  level: 'importante';
  surface: NoticeSurface;
  /** Emoji/icono de cabecera. */
  icon: string;
  /** Título del modal (los `beat` lo ignoran: tienen el suyo). */
  title: string;
  /** Texto del botón de descarte ("Aceptar/Continuar", docs/17 U4). */
  acceptLabel: string;
  accent: NoticeAccent;
}

/**
 * Catálogo de avisos importantes. Editar aquí para reclasificar o retextar.
 * Los baseline de docs/17 U4 están todos presentes.
 */
export const IMPORTANT_NOTICES: Record<NoticeKind, NoticeSpec> = {
  marketExit: {
    level: 'importante',
    surface: 'modal',
    icon: '📉',
    title: 'Un juego sale del mercado',
    acceptLabel: 'Entendido',
    accent: 'info',
  },
  staffLeft: {
    level: 'importante',
    surface: 'modal',
    icon: '🚪',
    title: 'Renuncia en el equipo',
    acceptLabel: 'Continuar',
    accent: 'danger',
  },
  bankruptcyWarning: {
    level: 'importante',
    surface: 'modal',
    icon: '🏦',
    title: 'Aviso de bancarrota',
    acceptLabel: 'Lo asumo',
    accent: 'danger',
  },
  scaleUp: {
    level: 'importante',
    surface: 'modal',
    icon: '🏢',
    title: 'El estudio crece',
    acceptLabel: '¡Adelante!',
    accent: 'ok',
  },
  // Estos tres ya tienen su beat (docs/10 §7): no se rehacen por el modal
  // genérico; se listan para que la clasificación viva completa en un sitio.
  crisis: {
    level: 'importante',
    surface: 'beat',
    icon: '🔥',
    title: 'Crisis en curso',
    acceptLabel: 'Gestionar',
    accent: 'danger',
  },
  era: {
    level: 'importante',
    surface: 'beat',
    icon: '🌍',
    title: 'Cambio de era',
    acceptLabel: 'Continuar',
    accent: 'info',
  },
  award: {
    level: 'importante',
    surface: 'beat',
    icon: '🏆',
    title: 'Premio ganado',
    acceptLabel: 'Recoger',
    accent: 'capital',
  },
};

/**
 * Tipos del historial que NO deben duplicarse como toast porque ya se presentan
 * con una superficie importante (beat dedicado o modal de aviso). Derivado del
 * catálogo + los beats de fases previas. Lo consume el componente Toasts.
 *
 * - `lanzamiento`/`era`/`premios`/`fin`: beats de fases 1–6 (reseña, transición
 *   de era, gala, museo del legado).
 * - `ventas`: la única entrada `ventas` es "sale de las tiendas", que ahora es
 *   el modal de P&L (marketExit); su toast sería redundante.
 */
export const TOAST_HIDDEN_TYPES: ReadonlySet<LogEntry['type']> = new Set([
  'lanzamiento',
  'era',
  'premios',
  'fin',
  'ventas',
]);
