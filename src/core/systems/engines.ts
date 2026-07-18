import { balance } from '../../data/balance';
import {
  engineCapabilities,
  getEngineCapability,
  getLicensedEngine,
  licensedEngines,
} from '../../data/engines';
import { eraAtLeast } from '../../data/eras';
import { getGenre } from '../../data/genres';
import { appendLog } from '../engine/log';
import type {
  EngineBuild,
  EngineCapabilityId,
  LicensedEngineDef,
  OwnedEngine,
} from '../model/engine';
import type { EraId } from '../model/era';
import type { GameState } from '../model/gameState';
import type { ProjectSize } from '../model/project';

/**
 * Sistema de motores (Fase 9.2, docs/19 §9.2): el motor es el término
 * tecnológico del techo dinámico (docs/03 §3.1) y decide plataformas,
 * features y royalty. Construir uno propio cuesta 💰 + 💡 + semanas de
 * calendario; licenciar uno de terceros es inmediato pero paga royalty sobre
 * cada venta. Los motores ENVEJECEN de forma emergente: su nivel es fijo y la
 * demanda de la era sube (balance.quality.ceiling.engine.demandByEra).
 * Todo puro y determinista; los números en data/balance.ts.
 */

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Lectura segura de las tablas por generación de balance.engines. */
const byGen = (table: Record<number, number>, generation: number): number =>
  table[generation] ?? 0;

/** Vista uniforme del motor de un proyecto, venga de donde venga. */
export interface ResolvedEngine {
  kind: 'artesanal' | 'propio' | 'licenciado';
  /** null solo para el artesanal. */
  id: string | null;
  name: string;
  generation: number;
  techLevel: number;
  capabilities: EngineCapabilityId[];
  /** Royalty sobre ingresos brutos (solo licenciados; 0 en el resto). */
  royaltyPct: number;
  /** Cuota de integración por juego (solo licenciados). */
  upfrontFee: number;
  /** Herramientas: bonus de output del equipo del proyecto que lo usa. */
  devOutputBonus: number;
}

/** El "motor" de 1980: código artesanal, nivel 0, sin capacidades. */
const ARTESANAL: ResolvedEngine = {
  kind: 'artesanal',
  id: null,
  name: 'Código artesanal',
  generation: 0,
  techLevel: 0,
  capabilities: [],
  royaltyPct: 0,
  upfrontFee: 0,
  devOutputBonus: 0,
};

export function getOwnedEngine(state: GameState, id: string): OwnedEngine {
  const engine = (state.engines ?? []).find((e) => e.id === id);
  if (!engine) throw new Error(`Motor propio desconocido: ${id}`);
  return engine;
}

/**
 * Resuelve el motor de un proyecto por id: propio (state.engines), licenciado
 * (data/engines.ts) o artesanal (null). Lanza si el id no existe en ninguno.
 */
export function resolveEngine(state: GameState, engineId?: string | null): ResolvedEngine {
  if (engineId === null || engineId === undefined) return ARTESANAL;
  const owned = (state.engines ?? []).find((e) => e.id === engineId);
  if (owned) {
    return {
      kind: 'propio',
      id: owned.id,
      name: owned.name,
      generation: owned.generation,
      techLevel: owned.techLevel,
      capabilities: owned.capabilities,
      royaltyPct: 0,
      upfrontFee: 0,
      devOutputBonus: byGen(balance.engines.devOutputByGeneration, owned.generation),
    };
  }
  const licensed = getLicensedEngine(engineId);
  return {
    kind: 'licenciado',
    id: licensed.id,
    name: licensed.name,
    generation: licensed.generation,
    techLevel: licensed.techLevel,
    capabilities: licensed.capabilities,
    royaltyPct: licensed.royaltyPct,
    upfrontFee: licensed.upfrontFee,
    devOutputBonus: byGen(balance.engines.devOutputByGeneration, licensed.generation),
  };
}

