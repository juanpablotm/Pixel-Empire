import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getScandalDef } from '../../data/scandals';
import { createInitialState } from '../engine/initialState';
import { makeRng } from '../engine/rng';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { MonetizationConfig } from '../model/moral';
import type { ReleasedGame } from '../model/release';
import {
  addReputationDebt,
  advanceMoral,
  advanceRegulation,
  applyReleaseMoralEffects,
  lootBoxesBanned,
  scandalChance,
  scandalCushion,
  scandalSalesFactor,
  topDebtSource,
} from './morale';
import { startProject } from './projects';
import { weeklyRevenue } from './sales';

const SEED = 42;

const honest: MonetizationConfig = {
  model: 'premium',
  aggressiveness: 0,
  hasLootBoxes: false,
  hasBattlePass: false,
  dayOneDLC: false,
};

const greedy: MonetizationConfig = {
  model: 'premium+mtx',
  aggressiveness: 1,
  hasLootBoxes: true,
  hasBattlePass: true,
  dayOneDLC: false,
};

/** Juego lanzado mínimo para probar los efectos morales del lanzamiento. */
function makeGame(overrides: Partial<ReleasedGame> = {}): ReleasedGame {
  return {
    id: 'proyecto-9',
    name: 'Juego moral',
    themeId: 'fantasia',
    genreId: 'rpg',
    platformId: 'pcCasero',
    audience: 'hardcore',
    size: 'pequeno',
    price: 20,
    monetization: honest,
    quality: 70,
    review: 70,
    reviewsBySegment: { critica: 70, prensa: 70, hardcore: 70, casual: 70 },
    reviewMarket: { base: 70, modaBonus: 0, hypePenalty: 0 },
    hypeAtRelease: 0,
    saturationAtRelease: 0,
    verdict: '—',
    breakdown: {
      fit: 1,
      fitParts: { themeGenre: 1, genrePlatform: 1, audience: 1 },
      balanceScore: 1,
      dReal: 0.65,
      dIdeal: 0.65,
      featureScore: 0.5,
      polishScore: 1,
      bugLevel: 0,
      teamFactor: 0.95,
      innovationMod: 1.05,
      base: 0.875,
      qualityCap: 85,
    },
    lines: [],
    releaseWeek: 1,
    weeklySales: [],
    totalUnits: 0,
    totalRevenue: 0,
    mtxRevenue: 0,
    salesActive: true,
    ...overrides,
  };
}

