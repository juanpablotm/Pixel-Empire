import type { Segment } from '../core/model/market';
import type { DebtSource } from '../core/model/moral';

/**
 * Definiciones de escándalos (docs/06 §5): uno por fuente de deuda de
 * reputación, para que cada estallido sea trazable a la decisión que lo
 * alimentó. Los golpes de reputación son magnitud máxima (se escalan por la
 * magnitud del escándalo y el colchón de reputación en core/systems/morale.ts).
 */

export interface ScandalDef {
  source: DebtSource;
  /** Titular del historial (el drama en el feed llega en Fase 5, docs/07). */
  headline: string;
  /** Golpes máximos de reputación por segmento (puntos 0–100). */
  repHits: Partial<Record<Segment, number>>;
  /** Multa/coste directo máximo en 💰 (0 = sin multa). */
  fine: number;
  /** Multiplicador de ventas de todo el catálogo mientras dura (< 1). */
  salesPenalty: number;
  /** Semanas que dura el efecto sobre las ventas. */
  durationWeeks: number;
  /** Golpe de moral a toda la plantilla (los escándalos avergüenzan). */
  teamMoraleHit: number;
  /** Presión regulatoria que aporta, por id de regulación (data/regulations.ts). */
  regulatoryPressure?: { regulationId: string; amount: number };
}

export const scandalDefs: readonly ScandalDef[] = [
  {
    source: 'crunch',
    headline: 'Se filtra la cultura de crunch del estudio: jornadas maratonianas y quemados.',
    repHits: { empleador: 18, prensa: 8, comunidad: 5 },
    fine: 0,
    salesPenalty: 0.85,
    durationWeeks: 6,
    teamMoraleHit: 8,
  },
  {
    source: 'lootboxes',
    headline: 'Investigan tus loot boxes: "un casino sin licencia en cada partida".',
    repHits: { hardcore: 15, comunidad: 10, prensa: 8 },
    fine: 4_000,
    salesPenalty: 0.75,
    durationWeeks: 8,
    teamMoraleHit: 5,
    regulatoryPressure: { regulationId: 'lootbox-ban', amount: 1 },
  },
  {
    source: 'dayOneDLC',
    headline: '"Nos vendieron el juego a trozos": el DLC day-one incendia los foros.',
    repHits: { hardcore: 12, comunidad: 8, prensa: 4 },
    fine: 0,
    salesPenalty: 0.8,
    durationWeeks: 6,
    teamMoraleHit: 4,
  },
  {
    source: 'mtxAgresivas',
    headline: 'La tienda in-game cruza la línea: acusaciones de pay-to-win organizadas.',
    repHits: { hardcore: 14, comunidad: 9, prensa: 6 },
    fine: 0,
    salesPenalty: 0.78,
    durationWeeks: 7,
    teamMoraleHit: 5,
    regulatoryPressure: { regulationId: 'lootbox-ban', amount: 0.5 },
  },
  {
    source: 'precioAbusivo',
    headline: 'Comparativas de precio te señalan: "el juego más caro por minuto de la historia".',
    repHits: { casual: 10, comunidad: 8, hardcore: 4 },
    fine: 0,
    salesPenalty: 0.85,
    durationWeeks: 5,
    teamMoraleHit: 3,
  },
  {
    source: 'refrito',
    headline: 'La crítica se organiza: "la fábrica de refritos ha vuelto a fotocopiar".',
    repHits: { critica: 12, hardcore: 6, prensa: 5 },
    fine: 0,
    salesPenalty: 0.85,
    durationWeeks: 5,
    teamMoraleHit: 4,
  },
];

export function getScandalDef(source: DebtSource): ScandalDef {
  const def = scandalDefs.find((s) => s.source === source);
  if (!def) throw new Error(`Escándalo sin definición: ${source}`);
  return def;
}
