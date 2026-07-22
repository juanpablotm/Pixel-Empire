/**
 * MEDICIÓN PREVIA AL PASE ECONÓMICO — Fase 10.2-A (docs/20, sección "Resultados
 * de la 10.1" + Consecuencias para la 10.2). PURAMENTE DIAGNÓSTICO: no cambia
 * ningún número de balance. Corre tres experimentos deterministas (semilla fija
 * BOT_SEED) y escupe las tablas del informe. Herramienta de playtest, no un test:
 *
 *   npx vite-node src/test/economyDiag102A.ts
 *
 * Exp1 — ¿Es el préstamo lo que rompe el ritmo? (hipótesis W8): optimizador con
 *        endeudamiento agresivo en dos mundos, (a) bug de préstamos restaurado y
 *        (b) interés arreglado.
 * Exp2 — ROI por tamaño CONTROLADO: mismo estudio/semana/equipo/Fit/calidad
 *        objetivo → lanzar cada tamaño viable. Contrafactual limpio.
 * Exp3 — Descomponer la "paradoja del capital": flujo de caja por categoría y
 *        era en la partida de la Fábrica (la que llega a Corporación).
 */
import { balance } from '../data/balance';
import { eraAtLeast, eraForWeek, getEra } from '../data/eras';
import { featureGenreAffinity } from '../data/features';
import { createInitialState } from '../core/engine/initialState';
import { tick } from '../core/engine/tick';
import type { GameState } from '../core/model/gameState';
import type { ProjectSize } from '../core/model/project';
import { salaryCostFactor } from '../core/systems/policies';
import { weeklyFixedCosts } from '../core/systems/economy';
import { engineHasCapability } from '../core/systems/engines';
import { comboPopularity } from '../core/systems/market';
import { teamPower } from '../core/systems/maturity';
import {
  confirmContestedRelease,
  projectTotalWeeks,
  sizeBlockReason,
  startProject,
  toggleFeature,
} from '../core/systems/projects';
import { computeFit } from '../core/systems/quality';
import { availableFeatures, availableGenres, availableThemes } from '../core/systems/unlocks';
import {
  AGGRO_OPTIMIZER,
  BOT_SEED,
  FACTORY,
  FINAL_WEEK,
  OPTIMIZER,
  botDecide,
  type Philosophy,
} from './bots';

// --- Formato --------------------------------------------------------------
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

// ==========================================================================
// EXPERIMENTO 1 — ¿Es el préstamo lo que rompe el ritmo? (hipótesis W8)
// ==========================================================================

interface Exp1Metrics {
  name: string;
  /** Etapa → primera semana en que se alcanzó. */
  stageWeek: Record<number, number>;
  /** Era → capital al cierre de esa era. */
  eraCapital: Partial<Record<string, number>>;
  /** Semanas con capital negativo. */
  redWeeks: number;
  /** Nº de veces que ENTRÓ en números rojos (episodios). */
  redEpisodes: number;
  minCapital: number;
  /** Mayor principal de préstamo que llegó a tener a la vez (el techo del banco). */
  peakPrincipal: number;
  end: GameState;
}

function runExp1(name: string, phil: Philosophy, legacyBug: boolean): Exp1Metrics {
  let state: GameState = { ...createInitialState(BOT_SEED), loanLegacyBug: legacyBug };
  let gamesStarted = 0;
  const stageWeek: Record<number, number> = { [state.studio.scaleStage]: state.week };
  const eraCapital: Partial<Record<string, number>> = {};
  let redWeeks = 0;
  let redEpisodes = 0;
  let wasRed = false;
  let minCapital = Infinity;
  let peakPrincipal = 0;
  while (state.week < FINAL_WEEK && state.gameOver === null) {
    const step = botDecide(state, phil, gamesStarted);
    state = step.state;
    gamesStarted = step.gamesStarted;
    peakPrincipal = Math.max(peakPrincipal, state.loanPrincipal);
    state = tick(state);
    if (stageWeek[state.studio.scaleStage] === undefined) {
      stageWeek[state.studio.scaleStage] = state.week;
    }
    eraCapital[state.era] = state.studio.capital;
    const cap = state.studio.capital;
    minCapital = Math.min(minCapital, cap);
    if (cap < 0) {
      redWeeks += 1;
      if (!wasRed) redEpisodes += 1;
      wasRed = true;
    } else {
      wasRed = false;
    }
  }
  return { name, stageWeek, eraCapital, redWeeks, redEpisodes, minCapital, peakPrincipal, end: state };
}

