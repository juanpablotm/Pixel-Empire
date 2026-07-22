import { balance } from '../../data/balance';
import { getEra } from '../../data/eras';
import { researchNodes } from '../../data/research';
import { themes } from '../../data/themes';
import type { EraId } from '../model/era';
import type { GameState } from '../model/gameState';
import type { LegacyTrackedStats } from '../model/moral';
import { initialCommunityState } from '../systems/community';
import { createMarketState } from '../systems/market';
import { defaultPolicies } from '../systems/policies';
import { initialReputation } from '../systems/reputation';
import { initialResearchState } from '../systems/research';
import { createInitialRivals } from '../systems/rivals';
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
    peakReputation: balance.reputation.initial,
  };
}

/**
 * Crea el estado inicial de una partida SANDBOX (docs/01 §7, Fase 7G):
 * la misma simulación, pero con caja y 💡 de sobra (balance.sandbox) y
 * empezando en la era elegida (el mercado arranca en su semana histórica).
 * Puro y determinista, como todo el núcleo.
 */
export function createSandboxState(seed: number, startEra: EraId): GameState {
  const startWeek = getEra(startEra).startWeek;
  const base = createInitialState(seed);
  // En sandbox se experimenta sin fricción (docs/01 §7): todos los temas ya
  // usables y el conocimiento de mercado revelado (docs/17 P1/P2). Sigue siendo
  // la misma simulación; solo se pre-desbloquea lo que en partida se gana con 💡.
  const knowledgeNodes = researchNodes.filter((n) => n.reveals).map((n) => n.id);
  return {
    ...base,
    week: startWeek,
    era: startEra,
    market: createMarketState(startWeek),
    // La industria arranca con el roster de la era elegida (9.5).
    rivals: createInitialRivals(seed, startWeek, startEra),
    studio: { ...base.studio, capital: balance.sandbox.initialCapital },
    research: {
      ...base.research,
      points: balance.sandbox.researchPoints,
      unlocked: knowledgeNodes,
      themes: themes.map((t) => t.id),
    },
    stats: { ...base.stats, peakCapital: balance.sandbox.initialCapital },
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
      awards: [],
      lastCeremony: null,
      awardHype: 0,
    },
    // En el garaje eres tú solo; el pool de contratación llega con la etapa 2.
    staff: [createFounder(seed)],
    candidates: [],
    projects: [],
    releasedGames: [],
    market: createMarketState(balance.time.startWeek),
    // La industria establecida de 1980 (9.5): tú eres el garaje, no el mundo.
    rivals: createInitialRivals(seed, balance.time.startWeek, balance.time.startEra),
    loanPrincipal: 0,
    loanInterest: 0,
    debtSpiral: false,
    scandals: [],
    community: initialCommunityState(),
    regulation: { pressure: {}, enacted: [] },
    research: initialResearchState(),
    engines: [],
    engineBuild: null,
    subsidiaries: [],
    policies: defaultPolicies(),
    stats: initialLegacyStats(),
    cashflow: [],
    projectCounter: 0,
    negativeWeeks: 0,
    recentFireWeeks: [],
    gameOver: null,
    log: [],
  };
}
