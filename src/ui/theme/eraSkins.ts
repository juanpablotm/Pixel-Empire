import type { EraId } from '../../core';

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
}

export const eraSkins: Record<EraId, EraSkin> = {
  E1: { className: 'era-E1', flavor: 'Fósforo verde y sabor CRT: los terminales del garaje.' },
  E2: { className: 'era-E2', flavor: 'Color primario y formas boxy: la era de los cartuchos.' },
  E3: { className: 'era-E3', flavor: 'Grises de software noventero y botones con relieve.' },
  E4: { className: 'era-E4', flavor: 'Brillos glossy de la web temprana.' },
  E5: { className: 'era-E5', flavor: 'Flat design puro: la base moderna.' },
  E6: { className: 'era-E6', flavor: 'Modo oscuro con neón: estética de dashboard y streaming.' },
  E7: { className: 'era-E7', flavor: 'Translúcido y minimal: glassmorphism del futuro cercano.' },
};

/** Piel efectiva: con "UI moderna siempre" se fuerza la base flat (E5). */
export function skinFor(era: EraId, modernUi: boolean): EraSkin {
  return modernUi ? eraSkins.E5 : eraSkins[era];
}