/** Catálogo licenciable disponible AHORA (era llegada y no retirado). */
export function availableLicensedEngines(state: GameState): LicensedEngineDef[] {
  return licensedEngines.filter(
    (e) =>
      eraAtLeast(state.era, e.appearsInEra) &&
      (e.retiresInEra === undefined || !eraAtLeast(state.era, e.retiresInEra)),
  );
}

// ---------------------------------------------------------------------------
// Adecuación: el término tecnológico del techo dinámico (docs/03 §3.1)
// ---------------------------------------------------------------------------

/**
 * Demanda tecnológica de un proyecto (docs/19 §9.2): lo que la ÉPOCA exige a
 * ESTE juego. Escala con la era (el envejecimiento emergente), con el tamaño
 * (el AAA pide motor puntero) y con la dependencia técnica del género (el
 * narrativo depende menos del motor que el shooter).
 */
export function engineDemand(era: EraId, size: ProjectSize, genreId: string): number {
  const e = balance.quality.ceiling.engine;
  const genreDep = e.genreDepBase + e.genreDepSpan * getGenre(genreId).idealTech;
  return e.demandByEra[era] * e.sizeFactor[size] * genreDep;
}

/**
 * Adecuación 0..1 del motor a un proyecto: nivel / demanda. Demanda 0 (E1) =
 * sin expectativa, adecuación completa — en 1980 el código artesanal basta.
 */
export function engineAdequacy01(
  state: GameState,
  engineId: string | null | undefined,
  size: ProjectSize,
  genreId: string,
): number {
  const demand = engineDemand(state.era, size, genreId);
  if (demand <= 0) return 1;
  return clamp01(resolveEngine(state, engineId).techLevel / demand);
}

/**
 * Adecuación de REFERENCIA para la ficha del taller (UI): cómo de al día está
 * un motor frente a la época, medido contra un proyecto grande de dependencia
 * técnica media (idealTech 0.5). La adecuación real de cada juego se calcula
 * al concebir con su tamaño y género (engineAdequacy01).
 */
export function engineReferenceAdequacy01(
  state: GameState,
  engineId?: string | null,
): number {
  const e = balance.quality.ceiling.engine;
  const demand =
    e.demandByEra[state.era] * e.sizeFactor.grande * (e.genreDepBase + e.genreDepSpan * 0.5);
  if (demand <= 0) return 1;
  return clamp01(resolveEngine(state, engineId).techLevel / demand);
}

/** Semáforo de adecuación para la concepción (visible SIEMPRE: es tu taller). */
export type AdequacyBand = 'verde' | 'ambar' | 'rojo';

export function adequacyBand(adequacy: number): AdequacyBand {
  const m = balance.engines.adequacyMeter;
  if (adequacy >= m.verde) return 'verde';
  if (adequacy >= m.ambar) return 'ambar';
  return 'rojo';
}

/** Plataformas simultáneas que permite un motor (1 sin capacidades de kit). */
export function engineMaxPlatforms(state: GameState, engineId?: string | null): number {
  return resolveEngine(state, engineId).capabilities.reduce(
    (max, id) => Math.max(max, getEngineCapability(id).maxPlatforms ?? 1),
    1,
  );
}

/** ¿El motor del proyecto tiene la capacidad? (features gateadas, docs/19 §9.2). */
export function engineHasCapability(
  state: GameState,
  engineId: string | null | undefined,
  capability: EngineCapabilityId,
): boolean {
  return resolveEngine(state, engineId).capabilities.includes(capability);
}

// ---------------------------------------------------------------------------
// Construir y mejorar motores propios (💰 + 💡 + semanas)
// ---------------------------------------------------------------------------

/**
 * Generación máxima construible HOY: los nodos de arquitectura la desbloquean
 * (balance.engines.generationGate) y la era la acota (nunca por delante de su
 * número: no se construye un motor de 2016 en 1995).
 */
