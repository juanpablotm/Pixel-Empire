/**
 * PRNG determinista con semilla (docs/08 §1: nada de Math.random() en la
 * lógica de juego). Misma semilla + mismo stream → misma secuencia, siempre.
 *
 * Algoritmo: mulberry32, con una mezcla previa (estilo murmur3) de
 * semilla + stream para derivar secuencias independientes de la misma
 * partida (p. ej. una por semana: `makeRng(state.seed, state.week)`).
 */

export interface Rng {
  /** Número en [0, 1), como Math.random pero determinista. */
  next(): number;
  /** Entero en [min, max], ambos inclusive. */
  int(min: number, max: number): number;
  /** true con probabilidad p (0..1). */
  chance(p: number): boolean;
  /** Un elemento del array, determinista. */
  pick<T>(items: readonly T[]): T;
}

/** Mezcla semilla y stream en un estado inicial de 32 bits bien distribuido. */
function mixSeed(seed: number, stream: number): number {
  let h = (seed ^ Math.imul(stream + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function makeRng(seed: number, stream = 0): Rng {
  let a = mixSeed(seed, stream);

  const next = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min, max) {
      if (max < min) throw new Error(`Rango inválido: [${min}, ${max}]`);
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(p) {
      return next() < p;
    },
    pick(items) {
      if (items.length === 0) throw new Error('pick() sobre un array vacío');
      return items[Math.floor(next() * items.length)];
    },
  };
}
