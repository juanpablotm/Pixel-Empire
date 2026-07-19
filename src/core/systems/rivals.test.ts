import { describe, expect, it } from 'vitest';
import { getAwardCategory } from '../../data/awards';
import { balance } from '../../data/balance';
import { rivalDefs } from '../../data/rivals';
import { createInitialState, createSandboxState } from '../engine/initialState';
import { makeRng } from '../engine/rng';
import { tick } from '../engine/tick';
import type { EraId } from '../model/era';
import type { GameState } from '../model/gameState';
import type { RivalRuntime } from '../model/rivals';
import { rivalNominees } from './awards';
import { comboKey } from './market';
import {
  advanceRivals,
  announcedReleases,
  createInitialRivals,
  RIVALS_STREAM,
  rollRivalReview,
} from './rivals';

/**
 * Estudios rivales (Fase 9.5, docs/19 §9.5). CA de la fase: un rival lanza y
 * satura su género (docs/04 §3); un hit rival puede encender una fiebre
 * (docs/04 §2.1); y la industria evoluciona (fuerza, tiers, cierres) de forma
 * determinista por semilla.
 */

const SEED = 4242;

/** El runtime de un rival por id (falla si no está en la partida). */
function runtimeOf(state: GameState, id: string): RivalRuntime {
  const r = state.rivals?.studios.find((s) => s.id === id);
  if (!r) throw new Error(`Rival ${id} no presente`);
  return r;
}

/** Sustituye el runtime de un rival (cirugía de estado para tests). */
function withRuntime(state: GameState, runtime: RivalRuntime): GameState {
  return {
    ...state,
    rivals: {
      ...(state.rivals ?? { studios: [], poachOffer: null }),
      studios: (state.rivals?.studios ?? []).map((s) => (s.id === runtime.id ? runtime : s)),
    },
  };
}

describe('roster inicial y determinismo (docs/08 §1)', () => {
  it('la partida nueva arranca con la industria establecida de E1', () => {
    const s = createInitialState(SEED);
    const ids = (s.rivals?.studios ?? []).map((r) => r.id).sort();
    const e1Ids = rivalDefs
      .filter((d) => d.appearsInEra === 'E1')
      .map((d) => d.id)
      .sort();
    expect(ids).toEqual(e1Ids);
    expect(ids.length).toBe(5);
    // Cada uno con la fuerza baseline de su tier y sin historia.
    for (const r of s.rivals?.studios ?? []) {
      expect(r.strength).toBe(balance.rivals.baseStrengthByTier[r.tier]);
      expect(r.games).toEqual([]);
      expect(r.closed).toBe(false);
    }
  });

  it('el roster crece con la era: E5 ya tiene la ola indie', () => {
    expect(createInitialRivals(SEED, 1509, 'E5').studios.length).toBe(10);
    expect(createInitialRivals(SEED, 1, 'E1').studios.length).toBe(5);
  });

  it('misma semilla → misma industria tras 120 semanas', () => {
    let a = createInitialState(SEED);
    let b = createInitialState(SEED);
    for (let i = 0; i < 120; i++) {
      a = tick(a);
      b = tick(b);
    }
    expect(JSON.stringify(a.rivals)).toBe(JSON.stringify(b.rivals));
    expect(a.rivals?.studios.some((r) => r.games.length > 0)).toBe(true);
  });
});

describe('CA 9.5: un rival lanza y satura su género (docs/04 §3)', () => {
  it('el primer lanzamiento rival suma saturación a su combo', () => {
    let s = createInitialState(SEED);
    let released: { genreId: string; themeId: string } | null = null;
    for (let i = 0; i < 90 && released === null; i++) {
      const before = s.rivals?.studios.map((r) => r.games.length) ?? [];
      s = tick(s);
      const after = s.rivals?.studios ?? [];
      const idx = after.findIndex((r, j) => r.games.length > (before[j] ?? 0));
      if (idx >= 0) {
        const game = after[idx].games[after[idx].games.length - 1];
        released = { genreId: game.genreId, themeId: game.themeId };
      }
    }
    expect(released).not.toBeNull();
    const key = comboKey(released!.genreId, released!.themeId);
    // La saturación del combo quedó registrada (decae, pero acaba de pasar).
    expect(s.market.saturation[key] ?? 0).toBeGreaterThan(0);
  });

  it('los anuncios preceden a los lanzamientos y son visibles (calendario)', () => {
    let s = createInitialState(SEED);
    for (let i = 0; i < 60; i++) {
      s = tick(s);
      const announced = announcedReleases(s);
      for (const { announcement } of announced) {
        expect(announcement.announcedWeek).toBeLessThanOrEqual(s.week);
        expect(announcement.releaseWeek).toBeGreaterThanOrEqual(s.week);
      }
    }
    // En 60 semanas la industria de E1 ya ha anunciado algo alguna vez.
    expect(s.rivals?.studios.some((r) => r.games.length > 0 || r.nextRelease !== null)).toBe(true);
  });
});

