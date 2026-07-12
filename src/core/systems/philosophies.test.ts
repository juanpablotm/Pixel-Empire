import { describe, expect, it } from 'vitest';
import { getEra } from '../../data/eras';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { MonetizationConfig } from '../model/moral';
import { computeLegacy } from './legacy';
import { createMarketState } from './market';
import { startProject } from './projects';
import { aggregateReputation } from './reputation';
import { setCrunch } from './staff';

/**
 * Test de bots de balance (docs/08 §8 y CA de Fase 4 en docs/11): las tres
 * filosofías de estudio (docs/01 §5) deben ser VIABLES y sentirse DISTINTAS.
 * Cada bot juega ~3 años con semilla fija encadenando juegos pequeños; solo
 * cambian sus palancas morales (precio, monetización, crunch).
 */

const SEED = 1234;
/** ~2,3 años dentro de E5 (los bots no llegan a E6: sin ley de loot boxes). */
const WEEKS = 120;

/**
 * Combos tema×género rotados (idénticos para los 3 bots: comparación justa).
 * 12 combos: el ciclo (~84 semanas) supera la ventana de refrito (52), así
 * que ningún bot comete refritos por accidente.
 */
const COMBOS = [
  { themeId: 'fantasia', genreId: 'rpg' },
  { themeId: 'espacio', genreId: 'estrategia' },
  { themeId: 'piratas', genreId: 'aventura' },
  { themeId: 'vida', genreId: 'puzzle' },
  { themeId: 'cienciaFiccion', genreId: 'rpg' },
  { themeId: 'deportes', genreId: 'puzzle' },
  { themeId: 'piratas', genreId: 'estrategia' },
  { themeId: 'cienciaFiccion', genreId: 'aventura' },
  { themeId: 'espacio', genreId: 'puzzle' },
  { themeId: 'deportes', genreId: 'estrategia' },
  { themeId: 'vida', genreId: 'aventura' },
  { themeId: 'fantasia', genreId: 'estrategia' },
];

interface Philosophy {
  /** Multiplicador sobre el precio recomendado (20 💰 en pequeño). */
  priceMult: number;
  monetization: MonetizationConfig;
  crunch: boolean;
}

/**
 * Codicia COMPETENTE (la "fábrica AAA" de docs/01 §5): exprime la
 * monetización sin suicidarse con el precio ni auto-crunchearse (el fundador
 * en solitario solo se daña a sí mismo: moral ↓ → calidad ↓ → espiral; el
 * crunch como palanca moral con empleados está cubierto en morale.test.ts).
 * La codicia con todo al máximo (precio abusivo + agg 1.0 + cajas + crunch
 * perpetuo) entra en espiral de muerte y quiebra: eso también es diseño
 * ("rica pero frágil", docs/06 §3), pero el arquetipo viable es este.
 */
const GREEDY: Philosophy = {
  priceMult: 1,
  monetization: {
    model: 'premium+mtx',
    aggressiveness: 0.7,
    hasLootBoxes: true,
    // El pase de batalla no se inventa hasta E6 (docs/02 §5) y no aporta
    // ingresos en el modelo v1: el bot de E5 exprime con cajas + MTX.
    hasBattlePass: false,
    dayOneDLC: false,
  },
  crunch: false,
};

const INTEGRITY: Philosophy = {
  priceMult: 0.8,
  monetization: {
    model: 'premium',
    aggressiveness: 0,
    hasLootBoxes: false,
    hasBattlePass: false,
    dayOneDLC: false,
  },
  crunch: false,
};

const BALANCED: Philosophy = {
  priceMult: 1,
  monetization: {
    model: 'premium+dlc',
    aggressiveness: 0,
    hasLootBoxes: false,
    hasBattlePass: false,
    dayOneDLC: false,
  },
  crunch: false,
};

/**
 * Bot: encadena juegos pequeños durante WEEKS semanas con su filosofía.
 * Desde Fase 6 la monetización está gateada por era (docs/09 §9), así que
 * los bots juegan en la ventana real de E5 (semana de inicio de data/eras):
 * ahí ya existen las MTX y las loot boxes, y el mercado es el de su época.
 * La comparación entre filosofías sigue siendo la de la Fase 4.
 */
function playBot(philosophy: Philosophy): GameState {
  const startWeek = getEra('E5').startWeek;
  let state: GameState = {
    ...createInitialState(SEED),
    week: startWeek,
    era: 'E5',
    market: createMarketState(startWeek),
  };
  let combo = 0;
  for (let week = 0; week < WEEKS; week++) {
    if (state.gameOver) break;
    if (state.projects.length === 0) {
      const { themeId, genreId } = COMBOS[combo % COMBOS.length];
      combo++;
      state = startProject(state, {
        name: `Bot ${combo}`,
        themeId,
        genreId,
        platformId: 'pcCasero',
        audience: 'amplio',
        size: 'pequeno',
        price: Math.round(20 * philosophy.priceMult),
        monetization: { ...philosophy.monetization },
      });
      if (philosophy.crunch) state = setCrunch(state, true);
    }
    state = tick(state);
  }
  return state;
}

describe('CA de cierre de Fase 4: las tres filosofías (docs/01 §5 y docs/11)', () => {
  const greedy = playBot(GREEDY);
  const integrity = playBot(INTEGRITY);
  const balanced = playBot(BALANCED);

  it('las tres son viables: nadie quiebra y todas acaban con caja positiva', () => {
    for (const bot of [greedy, integrity, balanced]) {
      expect(bot.gameOver).toBeNull();
      expect(bot.studio.capital).toBeGreaterThan(0);
      expect(bot.releasedGames.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('la codicia es tentadora: ingresa más por unidad vendida', () => {
    const perUnit = (s: GameState) => {
      const revenue = s.releasedGames.reduce((sum, g) => sum + g.totalRevenue, 0);
      const units = s.releasedGames.reduce((sum, g) => sum + g.totalUnits, 0);
      return revenue / units;
    };
    expect(perUnit(greedy)).toBeGreaterThan(perUnit(integrity) * 1.3);
  });

  it('la codicia acumula riesgo REAL: deuda oculta y escándalos; la integridad no', () => {
    expect(greedy.stats.scandalCount).toBeGreaterThanOrEqual(1);
    expect(integrity.stats.scandalCount).toBe(0);
    expect(integrity.studio.reputationDebt).toBe(0);
  });

  it('la reputación diverge por segmento: la codicia tiene víctimas concretas', () => {
    // El agregado se separa claramente.
    expect(aggregateReputation(integrity.studio.reputation)).toBeGreaterThan(
      aggregateReputation(greedy.studio.reputation) + 10,
    );
    // Los hardcore odian al codicioso más que los casual (docs/06 §1); el
    // detalle por palanca está cubierto en morale.test.ts.
    expect(greedy.studio.reputation.hardcore).toBeLessThanOrEqual(
      greedy.studio.reputation.casual,
    );
    expect(greedy.studio.reputation.hardcore).toBeLessThan(
      integrity.studio.reputation.hardcore,
    );
  });

  it('los legados cuentan historias distintas', () => {
    const greedyLegacy = computeLegacy(greedy);
    const integrityLegacy = computeLegacy(integrity);
    const balancedLegacy = computeLegacy(balanced);
    expect(integrityLegacy.etica).toBeGreaterThan(greedyLegacy.etica + 15);
    expect(balancedLegacy.etica).toBeGreaterThan(greedyLegacy.etica);
    // La balanza moral visible también diverge.
    expect(greedy.studio.moralDrift).toBeLessThan(0);
    expect(integrity.studio.moralDrift).toBeGreaterThanOrEqual(0);
  });
});
