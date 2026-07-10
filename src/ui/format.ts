import { balance } from '../data/balance';

/** Utilidades de presentación (solo formato; sin lógica de juego). */

export function formatMoney(amount: number): string {
  return `${amount.toLocaleString('es-ES')} 💰`;
}

/** Convierte la semana absoluta en fecha legible: "Semana 3 · 1980". */
export function formatWeek(week: number): string {
  const zeroBased = week - balance.time.startWeek;
  const year = balance.time.startYear + Math.floor(zeroBased / 52);
  const weekOfYear = (zeroBased % 52) + 1;
  return `Semana ${weekOfYear} · ${year}`;
}
