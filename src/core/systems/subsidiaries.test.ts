import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { makeRng } from '../engine/rng';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { RivalRuntime } from '../model/rivals';
import type { Subsidiary } from '../model/subsidiary';
import { activeRivalStudios } from './rivals';
import {
  acquireStudio,
  acquisitionBlockReason,
  acquisitionPriceFor,
  advanceSubsidiaries,
  sellSubsidiary,
  setSubsidiaryDirective,
  subsidiarySellPrice,
  subsidiaryUpkeep,
} from './subsidiaries';

/**
 * Adquisiciones y filiales (Fase 9.7, docs/19 §9.7): CA de la sub-fase —
 * comprar cuesta (desembolso + overhead) y da ingreso pasivo CON riesgo
 * (exprimir hunde moral → talento → reseñas hasta las pérdidas), y absorber
 * un rival lo elimina de la competencia. Semilla fija: determinista.
 */

const SEED = 971;

/** Estado en E6 con caja de corporación y la industria sembrada. */
function makeState(): GameState {
  const base = createInitialState(SEED);
  return {
    ...base,
    week: 1900,
    era: 'E6',
    studio: { ...base.studio, capital: 6_000_000, scaleStage: 5 },
  };
}

function runtimeOf(state: GameState, rivalId: string): RivalRuntime {
  const r = state.rivals?.studios.find((s) => s.id === rivalId);
  if (!r) throw new Error(`sin runtime: ${rivalId}`);
  return r;
}

function subOf(state: GameState, id: string): Subsidiary {
  const sub = (state.subsidiaries ?? []).find((s) => s.id === id);
  if (!sub) throw new Error(`sin filial: ${id}`);
  return sub;
}

describe('precio y elegibilidad (deterministas, sin PRNG)', () => {
  it('el precio sale de tier × fuerza, redondeado a miles', () => {
    const state = makeState();
    const runtime = runtimeOf(state, 'cincoPixeles');
    const cfg = balance.acquisitions;
    const expected =
      Math.round(
        ((cfg.priceByTier[runtime.tier] as number) *
          (cfg.priceStrengthBase + (runtime.strength / 100) * cfg.priceStrengthSpan)) /
          1000,
      ) * 1000;
    expect(acquisitionPriceFor(state, 'cincoPixeles')).toBe(expected);
  });

  it('los gigantes no están en venta; antes del Estudio grande no se compra', () => {
    const state = makeState();
    expect(acquisitionBlockReason(state, 'mango')).toMatch(/gigantes/i);
    const small = { ...state, studio: { ...state.studio, scaleStage: 3 as const } };
    expect(acquisitionBlockReason(small, 'cincoPixeles')).toMatch(/Estudio grande/);
  });

  it('un estudio en racha (fuerza ≥ barra) se niega a vender', () => {
    const state = makeState();
    const rivals = state.rivals;
    if (!rivals) throw new Error('sin rivales');
    const hot: GameState = {
      ...state,
      rivals: {
        ...rivals,
        studios: rivals.studios.map((r) =>
          r.id === 'cincoPixeles'
            ? { ...r, strength: balance.acquisitions.refuseAboveStrength }
            : r,
        ),
      },
    };
    expect(acquisitionBlockReason(hot, 'cincoPixeles')).toMatch(/racha/i);
  });
});

describe('CA 9.7c — absorber un rival lo elimina de la competencia', () => {
  it('comprar paga el precio, marca el runtime y anula su anuncio y su caza', () => {
    let state = makeState();
    const rivals = state.rivals;
    if (!rivals) throw new Error('sin rivales');
    // Dale un anuncio pendiente y una oferta de caza suya, para ver que mueren.
    state = {
      ...state,
      rivals: {
        studios: rivals.studios.map((r) =>
          r.id === 'cincoPixeles'
            ? {
                ...r,
                nextRelease: {
                  gameName: 'Umbral',
                  genreId: 'rpg',
                  themeId: 'fantasia',
                  size: 'mediano' as const,
                  announcedWeek: state.week,
                  releaseWeek: state.week + 10,
                  hyped: false,
                },
              }
            : r,
        ),
        poachOffer: {
          rivalId: 'cincoPixeles',
          employeeId: 'nadie',
          offeredSalary: 900,
          week: state.week,
        },
      },
    };
    const price = acquisitionPriceFor(state, 'cincoPixeles') as number;
    const next = acquireStudio(state, 'cincoPixeles');

    expect(next.studio.capital).toBe(state.studio.capital - price);
    const runtime = runtimeOf(next, 'cincoPixeles');
    expect(runtime.acquiredWeek).toBe(next.week);
    expect(runtime.nextRelease).toBeNull();
    expect(next.rivals?.poachOffer).toBeNull();
    // Fuera del censo activo: ni anuncia, ni lanza, ni disputa, ni caza.
    expect(activeRivalStudios(next).some((r) => r.id === 'cincoPixeles')).toBe(false);
    const sub = subOf(next, 'cincoPixeles');
    expect(sub.talent).toBe(runtime.strength);
    expect(sub.price).toBe(price);
  });

  it('tras la compra, el rival no vuelve a lanzar aunque pasen años', () => {
    let state = acquireStudio(makeState(), 'cincoPixeles');
    const gamesBefore = runtimeOf(state, 'cincoPixeles').games.length;
    for (let i = 0; i < 120; i += 1) state = tick(state);
    expect(runtimeOf(state, 'cincoPixeles').games.length).toBe(gamesBefore);
    // Y su filial, mientras tanto, SÍ ha publicado (autónoma).
    expect(subOf(state, 'cincoPixeles').games.length).toBeGreaterThan(0);
  });
});