describe('palancas de codicia al lanzar (docs/06 §2, CA: por segmento y con deuda)', () => {
  it('las loot boxes enfurecen al hardcore, los casual apenas lo notan', () => {
    const state = createInitialState(SEED);
    const before = state.studio.reputation;
    const after = applyReleaseMoralEffects(state, makeGame({ monetization: greedy }));
    const rep = after.studio.reputation;

    // Diferenciado por segmento: hardcore y comunidad caen más que casual.
    expect(rep.hardcore).toBeLessThan(before.hardcore);
    expect(rep.comunidad).toBeLessThan(before.comunidad);
    expect(before.hardcore - rep.hardcore).toBeGreaterThan(before.casual - (rep.casual ?? 50));
    // Y acumula deuda de reputación oculta (docs/06 §5).
    expect(after.studio.reputationDebt).toBeGreaterThan(0);
    expect(after.studio.debtBySource.lootboxes).toBeGreaterThan(0);
    expect(after.studio.debtBySource.mtxAgresivas).toBeGreaterThan(0);
    // La Balanza se inclina hacia el 💰.
    expect(after.studio.moralDrift).toBeLessThan(0);
  });

  it('loot boxes en juego infantil: golpes multiplicados y deuda extra (docs/06 §5)', () => {
    const state = createInitialState(SEED);
    const adult = applyReleaseMoralEffects(state, makeGame({ monetization: greedy }));
    const child = applyReleaseMoralEffects(
      state,
      makeGame({ monetization: greedy, audience: 'infantil' }),
    );
    expect(child.studio.debtBySource.lootboxes!).toBeGreaterThan(
      adult.studio.debtBySource.lootboxes!,
    );
  });

  it('el precio abusivo enfada a casual/comunidad; el generoso les encanta', () => {
    const state = createInitialState(SEED);
    const abusive = applyReleaseMoralEffects(state, makeGame({ price: 30 })); // 1.5× de 20
    const generous = applyReleaseMoralEffects(state, makeGame({ price: 14 })); // 0.7×
    expect(abusive.studio.reputation.casual).toBeLessThan(50);
    expect(abusive.studio.debtBySource.precioAbusivo).toBeGreaterThan(0);
    expect(generous.studio.reputation.casual).toBeGreaterThan(50);
    expect(generous.studio.moralDrift).toBeGreaterThan(abusive.studio.moralDrift);
  });

  it('el refrito reciente golpea a la crítica y acumula deuda', () => {
    const state = createInitialState(SEED);
    const previous = makeGame({ id: 'proyecto-1', releaseWeek: 1 });
    const withHistory: GameState = { ...state, releasedGames: [previous], week: 20 };
    const after = applyReleaseMoralEffects(
      withHistory,
      makeGame({ id: 'proyecto-2', releaseWeek: 20 }),
    );
    expect(after.studio.reputation.critica).toBeLessThan(50);
    expect(after.studio.debtBySource.refrito).toBeGreaterThan(0);

    // Pasada la ventana, ya no es refrito.
    const old = makeGame({ id: 'proyecto-1', releaseWeek: 1 });
    const later: GameState = {
      ...state,
      releasedGames: [old],
      week: 1 + balance.moral.rehashWindowWeeks + 30,
    };
    const clean = applyReleaseMoralEffects(
      later,
      makeGame({ id: 'proyecto-3', releaseWeek: later.week, reviewsBySegment: {}, review: 60 }),
    );
    expect(clean.studio.debtBySource.refrito).toBeUndefined();
  });

  it('un lanzamiento honesto con buenas reseñas construye reputación (despacio)', () => {
    const state = createInitialState(SEED);
    const after = applyReleaseMoralEffects(
      state,
      makeGame({
        review: 85,
        reviewsBySegment: { critica: 88, prensa: 84, hardcore: 86, casual: 80 },
      }),
    );
    expect(after.studio.reputation.critica).toBeGreaterThan(50);
    expect(after.studio.reputation.comunidad).toBeGreaterThan(50);
    expect(after.studio.moralDrift).toBeGreaterThan(0);
    expect(after.studio.reputationDebt).toBe(0);
    // Lenta de construir: el tope de ganancia por lanzamiento es pequeño.
    expect(after.studio.reputation.critica - 50).toBeLessThanOrEqual(
      balance.reputation.review.maxGain + balance.reputation.levers.honestRelease.hardcore,
    );
  });
});

describe('crunch como palanca moral semanal (docs/05 §6 y docs/06 §2)', () => {
  function crunchState(): GameState {
    let state = createInitialState(SEED);
    state = {
      ...state,
      studio: { ...state.studio, scaleStage: 2 },
      staff: [
        ...state.staff,
        ...['a', 'b'].map((id) => ({
          ...state.staff[0],
          id,
          name: id,
          founder: false,
          salary: 300,
        })),
      ],
    };
    state = startProject(state, {
      name: 'Crunchware',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
    });
    return { ...state, projects: [{ ...state.projects[0], crunch: true }] };
  }

  it('cada semana de crunch drena empleador y acumula deuda por empleado', () => {
    const state = crunchState();
    const rng = makeRng(SEED, 999);
    const after = advanceMoral(state, rng);
    // 2 empleados no fundadores afectados.
    const expectedDrain =
      balance.reputation.employer.crunchPerEmployeeWeek * 2 * balance.reputation.lossMultiplier;
    expect(after.studio.reputation.empleador).toBeCloseTo(50 - expectedDrain, 2);
    expect(after.studio.debtBySource.crunch).toBeGreaterThan(0);
    expect(after.stats.crunchWeeks).toBe(1);
  });

  it('el fundador crunchando solo en el garaje no genera deuda laboral', () => {
    let state = createInitialState(SEED);
    state = startProject(state, {
      name: 'Solo',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
    });
    state = { ...state, projects: [{ ...state.projects[0], crunch: true }] };
    const after = advanceMoral(state, makeRng(SEED, 999));
    expect(after.studio.reputationDebt).toBe(0);
    expect(after.stats.crunchWeeks).toBe(0);
  });

  it('la deuda decae con el tiempo: el público olvida despacio', () => {
    let state = createInitialState(SEED);
    state = { ...state, studio: addReputationDebt(state.studio, 'crunch', 4) };
    const after = advanceMoral(state, makeRng(SEED, 999));
    expect(after.studio.reputationDebt).toBeCloseTo(4 * balance.moral.debt.decayPerWeek, 2);
  });
});

