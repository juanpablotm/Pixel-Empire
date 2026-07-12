import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { makeRng } from '../engine/rng';
import type { GameState } from '../model/gameState';
import type { QualityBreakdown, ReleasedGame } from '../model/release';
import { advanceAwards, pickCategoryWinner } from './awards';
import { startProject } from './projects';

/**
 * Premios anuales (docs/06 §7): gala cada 52 semanas, selección determinista
 * (el mejor candidato que supere el umbral), recompensas de reputación y el
 * hype pendiente que consume el siguiente proyecto. Semilla fija.
 */

const SEED = 42;
const AWARDS_STREAM = 7 << 20;

function makeBreakdown(overrides: Partial<QualityBreakdown> = {}): QualityBreakdown {
  return {
    fit: 0.7,
    fitParts: { themeGenre: 0.75, genrePlatform: 0.75, audience: 0.5 },
    balanceScore: 0.8,
    dReal: 0.6,
    dIdeal: 0.65,
    featureScore: 0.5,
    polishScore: 0.8,
    bugLevel: 0.2,
    teamFactor: 1,
    innovationMod: 1,
    base: 0.7,
    qualityCap: 85,
    ...overrides,
  };
}

function makeGame(overrides: Partial<ReleasedGame> = {}): ReleasedGame {
  return {
    id: 'juego-test',
    name: 'Juego de prueba',
    themeId: 'fantasia',
    genreId: 'rpg',
    platformId: 'pcCasero',
    audience: 'amplio',
    size: 'pequeno',
    price: 20,
    monetization: {
      model: 'premium',
      aggressiveness: 0,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    },
    quality: 70,
    review: 70,
    reviewsBySegment: { critica: 70, prensa: 70, hardcore: 70, casual: 70 },
    reviewMarket: { base: 70, modaBonus: 0, hypePenalty: 0 },
    hypeAtRelease: 0,
    saturationAtRelease: 0,
    verdict: '',
    breakdown: makeBreakdown(),
    lines: [],
    releaseWeek: 30,
    weeklySales: [],
    totalUnits: 0,
    totalRevenue: 0,
    mtxRevenue: 0,
    salesActive: true,
    ...overrides,
  };
}

/** Estado en la semana de gala (52) con los juegos dados lanzados este año. */
function atCeremony(games: ReleasedGame[]): GameState {
  return { ...createInitialState(SEED), week: 52, releasedGames: games };
}

const rng = () => makeRng(SEED, AWARDS_STREAM + 52);

describe('selección de ganadores (docs/06 §7)', () => {
  it('el GOTY exige superar el listón; sin candidatos, nadie gana', () => {
    expect(pickCategoryWinner('goty', [makeGame({ review: 70 })])).toBeNull();
    const winner = pickCategoryWinner('goty', [
      makeGame({ id: 'a', review: 80 }),
      makeGame({ id: 'b', review: 88 }),
    ]);
    expect(winner?.id).toBe('b');
  });

  it('la innovación premia el riesgo, no solo la nota', () => {
    const safe = makeGame({ id: 'seguro', review: 85, breakdown: makeBreakdown({ innovationMod: 1 }) });
    const bold = makeGame({ id: 'valiente', review: 65, breakdown: makeBreakdown({ innovationMod: 1.05 }) });
    expect(pickCategoryWinner('innovacion', [safe, bold])?.id).toBe('valiente');
  });
});

describe('la gala en el tick (docs/06 §7)', () => {
  it('fuera de la semana de gala no pasa nada', () => {
    const state = { ...atCeremony([makeGame({ review: 90 })]), week: 51 };
    expect(advanceAwards(state, rng())).toBe(state);
  });

  it('sin lanzamientos este año, la gala pasa de largo', () => {
    const state = atCeremony([makeGame({ review: 90, releaseWeek: -10 })]);
    expect(advanceAwards(state, rng()).studio.awards).toEqual([]);
  });

  it('ganar da premios, reputación y hype pendiente', () => {
    const state = atCeremony([
      makeGame({
        review: 85,
        reviewsBySegment: { critica: 85, prensa: 85, hardcore: 85, casual: 80 },
        breakdown: makeBreakdown({ innovationMod: 1.05, polishScore: 0.95, fit: 0.9 }),
      }),
    ]);
    const after = advanceAwards(state, rng());
    expect(after.studio.awards.length).toBeGreaterThanOrEqual(3);
    expect(after.studio.awards[0].year).toBe(1980);
    expect(after.studio.reputation.critica).toBeGreaterThan(state.studio.reputation.critica);
    expect(after.studio.reputation.prensa).toBeGreaterThan(state.studio.reputation.prensa);
    expect(after.studio.awardHype).toBeGreaterThan(0);
    expect(after.studio.awardHype).toBeLessThanOrEqual(balance.awards.rewards.hypeCap);
    expect(after.log.some((e) => e.type === 'premios')).toBe(true);
  });

  it('perder también se anuncia: otro estudio se lleva el GOTY (PRNG solo el sabor)', () => {
    const state = atCeremony([makeGame({ review: 65 })]);
    const after = advanceAwards(state, rng());
    expect(after.studio.awards).toEqual([]);
    expect(after.log.some((e) => e.type === 'premios' && e.text.includes('se lo lleva'))).toBe(
      true,
    );
    expect(advanceAwards(state, rng())).toEqual(after);
  });

  it('el siguiente proyecto consume el hype de los premios (docs/06 §7)', () => {
    let state = atCeremony([makeGame({ review: 85 })]);
    state = advanceAwards(state, rng());
    const hype = state.studio.awardHype;
    expect(hype).toBeGreaterThan(0);
    state = startProject(state, {
      name: 'El esperado',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
    });
    const project = state.projects[state.projects.length - 1];
    expect(project.hype).toBeCloseTo(hype, 10);
    expect(state.studio.awardHype).toBe(0);
  });
});
