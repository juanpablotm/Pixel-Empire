import type { GameStore } from '../../state/store';

/**
 * Guion del tutorial del garaje (Fase 7F, docs/10 §13): introduce los
 * sistemas DE A POCO — concebir un juego, repartir esfuerzo, lanzar y leer la
 * reseña — guiado por ACCIÓN: cada paso resalta el control real (ancla
 * `data-tour` en la UI) y avanza cuando la acción real ocurre en el estado
 * (`advanceWhen`), no leyendo párrafos. Capa de GUÍA pura (docs/08): observa
 * el store, jamás calcula ni simula reglas de juego.
 */
export interface TutorialStep {
  id: string;
  /** Valor del ancla `data-tour` en la UI real; null = tarjeta centrada. */
  target: string | null;
  title: string;
  /** 1–2 líneas imperativas; el jugador aprende haciendo, no leyendo. */
  body: string;
  /** Avanza solo cuando la acción real se refleja en el estado. */
  advanceWhen?: (s: GameStore) => boolean;
  /** Botón de avance manual (pasos informativos o de red de seguridad). */
  nextLabel?: string;
  /** Paso discreto: chip en la esquina, sin foco ni telón (no estorba). */
  quiet?: boolean;
}

/** Reparto por defecto de una fase (core: evenAllocation = tercios). */
const EVEN_SHARE = 1 / 3;

/** true si el jugador ya movió algún deslizador del reparto de esfuerzo. */
function focusTouched(s: GameStore): boolean {
  return s.game.projects.some((p) =>
    p.focus.some((alloc) =>
      Object.values(alloc).some((share) => Math.abs(share - EVEN_SHARE) > 0.02),
    ),
  );
}

export const tutorialSteps: readonly TutorialStep[] = [
  {
    id: 'bienvenida',
    target: null,
    title: 'Bienvenido al garaje',
    body: 'Vas a llevar un estudio de videojuegos desde este garaje hasta lo más alto. Nada de manuales: te señalo el sitio y tú haces.',
    nextLabel: 'Vamos',
  },
  {
    id: 'nuevo-juego',
    target: 'new-game',
    title: 'Todo empieza con una idea',
    body: 'Pulsa «💡 Nuevo juego» para concebir tu primer título.',
    // La concepción es un modal desde la Fase 8.5 (docs/17 U3).
    advanceWhen: (s) => s.conceptionOpen || s.game.projects.length > 0,
  },
  {
    id: 'fit',
    target: 'fit-meter',
    title: 'El Fit es tu brújula',
    body: 'Tema, género, plataforma y público casan mejor o peor. Prueba combinaciones vigilando este medidor: verde promete, rojo avisa.',
    nextLabel: 'Entendido',
  },
  {
    id: 'empezar-desarrollo',
    target: 'start-dev',
    title: 'Dale luz verde',
    body: 'Ponle nombre al juego y pulsa «Empezar desarrollo».',
    advanceWhen: (s) => s.game.projects.length > 0,
  },
  {
    id: 'esfuerzo',
    target: 'focus-sliders',
    title: 'Reparte el esfuerzo',
    body: 'Mueve un deslizador: cada género pide su propio balance entre diseño y técnica, y la lectura de abajo te dice cómo vas.',
    advanceWhen: focusTouched,
    nextLabel: 'Así lo dejo',
  },
  {
    id: 'tiempo',
    target: 'time-controls',
    title: 'El tiempo manda',
    body: 'El mundo solo avanza si tú quieres. Dale a ▶ x1 (o a «+1 semana») y mira trabajar a tu fundador.',
    advanceWhen: (s) => s.speed > 0 || s.game.week > 1,
  },
  {
    id: 'desarrollo',
    target: null,
    quiet: true,
    title: 'El juego se cocina',
    body: 'Concepto → Desarrollo → Pulido, y al terminar se lanza solo. Te espero en la reseña.',
    advanceWhen: (s) => s.game.releasedGames.length > 0,
  },
  {
    id: 'resena',
    target: 'review-breakdown',
    title: 'La nota se explica sola',
    body: 'Cada línea ✔/~/✘ es una causa real: encaje, equilibrio, contenido, pulido, equipo e innovación. Aquí se aprende para el próximo juego.',
    nextLabel: 'Entendido',
  },
  {
    id: 'cierre',
    target: null,
    title: 'El garaje es tuyo',
    body: 'Vende, contrata, investiga… y cuando toque elegir entre Reputación y Capital, elige tú. El resto se descubre jugando.',
    nextLabel: '¡A jugar!',
  },
];