describe('escándalos (docs/06 §5, CA: prob/magnitud escalan con la deuda oculta)', () => {
  it('sin deuda no hay riesgo; la probabilidad crece con la deuda y tiene techo', () => {
    expect(scandalChance(0)).toBe(0);
    expect(scandalChance(balance.moral.scandal.freeDebt)).toBe(0);
    const low = scandalChance(balance.moral.scandal.freeDebt + 2);
    const high = scandalChance(balance.moral.scandal.freeDebt + 10);
    expect(low).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(low);
    expect(scandalChance(1_000)).toBe(balance.moral.scandal.maxChancePerWeek);
  });

  it('estalla por la mayor fuente de deuda: siempre trazable a una decisión', () => {
    let state = createInitialState(SEED);
    let studio = addReputationDebt(state.studio, 'lootboxes', 20);
    studio = addReputationDebt(studio, 'crunch', 3);
    state = { ...state, studio };
    expect(topDebtSource(state.studio)).toBe('lootboxes');

    // Con deuda 23 la probabilidad es el techo: buscamos la semana en que el
    // PRNG (semilla fija) lo hace estallar y comprobamos el tipo.
    let s = state;
    for (let i = 0; i < 30 && s.stats.scandalCount === 0; i++) {
      s = advanceMoral(s, makeRng(SEED, 5000 + i));
    }
    expect(s.stats.scandalCount).toBe(1);
    const scandal = s.scandals[0];
    expect(scandal.source).toBe('lootboxes');
    // Efectos reales: reputación golpeada, multa cobrada, ventas penalizadas.
    expect(s.studio.reputation.hardcore).toBeLessThan(50);
    expect(s.studio.capital).toBeLessThan(state.studio.capital);
    expect(scandalSalesFactor(s.scandals)).toBe(getScandalDef('lootboxes').salesPenalty);
    // El escándalo "cobra" parte de la deuda de su fuente.
    expect(s.studio.debtBySource.lootboxes!).toBeLessThan(20);
    // Y empuja la presión regulatoria (docs/06 §5).
    expect(s.regulation.pressure['lootbox-ban']).toBeGreaterThan(0);
  });

  it('la reputación previa amortigua o amplifica el golpe (docs/06 §5)', () => {
    const state = createInitialState(SEED);
    const loved = {
      ...state.studio,
      reputation: Object.fromEntries(
        Object.keys(state.studio.reputation).map((k) => [k, 90]),
      ) as GameState['studio']['reputation'],
    };
    const hated = {
      ...state.studio,
      reputation: Object.fromEntries(
        Object.keys(state.studio.reputation).map((k) => [k, 15]),
      ) as GameState['studio']['reputation'],
    };
    expect(scandalCushion(loved)).toBeLessThan(1);
    expect(scandalCushion(hated)).toBeGreaterThan(1);
    expect(scandalCushion(state.studio)).toBe(1);
  });

  it('los escándalos expiran: la penalización de ventas termina', () => {
    let state = createInitialState(SEED);
    state = {
      ...state,
      scandals: [
        { source: 'crunch', startWeek: 1, weeksLeft: 2, salesPenalty: 0.85, magnitude: 1 },
      ],
    };
    expect(scandalSalesFactor(state.scandals)).toBe(0.85);
    state = advanceMoral(state, makeRng(SEED, 1));
    state = advanceMoral(state, makeRng(SEED, 2));
    expect(scandalSalesFactor(state.scandals)).toBe(1);
    // El historial se conserva (para la UI y la Fase 5).
    expect(state.scandals).toHaveLength(1);
  });
});

