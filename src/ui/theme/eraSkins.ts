import type { EraId } from '../../core';
import { eraOrder } from '../../data/eras';

/**
 * Pieles de UI por era (docs/10 §8, innovación I7): la interfaz envejece con
 * las 7 eras. Cada piel es una clase CSS (definida en ui/index.css) que
 * ajusta variables y superficies; nada de lógica de juego. La piel nunca
 * sacrifica legibilidad (contraste garantizado) y puede desactivarse con el
 * toggle "UI moderna siempre" (docs/10 §13), que fuerza la base flat de E5.
 */

export interface EraSkin {
  /** Clase raíz que activa la piel (ui/index.css). */
  className: string;
  /** Descripción corta para tooltips/transición. */
  flavor: string;
  /**
   * Acento de la era para el beat de transición (docs/10 §7.6): versión
   * SIEMPRE clara del acento de la piel, legible sobre el telón nocturno del
   * overlay (que puede cubrir pieles claras). Solo presentación.
   */
  beatAccent: string;
}

export const eraSkins: Record<EraId, EraSkin> = {
  E1: { className: 'era-E1', flavor: 'Fósforo verde y sabor CRT: los terminales del garaje.', beatAccent: '#4ade80' },
  E2: { className: 'era-E2', flavor: 'Color primario y formas boxy: la era de los cartuchos.', beatAccent: '#f87171' },
  E3: { className: 'era-E3', flavor: 'Beige de software noventero, relieves y barras de título.', beatAccent: '#7fb1ef' },
  E4: { className: 'era-E4', flavor: 'Brillos glossy y reflejos de la web temprana.', beatAccent: '#38bdf8' },
  E5: { className: 'era-E5', flavor: 'Flat design puro: la base moderna.', beatAccent: '#34d399' },
  E6: { className: 'era-E6', flavor: 'Modo oscuro con neón: estética de dashboard y streaming.', beatAccent: '#e879f9' },
  E7: { className: 'era-E7', flavor: 'Translúcido y minimal: glassmorphism del futuro cercano.', beatAccent: '#a5f3fc' },
};

/** Piel efectiva: con "UI moderna siempre" se fuerza la base flat (E5). */
export function skinFor(era: EraId, modernUi: boolean): EraSkin {
  return modernUi ? eraSkins.E5 : eraSkins[era];
}

/**
 * Era anterior en el orden canónico (E1 no tiene: devuelve E1). Durante el
 * beat de transición (docs/10 §7.6) la UI conserva la piel de la era vieja
 * hasta que el jugador "entra" en la nueva: entonces la piel se transforma.
 */
export function previousEra(era: EraId): EraId {
  const i = eraOrder.indexOf(era);
  return i > 0 ? eraOrder[i - 1] : era;
}
