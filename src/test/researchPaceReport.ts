/**
 * Informe del RITMO DE INVESTIGACIÓN — Fase 10.3 (docs/20 W6). La regla de la
 * fase es que ampliar el catálogo de features NO puede diluir la economía de
 * 💡: "más objetivos con los mismos puntos hace que todo se sienta lejano".
 * Este arnés es la vara con la que se mide ese "antes y después".
 * Herramienta de playtest, no un test:
 *
 *   npx vite-node src/test/researchPaceReport.ts
 *
 * Mide, con los 4 perfiles de docs/08 §8 y semilla fija:
 * 1. SEMANA DE COMPRA de cada nodo del árbol (y su Δ respecto al inicio de su
 *    era: cuánto tarda el estudio en poder pagarlo desde que se habilita).
 * 2. FEATURES GATEADAS POR I+D: en qué semana quedan disponibles y cuánto
 *    tardan desde que su era llegó — el "¿en cuántas semanas desbloquea un
 *    jugador medio las features clave de su era?" del enunciado.
 * 3. ECONOMÍA DE 💡 POR ERA: puntos generados, gastados y saldo — para ver si
 *    el cuello de botella es el precio o la generación.
 * 4. CATÁLOGO DISPONIBLE por era (features utilizables al entrar y al salir).
 */
import { eraForWeek, eras } from '../data/eras';
import { features } from '../data/features';
import { researchNodes } from '../data/research';
import { createInitialState } from '../core/engine/initialState';
import { tick } from '../core/engine/tick';
import type { EraId } from '../core/model/era';
import type { GameState } from '../core/model/gameState';
import { availableFeatures } from '../core/systems/unlocks';
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

const ERAS: readonly EraId[] = eras.map((e) => e.id);
const eraStart = (id: EraId): number => eras.find((e) => e.id === id)?.startWeek ?? 1;
const pad = (s: string, n: number): string => s.padEnd(n);
const padL = (s: string, n: number): string => s.padStart(n);
const dash = (n: number | undefined): string => (n === undefined ? '—' : String(n));

interface EraPoints {
  gained: number;
  spent: number;
  endBalance: number;
}

interface Metrics {
  /** Semana en la que se compró cada nodo (undefined = nunca). */
  nodeWeek: Record<string, number>;
  /** Semana en la que cada feature quedó DISPONIBLE (era + investigación). */
  featureWeek: Record<string, number>;
  /** Nº de features disponibles al entrar en cada era y al salir. */
  catalogAtEraStart: Partial<Record<EraId, number>>;
  catalogAtEraEnd: Partial<Record<EraId, number>>;
  points: Record<string, EraPoints>;
  end: GameState;
}

function run(phil: Philosophy): Metrics {
  let state = createInitialState(BOT_SEED);
  let gamesStarted = 0;
  const nodeWeek: Record<string, number> = {};
  const featureWeek: Record<string, number> = {};
  const catalogAtEraStart: Partial<Record<EraId, number>> = {};
  const catalogAtEraEnd: Partial<Record<EraId, number>> = {};
  const points: Record<string, EraPoints> = {};

  while (state.week < FINAL_WEEK && state.gameOver === null) {
    const pre = state;
    const era = eraForWeek(pre.week);
    const P = (points[era] ??= { gained: 0, spent: 0, endBalance: 0 });
    const prePoints = pre.research.points;

    const step = botDecide(pre, phil, gamesStarted);
    gamesStarted = step.gamesStarted;
    const post = tick(step.state);

    // El bot gasta ANTES del tick (botDecide) y el tick GENERA: separar los dos
    // flujos da la economía real de 💡 sin confundir precio con generación.
    P.spent += Math.max(0, prePoints - step.state.research.points);
    P.gained += Math.max(0, post.research.points - step.state.research.points);
    P.endBalance = post.research.points;

    for (const id of post.research.unlocked) nodeWeek[id] ??= post.week;
    for (const f of availableFeatures(post)) featureWeek[f.id] ??= post.week;
    catalogAtEraStart[post.era] ??= availableFeatures(post).length;
    catalogAtEraEnd[post.era] = availableFeatures(post).length;

    state = post;
  }
  return { nodeWeek, featureWeek, catalogAtEraStart, catalogAtEraEnd, points, end: state };
}

