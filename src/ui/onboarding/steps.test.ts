import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  setFocus,
  startProject,
  tick,
  type GameState,
  type ProjectConcept,
  type ReleasedGame,
} from '../../core';
import { defaultMonetization } from '../../data/monetization';
import { genres } from '../../data/genres';
import { themes } from '../../data/themes';
import { platforms } from '../../data/platforms';
import type { GameStore, Screen } from '../../state/store';
import { tutorialSteps, type TutorialStep } from './steps';

/**
 * Los predicados `advanceWhen` del tutorial (Fase 7F) son funciones puras
 * sobre el estado: el paso avanza SOLO cuando la acción real del jugador se
 * refleja en el juego (semilla fija, docs/08 §8).
 */

const SEED = 7;

const stepById = (id: string): TutorialStep => {
  const step = tutorialSteps.find((s) => s.id === id);
  if (!step) throw new Error(`No existe el paso ${id}`);
  return step;
};

/** Estado del store mínimo para los predicados (solo leen game/screen/speed). */
function storeWith(game: GameState, patch: Partial<GameStore> = {}): GameStore {
  return { game, speed: 0, screen: 'estudio' as Screen, ...patch } as GameStore;
}

const concept: ProjectConcept = {
  name: 'Tutorial Quest',
  themeId: themes[0].id,
  genreId: genres[0].id,
  platformId: platforms[0].id,
  audience: 'amplio',
  size: 'pequeno',
  price: 30,
  monetization: defaultMonetization(),
};

describe('tutorial — avanza por acción real (docs/13 7F)', () => {
  it('«nuevo-juego»: al abrir la concepción (o si ya hay proyecto)', () => {
    const fresh = createInitialState(SEED);
    const when = stepById('nuevo-juego').advanceWhen!;

    expect(when(storeWith(fresh))).toBe(false);
    expect(when(storeWith(fresh, { screen: 'concepcion' }))).toBe(true);
    expect(when(storeWith(startProject(fresh, concept)))).toBe(true);
  });

  it('«empezar-desarrollo»: cuando el proyecto existe de verdad', () => {
    const fresh = createInitialState(SEED);
    const when = stepById('empezar-desarrollo').advanceWhen!;

    expect(when(storeWith(fresh, { screen: 'concepcion' }))).toBe(false);
    expect(when(storeWith(startProject(fresh, concept)))).toBe(true);
  });

  it('«esfuerzo»: solo al mover un deslizador (el reparto deja los tercios)', () => {
    const withProject = startProject(createInitialState(SEED), concept);
    const when = stepById('esfuerzo').advanceWhen!;

    // Recién creado, el reparto es el por defecto (evenAllocation): no avanza.
    expect(when(storeWith(withProject))).toBe(false);

    const touched = setFocus(withProject, 1, { motor: 0.5, jugabilidad: 0.3, historia: 0.2 });
    expect(when(storeWith(touched))).toBe(true);
  });

  it('«tiempo»: al arrancar el reloj o avanzar la primera semana', () => {
    const withProject = startProject(createInitialState(SEED), concept);
    const when = stepById('tiempo').advanceWhen!;

    expect(when(storeWith(withProject))).toBe(false);
    expect(when(storeWith(withProject, { speed: 1 }))).toBe(true);
    expect(when(storeWith(tick(withProject)))).toBe(true);
  });

  it('«desarrollo»: espera en silencio hasta el primer lanzamiento', () => {
    const fresh = createInitialState(SEED);
    const step = stepById('desarrollo');

    expect(step.quiet).toBe(true);
    expect(step.advanceWhen!(storeWith(fresh))).toBe(false);
    const released = { ...fresh, releasedGames: [{} as ReleasedGame] };
    expect(step.advanceWhen!(storeWith(released))).toBe(true);
  });

  it('el guion completo: pasos con ancla o centrados, siempre saltables', () => {
    // Cada paso o bien avanza por acción real o bien tiene botón manual:
    // ninguno puede dejar al jugador atrapado.
    for (const step of tutorialSteps) {
      expect(
        step.advanceWhen !== undefined || step.nextLabel !== undefined,
        `el paso ${step.id} no tiene salida`,
      ).toBe(true);
    }
  });
});
