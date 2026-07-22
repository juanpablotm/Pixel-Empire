/**
 * Informe del OPTIMIZADOR (Fase 10.1, docs/20 W8): corre los 4 perfiles —
 * indie de culto, fábrica AAA, estudio equilibrado y optimizador — con semilla
 * fija y escupe la tabla de métricas que pide la 10.1, entrada directa del pase
 * económico 10.2. Herramienta de playtest, no un test:
 *
 *   npx vite-node src/test/optimizerReport.ts
 *
 * Reporta, por perfil: era/semana en que alcanza CADA etapa de escala, capital
 * por era, ROI por tamaño de proyecto (ingreso neto ÷ coste total) y nota media
 * de reseñas por era. Dice la VERDAD sobre el estado actual: si el optimizador
 * rompe el juego, aquí se ve (no se ajusta balance para taparlo).
 */
import { createInitialState } from '../core/engine/initialState';
import { tick } from '../core/engine/tick';
import { eraForWeek } from '../data/eras';
import type { GameState } from '../core/model/gameState';
import type { ProjectSize } from '../core/model/project';
import { aggregateReputation } from '../core/systems/reputation';
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

const STAGE_NAMES = ['—', 'Garaje', 'E. pequeño', 'Estudio', 'E. grande', 'Corporación'];
const ERAS = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'] as const;
const SIZES: readonly ProjectSize[] = ['pequeno', 'mediano', 'grande', 'muyGrande', 'aaa'];
const SIZE_LABEL: Record<ProjectSize, string> = {
  pequeno: 'Pequeño',
  mediano: 'Mediano',
  grande: 'Grande',
  muyGrande: 'Muy grande',
  aaa: 'AAA',
};

const yearOf = (week: number): number => 1979 + Math.ceil(week / 52);
const k = (n: number): string => `${Math.round(n / 1000).toLocaleString('es-ES')}k`;
const pad = (s: string, n: number): string => s.padEnd(n);
const padL = (s: string, n: number): string => s.padStart(n);

interface Metrics {
  end: GameState;
  /** Etapa → primera semana en que se alcanzó. */
  stageWeek: Record<number, number>;
  /** Era → capital al final de esa era (último visto). */
  eraCapital: Partial<Record<string, number>>;
  bankruptWeek: number | null;
}

function run(phil: Philosophy): Metrics {
  let state = createInitialState(BOT_SEED);
  let gamesStarted = 0;
  const stageWeek: Record<number, number> = { [state.studio.scaleStage]: state.week };
  const eraCapital: Partial<Record<string, number>> = {};
  while (state.week < FINAL_WEEK && state.gameOver === null) {
    const step = botDecide(state, phil, gamesStarted);
    state = step.state;
    gamesStarted = step.gamesStarted;
    state = tick(state);
    if (stageWeek[state.studio.scaleStage] === undefined) {
      stageWeek[state.studio.scaleStage] = state.week;
    }
    eraCapital[state.era] = state.studio.capital;
  }
  return {
    end: state,
    stageWeek,
    eraCapital,
    bankruptWeek: state.gameOver ? state.gameOver.week : null,
  };
}

/** ROI por tamaño: Σ ingreso neto ÷ Σ coste atribuible (docs/20 W8, entrada 10.2). */
function roiBySize(state: GameState) {
  const acc = new Map<ProjectSize, { revenue: number; cost: number; count: number; review: number }>();
  for (const g of state.releasedGames) {
    const advance = g.publisherAdvance ?? 0;
    const cost = g.cost ?? 0;
    const cur = acc.get(g.size) ?? { revenue: 0, cost: 0, count: 0, review: 0 };
    // Ingreso neto que vio el estudio (ventas netas de royalty/publisher) + el
    // adelanto (dinero real). El coste es el atribuible (dev+licencia+mkt propio).
    cur.revenue += g.totalRevenue + advance;
    cur.cost += cost;
    cur.count += 1;
    cur.review += g.review;
    acc.set(g.size, cur);
  }
  return acc;
}

function reviewByEra(state: GameState): Partial<Record<string, { avg: number; n: number }>> {
  const byEra: Record<string, number[]> = {};
  for (const g of state.releasedGames) {
    (byEra[eraForWeek(g.releaseWeek)] ??= []).push(g.review);
  }
  const out: Partial<Record<string, { avg: number; n: number }>> = {};
  for (const era of ERAS) {
    const arr = byEra[era];
    if (arr && arr.length > 0) {
      out[era] = { avg: arr.reduce((a, b) => a + b, 0) / arr.length, n: arr.length };
    }
  }
  return out;
}

