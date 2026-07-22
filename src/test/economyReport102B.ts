/**
 * Informe del PASE ECONÓMICO — Fase 10.2-B (docs/20 §"10.2-B — Plan del pase
 * económico"). Es la vara con la que se cierra la fase: corre los 4 perfiles de
 * docs/08 §8 con semilla fija y escupe TODO lo que exigen los criterios de
 * cierre. Herramienta de playtest, no un test:
 *
 *   npx vite-node src/test/economyReport102B.ts
 *
 * 1. ESCALA — era/semana de cada etapa + TRAYECTORIA al alcanzarla (juegos
 *    lanzados y mejor reputación de segmento): la entrada del gate de W3.
 * 2. ROI **y BENEFICIO ABSOLUTO** por tamaño: el guardarraíl innegociable de W2
 *    (el ROI puede aplanarse, el beneficio absoluto NO puede decrecer).
 * 3. CONTRAFACTUAL de EXP2 re-corrido con los costes nuevos (mismo estudio,
 *    semana, equipo, Fit y calidad-objetivo → ¿qué rinde cada tamaño?).
 * 4. MARGEN OPERATIVO por era de la partida que llega a Corporación (E6 no
 *    puede seguir en negativo tras aligerar el AAA).
 * 5. NOTA MEDIA por era (que el AAA viable saque buenas reseñas) y deuda al
 *    cierre (que el rediseño de préstamos muerda de verdad).
 */
import { balance } from '../data/balance';
import { eraAtLeast, eraForWeek } from '../data/eras';
import { featureGenreAffinity } from '../data/features';
import { createInitialState } from '../core/engine/initialState';
import { tick } from '../core/engine/tick';
import type { GameState } from '../core/model/gameState';
import type { ProjectSize } from '../core/model/project';
import { outstandingDebt, weeklyFixedCosts } from '../core/systems/economy';
import { engineHasCapability } from '../core/systems/engines';
import { comboPopularity } from '../core/systems/market';
import { teamPower } from '../core/systems/maturity';
import { salaryCostFactor } from '../core/systems/policies';
import {
  confirmContestedRelease,
  projectTotalWeeks,
  sizeBlockReason,
  startProject,
  toggleFeature,
} from '../core/systems/projects';
import { computeFit } from '../core/systems/quality';
import { aggregateReputation } from '../core/systems/reputation';
import { availableFeatures, availableGenres, availableThemes } from '../core/systems/unlocks';
import {
  BOT_SEED,
  FACTORY,
  FINAL_WEEK,
  INDIE,
  OPTIMIZER,
  STUDIO,
  botDecide,
  type Philosophy,
} from './bots';

const ERAS = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'] as const;
const SIZES: readonly ProjectSize[] = ['pequeno', 'mediano', 'grande', 'muyGrande', 'aaa'];
const SIZE_LABEL: Record<ProjectSize, string> = {
  pequeno: 'Pequeño',
  mediano: 'Mediano',
  grande: 'Grande',
  muyGrande: 'Muy grande',
  aaa: 'AAA',
};
const STAGE_NAMES = ['—', 'Garaje', 'E. pequeño', 'Estudio', 'E. grande', 'Corporación'];

const yearOf = (week: number): number => 1979 + Math.ceil(week / 52);
const k = (n: number): string => `${Math.round(n / 1000).toLocaleString('es-ES')}k`;
const money = (n: number): string => Math.round(n).toLocaleString('es-ES');
const pad = (s: string, n: number): string => s.padEnd(n);
const padL = (s: string, n: number): string => s.padStart(n);

/** Trayectoria del estudio en el instante de comprar una etapa (gate de W3). */
interface StageStamp {
  week: number;
  games: number;
  topRep: number;
  capital: number;
}

interface EraLedger {
  weeks: number;
  salesIncome: number;
  payroll: number;
  stageOverhead: number;
  baseUpkeep: number;
  devCost: number;
  expansion: number;
  debtPaid: number;
  deltaCapital: number;
  gamesReleased: number;
}