function printExp1(): void {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║ EXPERIMENTO 1 — ¿Es el préstamo lo que rompe el ritmo? (W8)            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  const rows = [
    runExp1('optimizador PRUDENTE (arreglo)', OPTIMIZER, false),
    runExp1('agresivo (a) BUG restaurado', AGGRO_OPTIMIZER, true),
    runExp1('agresivo (b) interés arreglado', AGGRO_OPTIMIZER, false),
  ];

  console.log('\n1a. ESCALA — era/semana (año) en que se alcanza cada etapa:');
  console.log(pad('perfil', 32) + [2, 3, 4, 5].map((s) => padL(STAGE_NAMES[s], 18)).join(''));
  for (const m of rows) {
    const cells = [2, 3, 4, 5].map((stage) => {
      const w = m.stageWeek[stage];
      return padL(w === undefined ? '—' : `${eraForWeek(w)} s${w} (${yearOf(w)})`, 18);
    });
    console.log(pad(m.name, 32) + cells.join(''));
  }

  console.log('\n1b. CAPITAL al cierre de cada era (💰):');
  console.log(pad('perfil', 32) + ERAS.map((e) => padL(e, 10)).join(''));
  for (const m of rows) {
    const cells = ERAS.map((e) =>
      padL(m.eraCapital[e] !== undefined ? k(m.eraCapital[e]!) : '—', 10),
    );
    console.log(pad(m.name, 32) + cells.join(''));
  }

  console.log('\n1c. NÚMEROS ROJOS, préstamo máximo y cierre:');
  console.log(
    pad('perfil', 32) +
      padL('sem. rojo', 11) +
      padL('episod.', 9) +
      padL('mín. caja', 12) +
      padL('préstamo máx', 14) +
      padL('cap. final', 12) +
      padL('etapa', 7),
  );
  for (const m of rows) {
    console.log(
      pad(m.name, 32) +
        padL(String(m.redWeeks), 11) +
        padL(String(m.redEpisodes), 9) +
        padL(k(m.minCapital), 12) +
        padL(k(m.peakPrincipal), 14) +
        padL(k(m.end.studio.capital), 12) +
        padL(String(m.end.studio.scaleStage), 7),
    );
  }
  console.log(
    '(préstamo máx = mayor principal simultáneo: el techo del banco ≈ 26 sem de coste fijo × rep.\n' +
      ' El gate de Estudio grande pide 1,5M de capital: el crédito no da ni de lejos para saltarlo.)',
  );
}

// ==========================================================================
// EXPERIMENTO 2 — ROI por tamaño CONTROLADO (contrafactual)
// ==========================================================================

/** Estado FIJO capturado durante una única corrida del optimizador. */
interface Snapshot {
  label: string;
  state: GameState;
}

