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

  it('en Fase 0 no cambia nada más que la semana', () => {
    const state = createInitialState(SEED);
    const next = tick(state);
    expect({ ...next, week: state.week }).toEqual(state);
  });

  it('el estado inicial sale de data/balance.ts', () => {
    const state = createInitialState(SEED);
    expect(state.seed).toBe(SEED);
    expect(state.week).toBe(balance.time.startWeek);
    expect(state.era).toBe(balance.time.startEra);
    expect(state.studio.capital).toBe(balance.economy.initialCapital);
  });
});
