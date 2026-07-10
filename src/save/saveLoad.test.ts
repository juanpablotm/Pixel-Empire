import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, tick } from '../core';
import {
  deserializeSave,
  loadFromLocalStorage,
  SAVE_STORAGE_KEY,
  SAVE_VERSION,
  saveToLocalStorage,
  serializeSave,
} from './saveLoad';

const SEED = 777;

describe('saveLoad — guardado/carga con versión (docs/08 §7)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('serializa y deserializa con round-trip idéntico', () => {
    let state = createInitialState(SEED);
    state = tick(tick(state)); // avanza un par de semanas para no probar solo el estado inicial
    expect(deserializeSave(serializeSave(state))).toEqual(state);
  });

  it('el JSON incluye saveVersion', () => {
    const parsed = JSON.parse(serializeSave(createInitialState(SEED))) as {
      saveVersion: number;
    };
    expect(parsed.saveVersion).toBe(SAVE_VERSION);
  });

  it('rechaza un guardado con formato desconocido', () => {
    expect(() => deserializeSave('{}')).toThrow(/formato desconocido/);
    expect(() => deserializeSave('null')).toThrow(/formato desconocido/);
    expect(() => deserializeSave('{"saveVersion":1,"state":{}}')).toThrow(
      /formato desconocido/,
    );
  });

  it('rechaza JSON corrupto', () => {
    expect(() => deserializeSave('esto no es json')).toThrow();
  });

  it('rechaza un guardado de una versión futura', () => {
    const state = createInitialState(SEED);
    const future = JSON.stringify({ saveVersion: SAVE_VERSION + 1, state });
    expect(() => deserializeSave(future)).toThrow(/versión futura/);
  });

  it('rechaza una versión antigua sin migración registrada', () => {
    const state = createInitialState(SEED);
    const old = JSON.stringify({ saveVersion: 0, state });
    expect(() => deserializeSave(old)).toThrow(/migración/);
  });

  it('guarda y carga desde localStorage', () => {
    const state = tick(createInitialState(SEED));
    saveToLocalStorage(state);
    expect(localStorage.getItem(SAVE_STORAGE_KEY)).not.toBeNull();
    expect(loadFromLocalStorage()).toEqual(state);
  });

  it('devuelve null si no hay guardado', () => {
    expect(loadFromLocalStorage()).toBeNull();
  });
});