const emptyLedger = (): EraLedger => ({
  weeks: 0,
  salesIncome: 0,
  payroll: 0,
  stageOverhead: 0,
  baseUpkeep: 0,
  devCost: 0,
  expansion: 0,
  debtPaid: 0,
  deltaCapital: 0,
  gamesReleased: 0,
});

interface Metrics {
  end: GameState;
  stage: Record<number, StageStamp>;
  eraCapital: Partial<Record<string, number>>;
  byEra: Record<string, EraLedger>;
  byStage: Record<number, EraLedger>;
  redWeeks: number;
  peakDebt: number;
}

function run(phil: Philosophy): Metrics {
  let state = createInitialState(BOT_SEED);
  let gamesStarted = 0;
  const stage: Record<number, StageStamp> = {};
  const eraCapital: Partial<Record<string, number>> = {};
  const byEra: Record<string, EraLedger> = {};
  const byStage: Record<number, EraLedger> = {};
  let redWeeks = 0;
  let peakDebt = 0;
  let current = state.studio.scaleStage;

  while (state.week < FINAL_WEEK && state.gameOver === null) {
    const pre = state;
    const era = eraForWeek(pre.week);
    const preStage = pre.studio.scaleStage;
    const payroll = pre.staff.reduce((sum, e) => sum + e.salary, 0) * salaryCostFactor(pre);
    const stageOverhead = balance.economy.upkeepExtraByStage[preStage];
    const preCapital = pre.studio.capital;
    const preGames = pre.releasedGames.length;

    const step = botDecide(pre, phil, gamesStarted);
    let post = step.state;
    gamesStarted = step.gamesStarted;
    const devCost = balance.economy.devCostPerPersonWeek * post.projects.length;
    post = tick(post);

    const expansion =
      post.studio.scaleStage > preStage
        ? balance.staff.scale.upgradeCostByStage[post.studio.scaleStage as 2 | 3 | 4 | 5]
        : 0;
    const lastCash = post.cashflow[post.cashflow.length - 1];
    const sameWeek = lastCash && lastCash.week === pre.week;
    const salesIncome = sameWeek ? lastCash.income : 0;
    const debtPaid = sameWeek ? (lastCash.debtPayment ?? 0) : 0;

    for (const [map, key] of [
      [byEra, era],
      [byStage, preStage],
    ] as const) {
      const L = ((map as Record<string | number, EraLedger>)[key] ??= emptyLedger());
      L.weeks += 1;
      L.salesIncome += salesIncome;
      L.payroll += payroll;
      L.stageOverhead += stageOverhead;
      L.baseUpkeep += balance.economy.weeklyUpkeep;
      L.devCost += devCost;
      L.expansion += expansion;
      L.debtPaid += debtPaid;
      L.deltaCapital += post.studio.capital - preCapital;
      L.gamesReleased += post.releasedGames.length - preGames;
    }

    state = post;
    if (state.studio.scaleStage > current) {
      current = state.studio.scaleStage;
      stage[current] = {
        week: state.week,
        games: state.releasedGames.length,
        topRep: Math.max(...Object.values(state.studio.reputation)),
        capital: state.studio.capital,
      };
    }
    eraCapital[state.era] = state.studio.capital;
    if (state.studio.capital < 0) redWeeks += 1;
    peakDebt = Math.max(peakDebt, outstandingDebt(state));
  }
  return { end: state, stage, eraCapital, byEra, byStage, redWeeks, peakDebt };
}

/** ROI y beneficio ABSOLUTO por tamaño (guardarraíl de W2). */
function bySize(state: GameState) {
  const acc = new Map<
    ProjectSize,
    { revenue: number; cost: number; count: number; review: number }
  >();
  for (const g of state.releasedGames) {
    const cur = acc.get(g.size) ?? { revenue: 0, cost: 0, count: 0, review: 0 };
    cur.revenue += g.totalRevenue + (g.publisherAdvance ?? 0);
    cur.cost += g.cost ?? 0;
    cur.count += 1;
    cur.review += g.review;
    acc.set(g.size, cur);
  }
  return acc;
}

