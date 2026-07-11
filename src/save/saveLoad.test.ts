import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, startProject, tick } from '../core';
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

  it('round-trip de una partida a mitad de juego (proyecto + lanzamiento)', () => {
    let state = startProject(createInitialState(SEED), {
      name: 'Mazmorras del Alba',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
    });
    for (let i = 0; i < 10; i++) state = tick(state); // lanza y vende unas semanas
    expect(state.releasedGames).toHaveLength(1);
    expect(deserializeSave(serializeSave(state))).toEqual(state);
  });

  it('migra un guardado v1 (Fase 0) al esquema actual', () => {
    const v1 = JSON.stringify({
      saveVersion: 1,
      state: { seed: SEED, week: 12, era: 'E1', studio: { capital: 8_500 } },
    });
    const state = deserializeSave(v1);
    expect(state.week).toBe(12);
    expect(state.studio.capital).toBe(8_500);
    expect(state.projects).toEqual([]);
    expect(state.releasedGames).toEqual([]);
    expect(state.projectCounter).toBe(0);
    expect(state.negativeWeeks).toBe(0);
    expect(state.gameOver).toBeNull();
    expect(state.log).toEqual([]);
  });

  it('migra un guardado v2 (Fase 1) al esquema actual: fundador, pool y escala', () => {
    const project = {
      id: 'proyecto-1',
      name: 'Viejo proyecto',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
      price: 20,
      phase: 2,
      focus: [{}, {}, {}],
      chosenFeatureIds: [],
      weeksSpent: 3,
      designPoints: 2,
      techPoints: 1,
      qaInvested: 0,
      bugDebt: 0.06,
    };
    const v2 = JSON.stringify({
      saveVersion: 2,
      state: {
        seed: SEED,
        week: 30,
        era: 'E1',
        studio: { capital: 12_000 },
        projects: [project],
        releasedGames: [],
        projectCounter: 1,
        negativeWeeks: 0,
        gameOver: null,
        log: [],
      },
    });
    const state = deserializeSave(v2);
    expect(state.studio.scaleStage).toBe(1);
    expect(state.staff).toHaveLength(1);
    expect(state.staff[0].founder).toBe(true);
    expect(state.staff[0].id).toBe('fundador');
    expect(state.candidates).toEqual([]);
    expect(state.projects[0].assignedStaff).toEqual(['fundador']);
    expect(state.projects[0].crunch).toBe(false);
    expect(state.projects[0].weeksSpent).toBe(3);
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
