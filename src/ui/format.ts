import { balance } from '../data/balance';

/** Utilidades de presentación (solo formato; sin lógica de juego). */

export function formatMoney(amount: number): string {
  return `${amount.toLocaleString('es-ES')} 💰`;
}

/**
 * Fracción → porcentaje legible en es-ES, sin decimales de más: 0,01 → "1 %",
 * 0,025 → "2,5 %". Redondear a entero convertía la cuota del préstamo (2,5 %)
 * en un "3 %" que no cuadraba con la cifra de al lado.
 */
export function formatRate(fraction: number): string {
  return `${(fraction * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
}

/** Convierte la semana absoluta en fecha legible: "Semana 3 · 1980". */
export function formatWeek(week: number): string {
  const zeroBased = week - balance.time.startWeek;
  const year = balance.time.startYear + Math.floor(zeroBased / 52);
  const weekOfYear = (zeroBased % 52) + 1;
  return `Semana ${weekOfYear} · ${year}`;
}
