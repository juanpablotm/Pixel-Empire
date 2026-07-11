import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../core';
import { balance } from '../data/balance';
import { useGameStore } from './store';

const SEED = 2024;

const CONCEPT = {
  name: 'Mazmorras del Alba',
  themeId: 'fantasia',
  genreId: 'rpg',
  platformId: 'pcCasero',
  audience: 'hardcore',
  size: 'pequeno',
} as const;

describe('useGameStore — estado + acciones que delegan en core (docs/08 §6)', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().setSpeed(0);
    useGameStore.setState({
      game: createInitialState(SEED),
      speed: 0,
      screen: 'estudio',
      reviewGameId: null,
    });
  });

  afterEach(() => {
    useGameStore.getState().setSpeed(0);
    vi.useRealTimers();
  });

  it('advanceWeek avanza la semana vía tick()', () => {
    const before = useGameStore.getState().game.week;
    useGameStore.getState().advanceWeek();
    useGameStore.getState().advanceWeek();
    expect(useGameStore.getState().game.week).toBe(before + 2);
  });

  it('newGame reinicia con la semilla dada y en pausa', () => {
    useGameStore.getState().advanceWeek();
    useGameStore.getState().newGame(99);
    const { game, speed } = useGameStore.getState();
    expect(game).toEqual(createInitialState(99));
    expect(speed).toBe(0);
  });

  it('saveGame + loadGame hacen round-trip por localStorage', () => {
    useGameStore.getState().advanceWeek();
    const saved = useGameStore.getState().game;
    useGameStore.getState().saveGame();

    useGameStore.getState().newGame(1);
    expect(useGameStore.getState().game).not.toEqual(saved);

    expect(useGameStore.getState().loadGame()).toBe(true);
    expect(useGameStore.getState().game).toEqual(saved);
  });

  it('loadGame devuelve false si no hay guardado', () => {
    expect(useGameStore.getState().loadGame()).toBe(false);
  });

  it('setSpeed(1) hace avanzar el tiempo; pausar lo detiene', () => {
    vi.useFakeTimers();
    const start = useGameStore.getState().game.week;

    useGameStore.getState().setSpeed(1);
    vi.advanceTimersByTime(balance.time.baseTickMs * 3);
    expect(useGameStore.getState().game.week).toBe(start + 3);

    useGameStore.getState().setSpeed(0);
    vi.advanceTimersByTime(balance.time.baseTickMs * 10);
    expect(useGameStore.getState().game.week).toBe(start + 3);
  });

  it('setSpeed(4) avanza 4 semanas por intervalo base', () => {
    vi.useFakeTimers();
    const start = useGameStore.getState().game.week;

    useGameStore.getState().setSpeed(4);
    vi.advanceTimersByTime(balance.time.baseTickMs * 2);
    expect(useGameStore.getState().game.week).toBe(start + 8);

    useGameStore.getState().setSpeed(0);
  });

  it('startProject crea el proyecto y navega a la pantalla de desarrollo', () => {
    useGameStore.getState().startProject(CONCEPT);
    const { game, screen } = useGameStore.getState();
    expect(game.projects).toHaveLength(1);
    expect(screen).toBe('desarrollo');
  });

  it('un cambio de fase de desarrollo pausa el juego', () => {
    useGameStore.getState().startProject(CONCEPT);
    useGameStore.getState().setSpeed(2);
    useGameStore.getState().advanceWeek();
    useGameStore.getState().advanceWeek(); // el proyecto pequeño entra en Producción
    const { game, speed } = useGameStore.getState();
    expect(game.projects[0].phase).toBe(2);
    expect(speed).toBe(0);
  });

  it('al lanzarse un juego pausa y navega a la reseña', () => {
    useGameStore.getState().startProject(CONCEPT);
    for (let i = 0; i < 6; i++) useGameStore.getState().advanceWeek();

    const { game, screen, reviewGameId, speed } = useGameStore.getState();
    expect(game.releasedGames).toHaveLength(1);
    expect(screen).toBe('resena');
    expect(reviewGameId).toBe(game.releasedGames[0].id);
    expect(speed).toBe(0);
  });

  it('la bancarrota pausa el juego', () => {
    useGameStore.setState({
      game: { ...createInitialState(SEED), studio: { capital: 0, scaleStage: 1 } },
    });
    useGameStore.getState().setSpeed(1);
    for (let i = 0; i < balance.economy.bankruptcyGraceWeeks; i++) {
      useGameStore.getState().advanceWeek();
    }
    const { game, speed } = useGameStore.getState();
    expect(game.gameOver).not.toBeNull();
    expect(speed).toBe(0);
  });
});
