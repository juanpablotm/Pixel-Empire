import type { ProjectSize } from './project';
import type { RivalTier } from './rivals';

/**
 * Filiales (Fase 9.7, docs/19 §9.7): estudios adquiridos que hacen juegos de
 * forma AUTÓNOMA. Comprar un rival lo saca de la competencia (docs/04 §9) y
 * abre este runtime: overhead continuo, lanzamientos propios que se cobran
 * como flujo, y una directiva de gestión que es la palanca macro del dilema
 * (docs/02 §4 y docs/06 §2). Todo serializable; los números viven en
 * balance.acquisitions y la lógica en core/systems/subsidiaries.ts.
 */

/**
 * Directiva de gestión de una filial (gestión por políticas, docs/02 §4):
 * `exprimir` = más caja hoy, moral→talento en caída (codicia a escala);
 * `autonomo` = neutra; `invertir` = +coste, moral/talento crecen (integridad).
 */
export type SubsidiaryDirective = 'exprimir' | 'autonomo' | 'invertir';

/** Un juego lanzado por la filial (historial acotado para el panel). */
export interface SubsidiaryGame {
  name: string;
  genreId: string;
  themeId: string;
  size: ProjectSize;
  /** Reseña 0..100, misma escala que la tuya (rollRivalReview con su talento). */
  review: number;
  releaseWeek: number;
  /** Bote de ingresos que aportó (base × (reseña/100)² × directiva). */
  bounty: number;
}

/** Una filial viva: el estado que evoluciona semana a semana. */
export interface Subsidiary {
  /** Id del RivalDef de origen (data/rivals.ts): nombre, perfil y especialidades. */
  id: string;
  name: string;
  /** Tier congelado al comprar (las filiales no promocionan: su dial es el talento). */
  tier: RivalTier;
  acquiredWeek: number;
  /** Lo que costó (para el P&L y la historia). */
  price: number;
  /** Talento 0..100: hereda la fuerza del rival al comprar; sigue a la moral. */
  talent: number;
  /** Moral 0..100 de la casa: la directiva la construye o la quema. */
  morale: number;
  directive: SubsidiaryDirective;
  /** Semana del próximo lanzamiento (la filial siempre está haciendo algo). */
  nextReleaseWeek: number;
  /** Semanas seguidas con la moral hundida (bajo la barra de éxodo). */
  weeksMoraleLow: number;
  /** Bote de ingresos pendiente: cada semana se cobra payoutRate × esto. */
  pendingIncome: number;
  /** Acumulados para el P&L: ingresos cobrados y overhead pagado. */
  revenue: number;
  upkeepPaid: number;
  /** Últimos lanzamientos (acotado por balance.acquisitions.maxGamesKept). */
  games: SubsidiaryGame[];
}