describe('CA 9.7b — la filial cuesta y rinde (con riesgo)', () => {
  it('overhead continuo cada semana + lanzamientos autónomos que engordan el bote', () => {
    let state = acquireStudio(makeState(), 'cincoPixeles');
    const sub0 = subOf(state, 'cincoPixeles');
    const upkeep = subsidiaryUpkeep(sub0);
    for (let i = 0; i < 60; i += 1) {
      state = advanceSubsidiaries(state, makeRng(SEED, 100_000 + i));
      state = { ...state, week: state.week + 1 };
    }
    const sub = subOf(state, 'cincoPixeles');
    expect(sub.upkeepPaid).toBe(upkeep * 60);
    expect(sub.games.length).toBeGreaterThan(0);
    // El bote se cobra como flujo: ya ha entrado dinero del lanzamiento.
    expect(sub.revenue).toBeGreaterThan(0);
    // Su lanzamiento saturó el combo en TU mercado (docs/04 §3).
    const released = sub.games[0];
    const key = `${released.genreId}|${released.themeId}`;
    expect(state.market.saturation[key] ?? 0).toBeGreaterThan(0);
  });

  it('exprimir rinde más por juego HOY y hunde moral → talento (con éxodo que refuerza a un rival)', () => {
    const bought = acquireStudio(makeState(), 'cincoPixeles');
    let squeezed = setSubsidiaryDirective(bought, 'cincoPixeles', 'exprimir');
    let steady = bought;
    const rivalStrengthBefore = activeRivalStudios(bought).map((r) => r.strength);

    for (let i = 0; i < 90; i += 1) {
      squeezed = advanceSubsidiaries(squeezed, makeRng(SEED, 200_000 + i));
      squeezed = { ...squeezed, week: squeezed.week + 1 };
      steady = advanceSubsidiaries(steady, makeRng(SEED, 200_000 + i));
      steady = { ...steady, week: steady.week + 1 };
    }

    const subSq = subOf(squeezed, 'cincoPixeles');
    const subSt = subOf(steady, 'cincoPixeles');
    // La casa exprimida se quema: moral y talento por debajo de la autónoma.
    expect(subSq.morale).toBeLessThan(subSt.morale);
    expect(subSq.talent).toBeLessThan(subSt.talent);
    // El éxodo dejó noticia y devolvió talento a la industria (docs/05 §7).
    expect(squeezed.log.some((l) => l.text.includes('Fuga de talento'))).toBe(true);
    const strengthAfter = activeRivalStudios(squeezed).map((r) => r.strength);
    expect(strengthAfter.reduce((a, b) => a + b, 0)).toBeGreaterThan(
      rivalStrengthBefore.reduce((a, b) => a + b, 0),
    );
    // Exprimir gotea deuda de crunch y quema tu fama de Empleador (docs/06 §2).
    expect(squeezed.studio.debtBySource.crunch ?? 0).toBeGreaterThan(0);
    expect(squeezed.studio.reputation.empleador).toBeLessThan(
      steady.studio.reputation.empleador,
    );
    // Más caja por juego hoy: mismo talento al lanzar el primero, bote mayor
    // (incomeMult) y cadencia más corta (más lanzamientos en la ventana).
    expect(subSq.games.length).toBeGreaterThanOrEqual(subSt.games.length);
  });

  it('invertir cuesta más overhead y construye moral y talento', () => {
    const bought = acquireStudio(makeState(), 'cincoPixeles');
    let invested = setSubsidiaryDirective(bought, 'cincoPixeles', 'invertir');
    expect(subsidiaryUpkeep(subOf(invested, 'cincoPixeles'))).toBeGreaterThan(
      subsidiaryUpkeep(subOf(bought, 'cincoPixeles')),
    );
    for (let i = 0; i < 60; i += 1) {
      invested = advanceSubsidiaries(invested, makeRng(SEED, 300_000 + i));
      invested = { ...invested, week: invested.week + 1 };
    }
    const sub = subOf(invested, 'cincoPixeles');
    expect(sub.morale).toBeGreaterThan(balance.acquisitions.initialMorale);
    expect(sub.talent).toBeGreaterThan(subOf(bought, 'cincoPixeles').talent);
  });

  it('vender devuelve el valor actual con descuento y saca la filial', () => {
    const bought = acquireStudio(makeState(), 'cincoPixeles');
    const sub = subOf(bought, 'cincoPixeles');
    const sellPrice = subsidiarySellPrice(sub);
    // Vender recién comprada pierde dinero: no hay máquina de arbitraje.
    expect(sellPrice).toBeLessThan(sub.price);
    const after = sellSubsidiary(bought, 'cincoPixeles');
    expect(after.studio.capital).toBe(bought.studio.capital + sellPrice);
    expect(after.subsidiaries ?? []).toHaveLength(0);
  });
});