const profiles: { phil: Philosophy; m: Metrics }[] = [INDIE, FACTORY, STUDIO, OPTIMIZER].map(
  (phil) => ({ phil, m: run(phil) }),
);

// --- 1. Etapa de escala: era/semana en que se alcanza cada una ----------------
console.log('\n═══ 1. ESCALA — era/semana (año) en que se alcanza cada etapa ═══');
console.log(
  pad('perfil', 16) + STAGE_NAMES.slice(2).map((s) => padL(s, 16)).join(''),
);
for (const { phil, m } of profiles) {
  const cells = [2, 3, 4, 5].map((stage) => {
    const w = m.stageWeek[stage];
    if (w === undefined) return padL('—', 16);
    return padL(`${eraForWeek(w)} s${w} (${yearOf(w)})`, 16);
  });
  console.log(pad(phil.name, 16) + cells.join(''));
}

// --- 2. Capital por era -------------------------------------------------------
console.log('\n═══ 2. CAPITAL al cierre de cada era (💰) ═══');
console.log(pad('perfil', 16) + ERAS.map((e) => padL(e, 11)).join(''));
for (const { phil, m } of profiles) {
  const cells = ERAS.map((e) => padL(m.eraCapital[e] !== undefined ? k(m.eraCapital[e]!) : '—', 11));
  console.log(pad(phil.name, 16) + cells.join(''));
}

// --- 3. ROI por tamaño de proyecto (ingreso neto ÷ coste total) ---------------
console.log('\n═══ 3. ROI por tamaño = Σ ingreso neto ÷ Σ coste atribuible (entrada 10.2) ═══');
console.log('  (× = veces el coste; n = lanzamientos; r = nota media del tamaño)');
console.log(pad('perfil', 16) + SIZES.map((s) => padL(SIZE_LABEL[s], 18)).join(''));
for (const { phil, m } of profiles) {
  const acc = roiBySize(m.end);
  const cells = SIZES.map((s) => {
    const d = acc.get(s);
    if (!d || d.cost === 0) return padL(d ? `n${d.count} (sin coste)` : '—', 18);
    const roi = d.revenue / d.cost;
    return padL(`${roi.toFixed(2)}× n${d.count} r${Math.round(d.review / d.count)}`, 18);
  });
  console.log(pad(phil.name, 16) + cells.join(''));
}

// --- 4. Nota media de reseñas por era -----------------------------------------
console.log('\n═══ 4. NOTA MEDIA de reseñas por era (n = lanzamientos) ═══');
console.log(pad('perfil', 16) + ERAS.map((e) => padL(e, 11)).join(''));
for (const { phil, m } of profiles) {
  const byEra = reviewByEra(m.end);
  const cells = ERAS.map((e) => {
    const d = byEra[e];
    return padL(d ? `${Math.round(d.avg)} (${d.n})` : '—', 11);
  });
  console.log(pad(phil.name, 16) + cells.join(''));
}

// --- 5. Resumen final ---------------------------------------------------------
console.log('\n═══ 5. RESUMEN final ═══');
for (const { phil, m } of profiles) {
  const s = m.end;
  const rev = s.releasedGames.reduce((a, g) => a + g.totalRevenue, 0);
  const masterpieces = s.releasedGames.filter((g) => g.review >= 85).length;
  const corpWeek = m.stageWeek[5];
  const corpNote =
    corpWeek !== undefined
      ? `Corp en ${eraForWeek(corpWeek)} s${corpWeek} (${yearOf(corpWeek)})`
      : 'nunca Corp';
  console.log(
    `${pad(phil.name, 16)} → ${padL(k(s.studio.capital), 8)} 💰 · etapa ${
      s.studio.scaleStage
    } · ${corpNote} · ${s.releasedGames.length} juegos · ${k(rev)} ingresos · ` +
      `rep ${Math.round(aggregateReputation(s.studio.reputation))} · ${masterpieces}×85+ · ` +
      `${s.stats.scandalCount} escándalos${m.bankruptWeek ? ` · QUIEBRA s${m.bankruptWeek}` : ''}`,
  );
}
