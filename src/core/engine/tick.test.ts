import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from './initialState';
import { tick } from './tick';

const SEED = 42;

describe('tick — avance puro de 1 semana (docs/08 §4)', () => {
  it('avanza exactamente 1 semana', () => {
    const state = createInitialState(SEED);
    expect(tick(state).week).toBe(state.week + 1);
  });

  it('no muta el estado de entrada y devuelve un objeto nuevo', () => {
    const state = Object.freeze(createInitialState(SEED));
    const before = structuredClone(state);
    const next = tick(state);
    expect(state).toEqual(before);
    expect(next).not.toBe(state);
  });

  it('es determinista: mismo estado → mismo resultado', () => {
    const state = createInitialState(SEED);
    expect(tick(state)).toEqual(tick(state));
  });

  it('sin proyecto ni juegos lanzados: solo avanza la semana y paga el coste fijo', () => {
    const state = createInitialState(SEED);
    const next = tick(state);
    expect(next.studio.capital).toBe(state.studio.capital - balance.economy.weeklyUpkeep);
    expect({ ...next, week: state.week, studio: state.studio }).toEqual(state);
  });

  it('el estado inicial sale de data/balance.ts', () => {
    const state = createInitialState(SEED);
    expect(state.seed).toBe(SEED);
    expect(state.week).toBe(balance.time.startWeek);
    expect(state.era).toBe(balance.time.startEra);
    expect(state.studio.capital).toBe(balance.economy.initialCapital);
    expect(state.projects).toEqual([]);
    expect(state.releasedGames).toEqual([]);
    expect(state.gameOver).toBeNull();
    expect(state.log).toEqual([]);
  });
});
