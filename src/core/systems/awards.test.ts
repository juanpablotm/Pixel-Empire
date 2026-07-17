import { describe, expect, it } from 'vitest';
import { awardCategories, getAwardCategory } from '../../data/awards';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { makeRng } from '../engine/rng';
import type { EraId } from '../model/era';
import type { GameState } from '../model/gameState';
import type { QualityBreakdown, ReleasedGame } from '../model/release';
import {
  advanceAwards,
  categoryBar,
  pickCategoryWinner,
  prestigeBonus,
  studioScore,
} from './awards';
import { startProject } from './projects';

/**
 * Premios anuales (docs/06 §7 + docs/18 V7): gala cada 52 semanas, COMPETITIVA
 * — nominación por umbral, puesto contra el listón de industria y los nominados
 * ficticios. Ganar es difícil y solo realista en E6–E7. Semilla fija.
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

/** Un estudio consagrado: reputación alta de crítica y prensa (el prestigio). */
function withPrestige(state: GameState, value: number): GameState {
  return {
    ...state,
    studio: {
      ...state.studio,
      reputation: { ...state.studio.reputation, critica: value, prensa: value },
    },
  };
}

const rng = () => makeRng(SEED, AWARDS_STREAM + 52);

describe('nominación: el umbral que da identidad a cada categoría (docs/06 §7)', () => {
  it('el GOTY exige superar el listón; sin candidatos, nadie se nomina', () => {
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

describe('el listón de industria (docs/18 V7)', () => {
  it('sube con cada era: ganar es más caro cuanto más tarde', () => {
    const goty = getAwardCategory('goty');
    const eras: EraId[] = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'];
    const bars = eras.map((era) => categoryBar(goty, era));
    for (let i = 1; i < bars.length; i++) {
      expect(bars[i]).toBeGreaterThan(bars[i - 1]);
    }
    expect(bars[6]).toBeGreaterThan(bars[0]);
  });

  it('cada categoría tiene su propio listón: el GOTY es el más caro de todos', () => {
    const bars = awardCategories.map((c) => ({ id: c.id, bar: categoryBar(c, 'E4') }));
    const goty = bars.find((b) => b.id === 'goty') as { bar: number };
    for (const other of bars.filter((b) => b.id !== 'goty')) {
      expect(other.bar).toBeLessThan(goty.bar);
    }
  });

  it('con la misma puntuación, subir de era empeora tu puesto', () => {
    const game = makeGame({ review: 88, size: 'grande' });
    const inE1 = withPrestige(atCeremony([game]), 60);
    const inE7 = { ...inE1, era: 'E7' as const };
    const rankIn = (s: GameState): number =>
      (advanceAwards(s, rng()).studio.lastCeremony?.categories.find((c) => c.categoryId === 'goty')
        ?.rank as number);
    expect(rankIn(inE7)).toBeGreaterThan(rankIn(inE1));
  });
});

describe('tu puntuación: calidad + reputación + escala (docs/18 V7)', () => {
  it('el prestigio suma, con tope: la crítica y la prensa votan', () => {
    const humilde = atCeremony([]);
    const consagrado = withPrestige(humilde, 100);
    expect(prestigeBonus(withPrestige(humilde, 0))).toBe(0);
    expect(prestigeBonus(consagrado)).toBeCloseTo(balance.awards.competition.prestigeWeight, 5);
    expect(prestigeBonus(consagrado)).toBeGreaterThan(prestigeBonus(humilde));
  });

  it('la escala pesa en el GOTY, pero casi nada en Innovación', () => {
    const state = atCeremony([]);
    const pequeno = makeGame({ size: 'pequeno' });
    const aaa = makeGame({ size: 'aaa' });
    const goty = getAwardCategory('goty');
    const innovacion = getAwardCategory('innovacion');

    const gotyGap = studioScore(state, aaa, goty) - studioScore(state, pequeno, goty);
    const innGap = studioScore(state, aaa, innovacion) - studioScore(state, pequeno, innovacion);
    expect(gotyGap).toBeGreaterThan(innGap * 2);
  });
});

describe('la gala en el tick (docs/06 §7 + docs/18 V7)', () => {
  it('fuera de la semana de gala no pasa nada', () => {
    const state = { ...atCeremony([makeGame({ review: 90 })]), week: 51 };
    expect(advanceAwards(state, rng())).toBe(state);
  });

  it('sin lanzamientos este año, la gala pasa de largo', () => {
    const state = atCeremony([makeGame({ review: 90, releaseWeek: -10 })]);
    const after = advanceAwards(state, rng());
    expect(after.studio.awards).toEqual([]);
    expect(after.studio.lastCeremony).toBeNull();
  });

  it('con un juego flojo NO ganas: ni te nominan y la gala pasa de largo', () => {
    // Reseña 55: por debajo de todos los umbrales de candidatura.
    const state = atCeremony([makeGame({ review: 55, reviewsBySegment: { critica: 55, prensa: 55, hardcore: 55, casual: 55 } })]);
    const after = advanceAwards(state, rng());
    expect(after.studio.awards).toEqual([]);
    expect(after.studio.lastCeremony).toBeNull();
    expect(after.studio.awardHype).toBe(0);
  });

  it('un juego decente en E1 se nomina pero NO gana el GOTY: entras en el ranking', () => {
    // Garaje: juego pequeño, reseña buena, sin prestigio ni escala.
    const state = withPrestige(atCeremony([makeGame({ review: 85, size: 'pequeno' })]), 50);
    const after = advanceAwards(state, rng());
    const goty = after.studio.lastCeremony?.categories.find((c) => c.categoryId === 'goty');
    expect(goty?.rank).not.toBeNull();
    expect(goty?.rank).toBeGreaterThan(1); // nominado, pero no gana
    expect(after.studio.awards.some((a) => a.categoryId === 'goty')).toBe(false);
    // La nominación no es estéril: deja poso en crítica y prensa (docs/18 V7).
    expect(after.studio.reputation.critica).toBeGreaterThan(state.studio.reputation.critica);
    expect(after.studio.awardHype).toBe(0); // pero no da hype: eso es de ganar
  });

  it('en E7, con escala y prestigio, el GOTY es alcanzable (docs/18 V7)', () => {
    const megacorp = withPrestige(
      {
        ...atCeremony([
          makeGame({
            review: 88,
            size: 'aaa',
            reviewsBySegment: { critica: 88, prensa: 88, hardcore: 85, casual: 85 },
          }),
        ]),
        era: 'E7',
      },
      95,
    );
    const after = advanceAwards(megacorp, rng());
    const goty = after.studio.lastCeremony?.categories.find((c) => c.categoryId === 'goty');
    expect(goty?.rank).toBe(1);
    expect(after.studio.awards.some((a) => a.categoryId === 'goty')).toBe(true);
  });

  it('el mismo juego en E1 y en E7: la escala es lo que te hace ganar', () => {
    // Mismo estudio consagrado, misma reseña: solo cambia el tamaño del juego.
    const base = withPrestige({ ...atCeremony([]), era: 'E7' as const }, 95);
    const conAAA = { ...base, releasedGames: [makeGame({ review: 88, size: 'aaa' })] };
    const conPequeno = { ...base, releasedGames: [makeGame({ review: 88, size: 'pequeno' })] };
    const rankGoty = (s: GameState): number =>
      (advanceAwards(s, rng()).studio.lastCeremony?.categories.find((c) => c.categoryId === 'goty')
        ?.rank as number);
    expect(rankGoty(conAAA)).toBe(1);
    expect(rankGoty(conPequeno)).toBeGreaterThan(1);
  });

  // La calibración de docs/18 V7 ("solo realista ganar en E6–E7"), medida como
  // tasa de victoria sobre muchos años en vez de con una semilla afortunada.
  it('el GOTY solo se gana en E6–E7, y con el techo de escala de cada era', () => {
    // Techo de tamaño realista por era: lo fijan los gates de la 8.8.
    const techo: Record<EraId, ReleasedGame['size']> = {
      E1: 'mediano',
      E2: 'grande',
      E3: 'grande',
      E4: 'muyGrande',
      E5: 'muyGrande',
      E6: 'aaa',
      E7: 'aaa',
    };
    const winRate = (era: EraId): number => {
      let wins = 0;
      const years = 20;
      for (let i = 0; i < years; i++) {
        // Un estudio excelente y consagrado, año tras año: solo cambia la gala.
        const base = { ...createInitialState(500 + i), week: 52, era };
        const state = withPrestige(
          {
            ...base,
            releasedGames: [
              makeGame({
                review: 88,
                size: techo[era],
                reviewsBySegment: { critica: 88, prensa: 88, hardcore: 88, casual: 88 },
              }),
            ],
          },
          95,
        );
        const goty = advanceAwards(state, makeRng(state.seed, AWARDS_STREAM + 52)).studio.lastCeremony?.categories.find(
          (c) => c.categoryId === 'goty',
        );
        if (goty?.rank === 1) wins++;
      }
      return wins / years;
    };

    // Antes de E6 el listón va por delante de tu techo: ganar es la excepción.
    for (const era of ['E1', 'E2', 'E3', 'E4', 'E5'] as EraId[]) {
      expect(winRate(era)).toBeLessThan(0.2);
    }
    // En E6–E7, con Corporación y AAA, el gordo por fin cae.
    expect(winRate('E6')).toBeGreaterThan(0.8);
    expect(winRate('E7')).toBeGreaterThan(0.8);
  });

  it('la escala no compra la Innovación: ahí compite la idea (docs/18 V7)', () => {
    // Una megacorporación en E7 con un AAA excelente arrasa el GOTY…
    const megacorp = withPrestige(
      {
        ...atCeremony([
          makeGame({
            review: 88,
            size: 'aaa',
            reviewsBySegment: { critica: 88, prensa: 88, hardcore: 88, casual: 88 },
            breakdown: makeBreakdown({ innovationMod: 1.05, polishScore: 0.95, fit: 0.9 }),
          }),
        ]),
        era: 'E7',
      },
      95,
    );
    const cats = advanceAwards(megacorp, rng()).studio.lastCeremony?.categories;
    expect(cats?.find((c) => c.categoryId === 'goty')?.rank).toBe(1);
    // …pero no se lleva la Innovación: su músculo casi no puntúa ahí.
    expect(cats?.find((c) => c.categoryId === 'innovacion')?.rank).toBeGreaterThan(1);
  });

  it('ganar da premios, reputación y hype pendiente', () => {
    const state = withPrestige(
      {
        ...atCeremony([
          makeGame({
            review: 88,
            size: 'aaa',
            reviewsBySegment: { critica: 88, prensa: 88, hardcore: 85, casual: 85 },
            breakdown: makeBreakdown({ innovationMod: 1.05, polishScore: 0.95, fit: 0.9 }),
          }),
        ]),
        era: 'E7',
      },
      95,
    );
    const after = advanceAwards(state, rng());
    expect(after.studio.awards.length).toBeGreaterThanOrEqual(1);
    expect(after.studio.awards[0].year).toBe(1980);
    expect(after.studio.reputation.critica).toBeGreaterThan(state.studio.reputation.critica);
    expect(after.studio.reputation.prensa).toBeGreaterThan(state.studio.reputation.prensa);
    expect(after.studio.awardHype).toBeGreaterThan(0);
    expect(after.studio.awardHype).toBeLessThanOrEqual(balance.awards.rewards.hypeCap);
    expect(after.log.some((e) => e.type === 'premios')).toBe(true);
  });

  it('la ceremonia guarda el ranking completo con nominados ficticios y nombre', () => {
    const state = withPrestige(atCeremony([makeGame({ review: 85 })]), 50);
    const ceremony = advanceAwards(state, rng()).studio.lastCeremony;
    expect(ceremony?.year).toBe(1980);
    expect(ceremony?.era).toBe('E1');

    const goty = ceremony?.categories.find((c) => c.categoryId === 'goty');
    // Tú + los nominados ficticios, ordenados de mejor a peor.
    expect(goty?.nominees).toHaveLength(balance.awards.competition.nomineeCount + 1);
    expect(goty?.nominees.filter((n) => n.isPlayer)).toHaveLength(1);
    const scores = goty?.nominees.map((n) => n.score) as number[];
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    // Los ficticios tienen nombre de estudio y de juego: industria viva.
    for (const rival of goty?.nominees.filter((n) => !n.isPlayer) ?? []) {
      expect(rival.studio.length).toBeGreaterThan(0);
      expect(rival.gameName.length).toBeGreaterThan(0);
    }
    // Y tu puesto es exactamente tu posición en ese ranking.
    const position = (goty?.nominees.findIndex((n) => n.isPlayer) as number) + 1;
    expect(goty?.rank).toBe(position);
  });

  it('perder también se anuncia: el ranking dice quién ganó (PRNG solo el sabor)', () => {
    const state = withPrestige(atCeremony([makeGame({ review: 85 })]), 50);
    const after = advanceAwards(state, rng());
    expect(after.studio.awards.some((a) => a.categoryId === 'goty')).toBe(false);
    expect(after.log.some((e) => e.type === 'premios' && e.text.includes('Gana '))).toBe(true);
    // Determinista: misma semilla, misma gala.
    expect(advanceAwards(state, rng())).toEqual(after);
  });

  it('el siguiente proyecto consume el hype de los premios (docs/06 §7)', () => {
    let state = withPrestige(
      { ...atCeremony([makeGame({ review: 88, size: 'aaa' })]), era: 'E7' },
      95,
    );
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