export function maxBuildableGeneration(state: GameState): number {
  const gate = balance.engines.generationGate;
  let byNodes: number = gate.base;
  for (const [nodeId, gen] of Object.entries(gate)) {
    if (nodeId !== 'base' && state.research.unlocked.includes(nodeId)) {
      byNodes = Math.max(byNodes, gen);
    }
  }
  const eraNumber = Number(state.era.slice(1));
  return Math.min(byNodes, eraNumber);
}

/** ¿La capacidad se puede construir hoy? (era llegada + nodo investigado). */
export function capabilityBuildable(state: GameState, capability: EngineCapabilityId): boolean {
  const def = getEngineCapability(capability);
  if (!eraAtLeast(state.era, def.era)) return false;
  if (def.requiresNode && !state.research.unlocked.includes(def.requiresNode)) return false;
  return true;
}

/** Capacidades construibles hoy, para el taller de la UI. */
export function buildableCapabilities(state: GameState): EngineCapabilityId[] {
  return engineCapabilities.filter((c) => capabilityBuildable(state, c.id)).map((c) => c.id);
}

export interface EngineBuildCost {
  money: number;
  points: number;
  weeks: number;
}

/**
 * Coste de una obra: base de la generación + sobrecoste de cada capacidad
 * NUEVA. Mejorar un motor existente (upgradeOf) paga la fracción
 * upgradeFactor — amortizar el activo tiene premio (docs/19 §9.2).
 */
export function engineBuildCost(
  state: GameState,
  generation: number,
  capabilities: EngineCapabilityId[],
  upgradeOf?: string | null,
): EngineBuildCost {
  const e = balance.engines;
  const existing = upgradeOf ? getOwnedEngine(state, upgradeOf) : null;
  const newCaps = capabilities.filter((id) => !existing?.capabilities.includes(id));
  let money = byGen(e.moneyByGeneration, generation);
  let points = byGen(e.pointsByGeneration, generation);
  let weeks = byGen(e.weeksByGeneration, generation);
  for (const id of newCaps) {
    const cap = getEngineCapability(id);
    money += cap.buildCostMoney;
    points += cap.buildCostPoints;
  }
  if (existing) {
    money = Math.round(money * e.upgradeFactor);
    points = Math.round(points * e.upgradeFactor);
    weeks = Math.round(weeks * e.upgradeFactor);
  }
  return { money, points, weeks };
}

/** Nivel tecnológico resultante: base de la generación + capacidades. */
export function engineTechLevel(
  generation: number,
  capabilities: EngineCapabilityId[],
): number {
  const base = byGen(balance.engines.baseLevelByGeneration, generation);
  return base + capabilities.reduce((sum, id) => sum + getEngineCapability(id).techBonus, 0);
}

/** Lo que el jugador decide al encargar una obra (acción startEngineBuild). */
export interface EngineBuildSpec {
  /** Mejora de un motor existente, o null/undefined para obra nueva. */
  upgradeOf?: string | null;
  /** Nombre del motor nuevo (las mejoras conservan el suyo). */
  name?: string;
  generation: number;
  capabilities: EngineCapabilityId[];
}

/**
 * Motivo por el que una obra no puede encargarse, o null si puede. Único
 * punto de verdad: startEngineBuild valida con esto y la UI lo muestra
 * (docs/08 §6: la UI no calcula reglas).
 */