const PROFILES: readonly (readonly [string, Philosophy])[] = [
  ['Indie', INDIE],
  ['Fábrica', FACTORY],
  ['Equilibrado', STUDIO],
  ['Optimizador', OPTIMIZER],
];

const results = PROFILES.map(([name, phil]) => [name, run(phil)] as const);

console.log('═'.repeat(96));
console.log('RITMO DE INVESTIGACIÓN — 10.3 W6 · semilla', BOT_SEED, '· hasta la semana', FINAL_WEEK);
console.log('═'.repeat(96));

// 1. Nodos: semana de compra y retraso respecto a la habilitación por era.
console.log('\n1. NODOS DEL ÁRBOL — semana de compra (Δ = semanas desde que su era lo habilita)\n');
console.log(
  pad('nodo', 26) +
    padL('era', 4) +
    padL('💡', 5) +
    PROFILES.map(([n]) => padL(n, 18)).join(''),
);
for (const node of researchNodes) {
  const row = results.map(([, m]) => {
    const w = m.nodeWeek[node.id];
    if (w === undefined) return padL('—', 18);
    return padL(`s${w} (Δ${w - eraStart(node.era)})`, 18);
  });
  console.log(pad(node.name, 26) + padL(node.era, 4) + padL(String(node.cost), 5) + row.join(''));
}

// 2. Features gateadas por I+D: cuánto tardan desde que su era llegó.
console.log('\n2. FEATURES GATEADAS POR I+D — semana de disponibilidad (Δ desde el inicio de su era)\n');
console.log(
  pad('feature', 26) + padL('era', 4) + PROFILES.map(([n]) => padL(n, 18)).join(''),
);
for (const f of features.filter((f) => f.requiresResearch !== undefined)) {
  const row = results.map(([, m]) => {
    const w = m.featureWeek[f.id];
    if (w === undefined) return padL('—', 18);
    return padL(`s${w} (Δ${w - eraStart(f.appearsInEra)})`, 18);
  });
  console.log(pad(f.name, 26) + padL(f.appearsInEra, 4) + row.join(''));
}

// 3. Economía de 💡 por era.
console.log('\n3. ECONOMÍA DE 💡 POR ERA — generados / gastados (saldo al cerrar la era)\n');
console.log(pad('perfil', 14) + ERAS.map((e) => padL(e, 20)).join(''));
for (const [name, m] of results) {
  const row = ERAS.map((era) => {
    const p = m.points[era];
    if (!p) return padL('—', 20);
    return padL(`${Math.round(p.gained)}/${Math.round(p.spent)} (${Math.round(p.endBalance)})`, 20);
  });
  console.log(pad(name, 14) + row.join(''));
}

// 4. Catálogo de features disponible por era.
console.log('\n4. FEATURES DISPONIBLES — al entrar en la era → al salir (de', features.length, 'del catálogo)\n');
console.log(pad('perfil', 14) + ERAS.map((e) => padL(e, 12)).join(''));
for (const [name, m] of results) {
  const row = ERAS.map((era) => {
    const a = m.catalogAtEraStart[era];
    const b = m.catalogAtEraEnd[era];
    return padL(a === undefined ? '—' : `${dash(a)}→${dash(b)}`, 12);
  });
  console.log(pad(name, 14) + row.join(''));
}

console.log('\n5. CIERRE — nodos comprados / temas / puntos sin gastar\n');
for (const [name, m] of results) {
  console.log(
    `${pad(name, 14)} nodos ${padL(String(m.end.research.unlocked.length), 2)}/${researchNodes.length}` +
      ` · temas ${padL(String((m.end.research.themes ?? []).length), 2)}` +
      ` · 💡 sin gastar ${padL(String(Math.round(m.end.research.points)), 4)}` +
      ` · era final ${m.end.era} (s${m.end.week})`,
  );
}