function reviewByEra(state: GameState): Partial<Record<string, { avg: number; n: number }>> {
  const byEra: Record<string, number[]> = {};
  for (const g of state.releasedGames) (byEra[eraForWeek(g.releaseWeek)] ??= []).push(g.review);
  const out: Partial<Record<string, { avg: number; n: number }>> = {};
  for (const era of ERAS) {
    const arr = byEra[era];
    if (arr?.length) out[era] = { avg: arr.reduce((a, b) => a + b, 0) / arr.length, n: arr.length };
  }
  return out;
}

// ==========================================================================
// CONTRAFACTUAL (EXP2 de la 10.2-A re-corrido con los costes nuevos)
// ==========================================================================

function cleanForContrafactual(snap: GameState): GameState {
  const s = structuredClone(snap);
  s.projects = [];
  s.research = { ...s.research, rdStaff: [] };
  s.subsidiaries = [];
  s.engineBuild = null;
  s.gameOver = null;
  s.negativeWeeks = 0;
  s.loanPrincipal = 0;
  s.loanInterest = 0;
  s.studio = { ...s.studio, capital: 1_000_000_000 };
  s.releasedGames = s.releasedGames.map((g) => ({ ...g, salesActive: false, liveService: undefined }));
  return s;
}

function bestOwnedEngineId(state: GameState): string | null {
  let best: { id: string; lvl: number } | null = null;
  for (const e of state.engines ?? []) {
    if (best === null || e.techLevel > best.lvl) best = { id: e.id, lvl: e.techLevel };
  }
  return best?.id ?? null;
}

function bestCombo(state: GameState): { themeId: string; genreId: string } | null {
  let combo: { themeId: string; genreId: string } | null = null;
  let best = -1;
  for (const theme of availableThemes(state)) {
    for (const genre of availableGenres(state)) {
      const { fit } = computeFit({
        themeId: theme.id,
        genreId: genre.id,
        platformId: 'pcCasero',
        audience: 'amplio',
      });
      const score = fit * comboPopularity(state.market, genre.id, theme.id);
      if (score > best) {
        best = score;
        combo = { themeId: theme.id, genreId: genre.id };
      }
    }
  }
  return combo;
}

function addFeaturesToTarget(
  state: GameState,
  projectId: string,
  size: ProjectSize,
  genreId: string,
  engineId: string | null,
): GameState {
  let next = state;
  const target = balance.quality.featureScopeTarget[size];
  const aff = balance.quality.featureAffinity;
  const affMult = { encaja: aff.encajaMult, neutro: aff.neutroMult, noEncaja: aff.noEncajaMult };
  const pool = [...availableFeatures(next)]
    .filter(
      (f) =>
        f.requiresEngineCapability === undefined ||
        engineHasCapability(next, engineId, f.requiresEngineCapability),
    )
    .map((f) => ({ feature: f, eff: f.qualityValue * affMult[featureGenreAffinity(f, genreId)] }))
    .filter(({ eff }) => eff > 0)
    .sort((a, b) => b.eff - a.eff || a.feature.id.localeCompare(b.feature.id));
  let scope = 0;
  const groups = new Set<string>();
  for (const { feature, eff } of pool) {
    if (scope >= target) break;
    if (feature.variantGroup !== undefined) {
      if (groups.has(feature.variantGroup)) continue;
      groups.add(feature.variantGroup);
    }
    next = toggleFeature(next, feature.id, projectId);
    scope += eff;
  }
  return next;
}

interface CfRow {
  cost: number;
  netRevenue: number;
  roi: number;
  absProfit: number;
  fullyLoaded: number;
  review: number;
  scope01: number;
  devWeeks: number;
  soldOut: boolean;
}

