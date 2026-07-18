import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState, createSandboxState } from '../engine/initialState';
import { makeRng } from '../engine/rng';
import type { OwnedEngine } from '../model/engine';
import type { Fever } from '../model/market';
import type { GameState } from '../model/gameState';
import {
  activeFeverFor,
  advanceMarket,
  comboKey,
  createMarketState,
  registerReleaseSaturation,
} from './market';
import { startProject } from './projects';

/**
 * Fiebres de mercado y multiplataforma (Fase 9.4, docs/19 §9.4). Los CA de la
 * fase: una fiebre sube las ventas de su género/tema en su ventana y luego
 * decae; inundarla la satura más rápido; y lanzar en varias plataformas exige
 * la capacidad del motor (la I+D de 9.2). Semilla fija, todo determinista.
 */

const SEED = 4242;

/** Avanza SOLO el mercado (sin economía), semana a semana. */
function advanceMarketWeek(state: GameState): GameState {
  return { ...advanceMarket(state, makeRng(state.seed, state.week)), week: state.week + 1 };
}

describe('CA 9.4: una fiebre sube la popularidad y luego decae', () => {
  it('la popularidad del género sube por encima de la banda en la ventana y vuelve al expirar', () => {
    const fever: Fever = {
      id: 'f-rpg', target: 'genre', targetId: 'rpg',
      startWeek: 5, peakWeek: 9, endWeek: 17, intensity: 0.4, source: 'organica',
    };
    let s: GameState = {
      ...createInitialState(SEED),
      market: { ...createMarketState(1), fevers: [fever] },
    };
    const popAt: Record<number, number> = {};
    for (let i = 0; i < 25; i++) {
      s = advanceMarketWeek(s);
      popAt[s.week - 1] = s.market.genres.rpg.pop;
    }
    const bandMax = balance.market.popularity.bandMax;
    // En el pico, muy por encima de la banda normal; y sube hacia él.
    expect(popAt[9]).toBeGreaterThan(bandMax);
    expect(popAt[9]).toBeGreaterThan(popAt[6]);
    // Tras expirar (endWeek 17), la popularidad vuelve a la banda plana.
    expect(s.market.genres.rpg.stage).toBe('estable');
    expect(s.market.genres.rpg.pop).toBeLessThanOrEqual(bandMax);
  });
});

describe('CA 9.4: inundar una fiebre la satura más rápido (docs/04 §3)', () => {
  it('lanzar sobre un género en fiebre suma saturación multiplicada', () => {
    const fever: Fever = {
      id: 'f-rpg', target: 'genre', targetId: 'rpg',
      startWeek: 1, peakWeek: 5, endWeek: 20, intensity: 0.4, source: 'organica',
    };
    const feveredMarket = { ...createMarketState(1), fevers: [fever] };
    const key = comboKey('rpg', 'fantasia');
    const week = 3; // dentro de la ventana de la fiebre

    const inFever = registerReleaseSaturation(feveredMarket, 'rpg', 'fantasia', week);
    const calm = registerReleaseSaturation(createMarketState(1), 'rpg', 'fantasia', week);

    const sat = balance.market.saturation.releaseIncrement;
    expect(inFever.saturation[key]).toBeCloseTo(sat * balance.market.fevers.feverSaturationMult, 10);
    expect(calm.saturation[key]).toBeCloseTo(sat, 10);
    expect(inFever.saturation[key]).toBeGreaterThan(calm.saturation[key]);
  });
});

describe('CA 9.4: multiplataforma exige la capacidad del motor (I+D de 9.2)', () => {
  /** Motor propio con kit biplataforma (la capacidad se investiga en 9.2). */
  const biEngine: OwnedEngine = {
    id: 'motor-bi',
    name: 'Motor Bi',
    generation: 4,
    techLevel: 20,
    capabilities: ['graficos3d', 'biplataforma'],
    builtWeek: 0,
  };

  /** Sandbox en E4 en una semana donde la consola nueva Vertex ya está a la venta. */
  function e4At(week: number, engines: OwnedEngine[]): GameState {
    const base = createSandboxState(SEED, 'E4');
    return { ...base, week, market: createMarketState(week), engines };
  }

  const concept = {
    name: 'Doble',
    themeId: 'fantasia',
    genreId: 'rpg',
    platformId: 'pcCasero',
    platformIds: ['pcCasero', 'vertex'], // Vertex: consola nueva de E4 (9.4)
    audience: 'amplio' as const,
    size: 'pequeno' as const,
  };

  it('sin kit multiplataforma, lanzar en dos plataformas se rechaza', () => {
    const artesanal = e4At(1200, []); // motor artesanal (null) = 1 plataforma
    expect(() => startProject(artesanal, concept)).toThrow(/una plataforma/);
  });

  it('con el kit biplataforma del motor, sale en las dos a la vez', () => {
    const conKit = e4At(1200, [biEngine]);
    const s = startProject(conKit, { ...concept, engineId: 'motor-bi' });
    expect(s.projects[0].platformIds).toEqual(['pcCasero', 'vertex']);
  });
});

describe('fiebre del oro: un HIT puede encender una fiebre (docs/19 §9.4)', () => {
  it('activeFeverFor localiza la fiebre encendida sobre su target', () => {
    const fever: Fever = {
      id: 'f-hit', target: 'theme', targetId: 'espacio',
      startWeek: 10, peakWeek: 14, endWeek: 24, intensity: 0.42, source: 'hit',
    };
    const market = { ...createMarketState(10), fevers: [fever] };
    expect(activeFeverFor(market.fevers, 'theme', 'espacio', 12)?.source).toBe('hit');
    expect(activeFeverFor(market.fevers, 'theme', 'espacio', 24)).toBeUndefined(); // ya expiró
    expect(activeFeverFor(market.fevers, 'genre', 'espacio', 12)).toBeUndefined(); // es tema, no género
  });
});