describe('regulación por era (docs/06 §5, CA: invalida modelos de negocio)', () => {
  function pressured(era: GameState['era']): GameState {
    const state = createInitialState(SEED);
    return {
      ...state,
      era,
      regulation: { pressure: { 'lootbox-ban': 5 }, enacted: [] },
    };
  }

  it('con presión suficiente pero era temprana, la ley no llega todavía', () => {
    const state = advanceRegulation(pressured('E1'));
    expect(state.regulation.enacted).toEqual([]);
    expect(lootBoxesBanned(state)).toBe(false);
  });

  it('en E6+ la presión promulga la prohibición de loot boxes', () => {
    const state = advanceRegulation(pressured('E6'));
    expect(state.regulation.enacted).toContain('lootbox-ban');
    expect(lootBoxesBanned(state)).toBe(true);
    expect(state.log.some((e) => e.type === 'moral')).toBe(true);
  });

  it('la prohibición corta las MTX de los juegos con loot boxes de golpe', () => {
    const game = makeGame({ monetization: greedy });
    const legal = weeklyRevenue(game, 100, false);
    const banned = weeklyRevenue(game, 100, true);
    expect(legal.mtx).toBeGreaterThan(0);
    expect(banned.mtx).toBe(0);
    expect(banned.sales).toBe(legal.sales);
  });

  it('con la ley promulgada no se pueden concebir juegos con loot boxes', () => {
    let state = advanceRegulation(pressured('E6'));
    state = { ...state, projects: [] };
    expect(() =>
      startProject(state, {
        name: 'Casino Kids',
        themeId: 'fantasia',
        genreId: 'rpg',
        platformId: 'pcCasero',
        audience: 'infantil',
        size: 'pequeno',
        monetization: { ...greedy },
      }),
    ).toThrow(/prohibidas/);
  });

  it('al promulgarse, los proyectos en desarrollo pierden las loot boxes', () => {
    let state = pressured('E6');
    state = startProject(state, {
      name: 'Cajas SA',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
      monetization: { ...greedy },
    });
    expect(state.projects[0].monetization.hasLootBoxes).toBe(true);
    const after = advanceRegulation(state);
    expect(after.projects[0].monetization.hasLootBoxes).toBe(false);
  });
});

describe('integración en el tick (docs/08 §4)', () => {
  it('una partida honesta de 30 semanas no genera deuda ni escándalos', () => {
    let state = createInitialState(SEED);
    for (let i = 0; i < 30; i++) state = tick(state);
    expect(state.studio.reputationDebt).toBe(0);
    expect(state.stats.scandalCount).toBe(0);
    expect(state.scandals).toEqual([]);
  });

  it('es determinista: misma semilla → misma reputación y misma deuda', () => {
    const run = () => {
      let state = createInitialState(SEED);
      state = startProject(state, {
        name: 'Det',
        themeId: 'fantasia',
        genreId: 'rpg',
        platformId: 'pcCasero',
        audience: 'hardcore',
        size: 'pequeno',
        monetization: { ...greedy, hasLootBoxes: false },
      });
      for (let i = 0; i < 20; i++) state = tick(state);
      return state;
    };
    const a = run();
    const b = run();
    expect(a.studio.reputation).toEqual(b.studio.reputation);
    expect(a.studio.reputationDebt).toBe(b.studio.reputationDebt);
    expect(a.scandals).toEqual(b.scandals);
  });
});