export function engineBuildBlockReason(state: GameState, spec: EngineBuildSpec): string | null {
  if (state.engineBuild) return 'Ya hay una obra de motor en curso';
  const maxGen = maxBuildableGeneration(state);
  if (spec.generation < 1 || !Number.isInteger(spec.generation)) {
    return 'Generación inválida';
  }
  if (spec.generation > maxGen) {
    return `Tu arquitectura llega hasta la generación ${maxGen} (investiga más o espera a la era)`;
  }
  const existing = spec.upgradeOf ? getOwnedEngine(state, spec.upgradeOf) : null;
  if (existing && spec.generation < existing.generation) {
    return 'Una mejora no puede bajar de generación';
  }
  if (existing) {
    const dropped = existing.capabilities.filter((id) => !spec.capabilities.includes(id));
    if (dropped.length > 0) return 'Una mejora conserva las capacidades del motor';
  }
  // Solo las capacidades NUEVAS exigen su nodo/era: las que el motor ya tiene
  // se conservan sin re-validar (p. ej. las heredadas por la migración v13).
  for (const id of spec.capabilities) {
    if (existing?.capabilities.includes(id)) continue;
    if (!capabilityBuildable(state, id)) {
      return `La capacidad ${getEngineCapability(id).name} aún no está a tu alcance (era o I+D)`;
    }
  }
  const cost = engineBuildCost(state, spec.generation, spec.capabilities, spec.upgradeOf);
  if (state.studio.capital < cost.money) return 'No hay caja para la obra';
  if (state.research.points < cost.points) return `Faltan puntos de investigación (${cost.points} 💡)`;
  if (!existing && (spec.name ?? '').trim() === '') return 'El motor necesita un nombre';
  return null;
}

/**
 * Acción: encargar la obra de un motor (nuevo o mejora). Paga 💰 + 💡 por
 * adelantado; el tick descuenta las semanas (advanceEngineBuild) y al
 * terminar el motor aparece/asciende en state.engines. Una obra a la vez.
 */
export function startEngineBuild(state: GameState, spec: EngineBuildSpec): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const blocked = engineBuildBlockReason(state, spec);
  if (blocked) throw new Error(blocked);

  const existing = spec.upgradeOf ? getOwnedEngine(state, spec.upgradeOf) : null;
  const cost = engineBuildCost(state, spec.generation, spec.capabilities, spec.upgradeOf);
  const build: EngineBuild = {
    upgradeOf: existing?.id ?? null,
    name: existing?.name ?? (spec.name ?? '').trim(),
    generation: spec.generation,
    capabilities: [...spec.capabilities],
    weeksLeft: cost.weeks,
    totalWeeks: cost.weeks,
  };
  const next: GameState = {
    ...state,
    studio: { ...state.studio, capital: state.studio.capital - cost.money },
    research: { ...state.research, points: state.research.points - cost.points },
    engineBuild: build,
  };
  return appendLog(
    next,
    'investigacion',
    existing
      ? `🔧 Empieza la mejora de «${build.name}» a la generación ${build.generation} (${cost.weeks} semanas).`
      : `🔧 Empieza la obra del motor «${build.name}» (gen ${build.generation}, ${cost.weeks} semanas).`,
  );
}

/**
 * Tick semanal de la obra (docs/08 §4): descuenta una semana y, al terminar,
 * estrena el motor (o consolida la mejora). El coste ya se pagó al encargar.
 */
export function advanceEngineBuild(state: GameState): GameState {
  const build = state.engineBuild ?? null;
  if (!build) return state;
  const weeksLeft = build.weeksLeft - 1;
  if (weeksLeft > 0) {
    return { ...state, engineBuild: { ...build, weeksLeft } };
  }

  const engines = state.engines ?? [];
  const techLevel = engineTechLevel(build.generation, build.capabilities);
  let nextEngines: OwnedEngine[];
  if (build.upgradeOf) {
    nextEngines = engines.map((e) =>
      e.id === build.upgradeOf
        ? {
            ...e,
            generation: build.generation,
            techLevel,
            capabilities: [...build.capabilities],
            builtWeek: state.week,
          }
        : e,
    );
  } else {
    const id = `motor-${engines.length + 1}-${state.week}`;
    nextEngines = [
      ...engines,
      {
        id,
        name: build.name,
        generation: build.generation,
        techLevel,
        capabilities: [...build.capabilities],
        builtWeek: state.week,
      },
    ];
  }
  const next: GameState = { ...state, engines: nextEngines, engineBuild: null };
  return appendLog(
    next,
    'investigacion',
    build.upgradeOf
      ? `🔧 «${build.name}» estrena su generación ${build.generation}: el motor vuelve a estar a la altura.`
      : `🔧 El motor «${build.name}» está listo (gen ${build.generation}).`,
  );
}