function runContrafactual(
  snap: GameState,
  size: ProjectSize,
  combo: { themeId: string; genreId: string },
): CfRow | null {
  const clean = cleanForContrafactual(snap);
  if (sizeBlockReason(clean, size) !== null) return null;
  const engineId = bestOwnedEngineId(clean);
  const scope01 = teamPower(clean.staff, combo.genreId) / balance.quality.scope.powerTarget[size];
  const fixedAtStart = weeklyFixedCosts(clean);

  let state = startProject(clean, {
    name: `CF ${SIZE_LABEL[size]}`,
    themeId: combo.themeId,
    genreId: combo.genreId,
    platformId: 'pcCasero',
    audience: 'amplio',
    size,
    engineId,
    price: balance.economy.priceBySize[size],
    monetization: {
      model: 'premium',
      aggressiveness: 0,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    },
    publisherId: null,
  });
  const project = state.projects[state.projects.length - 1];
  const projectId = project.id;
  state = addFeaturesToTarget(state, projectId, size, combo.genreId, engineId);

  const totalDevWeeks = projectTotalWeeks(state.projects.find((p) => p.id === projectId)!);
  const maxWeeks = state.week + totalDevWeeks + 520;
  let soldOut = false;
  while (state.week < maxWeeks && state.gameOver === null) {
    state = { ...state, studio: { ...state.studio, capital: 1_000_000_000 } };
    state = { ...state, staff: state.staff.map((e) => ({ ...e, energy: 100 })) };
    const p = state.projects.find((x) => x.id === projectId);
    if (p && p.pendingRelease !== undefined) state = confirmContestedRelease(state, projectId);
    state = tick(state);
    const g = state.releasedGames.find((x) => x.id === projectId);
    if (g && !g.salesActive) {
      soldOut = true;
      break;
    }
  }
  const game = state.releasedGames.find((x) => x.id === projectId);
  if (!game) return null;
  const cost = game.cost ?? 0;
  const netRevenue = game.totalRevenue + (game.publisherAdvance ?? 0);
  const devWeeks = game.releaseWeek - (project.startWeek ?? game.releaseWeek);
  return {
    cost,
    netRevenue,
    roi: cost > 0 ? netRevenue / cost : 0,
    absProfit: netRevenue - cost,
    fullyLoaded: netRevenue - cost - devWeeks * fixedAtStart,
    review: game.review,
    scope01,
    devWeeks,
    soldOut,
  };
}

/** Corre el optimizador una vez y captura estados fijos para el contrafactual. */
function captureSnapshots(): { label: string; state: GameState }[] {
  const wants: { label: string; ok: (s: GameState) => boolean }[] = [
    { label: 'E4', ok: (s) => s.era === 'E4' && s.studio.scaleStage >= 4 },
    { label: 'late E5 (Corp)', ok: (s) => s.era === 'E5' && s.studio.scaleStage >= 5 },
    {
      label: 'E6 (Corp, AAA-listo)',
      ok: (s) =>
        eraAtLeast(s.era, 'E6') &&
        s.studio.scaleStage >= 5 &&
        s.staff.length >= balance.development.sizeGate.aaa.minStaff,
    },
  ];
  const caught: { label: string; state: GameState }[] = [];
  const done = new Set<string>();
  let state = createInitialState(BOT_SEED);
  let gamesStarted = 0;
  while (state.week < FINAL_WEEK && state.gameOver === null && done.size < wants.length) {
    const step = botDecide(state, OPTIMIZER, gamesStarted);
    state = step.state;
    gamesStarted = step.gamesStarted;
    state = tick(state);
    for (const w of wants) {
      if (!done.has(w.label) && w.ok(state)) {
        done.add(w.label);
        caught.push({ label: w.label, state: structuredClone(state) });
      }
    }
  }
  return caught;
}

// ==========================================================================
console.log('════════════════════════════════════════════════════════════════════════');
console.log(' PASE ECONÓMICO 10.2-B — validación con bots (semilla', BOT_SEED, ')');
console.log('════════════════════════════════════════════════════════════════════════');

const profiles: { phil: Philosophy; m: Metrics }[] = [INDIE, FACTORY, STUDIO, OPTIMIZER].map(
  (phil) => ({ phil, m: run(phil) }),
);

