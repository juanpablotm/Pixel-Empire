import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameLoop } from './gameLoop';

const BASE_MS = 1000;

describe('createGameLoop — velocidad y pausa (docs/02 §1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('arranca en pausa y no dispara ticks', () => {
    const onTick = vi.fn();
    createGameLoop(onTick, BASE_MS);
    vi.advanceTimersByTime(BASE_MS * 10);
    expect(onTick).not.toHaveBeenCalled();
  });

  it('a x1 dispara 1 tick por intervalo base', () => {
    const onTick = vi.fn();
    const loop = createGameLoop(onTick, BASE_MS);
    loop.setSpeed(1);
    vi.advanceTimersByTime(BASE_MS * 3);
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it('a x2 y x4 multiplica la frecuencia', () => {
    const onTick = vi.fn();
    const loop = createGameLoop(onTick, BASE_MS);

    loop.setSpeed(2);
    vi.advanceTimersByTime(BASE_MS * 3);
    expect(onTick).toHaveBeenCalledTimes(6);

    onTick.mockClear();
    loop.setSpeed(4);
    vi.advanceTimersByTime(BASE_MS * 3);
    expect(onTick).toHaveBeenCalledTimes(12);
  });

  it('volver a pausa detiene los ticks', () => {
    const onTick = vi.fn();
    const loop = createGameLoop(onTick, BASE_MS);
    loop.setSpeed(1);
    vi.advanceTimersByTime(BASE_MS * 2);
    loop.setSpeed(0);
    vi.advanceTimersByTime(BASE_MS * 10);
    expect(onTick).toHaveBeenCalledTimes(2);
    expect(loop.getSpeed()).toBe(0);
  });

  it('dispose detiene el bucle y deja velocidad 0', () => {
    const onTick = vi.fn();
    const loop = createGameLoop(onTick, BASE_MS);
    loop.setSpeed(4);
    loop.dispose();
    vi.advanceTimersByTime(BASE_MS * 10);
    expect(onTick).not.toHaveBeenCalled();
    expect(loop.getSpeed()).toBe(0);
  });
});
