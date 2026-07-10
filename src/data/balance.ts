import type { EraId } from '../core/model/gameState';

/**
 * Balance central (docs/09 §11): todo número que afecte al juego vive aquí,
 * nunca hardcodeado en la lógica. Balancear = editar este archivo.
 *
 * Fase 0: solo lo que el andamiaje necesita.
 */
export const balance = {
  time: {
    /** Semana en la que empieza una partida nueva. */
    startWeek: 1,
    /** Era inicial: el garaje, ~1980 (docs/02 §5). */
    startEra: 'E1' as EraId,
    /** Milisegundos reales por tick (1 semana) a velocidad x1 (docs/02 §1). */
    baseTickMs: 1000,
  },
  economy: {
    /** Capital inicial del garaje: 10.000 💰 [DECIDIDO, docs/12 §6]. */
    initialCapital: 10_000,
  },
} as const;
