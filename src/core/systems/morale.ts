import { balance } from '../../data/balance';
import { eraAtLeast, regulations } from '../../data/regulations';
import { getScandalDef } from '../../data/scandals';
import { appendLog } from '../engine/log';
import type { Rng } from '../engine/rng';
import type { GameState, Studio } from '../model/gameState';
import type { Segment } from '../model/market';
import type { ActiveScandal, DebtSource } from '../model/moral';
import type { ReleasedGame } from '../model/release';
import { activeFeverFor } from './market';
import {
  aggregateReputation,
  mergeDeltas,
  reputationDeltasFromReviews,
  withReputationDeltas,
  type ReputationDeltas,
} from './reputation';

/**
 * El dilema moral (docs/06): las palancas de codicia dan dinero y acumulan
 * "deuda de reputación" oculta por fuente; la deuda escala la probabilidad y
 * magnitud de los escándalos, que estallan SIEMPRE trazables a la mayor
 * fuente (mayormente determinista: el PRNG solo decide el cuándo). La
 * regulación por era puede invalidar modelos de negocio de golpe.
 *
 * En Fase 4 los escándalos aplican sus efectos económicos y de reputación;
 * su dramatización pública (feed, crisis con reloj) llega en Fase 5 (docs/07).
 */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round2 = (value: number): number => Math.round(value * 100) / 100;

// ---------------------------------------------------------------------------
// Deuda de reputación y deriva moral (docs/06 §5 y docs/10 §7.4)
// ---------------------------------------------------------------------------

/** Suma deuda a una fuente manteniendo el invariante total = Σ fuentes. */
export function addReputationDebt(studio: Studio, source: DebtSource, amount: number): Studio {
  if (amount <= 0) return studio;
  const debtBySource = {
    ...studio.debtBySource,
    [source]: round2((studio.debtBySource[source] ?? 0) + amount),
  };
  return { ...studio, debtBySource, reputationDebt: totalDebt(debtBySource) };
}

function totalDebt(debtBySource: Studio['debtBySource']): number {
  return round2(Object.values(debtBySource).reduce((sum, v) => sum + (v ?? 0), 0));
}

/** Inclina la Balanza "El Precio": − hacia el 💰 (codicia), + hacia la ⭐. */
export function nudgeMoralDrift(studio: Studio, amount: number): Studio {
  if (amount === 0) return studio;
  return { ...studio, moralDrift: round2(clamp(studio.moralDrift + amount, -1, 1)) };
}

/** La fuente con más deuda acumulada: el escándalo que estallará será el suyo. */
export function topDebtSource(studio: Studio): DebtSource | null {
  let top: DebtSource | null = null;
  let max = 0;
  for (const [source, amount] of Object.entries(studio.debtBySource) as [DebtSource, number][]) {
    if ((amount ?? 0) > max) {
      max = amount;
      top = source;
    }
  }
  return top;
}

// ---------------------------------------------------------------------------
// Palancas al lanzar (docs/06 §2): monetización, precio, refrito
// ---------------------------------------------------------------------------

/** ¿El modelo de negocio incluye microtransacciones? */
export function hasMtx(model: ReleasedGame['monetization']['model']): boolean {
  return model === 'premium+mtx' || model === 'f2p';
}

/**
 * ¿Hay un "refrito"? Mismo combo tema×género lanzado hace poco (docs/06 §2:
 * secuela-refrito apresurada). El propio juego se excluye.
 */
export function isRehash(game: ReleasedGame, previousReleases: readonly ReleasedGame[]): boolean {
  return previousReleases.some(
    (g) =>
      g.id !== game.id &&
      g.genreId === game.genreId &&
      g.themeId === game.themeId &&
      game.releaseWeek - g.releaseWeek <= balance.moral.rehashWindowWeeks,
  );
}

/**
 * Aplica al estado todas las consecuencias morales de un lanzamiento:
 * reputación por reseñas y palancas, deuda por codicia, deriva de la balanza,
 * contadores de legado y avisos legibles en el historial (Pilar 2).
 */
