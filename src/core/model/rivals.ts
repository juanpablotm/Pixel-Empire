import type { ProjectSize } from './project';

/**
 * Tipos de los estudios rivales (Fase 9.5, docs/19 §9.5 y docs/04 §9): la
 * industria simulada que lanza juegos, disputa ventanas, roba talento y compite
 * en la gala. Todo serializable: el estado vivo cuelga de GameState.rivals y
 * los perfiles estáticos viven en data/rivals.ts (data-driven, docs/08 §1).
 */

/** Nivel del estudio rival: define cadencia, tamaño y calidad de sus juegos. */
export type RivalTier = 'indie' | 'medio' | 'gigante';

/**
 * Perfil de comportamiento (docs/19 §9.5 "IA" legible, no azar opaco):
 * la fábrica encadena secuelas de lo que le funciona (inunda y satura),
 * el de prestigio lanza menos y mejor, y el oportunista persigue las
 * fiebres activas (ayuda a quemarlas, docs/04 §2.1).
 */
export type RivalProfile = 'fabrica' | 'prestigio' | 'oportunista';

/**
 * Un lanzamiento rival ANUNCIADO (docs/19 §9.5 "ventanas de lanzamiento"):
 * visible en el calendario de Industria desde announcedWeek. Si `hyped`
 * (campaña de gigante), define una ventana disputada que aplasta los
 * lanzamientos ajenos del mismo género (core/systems/rivals.ts).
 */
export interface RivalAnnouncement {
  gameName: string;
  genreId: string;
  themeId: string;
  size: ProjectSize;
  /** Semana en la que se hizo público (antes de esa semana la UI no lo enseña). */
  announcedWeek: number;
  releaseWeek: number;
  /** true = llega con campaña masiva (solo gigantes): ventana disputada. */
  hyped: boolean;
}

/** Un juego rival ya lanzado (historial acotado: panel + gala + legibilidad). */
export interface RivalGame {
  name: string;
  genreId: string;
  themeId: string;
  size: ProjectSize;
  /** Reseña 0..100 en la misma escala que la tuya (docs/04 §5). */
  review: number;
  releaseWeek: number;
  /** true si llegó con campaña de gigante (su ventana aplastó a los vecinos). */
  hyped: boolean;
  /** true si su éxito encendió una fiebre (docs/04 §2.1: "fiebre del oro"). */
  feverIgnited?: boolean;
}

/** Estado vivo de un estudio rival: evoluciona (crece o decae) con la partida. */
export interface RivalRuntime {
  /** Id del RivalDef de data/rivals.ts. */
  id: string;
  /** Tier ACTUAL (puede subir o bajar respecto al de data/rivals.ts). */
  tier: RivalTier;
  /**
   * Fuerza 0..100: el momento del estudio. Sube con hits y fichajes, baja con
   * flops, y revierte despacio al baseline de su tier. Sostenida fuera de
   * banda, promociona o degrada el tier (balance.rivals.tierShift).
   */
  strength: number;
  /** Semanas consecutivas con la fuerza en zona de promoción / de caída. */
  weeksHigh: number;
  weeksLow: number;
  /** Semana en la que anunciará su próximo juego (si aún no hay anuncio). */
  nextAnnounceWeek: number;
  /** Su próximo lanzamiento anunciado, o null si todavía no toca. */
  nextRelease: RivalAnnouncement | null;
  /** Últimos lanzamientos (acotado por balance.rivals.maxGamesKept). */
  games: RivalGame[];
  /** true si el estudio cerró (los indies hundidos mueren; docs/19 §9.5). */
  closed: boolean;
}

/**
 * Oferta de caza de talento en curso (docs/19 §9.5 "robo de talento" +
 * docs/05 §7): un rival tienta a un empleado tuyo con lealtad baja. Pausa el
 * juego y se resuelve con resolvePoachOffer (contraoferta o dejarle ir).
 * Como mucho una a la vez.
 */
export interface PoachOffer {
  rivalId: string;
  employeeId: string;
  /** Salario semanal que ofrece el rival (para el modal y la contraoferta). */
  offeredSalary: number;
  week: number;
}

/** Estado de la capa de rivales dentro de GameState (serializable). */
export interface RivalsState {
  studios: RivalRuntime[];
  poachOffer: PoachOffer | null;
}