// --- 1. Escala + trayectoria --------------------------------------------------
console.log('\n═══ 1. ESCALA — era/semana (año) en que se alcanza cada etapa ═══');
console.log(pad('perfil', 20) + STAGE_NAMES.slice(2).map((s) => padL(s, 17)).join(''));
for (const { phil, m } of profiles) {
  const cells = [2, 3, 4, 5].map((s) => {
    const st = m.stage[s];
    return padL(st ? `${eraForWeek(st.week)} s${st.week} (${yearOf(st.week)})` : '—', 17);
  });
  console.log(pad(phil.name, 20) + cells.join(''));
}
console.log('\n═══ 1b. TRAYECTORIA al comprar cada etapa (juegos · mejor rep · caja) ═══');
console.log(pad('perfil', 20) + STAGE_NAMES.slice(2).map((s) => padL(s, 22)).join(''));
for (const { phil, m } of profiles) {
  const cells = [2, 3, 4, 5].map((s) => {
    const st = m.stage[s];
    return padL(st ? `${st.games}j r${Math.round(st.topRep)} ${k(st.capital)}` : '—', 22);
  });
  console.log(pad(phil.name, 20) + cells.join(''));
}

// --- 2. ROI y BENEFICIO ABSOLUTO por tamaño ----------------------------------
console.log('\n═══ 2. ROI por tamaño (Σ ingreso neto ÷ Σ coste) — n lanzamientos, r nota ═══');
console.log(pad('perfil', 20) + SIZES.map((s) => padL(SIZE_LABEL[s], 18)).join(''));
for (const { phil, m } of profiles) {
  const acc = bySize(m.end);
  const cells = SIZES.map((s) => {
    const d = acc.get(s);
    if (!d || d.cost === 0) return padL(d ? `n${d.count} (sin coste)` : '—', 18);
    return padL(
      `${(d.revenue / d.cost).toFixed(1)}× n${d.count} r${Math.round(d.review / d.count)}`,
      18,
    );
  });
  console.log(pad(phil.name, 20) + cells.join(''));
}
console.log('\n═══ 2b. BENEFICIO ABSOLUTO MEDIO por juego y tamaño (GUARDARRAÍL W2) ═══');
console.log('  Debe CRECER con el tamaño: si decrece, nadie crecería y se rompe el Pilar 5.');
console.log(pad('perfil', 20) + SIZES.map((s) => padL(SIZE_LABEL[s], 15)).join('') + '  ¿monótono?');
for (const { phil, m } of profiles) {
  const acc = bySize(m.end);
  const vals = SIZES.map((s) => {
    const d = acc.get(s);
    return d && d.count > 0 ? (d.revenue - d.cost) / d.count : null;
  });
  const seen = vals.filter((v): v is number => v !== null);
  const monotone = seen.every((v, i) => i === 0 || v >= seen[i - 1]);
  console.log(
    pad(phil.name, 20) +
      vals.map((v) => padL(v === null ? '—' : k(v), 15)).join('') +
      (monotone ? '  ✅ sí' : '  ❌ NO'),
  );
}

// --- 3. Contrafactual --------------------------------------------------------
console.log('\n═══ 3. CONTRAFACTUAL de EXP2 re-corrido (mismo estudio/semana/equipo/Fit) ═══');
for (const snap of captureSnapshots()) {
  const s = snap.state;
  const combo = bestCombo(cleanForContrafactual(s));
  if (!combo) continue;
  console.log(
    `\n── «${snap.label}» · ${s.era} s${s.week} (${yearOf(s.week)}) · etapa ${
      s.studio.scaleStage
    } · plantilla ${s.staff.length} · ${combo.themeId}×${combo.genreId} ──`,
  );
  console.log(
    pad('tamaño', 12) +
      padL('coste', 11) +
      padL('ing. neto', 13) +
      padL('ROI', 9) +
      padL('benef. abs.', 13) +
      padL('con nómina', 13) +
      padL('reseña', 8) +
      padL('alc.', 7) +
      padL('sem.', 6),
  );
  let prevAbs: number | null = null;
  let monotone = true;
  for (const size of SIZES) {
    const row = runContrafactual(s, size, combo);
    if (!row) {
      console.log(pad(SIZE_LABEL[size], 12) + padL('— (bloqueado)', 11));
      continue;
    }
    if (prevAbs !== null && row.absProfit < prevAbs) monotone = false;
    prevAbs = row.absProfit;
    console.log(
      pad(SIZE_LABEL[size], 12) +
        padL(k(row.cost), 11) +
        padL(k(row.netRevenue), 13) +
        padL(`${row.roi.toFixed(1)}×`, 9) +
        padL(k(row.absProfit), 13) +
        padL(k(row.fullyLoaded), 13) +
        padL(String(Math.round(row.review)), 8) +
        padL(row.scope01.toFixed(2), 7) +
        padL(row.soldOut ? String(row.devWeeks) : `${row.devWeeks}*`, 6),
    );
  }
  console.log(
    `   → beneficio absoluto creciente con el tamaño: ${monotone ? '✅ sí' : '❌ NO'}`,
  );
}
console.log('\n(* la cola de ventas no se agotó dentro del cap; ingreso algo subestimado)');