export function applyReleaseMoralEffects(state: GameState, game: ReleasedGame): GameState {
  const levers = balance.reputation.levers;
  const debtCfg = balance.moral.debt;
  const driftCfg = balance.moral.drift;
  const pricing = balance.economy.pricing;

  const mon = game.monetization;
  const child = game.audience === 'infantil';
  const childMult = child ? levers.lootboxChildMultiplier : 1;
  const priceRatio = game.price / balance.economy.priceBySize[game.size];
  const previous = state.releasedGames.filter((g) => g.id !== game.id);
  const rehash = isRehash(game, previous);

  let deltas: ReputationDeltas = reputationDeltasFromReviews(game);
  let studio = state.studio;
  let drift = 0;
  const logs: string[] = [];

  const scale = (hits: Partial<Record<Segment, number>>, factor: number): ReputationDeltas => {
    const scaled: ReputationDeltas = {};
    for (const [seg, v] of Object.entries(hits) as [Segment, number][]) scaled[seg] = v * factor;
    return scaled;
  };

  if (mon.hasLootBoxes) {
    deltas = mergeDeltas(deltas, scale(levers.lootboxes, childMult));
    studio = addReputationDebt(
      studio,
      'lootboxes',
      debtCfg.lootboxRelease + (child ? debtCfg.lootboxChildExtra : 0),
    );
    drift += driftCfg.lootboxRelease;
    logs.push(
      child
        ? `«${game.name}» mete loot boxes en un juego infantil. Dinero fácil… y un polvorín.`
        : `Las loot boxes de «${game.name}» engordan la caja. Los hardcore toman nota.`,
    );
  }
  if (mon.hasBattlePass) {
    deltas = mergeDeltas(deltas, levers.battlePass);
    studio = addReputationDebt(studio, 'mtxAgresivas', debtCfg.battlePassRelease);
  }
  if (mon.dayOneDLC) {
    deltas = mergeDeltas(deltas, levers.dayOneDLC);
    studio = addReputationDebt(studio, 'dayOneDLC', debtCfg.dayOneDlcRelease);
    drift += driftCfg.dayOneDlcRelease;
    logs.push(`DLC day-one en «${game.name}»: "nos venden el juego a trozos", protestan.`);
  }
  if (hasMtx(mon.model) && mon.aggressiveness > 0) {
    deltas = mergeDeltas(deltas, scale(levers.mtxPerAggression, mon.aggressiveness));
    studio = addReputationDebt(
      studio,
      'mtxAgresivas',
      debtCfg.mtxAggressionRelease * mon.aggressiveness,
    );
    drift += driftCfg.mtxAggressionRelease * mon.aggressiveness;
    if (mon.aggressiveness > 0.5) {
      logs.push(`La tienda de «${game.name}» aprieta fuerte: ingresos ↑, respeto ↓.`);
    }
  }

  if (priceRatio >= pricing.abusiveMultiplier) {
    deltas = mergeDeltas(deltas, levers.abusivePrice);
    studio = addReputationDebt(studio, 'precioAbusivo', debtCfg.abusivePriceRelease);
    drift += driftCfg.abusivePriceRelease;
    logs.push(`El precio de «${game.name}» escuece: margen alto, público enfadado.`);
  } else if (priceRatio <= pricing.generousMultiplier) {
    deltas = mergeDeltas(deltas, levers.generousPrice);
    drift += driftCfg.generousPriceRelease;
    logs.push(`Precio generoso para «${game.name}»: menos margen, más cariño.`);
  }

  if (rehash) {
    deltas = mergeDeltas(deltas, levers.rehash);
    studio = addReputationDebt(studio, 'refrito', debtCfg.rehashRelease);
    drift += driftCfg.rehashRelease;
    logs.push(`«${game.name}» huele a refrito: la crítica no perdona la fotocopia.`);
  }

  const honest =
    !mon.hasLootBoxes &&
    !mon.dayOneDLC &&
    (!hasMtx(mon.model) || mon.aggressiveness <= driftCfg.honestAggressivenessMax) &&
    priceRatio < pricing.abusiveMultiplier;
  if (honest) {
    deltas = mergeDeltas(deltas, levers.honestRelease);
    drift += driftCfg.honestRelease;
  }

  studio = withReputationDeltas(studio, deltas);
  studio = nudgeMoralDrift(studio, drift);

  // Contadores de legado (docs/06 §6): desde el modelo "fiebre" (docs/19 §9.4),
  // "apostar temprano por una moda" es pillar una FIEBRE en su arranque —
  // lanzar mientras su género o tema está en fiebre y antes de su pico, cuando
  // llegar el primero es mérito y no seguir a la manada.
  const genreFever = activeFeverFor(state.market.fevers, 'genre', game.genreId, state.week);
  const themeFever = activeFeverFor(state.market.fevers, 'theme', game.themeId, state.week);
  const early =
    (genreFever !== undefined && state.week < genreFever.peakWeek) ||
    (themeFever !== undefined && state.week < themeFever.peakWeek);
  const stats = early
    ? { ...state.stats, earlyTrendReleases: state.stats.earlyTrendReleases + 1 }
    : state.stats;
  if (early) {
    logs.push(`«${game.name}» pilla una fiebre en su arranque, antes que nadie. Eso se recuerda.`);
  }

  let next: GameState = { ...state, studio, stats };
  for (const text of logs) next = appendLog(next, 'moral', text);
  return next;
}

