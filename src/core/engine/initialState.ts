import { balance } from '../../data/balance';
import type { GameState } from '../model/gameState';
import type { LegacyTrackedStats } from '../model/moral';
import { createMarketState } from '../systems/market';
import { initialReputation } from '../systems/reputation';
import { createFounder } from '../systems/staff';

/** Contadores de legado a cero (docs/06 §6). */
export function initialLegacyStats(): LegacyTrackedStats {
  return {
    totalRevenue: 0,
    peakCapital: balance.economy.initialCapital,
    crunchWeeks: 0,
    scandalCount: 0,
    earlyTrendReleases: 0,
    firedCount: 0,
  };
}

/** Crea el estado inicial de una partida nueva. Los valores vienen de data/balance.ts. */
export function createInitialState(seed: number): GameState {
  return {
    seed,
    week: balance.time.startWeek,
    era: balance.time.startEra,
    studio: {
      capital: balance.economy.initialCapital,
      reputation: initialReputation(),
      reputationDebt: 0,
      debtBySource: {},
      moralDrift: 0,
      scaleStage: 1,
    },
    // En el garaje eres tú solo; el pool de contratación llega con la etapa 2.
    staff: [createFounder(seed)],
    candidates: [],
    projects: [],
    releasedGames: [],
    market: createMarketState(balance.time.startWeek),
    loanPrincipal: 0,
    scandals: [],
    regulation: { pressure: {}, enacted: [] },
    stats: initialLegacyStats(),
    cashflow: [],
    projectCounter: 0,
    negativeWeeks: 0,
    gameOver: null,
    log: [],
  };
}