/** Corre el optimizador una vez y captura estados fijos en E3, E4 y E5(Corp). */
function captureSnapshots(): Snapshot[] {
  const wants: { label: string; ok: (s: GameState) => boolean }[] = [
    { label: 'media E3', ok: (s) => s.era === 'E3' && s.studio.scaleStage >= 3 },
    { label: 'E4', ok: (s) => s.era === 'E4' && s.studio.scaleStage >= 4 },
    { label: 'late E5 (Corp)', ok: (s) => s.era === 'E5' && s.studio.scaleStage >= 5 },
    {
      label: 'E6 (Corp, AAA-listo)',
      ok: (s) => eraAtLeast(s.era, 'E6') && s.studio.scaleStage >= 5 && s.staff.length >= 40,
    },
  ];
  const caught: Snapshot[] = [];
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

/**
 * Prepara un estado para el contrafactual: retira el catálogo (no vende ni
 * ocupa manos), libera todo el equipo (sin I+D, sin servicios, sin filiales),
 * vacía los proyectos y da caja de sobra (para que el juego se complete y
 * agote sin bancarrota: medimos el JUEGO, no la caja del estudio).
 */
function cleanForContrafactual(snap: GameState): GameState {
  const s = structuredClone(snap);
  s.projects = [];
  s.research = { ...s.research, rdStaff: [] };
  s.subsidiaries = [];
  s.engineBuild = null;
  s.gameOver = null;
  s.negativeWeeks = 0;
  s.studio = { ...s.studio, capital: 1_000_000_000 };
  s.releasedGames = s.releasedGames.map((g) => ({
    ...g,
    salesActive: false,
    liveService: undefined,
  }));
  return s;
}

/** Mejor motor propio por nivel técnico (o null = artesanal). */
function bestOwnedEngineId(state: GameState): string | null {
  const engines = state.engines ?? [];
  let best: { id: string; lvl: number } | null = null;
  for (const e of engines) {
    if (best === null || e.techLevel > best.lvl) best = { id: e.id, lvl: e.techLevel };
  }
  return best?.id ?? null;
}

/** Mejor combo tema×género por fit × popularidad (constante para todos los tamaños). */
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

/** Añade features hasta el objetivo de alcance del tamaño (mismo criterio que el bot). */
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

interface Exp2Row {
  size: ProjectSize;
  cost: number;
  netRevenue: number;
  roi: number;
  absProfit: number;
  fullyLoadedProfit: number;
  review: number;
  quality: number;
  devWeeks: number;
  scope01: number;
  soldOut: boolean;
}

/** Simula lanzar UN tamaño desde un estado fijo y mide su economía de juego. */
function runContrafactual(
  snap: GameState,
  size: ProjectSize,
  combo: { themeId: string; genreId: string },
): Exp2Row | null {
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
  // Cap generoso: desarrollo + cola larga de ventas. Energía al máximo cada
  // semana para AISLAR la economía del tamaño de la fatiga (calidad objetivo
  // constante); no se toman decisiones de bot (ni ampliar ni nuevos juegos).
  const maxWeeks = state.week + totalDevWeeks + 520;
  let soldOut = false;
  while (state.week < maxWeeks && state.gameOver === null) {
    state = { ...state, studio: { ...state.studio, capital: 1_000_000_000 } };
    state = { ...state, staff: state.staff.map((e) => ({ ...e, energy: 100 })) };
    // Sin bot que decida, un lanzamiento en ventana disputada (9.5) se quedaría
    // colgado en pendingRelease para siempre: se lanza igual (consistente entre
    // tamaños; elimina el confound del aplastamiento rival por fecha de salida).
    const p = state.projects.find((x) => x.id === projectId);
    if (p && p.pendingRelease !== undefined) {
      state = confirmContestedRelease(state, projectId);
    }
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
  const payrollDuringDev = devWeeks * fixedAtStart;
  return {
    size,
    cost,
    netRevenue,
    roi: cost > 0 ? netRevenue / cost : 0,
    absProfit: netRevenue - cost,
    fullyLoadedProfit: netRevenue - cost - payrollDuringDev,
    review: game.review,
    quality: game.quality,
    devWeeks,
    scope01,
    soldOut,
  };
}

function printExp2(): void {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║ EXPERIMENTO 2 — ROI por tamaño CONTROLADO (contrafactual)             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(
    'Mismo estudio/semana/equipo/Fit/calidad-objetivo; premium honesto; motor propio;\n' +
      'plataforma pcCasero; energía al máximo (aísla la economía del tamaño de la fatiga).',
  );
  const snapshots = captureSnapshots();
  for (const snap of snapshots) {
    const s = snap.state;
    const combo = bestCombo(cleanForContrafactual(s));
    if (!combo) {
      console.log(`\n(${snap.label}: sin combo disponible)`);
      continue;
    }
    console.log(
      `\n── Estado «${snap.label}» · ${s.era} s${s.week} (${yearOf(s.week)}) · etapa ${
        s.studio.scaleStage
      } · plantilla ${s.staff.length} · combo ${combo.themeId}×${combo.genreId} ──`,
    );
    console.log(
      pad('tamaño', 12) +
        padL('coste', 12) +
        padL('ing. neto', 14) +
        padL('ROI', 9) +
        padL('benef. abs.', 14) +
        padL('con nómina', 14) +
        padL('reseña', 8) +
        padL('Q', 6) +
        padL('alc.', 7) +
        padL('sem.dev', 8),
    );
    for (const size of SIZES) {
      const row = runContrafactual(s, size, combo);
      if (!row) {
        console.log(pad(SIZE_LABEL[size], 12) + padL('— (bloqueado)', 12));
        continue;
      }
      console.log(
        pad(SIZE_LABEL[size], 12) +
          padL(k(row.cost), 12) +
          padL(k(row.netRevenue), 14) +
          padL(`${row.roi.toFixed(1)}×`, 9) +
          padL(k(row.absProfit), 14) +
          padL(k(row.fullyLoadedProfit), 14) +
          padL(String(Math.round(row.review)), 8) +
          padL(String(Math.round(row.quality)), 6) +
          padL(row.scope01.toFixed(2), 7) +
          padL(row.soldOut ? String(row.devWeeks) : `${row.devWeeks}*`, 8),
      );
    }
  }
  console.log('\n(* la cola de ventas no se agotó dentro del cap; ingreso ligeramente subestimado)');
  console.log('(alc. = poderEquipo / poderObjetivo del tamaño: <1 = equipo corto para ese tamaño)');
}

// ==========================================================================
// EXPERIMENTO 3 — Descomponer la "paradoja del capital" (Fábrica → Corp)
// ==========================================================================

interface EraLedger {
  weeks: number;
  salesIncome: number;
  payroll: number;
  stageOverhead: number;
  baseUpkeep: number;
  devCost: number;
  expansion: number;
  interest: number;
  deltaCapital: number;
  gamesReleased: number;
}

function emptyLedger(): EraLedger {
  return {
    weeks: 0,
    salesIncome: 0,
    payroll: 0,
    stageOverhead: 0,
    baseUpkeep: 0,
    devCost: 0,
    expansion: 0,
    interest: 0,
    deltaCapital: 0,
    gamesReleased: 0,
  };
}

function printExp3(): void {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║ EXPERIMENTO 3 — Paradoja del capital: flujo por categoría y era        ║');
  console.log('║               (Fábrica AAA, la partida que llega a Corporación)        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  const byEra: Record<string, EraLedger> = {};
  // Bucket adicional por ETAPA de escala (para "¿la etapa 5 se paga sola?").
  const byStage: Record<number, EraLedger> = {};
  const ledger = (map: Record<string | number, EraLedger>, key: string | number): EraLedger =>
    (map[key] ??= emptyLedger());

  let state = createInitialState(BOT_SEED);
  let endState = state;
  let gamesStarted = 0;
  while (state.week < FINAL_WEEK && state.gameOver === null) {
    const pre = state;
    const era = eraForWeek(pre.week);
    const stage = pre.studio.scaleStage;
    const payroll = pre.staff.reduce((sum, e) => sum + e.salary, 0) * salaryCostFactor(pre);
    const stageOverhead = balance.economy.upkeepExtraByStage[stage];
    const baseUpkeep = balance.economy.weeklyUpkeep;
    const preCapital = pre.studio.capital;
    const preGames = pre.releasedGames.length;

    const step = botDecide(pre, FACTORY, gamesStarted);
    let post = step.state;
    gamesStarted = step.gamesStarted;
    // devCost lo cobra advanceEconomy sobre los proyectos VIVOS en el tick.
    const devCost = balance.economy.devCostPerPersonWeek * post.projects.length;
    post = tick(post);

    const postStage = post.studio.scaleStage;
    const expansion =
      postStage > stage ? balance.staff.scale.upgradeCostByStage[postStage as 2 | 3 | 4 | 5] : 0;
    const lastCash = post.cashflow[post.cashflow.length - 1];
    const salesIncome = lastCash && lastCash.week === pre.week ? lastCash.income : 0;
    const interest = lastCash && lastCash.week === pre.week ? lastCash.interest ?? 0 : 0;
    const deltaCapital = post.studio.capital - preCapital;
    const gamesReleased = post.releasedGames.length - preGames;
    endState = post;

    for (const map of [byEra, byStage] as const) {
      const key = map === byEra ? era : stage;
      const L = ledger(map as Record<string | number, EraLedger>, key);
      L.weeks += 1;
      L.salesIncome += salesIncome;
      L.payroll += payroll;
      L.stageOverhead += stageOverhead;
      L.baseUpkeep += baseUpkeep;
      L.devCost += devCost;
      L.expansion += expansion;
      L.interest += interest;
      L.deltaCapital += deltaCapital;
      L.gamesReleased += gamesReleased;
    }
    state = post;
  }

  // --- 3a. Categorías por era (💰 acumulado en la era) ---
  console.log('\n3a. FLUJO POR CATEGORÍA acumulado por era (💰):');
  console.log(
    pad('era', 6) +
      padL('sem.', 6) +
      padL('ventas', 12) +
      padL('nómina', 12) +
      padL('overhead', 12) +
      padL('amplia.', 11) +
      padL('interés', 11) +
      padL('otros*', 12) +
      padL('Δcaja', 12),
  );
  for (const era of ERAS) {
    const L = byEra[era];
    if (!L) continue;
    // "otros" (residual de caja): marketing, motores, GaaS, filiales, adelantos,
    // EA, contrataciones… El interés NO toca caja (capitaliza), se excluye.
    const otros =
      L.deltaCapital -
      (L.salesIncome - L.payroll - L.baseUpkeep - L.stageOverhead - L.devCost - L.expansion);
    console.log(
      pad(era, 6) +
        padL(String(L.weeks), 6) +
        padL(k(L.salesIncome), 12) +
        padL(k(-L.payroll), 12) +
        padL(k(-L.stageOverhead), 12) +
        padL(k(-L.expansion), 11) +
        padL(k(-L.interest), 11) +
        padL(k(otros), 12) +
        padL(k(L.deltaCapital), 12),
    );
  }
  console.log('(overhead = SOLO el extra de etapa; nómina = salarios×factor; +base 100/sem aparte)');
  console.log('(*otros: marketing, motores, GaaS, filiales, adelantos, EA, contrataciones…)');
  // El interés capitaliza (no toca caja): por eso su columna crece a lo absurdo
  // sin hundir la caja. Es una señal, no un gasto — clave para 10.2-B.
  const debt = endState.loanPrincipal + (endState.loanInterest ?? 0);
  console.log(
    `\n⚠️  DEUDA al cierre: principal ${money(endState.loanPrincipal)} 💰 · ` +
      `interés acumulado ${money(endState.loanInterest ?? 0)} 💰 · deuda viva ${money(debt)} 💰.\n` +
      '    El interés CAPITALIZA (no sale de caja) y availableCredit ignora el interés\n' +
      '    acumulado: la Fábrica tomó préstamos puente que nunca amortizó (una vez la deuda\n' +
      '    viva supera la caja, la regla de amortizar ya no se cumple) → la "presión de deuda"\n' +
      '    del 10.1 es COSMÉTICA para un estudio apalancado que crece. Dato para 10.2-B.',
  );

  // --- 3b. Margen operativo por era ---
  console.log('\n3b. MARGEN OPERATIVO por era (media semanal, 💰/sem):');
  console.log(
    pad('era', 6) +
      padL('ing./sem', 12) +
      padL('coste/sem', 12) +
      padL('margen/sem', 12) +
      padL('juegos', 9),
  );
  let firstPositive: string | null = null;
  for (const era of ERAS) {
    const L = byEra[era];
    if (!L) continue;
    const incWk = L.salesIncome / L.weeks;
    // Coste operativo recurrente de CAJA: nómina + overhead + base + desarrollo
    // (sin capex de ampliación ni el interés, que capitaliza).
    const costWk = (L.payroll + L.stageOverhead + L.baseUpkeep + L.devCost) / L.weeks;
    const marginWk = incWk - costWk;
    if (firstPositive === null && marginWk > 0) firstPositive = era;
    console.log(
      pad(era, 6) +
        padL(money(incWk), 12) +
        padL(money(costWk), 12) +
        padL((marginWk >= 0 ? '+' : '') + money(marginWk), 12) +
        padL(String(L.gamesReleased), 9),
    );
  }
  console.log(
    `→ El margen operativo se vuelve positivo por primera vez en: ${firstPositive ?? 'nunca'}.`,
  );

  // --- 3c. ¿La etapa 5 se paga a sí misma? ---
  console.log('\n3c. ¿SE PAGA LA ETAPA 5 A SÍ MISMA? (agregado de todas las semanas en etapa 5):');
  const s5 = byStage[5];
  if (!s5) {
    console.log('   La Fábrica no llegó a la etapa 5 en esta corrida.');
  } else {
    const recurring = s5.payroll + s5.stageOverhead + s5.baseUpkeep + s5.devCost;
    console.log(`   Semanas en Corporación: ${s5.weeks} (~${(s5.weeks / 52).toFixed(1)} años)`);
    console.log(`   Ingreso por ventas:        ${padL(k(s5.salesIncome), 12)} 💰`);
    console.log(`   − Overhead de etapa 5:     ${padL(k(-s5.stageOverhead), 12)} 💰 (30k/sem)`);
    console.log(`   − Nómina:                  ${padL(k(-s5.payroll), 12)} 💰`);
    console.log(`   − Base + desarrollo:       ${padL(k(-(s5.baseUpkeep + s5.devCost)), 12)} 💰`);
    console.log(`   = Margen operativo etapa 5:${padL(k(s5.salesIncome - recurring), 12)} 💰`);
    console.log(`   Juegos lanzados en etapa 5: ${s5.gamesReleased}`);
    console.log(
      `   Δcaja total en etapa 5 (con capex y "otros"): ${k(s5.deltaCapital)} 💰` +
        ` (ampliaciones ${k(-s5.expansion)})`,
    );
    const overheadShareOfIncome =
      s5.salesIncome > 0 ? (s5.stageOverhead / s5.salesIncome) * 100 : Infinity;
    console.log(
      `   El overhead de etapa 5 se come el ${overheadShareOfIncome.toFixed(1)} % del ingreso por ventas de la etapa.`,
    );
  }
}

// ==========================================================================
console.log('════════════════════════════════════════════════════════════════════════');
console.log(' MEDICIÓN 10.2-A — diagnóstico previo al pase económico (semilla', BOT_SEED, ')');
console.log(' FINAL_WEEK =', FINAL_WEEK, '· E7 empieza en', getEra('E7').startWeek);
console.log('════════════════════════════════════════════════════════════════════════');
printExp1();
printExp2();
printExp3();
console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(' Fin de la medición 10.2-A. Ningún número de balance ha cambiado.');
console.log('════════════════════════════════════════════════════════════════════════');