// ---------------------------------------------------------------------------
// Semana a semana: crunch, decaimientos, escándalos y regulación
// ---------------------------------------------------------------------------

/** Nº de empleados (no fundador) afectados por el crunch esta semana (todos los proyectos). */
function crunchAffectedCount(state: GameState): number {
  let affected = 0;
  for (const project of state.projects) {
    if (!project.crunch) continue;
    affected += state.staff.filter(
      (e) => !e.founder && project.assignedStaff.includes(e.id),
    ).length;
  }
  return affected;
}

/** Probabilidad semanal de escándalo para una deuda total (docs/06 §5). */
export function scandalChance(reputationDebt: number): number {
  const s = balance.moral.scandal;
  const excess = Math.max(0, reputationDebt - s.freeDebt);
  return Math.min(s.maxChancePerWeek, s.chancePerDebtPoint * excess);
}

/** Magnitud 0..1 con la que estallaría un escándalo hoy. */
export function scandalMagnitude(reputationDebt: number): number {
  const s = balance.moral.scandal;
  return clamp(reputationDebt / s.debtForMaxMagnitude, s.minMagnitude, 1);
}

/**
 * Colchón/amplificador del golpe por reputación previa (docs/06 §5): una
 * comunidad que te adora amortigua; una que te odia lo amplifica.
 */
export function scandalCushion(studio: Studio): number {
  const s = balance.moral.scandal;
  const agg = aggregateReputation(studio.reputation);
  return clamp(1 - s.cushionCoef * ((agg - 50) / 50), s.cushionMin, s.cushionMax);
}

/** Peor penalización de ventas de los escándalos activos (1 = sin escándalo). */
export function scandalSalesFactor(scandals: readonly ActiveScandal[]): number {
  return scandals.reduce(
    (worst, s) => (s.weeksLeft > 0 ? Math.min(worst, s.salesPenalty) : worst),
    1,
  );
}

function lastScandalWeek(scandals: readonly ActiveScandal[]): number | null {
  return scandals.length === 0 ? null : scandals[scandals.length - 1].startWeek;
}

/** Hace estallar un escándalo de la mayor fuente de deuda y aplica sus efectos. */
function igniteScandal(state: GameState, source: DebtSource): GameState {
  const def = getScandalDef(source);
  const magnitude = scandalMagnitude(state.studio.reputationDebt);
  const cushion = scandalCushion(state.studio);
  const factor = magnitude * cushion;

  // Golpes de reputación escalados por magnitud y colchón (docs/06 §5).
  const deltas: ReputationDeltas = {};
  for (const [seg, hit] of Object.entries(def.repHits) as [Segment, number][]) {
    deltas[seg] = -hit * factor;
  }
  let studio = withReputationDeltas(state.studio, deltas);

  // La multa (si la hay) golpea la caja directamente.
  const fine = Math.round(def.fine * magnitude);
  if (fine > 0) studio = { ...studio, capital: studio.capital - fine };

  // El escándalo "cobra" parte de la deuda de su fuente (ya está pagada en público).
  const s = balance.moral.scandal;
  const remaining = round2((studio.debtBySource[source] ?? 0) * (1 - s.dischargeFraction));
  const debtBySource = { ...studio.debtBySource, [source]: remaining };
  studio = { ...studio, debtBySource, reputationDebt: totalDebt(debtBySource) };

  // La plantilla se avergüenza (docs/05 §4: los agravios bajan la moral).
  const staff = state.staff.map((e) => ({
    ...e,
    morale: clamp(e.morale - def.teamMoraleHit * factor, 0, 100),
  }));

  const scandal: ActiveScandal = {
    source,
    startWeek: state.week,
    weeksLeft: def.durationWeeks,
    salesPenalty: def.salesPenalty,
    magnitude: round2(magnitude),
  };

  // Presión regulatoria: los escándalos de MTX empujan la ley (docs/06 §5).
  let regulation = state.regulation;
  if (def.regulatoryPressure) {
    const { regulationId, amount } = def.regulatoryPressure;
    regulation = {
      ...regulation,
      pressure: {
        ...regulation.pressure,
        [regulationId]: round2((regulation.pressure[regulationId] ?? 0) + amount),
      },
    };
  }

  let next: GameState = {
    ...state,
    studio,
    staff,
    scandals: [...state.scandals, scandal],
    regulation,
    stats: { ...state.stats, scandalCount: state.stats.scandalCount + 1 },
  };
  next = appendLog(next, 'moral', `💥 ESCÁNDALO: ${def.headline}`);
  if (fine > 0) next = appendLog(next, 'moral', `La sanción asciende a ${fine} 💰.`);
  return next;
}