describe('CA 9.5: un hit de rival puede encender una fiebre (docs/04 §2.1)', () => {
  it('un gigante en racha con bombazo dispara una fiebre source=rival', () => {
    let ignitedSeed: number | null = null;
    for (let seed = 1; seed <= 100 && ignitedSeed === null; seed++) {
      let s = createInitialState(seed);
      // Cirugía: Mango (gigante) a plena fuerza con lanzamiento esta semana.
      s = withRuntime(s, {
        ...runtimeOf(s, 'mango'),
        strength: 100,
        nextRelease: {
          gameName: 'Bombazo',
          genreId: 'puzzle',
          themeId: 'fantasia',
          size: 'grande',
          announcedWeek: s.week - 5,
          releaseWeek: s.week,
          hyped: true,
        },
      });
      const after = advanceRivals(s, makeRng(seed, RIVALS_STREAM + s.week));
      const fever = (after.market.fevers ?? []).find((f) => f.source === 'rival');
      if (fever) {
        ignitedSeed = seed;
        // La fiebre cae sobre el género o el tema del bombazo.
        expect(
          (fever.target === 'genre' && fever.targetId === 'puzzle') ||
            (fever.target === 'theme' && fever.targetId === 'fantasia'),
        ).toBe(true);
        // El lanzamiento queda marcado y la noticia está en el log.
        expect(runtimeOf(after, 'mango').games.at(-1)?.feverIgnited).toBe(true);
        expect(after.log.some((e) => e.type === 'mercado' && e.text.includes('fiebre'))).toBe(true);
      }
    }
    expect(ignitedSeed).not.toBeNull();
  });
});

describe('evolución de la industria (docs/19 §9.5: crecen o decaen)', () => {
  it('fuerza alta sostenida promociona de tier (con noticia)', () => {
    let s = createInitialState(SEED);
    s = withRuntime(s, {
      ...runtimeOf(s, 'cincoPixeles'), // indie
      strength: 90,
      weeksHigh: balance.rivals.tierShift.sustainWeeks - 1,
      nextAnnounceWeek: s.week + 40, // esta semana no anuncia: aísla la promoción
    });
    const after = advanceRivals(s, makeRng(SEED, RIVALS_STREAM + s.week));
    expect(runtimeOf(after, 'cincoPixeles').tier).toBe('medio');
    expect(after.log.some((e) => e.type === 'industria' && e.text.includes('Cinco Pixeles'))).toBe(
      true,
    );
  });

  it('un indie hundido el tiempo suficiente cierra', () => {
    let s = createInitialState(SEED);
    s = withRuntime(s, {
      ...runtimeOf(s, 'tortuga'),
      strength: 5,
      weeksLow: balance.rivals.tierShift.closeWeeks - 1,
    });
    const after = advanceRivals(s, makeRng(SEED, RIVALS_STREAM + s.week));
    expect(runtimeOf(after, 'tortuga').closed).toBe(true);
    expect(after.log.some((e) => e.text.includes('cierra sus puertas'))).toBe(true);
  });

  it('la reseña rival responde a la fuerza (más fuerte → mejor de media)', () => {
    const avg = (strength: number): number => {
      let sum = 0;
      const rng = makeRng(SEED, strength);
      for (let i = 0; i < 300; i++) sum += rollRivalReview('gigante', 'fabrica', strength, rng);
      return sum / 300;
    };
    expect(avg(100)).toBeGreaterThan(avg(30) + 5);
  });

  it('la envolvente de la gala sigue la calibración de 8.10 (docs/18 V7)', () => {
    // El mundo gira sin jugador (sandbox: la caja aguanta 46 años de alquiler):
    // el techo anual de los nominados reales al GOTY debe dejar el premio
    // imposible pronto y ganable en E6–E7 por un AAA excelente y consagrado
    // (~108 puntos: 88 + prestigio 6 + escala 14).
    let s = createSandboxState(SEED, 'E1');
    const topsByEra = new Map<EraId, number[]>();
    const goty = getAwardCategory('goty');
    const finalWeek = 2289 + 104; // E7 + 2 años (docs/02 §6)
    while (s.week < finalWeek) {
      s = tick(s);
      if (s.week % 52 === 0) {
        const top = rivalNominees(s, goty)[0];
        if (top) {
          const list = topsByEra.get(s.era) ?? [];
          list.push(top.score);
          topsByEra.set(s.era, list);
        }
      }
    }
    const mean = (era: EraId): number => {
      const list = topsByEra.get(era) ?? [];
      return list.reduce((a, b) => a + b, 0) / Math.max(1, list.length);
    };
    // E6–E7: en la banda ganable (por debajo del 108 del AAA excelente)…
    expect(mean('E6')).toBeGreaterThan(100);
    expect(mean('E6')).toBeLessThan(108);
    expect(mean('E7')).toBeGreaterThan(100);
    expect(mean('E7')).toBeLessThan(108);
    // …y E4–E5 por encima de lo que alcanza un muyGrande excelente (~102):
    // el listón va por delante de tu techo hasta que eres Corporación.
    expect(mean('E4')).toBeGreaterThan(102);
    expect(mean('E5')).toBeGreaterThan(102);
  });
});
