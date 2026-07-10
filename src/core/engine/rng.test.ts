import { describe, expect, it } from 'vitest';
import { makeRng } from './rng';

const SEED = 123456;

const sequenceOf = (rng: { next(): number }, n: number): number[] =>
  Array.from({ length: n }, () => rng.next());

describe('makeRng — PRNG determinista con semilla (docs/08 §1)', () => {
  it('misma semilla → misma secuencia', () => {
    const a = makeRng(SEED);
    const b = makeRng(SEED);
    expect(sequenceOf(a, 100)).toEqual(sequenceOf(b, 100));
  });

  it('semillas distintas → secuencias distintas', () => {
    const a = sequenceOf(makeRng(SEED), 20);
    const b = sequenceOf(makeRng(SEED + 1), 20);
    expect(a).not.toEqual(b);
  });

  it('streams distintos de la misma semilla → secuencias independientes', () => {
    // Uso previsto: makeRng(state.seed, state.week), una secuencia por semana.
    const week1 = sequenceOf(makeRng(SEED, 1), 20);
    const week2 = sequenceOf(makeRng(SEED, 2), 20);
    expect(week1).not.toEqual(week2);
    // Y el mismo stream es reproducible.
    expect(sequenceOf(makeRng(SEED, 1), 20)).toEqual(week1);
  });

  it('next() devuelve valores en [0, 1)', () => {
    const rng = makeRng(SEED);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(min, max) queda en el rango inclusive y cubre los extremos', () => {
    const rng = makeRng(SEED);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
      seen.add(v);
    }
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  it('int lanza con rango inválido', () => {
    expect(() => makeRng(SEED).int(5, 1)).toThrow();
  });

  it('pick devuelve elementos del array y es determinista', () => {
    const items = ['a', 'b', 'c', 'd'] as const;
    const a = makeRng(SEED);
    const b = makeRng(SEED);
    for (let i = 0; i < 100; i++) {
      const picked = a.pick(items);
      expect(items).toContain(picked);
      expect(b.pick(items)).toBe(picked);
    }
  });

  it('pick lanza con array vacío', () => {
    expect(() => makeRng(SEED).pick([])).toThrow();
  });

  it('chance(0) nunca acierta y chance(1) siempre', () => {
    const never = makeRng(SEED);
    const always = makeRng(SEED);
    for (let i = 0; i < 200; i++) {
      expect(never.chance(0)).toBe(false);
      expect(always.chance(1)).toBe(true);
    }
  });
});