/** Promulga las regulaciones cuya presión y era hayan llegado (docs/06 §5). */
export function advanceRegulation(state: GameState): GameState {
  let next = state;
  for (const reg of regulations) {
    if (next.regulation.enacted.includes(reg.id)) continue;
    const pressure = next.regulation.pressure[reg.id] ?? 0;
    if (pressure < reg.pressureThreshold || !eraAtLeast(next.era, reg.minEra)) continue;

    next = {
      ...next,
      regulation: { ...next.regulation, enacted: [...next.regulation.enacted, reg.id] },
    };
    next = appendLog(next, 'moral', `⚖️ ${reg.headline}`);

    if (reg.effect === 'banLootBoxes') {
      // El modelo muere de golpe: los proyectos en desarrollo pierden las cajas
      // (los juegos ya lanzados conservan la config, pero sus MTX se cortan en ventas).
      next = {
        ...next,
        projects: next.projects.map((p) =>
          p.monetization.hasLootBoxes
            ? { ...p, monetization: { ...p.monetization, hasLootBoxes: false } }
            : p,
        ),
      };
    }
  }
  return next;
}

/** ¿Están prohibidas las loot boxes? (consultado por ventas y concepción). */
export function lootBoxesBanned(state: Pick<GameState, 'regulation'>): boolean {
  return regulations.some(
    (r) => r.effect === 'banLootBoxes' && state.regulation.enacted.includes(r.id),
  );
}

/**
 * Una semana del dilema moral (integrada en el tick): drenaje por crunch,
 * decaimiento de deuda y deriva, cuenta atrás de escándalos activos, posible
 * estallido (PRNG, trazable a la mayor fuente) y regulación.
 */
export function advanceMoral(state: GameState, rng: Rng): GameState {
  const debtCfg = balance.moral.debt;
  const driftCfg = balance.moral.drift;
  const employerCfg = balance.reputation.employer;

  let studio = state.studio;
  let stats = state.stats;

  // Crunch como palanca moral (docs/05 §6 y docs/06 §2): daña la reputación de
  // empleador y acumula deuda por cada empleado exprimido. El fundador
  // crunchando solo en el garaje no cuenta: nadie filtra su propio castigo.
  const affected = crunchAffectedCount(state);
  if (affected > 0) {
    studio = withReputationDeltas(studio, {
      empleador: -employerCfg.crunchPerEmployeeWeek * affected,
    });
    studio = addReputationDebt(studio, 'crunch', debtCfg.crunchPerEmployeeWeek * affected);
    studio = nudgeMoralDrift(studio, driftCfg.crunchPerWeek);
    stats = { ...stats, crunchWeeks: stats.crunchWeeks + 1 };
  }

  // El público olvida despacio: la deuda decae; la balanza vuelve al centro.
  const debtBySource: Studio['debtBySource'] = {};
  for (const [source, amount] of Object.entries(studio.debtBySource) as [DebtSource, number][]) {
    const decayed = round2((amount ?? 0) * debtCfg.decayPerWeek);
    if (decayed >= debtCfg.cleanupThreshold) debtBySource[source] = decayed;
  }
  studio = {
    ...studio,
    debtBySource,
    reputationDebt: totalDebt(debtBySource),
    moralDrift: round2(studio.moralDrift * driftCfg.decayPerWeek),
  };

  // La reputación DECAE sola (Fase 9.1, docs/19 §9.1): el cariño se erosiona
  // hacia el objetivo si no das motivos nuevos. Por debajo del objetivo no hay
  // cura gratis (la asimetría de docs/06 §3): recuperarse exige actuar.
  const decayCfg = balance.reputation.decay;
  const reputation = { ...studio.reputation };
  let repDecayed = false;
  for (const segment of Object.keys(reputation) as Segment[]) {
    const value = reputation[segment];
    if (value > decayCfg.target) {
      reputation[segment] = round2(value - decayCfg.ratePerWeek * (value - decayCfg.target));
      repDecayed = true;
    }
  }
  if (repDecayed) studio = { ...studio, reputation };

  // Cuenta atrás de los escándalos activos (se conservan como historial).
  const scandals = state.scandals.map((s) =>
    s.weeksLeft > 0 ? { ...s, weeksLeft: s.weeksLeft - 1 } : s,
  );

  let next: GameState = { ...state, studio, stats, scandals };

  // ¿Estalla un escándalo? El PRNG decide el cuándo; la deuda, el cuánto; y
  // la mayor fuente, el qué (siempre trazable a una decisión del jugador).
  const last = lastScandalWeek(scandals);
  const offCooldown = last === null || next.week - last >= balance.moral.scandal.cooldownWeeks;
  const source = topDebtSource(next.studio);
  if (offCooldown && source !== null && rng.chance(scandalChance(next.studio.reputationDebt))) {
    next = igniteScandal(next, source);
  }

  return advanceRegulation(next);
}
