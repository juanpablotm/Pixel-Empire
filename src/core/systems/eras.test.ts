import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { eraForWeek, eraOrder, eras, getEra } from '../../data/eras';
import { monetizationModels } from '../../data/monetization';
import { platforms } from '../../data/platforms';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { ProjectSize } from '../model/project';
import { eraNovelties } from './eras';
import { createMarketState, computeSegmentReviews, platformAvailable } from './market';
import { startProject } from './projects';
import {
  availableCreatorDefs,
  availableGenres,
  availableMonetizationModels,
  availablePlatforms,
  availableThemes,
  researchableThemes,
} from './unlocks';

/**
 * Las 7 eras (docs/02 §5): transición automática por tiempo, desbloqueos de
 * contenido por era (docs/09 §7), subida del listón de calidad y ritmo de
 * partida (docs/02 §6). Semilla fija; las eras viven en data/eras.ts.
 */

const SEED = 42;

/** Estado en una semana concreta (mercado coherente con la semana). */
function atWeek(week: number, era = eraForWeek(week)): GameState {
  const base = createInitialState(SEED);
  return { ...base, week, era, market: createMarketState(week) };
}

describe('eraForWeek y datos de las eras (docs/02 §5)', () => {
  it('hay 7 eras en orden y con semanas de inicio crecientes', () => {
    expect(eraOrder).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7']);
    for (let i = 1; i < eras.length; i++) {
      expect(eras[i].startWeek).toBeGreaterThan(eras[i - 1].startWeek);
    }
    expect(eras[0].startWeek).toBe(balance.time.startWeek);
  });

  it('mapea semanas a eras por su startWeek', () => {
    expect(eraForWeek(1)).toBe('E1');
    expect(eraForWeek(getEra('E2').startWeek - 1)).toBe('E1');
    expect(eraForWeek(getEra('E2').startWeek)).toBe('E2');
    expect(eraForWeek(getEra('E7').startWeek)).toBe('E7');
    expect(eraForWeek(getEra('E7').startWeek + 5_000)).toBe('E7');
  });

  it('cada era dura al menos 3 años: la curva de escala se siente (docs/02 §6)', () => {
    for (let i = 1; i < eras.length; i++) {
      expect(eras[i].startWeek - eras[i - 1].startWeek).toBeGreaterThanOrEqual(156);
    }
  });
});

describe('transición de era en el tick (docs/02 §5)', () => {
  it('al cruzar el startWeek cambia la era y se anuncia el evento', () => {
    const before = atWeek(getEra('E2').startWeek - 1, 'E1');
    const after = tick(before);
    expect(after.week).toBe(getEra('E2').startWeek);
    expect(after.era).toBe('E2');
    expect(after.log.some((e) => e.type === 'era' && e.text.includes('Las consolas'))).toBe(true);
  });

  it('en mitad de una era no pasa nada', () => {
    const state = atWeek(100, 'E1');
    expect(tick(state).era).toBe('E1');
  });

  it('nunca retrocede: un estado con era forzada se respeta', () => {
    const state = { ...atWeek(10, 'E1'), era: 'E5' as const };
    expect(tick(state).era).toBe('E5');
  });

  it('es determinista: misma semilla → misma transición', () => {
    const state = atWeek(getEra('E3').startWeek - 1, 'E2');
    expect(tick(state)).toEqual(tick(state));
  });
});