// --- 4. Margen operativo por era (la partida que llega a Corporación) --------
console.log('\n═══ 4. MARGEN OPERATIVO por era (💰/sem) — E6 no puede ser negativo ═══');
for (const { phil, m } of profiles) {
  if (m.stage[5] === undefined) continue;
  console.log(`\n── ${phil.name} (llega a Corporación) ──`);
  console.log(
    pad('era', 6) +
      padL('ing./sem', 12) +
      padL('coste/sem', 12) +
      padL('margen/sem', 13) +
      padL('juegos', 8) +
      padL('Δcaja era', 12),
  );
  for (const era of ERAS) {
    const L = m.byEra[era];
    if (!L) continue;
    const inc = L.salesIncome / L.weeks;
    const cost = (L.payroll + L.stageOverhead + L.baseUpkeep + L.devCost) / L.weeks;
    const margin = inc - cost;
    console.log(
      pad(era, 6) +
        padL(money(inc), 12) +
        padL(money(cost), 12) +
        padL((margin >= 0 ? '+' : '') + money(margin), 13) +
        padL(String(L.gamesReleased), 8) +
        padL(k(L.deltaCapital), 12),
    );
  }
  const s5 = m.byStage[5];
  if (s5) {
    const recurring = s5.payroll + s5.stageOverhead + s5.baseUpkeep + s5.devCost;
    console.log(
      `   Etapa 5 (${s5.weeks} sem): ventas ${k(s5.salesIncome)} − recurrente ${k(recurring)} = ` +
        `margen ${k(s5.salesIncome - recurring)} · overhead ${(
          (s5.stageOverhead / Math.max(1, s5.salesIncome)) *
          100
        ).toFixed(1)} % del ingreso`,
    );
  }
}

// --- 5. Nota media por era + deuda -------------------------------------------
console.log('\n═══ 5. NOTA MEDIA de reseñas por era (n lanzamientos) ═══');
console.log(pad('perfil', 20) + ERAS.map((e) => padL(e, 11)).join(''));
for (const { phil, m } of profiles) {
  const byEra = reviewByEra(m.end);
  console.log(
    pad(phil.name, 20) +
      ERAS.map((e) => {
        const d = byEra[e];
        return padL(d ? `${Math.round(d.avg)} (${d.n})` : '—', 11);
      }).join(''),
  );
}

console.log('\n═══ 6. RESUMEN final (préstamos incluidos) ═══');
for (const { phil, m } of profiles) {
  const s = m.end;
  const masterpieces = s.releasedGames.filter((g) => g.review >= 85).length;
  const corp = m.stage[5];
  console.log(
    `${pad(phil.name, 20)} → ${padL(k(s.studio.capital), 9)} 💰 · etapa ${s.studio.scaleStage} · ` +
      `${corp ? `Corp ${eraForWeek(corp.week)} s${corp.week}` : 'nunca Corp'} · ` +
      `${s.releasedGames.length} juegos · rep ${Math.round(
        aggregateReputation(s.studio.reputation),
      )} · ${masterpieces}×85+ · ${s.stats.scandalCount} escándalos · ` +
      `deuda final ${money(outstandingDebt(s))} (pico ${k(m.peakDebt)}) · ` +
      `${m.redWeeks} sem. en rojo${s.gameOver ? ` · QUIEBRA s${s.gameOver.week}` : ''}`,
  );
}
console.log('\n════════════════════════════════════════════════════════════════════════');