describe('desbloqueos por era (docs/09 §7, CA: contenido gateado)', () => {
  it('en E1 no existen los géneros/plataformas/modelos de eras futuras', () => {
    const state = atWeek(1);
    expect(availableGenres(state).map((g) => g.id)).not.toContain('shooter');
    expect(availablePlatforms(state).map((p) => p.id)).not.toContain('playsystem');
    expect(availableMonetizationModels(state).map((m) => m.id)).toEqual(['premium']);
  });

  it('cada era nueva desbloquea contenido', () => {
    const e2 = atWeek(getEra('E2').startWeek);
    expect(availableGenres(e2).map((g) => g.id)).toContain('shooter');
    const e5 = atWeek(getEra('E5').startWeek);
    expect(availableMonetizationModels(e5).map((m) => m.id)).toContain('f2p');
    const e6 = atWeek(getEra('E6').startWeek);
    expect(availableCreatorDefs(e6).map((c) => c.id)).toContain('streamKing');
  });

  it('concebir con contenido bloqueado por era lanza un error legible', () => {
    const state = atWeek(1);
    expect(() =>
      startProject(state, {
        name: 'Anacronismo',
        themeId: 'fantasia',
        genreId: 'shooter',
        platformId: 'pcCasero',
        audience: 'amplio',
        size: 'pequeno',
      }),
    ).toThrow(/no está desbloqueado/);
    expect(() =>
      startProject(state, {
        name: 'MTX en 1980',
        themeId: 'fantasia',
        genreId: 'rpg',
        platformId: 'pcCasero',
        audience: 'amplio',
        size: 'pequeno',
        monetization: {
          model: 'premium+mtx',
          aggressiveness: 0.5,
          hasLootBoxes: false,
          hasBattlePass: false,
          dayOneDLC: false,
        },
      }),
    ).toThrow(/no existe en esta era/);
  });

  it('el pase de batalla no existe hasta E6 aunque las MTX lleguen en E5', () => {
    const e5 = atWeek(getEra('E5').startWeek);
    expect(() =>
      startProject(e5, {
        name: 'Pase Anacrónico',
        themeId: 'fantasia',
        genreId: 'rpg',
        platformId: 'pcCasero',
        audience: 'amplio',
        size: 'pequeno',
        monetization: {
          model: 'premium+mtx',
          aggressiveness: 0.3,
          hasLootBoxes: false,
          hasBattlePass: true,
          dayOneDLC: false,
        },
      }),
    ).toThrow(/pase de batalla/);
  });

  it('CA: el ritmo no se vacía — toda era tiene contenido de sobra', () => {
    for (const era of eras) {
      const state = atWeek(era.startWeek);
      expect(availableGenres(state).length).toBeGreaterThanOrEqual(4);
      // Con los temas gateados por investigación (docs/17 P1), el "contenido de
      // sobra" son los temas que la era pone al ALCANCE: usables (starter) +
      // investigables. La era habilita; el jugador decide en qué se especializa.
      expect(
        availableThemes(state).length + researchableThemes(state).length,
      ).toBeGreaterThanOrEqual(6);
      expect(availableMonetizationModels(state).length).toBeGreaterThanOrEqual(1);
      expect(availableCreatorDefs(state).length).toBeGreaterThanOrEqual(2);
      // Siempre hay al menos una plataforma A LA VENTA (no solo anunciada).
      const onSale = availablePlatforms(state).filter((p) =>
        platformAvailable(p, era.startWeek),
      );
      expect(onSale.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('novedades de la era (docs/17 U1: cronología)', () => {
  it('E1 estrena los micro-ordenadores y la venta de copias', () => {
    const { platforms: plats, business } = eraNovelties('E1');
    expect(plats).toContain('PC Casero');
    expect(business).toEqual(['Premium']);
  });

  it('E5 estrena el f2p y las loot boxes; los pases de batalla esperan a E6', () => {
    expect(eraNovelties('E5').business).toContain('Free-to-play');
    expect(eraNovelties('E5').business).toContain('Loot boxes');
    expect(eraNovelties('E5').business).not.toContain('Pases de batalla');
    expect(eraNovelties('E6').business).toContain('Pases de batalla');
  });

  it('se deriva del catálogo: cada plataforma y modelo sale en su era, una sola vez', () => {
    const allPlatforms = eraOrder.flatMap((era) => eraNovelties(era).platforms);
    expect(allPlatforms).toHaveLength(platforms.length);
    expect(new Set(allPlatforms).size).toBe(allPlatforms.length);

    const allBusiness = eraOrder.flatMap((era) => eraNovelties(era).business);
    expect(allBusiness).toHaveLength(monetizationModels.length + 2);
    expect(new Set(allBusiness).size).toBe(allBusiness.length);
  });

  it('ninguna era llega de vacío: todas estrenan algo que enseñar', () => {
    for (const era of eraOrder) {
      const { platforms: plats, business } = eraNovelties(era);
      expect(plats.length + business.length).toBeGreaterThan(0);
    }
  });
});

describe('CA de Fase 6: la progresión larga E1→E7 (docs/11)', () => {
  it('una partida recorre las 7 eras de punta a punta sin romperse', () => {
    // Estudio con caja de sobra que deja pasar el tiempo: el mundo entero
    // (mercado, eras, galas, escala) debe sostenerse ~45 años de ticks.
    const base = createInitialState(SEED);
    let state: GameState = {
      ...base,
      studio: { ...base.studio, capital: 5_000_000 },
      stats: { ...base.stats, peakCapital: 5_000_000 },
    };
    const seen: string[] = [state.era];
    const end = getEra('E7').startWeek + 10;
    while (state.week < end) {
      state = tick(state);
      if (state.era !== seen[seen.length - 1]) seen.push(state.era);
    }
    // Las 7 eras llegan en orden, con su evento de transición.
    expect(seen).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7']);
    expect(state.gameOver).toBeNull();
    // Invariantes básicos tras ~2300 ticks (docs/08 §8).
    expect(Number.isFinite(state.studio.capital)).toBe(true);
    for (const value of Object.values(state.studio.reputation)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
    // El mercado de E7 respira: hay plataformas vivas con base instalada.
    const alive = Object.values(state.market.platforms).filter((p) => p.installedBase > 0);
    expect(alive.length).toBeGreaterThanOrEqual(2);
  });
});

describe('el listón de calidad sube con las eras (docs/02 §5 y docs/04 §5)', () => {
  it('eraStandard no crece y capByEraSize no decrece a lo largo de las eras', () => {
    const sizes: ProjectSize[] = ['pequeno', 'mediano', 'grande', 'muyGrande', 'aaa'];
    for (let i = 1; i < eraOrder.length; i++) {
      const prev = eraOrder[i - 1];
      const cur = eraOrder[i];
      expect(balance.market.reviews.eraStandard[cur]).toBeLessThanOrEqual(
        balance.market.reviews.eraStandard[prev],
      );
      for (const size of sizes) {
        expect(balance.quality.capByEraSize[cur][size]).toBeGreaterThanOrEqual(
          balance.quality.capByEraSize[prev][size],
        );
      }
    }
  });

  it('la misma Q puntúa peor en una era tardía (el público exige más)', () => {
    const market = createMarketState(1);
    const base = {
      quality: 80,
      genreId: 'rpg',
      themeId: 'fantasia',
      audience: 'amplio' as const,
      hype: 0,
      monetization: {
        model: 'premium' as const,
        aggressiveness: 0,
        hasLootBoxes: false,
        hasBattlePass: false,
        dayOneDLC: false,
      },
      market,
    };
    const e1 = computeSegmentReviews({ ...base, era: 'E1' });
    const e6 = computeSegmentReviews({ ...base, era: 'E6' });
    expect(e6.average).toBeLessThan(e1.average);
    expect(e6.info.base).toBeCloseTo(80 * balance.market.reviews.eraStandard.E6, 5);
  });
});
