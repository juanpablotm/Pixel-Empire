import { balance } from '../../data/balance';
import { getDevPhase } from '../../data/devPhases';
import { chosenVariantSibling, featureGenreAffinity, getFeature } from '../../data/features';
import { getGenre } from '../../data/genres';
import { defaultMonetization, getMonetizationModel } from '../../data/monetization';
import { getPlatform } from '../../data/platforms';
import { getTheme } from '../../data/themes';
import { appendLog } from '../engine/log';
import { makeRng, type Rng } from '../engine/rng';
import type { Feature } from '../model/content';
import type { GameState } from '../model/gameState';
import type { MonetizationConfig } from '../model/moral';
import type {
  Audience,
  DevPhaseNumber,
  FocusAllocation,
  Project,
  ProjectSize,
} from '../model/project';
import type { ReleasedGame } from '../model/release';
import { applyReleaseCommunityEffects } from './community';
import {
  activeFeverFor,
  buildFever,
  clampHype,
  computeSegmentReviews,
  effectiveSaturation,
  overHypeGap,
  platformAvailable,
  registerReleaseSaturation,
} from './market';
import { applyReleaseMoralEffects, lootBoxesBanned } from './morale';
import { computeCeilingContext } from './maturity';
import { computeQuality } from './quality';
import { contestedWindowAt } from './rivals';
import {
  addReleaseResearchPoints,
  capabilityBonus,
  learnFeatureInsights,
  themeResearchStatus,
} from './research';
import { engineHasCapability, engineMaxPlatforms, resolveEngine } from './engines';
import { getLicensedEngine, isLicensedEngineId } from '../../data/engines';

/** Cuota por juego de un motor licenciado; 0 para propios/artesanal. */
function getLicensedEngineFeeOrZero(engineId: string): number {
  return isLicensedEngineId(engineId) ? getLicensedEngine(engineId).upfrontFee : 0;
}
import { withReputationDeltas } from './reputation';
import { buildReviewLines, reviewVerdict } from './review';
import {
  applyReleaseMorale,
  computeTeamFactor,
  computeTeamOutput,
  teamInnovationBonus,
} from './staff';
import {
  featureAvailable,
  genreAvailable,
  monetizationFlagAvailable,
  themeAvailable,
} from './unlocks';
import { getTrait } from '../../data/traits';
import { eraAtLeast } from '../../data/eras';
import { sizeBlockedLabels } from '../../data/reviewTexts';
import { stageLabels } from '../../data/staffTexts';
import type { Employee } from '../model/staff';

/**
 * Ciclo de vida del proyecto (docs/02 §2): concepción → 3 fases de desarrollo →
 * lanzamiento. Acciones puras del jugador + integración en el tick. Desde la
 * Fase 6 puede haber varios proyectos en paralelo (docs/02 §4: el aforo lo
 * pone la etapa de escala) y el contenido está gateado por era e
 * investigación (docs/02 §3 y §5).
 */

/** Lo que el jugador decide en la pantalla de concepción (docs/02 paso 1). */
export interface ProjectConcept {
  name: string;
  themeId: string;
  genreId: string;
  /** Plataforma principal (o la única). */
  platformId: string;
  /**
   * Plataformas del lanzamiento (Fase 9.2): si se pasa, la primera debe ser
   * platformId y el número lo limita el motor (bi/multiplataforma). Si se
   * omite, [platformId].
   */
  platformIds?: string[];
  /**
   * Motor del proyecto (Fase 9.2): propio, licenciado o null/omitido =
   * código artesanal. Los licenciados cobran su cuota al concebir y su
   * royalty sobre cada venta.
   */
  engineId?: string | null;
  audience: Audience;
  size: ProjectSize;
  /**
   * Precio elegido (docs/06 §2: palanca moral). Si se omite, el recomendado
   * por tamaño. Debe caer dentro del rango de balance.economy.pricing.
   */
  price?: number;
  /** Modelo de negocio (docs/09 §9). Si se omite, premium honesto. */
  monetization?: MonetizationConfig;
}

/** Proyecto por id; sin id, el primero en curso (compatibilidad mono-proyecto). */
export function findProject(state: GameState, projectId?: string): Project {
  const project =
    projectId === undefined
      ? state.projects[0]
      : state.projects.find((p) => p.id === projectId);
  if (!project) throw new Error('No hay proyecto en desarrollo');
  return project;
}

/** Reemplaza un proyecto en la lista sin mutar (multi-proyecto, docs/02 §4). */
function withProject(state: GameState, updated: Project): GameState {
  return {
    ...state,
    projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
  };
}

/** Proyectos en paralelo permitidos por la etapa de escala (docs/02 §4). */
export function projectCap(state: GameState): number {
  return balance.staff.scale.projectCapByStage[state.studio.scaleStage];
}

/**
 * Motivo estructural por el que un tamaño de proyecto está bloqueado, o null si
 * se puede elegir (docs/17 E1). Cada tamaño exige una etapa de escala mínima
 * (el AAA, Corporación) y una plantilla mínima; se muestra el requisito que
 * falte, priorizando la etapa. Único punto de verdad: startProject lo valida y
 * la UI lo muestra atenuando el botón (docs/08 §6: la UI no calcula reglas).
 */
export function sizeBlockReason(state: GameState, size: ProjectSize): string | null {
  const gate = balance.development.sizeGate[size];
  if (state.studio.scaleStage < gate.minStage) {
    return sizeBlockedLabels.stage(stageLabels[gate.minStage]);
  }
  if (state.staff.length < gate.minStaff) {
    return sizeBlockedLabels.staff(gate.minStaff);
  }
  return null;
}

/**
 * Valida una configuración de monetización (docs/09 §9): el modelo y sus
 * añadidos deben existir ya en esta era (docs/02 §5), las MTX exigen un
 * modelo con tienda, el DLC day-one un modelo con DLC, y la regulación puede
 * haber prohibido las loot boxes (docs/06 §5).
 */
function validateMonetization(state: GameState, config: MonetizationConfig): void {
  const model = getMonetizationModel(config.model);
  if (!eraAtLeast(state.era, model.appearsInEra)) {
    throw new Error(`El modelo ${model.name} aún no existe en esta era (llega en ${model.appearsInEra})`);
  }
  if (config.aggressiveness < 0 || config.aggressiveness > 1) {
    throw new Error('La agresividad de monetización debe estar entre 0 y 1');
  }
  if ((config.hasLootBoxes || config.hasBattlePass || config.aggressiveness > 0) && !model.supportsMtx) {
    throw new Error(`El modelo ${model.name} no admite microtransacciones`);
  }
  if (config.dayOneDLC && !model.supportsDayOneDlc) {
    throw new Error(`El modelo ${model.name} no admite DLC day-one`);
  }
  if (config.hasLootBoxes && !monetizationFlagAvailable(state, 'lootBoxes')) {
    throw new Error('Las loot boxes aún no se han inventado (llegan en la era digital)');
  }
  if (config.hasBattlePass && !monetizationFlagAvailable(state, 'battlePass')) {
    throw new Error('El pase de batalla aún no se ha inventado (llega con los servicios)');
  }
  if (config.hasLootBoxes && lootBoxesBanned(state)) {
    throw new Error('Las loot boxes están prohibidas por ley (docs/06 §5)');
  }
}

/** Reparto uniforme entre los aspectos de una fase (valor por defecto). */
function evenAllocation(phase: DevPhaseNumber): FocusAllocation {
  const aspects = getDevPhase(phase).aspects;
  const share = 1 / aspects.length;
  return Object.fromEntries(aspects.map((a) => [a.id, share]));
}

/** Normaliza un reparto para que sume 1; si todo es 0, reparte uniforme. */
function normalizeAllocation(phase: DevPhaseNumber, allocation: FocusAllocation): FocusAllocation {
  const aspects = getDevPhase(phase).aspects;
  const total = aspects.reduce((sum, a) => sum + Math.max(0, allocation[a.id] ?? 0), 0);
  if (total <= 0) return evenAllocation(phase);
  return Object.fromEntries(aspects.map((a) => [a.id, Math.max(0, allocation[a.id] ?? 0) / total]));
}

/** Semanas de cada fase del proyecto; las features alargan la Producción (fase 2). */
export function phaseWeeks(project: Project): [number, number, number] {
  const base = balance.development.phaseWeeksBySize[project.size];
  const extra = project.chosenFeatureIds.reduce(
    (sum, id) => sum + getFeature(id).timeCostWeeks,
    0,
  );
  return [base, base + extra, base];
}

export function projectTotalWeeks(project: Project): number {
  const [a, b, c] = phaseWeeks(project);
  return a + b + c;
}

/** Progreso 0..1 para la UI (docs/09: Project.progress, derivado). */
export function projectProgress(project: Project): number {
  return Math.min(1, project.weeksSpent / projectTotalWeeks(project));
}

/**
 * Estimación de duración y coste para la pantalla de concepción. Acepta una o
 * varias plataformas (9.2: cada una paga su licencia) y la cuota del motor
 * licenciado si lo hay.
 */
export function estimateProject(
  size: ProjectSize,
  platformIds: string | readonly string[],
  engineUpfrontFee = 0,
): {
  weeks: number;
  cost: number;
} {
  const ids = typeof platformIds === 'string' ? [platformIds] : platformIds;
  const weeks = balance.development.phaseWeeksBySize[size] * 3;
  // Coste estimado: desarrollo (persona·semana) + licencias + coste base fijo
  // del tamaño (docs/17 E1) + cuota del motor. Sin marketing ni features (aún
  // por decidir).
  const cost =
    weeks * balance.economy.devCostPerPersonWeek +
    ids.reduce((sum, id) => sum + getPlatform(id).licenseCost, 0) +
    balance.economy.sizeBaseCost[size] +
    engineUpfrontFee;
  return { weeks, cost };
}

/**
 * Coste atribuible al juego al lanzarlo (docs/17 U4): licencia de plataforma +
 * coste base del tamaño (docs/17 E1) + desarrollo (semanas de calendario · coste
 * por persona·semana) + marketing comprado. Es el "costó" del P&L de "sale del
 * mercado". No incluye la nómina general del estudio (coste compartido entre
 * proyectos), a propósito y de forma legible (Pilar 2).
 */
export function releasedGameCost(project: Project, releaseWeek: number): number {
  // Todas las plataformas pagan licencia (9.2) y el motor licenciado, su cuota.
  const licenseCost = (project.platformIds ?? [project.platformId]).reduce(
    (sum, id) => sum + getPlatform(id).licenseCost,
    0,
  );
  // resolveEngine exige estado; aquí basta el catálogo licenciable (los
  // propios y el artesanal no cobran cuota por juego).
  const engineFee = project.engineId ? getLicensedEngineFeeOrZero(project.engineId) : 0;
  const baseCost = balance.economy.sizeBaseCost[project.size] + engineFee;
  // Las semanas en pausa no cuentan: nadie trabajó, no hay desarrollo que
  // cobrar (docs/18 V5). La nómina del estudio va aparte y ya se pagó semana a
  // semana; esta cifra es el coste atribuible AL JUEGO.
  const devWeeks = Math.max(
    0,
    releaseWeek - (project.startWeek ?? releaseWeek) - (project.pausedWeeks ?? 0),
  );
  const devCost = devWeeks * balance.economy.devCostPerPersonWeek;
  const marketingCost = project.marketingUsed.reduce(
    (sum, level) => sum + (balance.economy.marketing.levels[level]?.cost ?? 0),
    0,
  );
  return Math.round(licenseCost + baseCost + devCost + marketingCost);
}

/** Empleados sin proyecto ni I+D: el equipo por defecto de un proyecto nuevo. */
function unassignedStaff(state: GameState): Employee[] {
  const busy = new Set<string>(state.research.rdStaff);
  for (const project of state.projects) {
    for (const id of project.assignedStaff) busy.add(id);
  }
  return state.staff.filter((e) => !busy.has(e.id));
}

/**
 * Acción: empezar un proyecto nuevo (docs/02 paso 1). El aforo de proyectos
 * lo pone la etapa de escala (docs/02 §4); el contenido debe estar
 * desbloqueado por era/investigación. Precio y monetización son palancas
 * morales (docs/06 §2) y quedan fijados en la concepción. Los premios del
 * año dan hype de salida al siguiente anuncio (docs/06 §7).
 */
export function startProject(state: GameState, concept: ProjectConcept): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  if (state.projects.length >= projectCap(state)) {
    throw new Error(
      projectCap(state) === 1
        ? 'Ya hay un proyecto en desarrollo'
        : 'No caben más proyectos en paralelo en esta etapa (docs/02 §4)',
    );
  }
  const name = concept.name.trim();
  if (name === '') throw new Error('El juego necesita un nombre');
  // Validar que el contenido existe y está desbloqueado (era + investigación).
  const theme = getTheme(concept.themeId);
  const genre = getGenre(concept.genreId);
  if (!themeAvailable(state, theme)) {
    // Distingue "aún no es tu era" de "existe pero no lo has investigado" (docs/17 P1).
    throw new Error(
      themeResearchStatus(state, theme.id) === 'bloqueado'
        ? `El tema ${theme.name} aún no está disponible en esta era`
        : `El tema ${theme.name} aún no está investigado (cuesta 💡 en Investigación)`,
    );
  }
  if (!genreAvailable(state, genre)) {
    throw new Error(`El género ${genre.name} aún no está desbloqueado (era o investigación)`);
  }
  // Plataformas (9.2: puede haber varias; la primera es la principal).
  const platformIds = concept.platformIds ?? [concept.platformId];
  if (platformIds.length === 0 || platformIds[0] !== concept.platformId) {
    throw new Error('La primera plataforma debe ser la principal');
  }
  if (new Set(platformIds).size !== platformIds.length) {
    throw new Error('Plataformas repetidas en el lanzamiento');
  }
  for (const id of platformIds) {
    const p = getPlatform(id);
    if (!platformAvailable(p, state.week)) {
      throw new Error(`${p.name} no está a la venta (docs/04 §7)`);
    }
  }
  // Motor (9.2): debe existir (propio o licenciado disponible) y permitir
  // tantas plataformas como se pidan. resolveEngine lanza si el id no existe.
  const engineId = concept.engineId ?? null;
  const engine = resolveEngine(state, engineId);
  if (engine.kind === 'licenciado' && engineId !== null) {
    const def = getLicensedEngine(engineId);
    if (!eraAtLeast(state.era, def.appearsInEra)) {
      throw new Error(`${def.name} aún no existe en esta era`);
    }
    if (def.retiresInEra !== undefined && eraAtLeast(state.era, def.retiresInEra)) {
      throw new Error(`${def.name} ya está retirado del catálogo`);
    }
  }
  const maxPlatforms = engineMaxPlatforms(state, engineId);
  if (platformIds.length > maxPlatforms) {
    throw new Error(
      maxPlatforms === 1
        ? `${engine.name} solo compila para una plataforma (investiga los kits multiplataforma)`
        : `${engine.name} admite como mucho ${maxPlatforms} plataformas a la vez`,
    );
  }
  // El tamaño exige etapa de escala y plantilla mínimas (docs/17 E1): el AAA,
  // hasta ser Corporación. Mismo motivo que ve la UI (sizeBlockReason).
  const sizeBlocked = sizeBlockReason(state, concept.size);
  if (sizeBlocked) throw new Error(sizeBlocked);

  const monetization = concept.monetization ?? defaultMonetization();
  validateMonetization(state, monetization);

  const recommended = balance.economy.priceBySize[concept.size];
  const { minMultiplier, maxMultiplier } = balance.economy.pricing;
  // En F2P el precio es el valor de referencia por jugador: siempre el recomendado.
  const price = monetization.model === 'f2p' ? recommended : (concept.price ?? recommended);
  if (price < recommended * minMultiplier || price > recommended * maxMultiplier) {
    throw new Error(
      `El precio debe estar entre ${recommended * minMultiplier} y ${recommended * maxMultiplier} 💰`,
    );
  }

  const project: Project = {
    id: `proyecto-${state.projectCounter + 1}`,
    name,
    themeId: concept.themeId,
    genreId: concept.genreId,
    platformId: concept.platformId,
    platformIds,
    engineId,
    audience: concept.audience,
    size: concept.size,
    price,
    monetization,
    marketingUsed: [],
    creatorCampaign: [],
    overPromised: false,
    phase: 1,
    focus: [evenAllocation(1), evenAllocation(2), evenAllocation(3)],
    chosenFeatureIds: [],
    // Arranca con quien esté libre (sin proyecto ni I+D; docs/02 §2 paso 2).
    assignedStaff: unassignedStaff(state).map((e) => e.id),
    crunch: false,
    startWeek: state.week,
    pausedWeeks: 0,
    // Los premios del año pasado inflan el anuncio (docs/06 §7); aun así el
    // hype de salida entra clampeado a su rango (docs/17 B2).
    hype: clampHype(state.studio.awardHype),
    weeksSpent: 0,
    designPoints: 0,
    techPoints: 0,
    qaInvested: 0,
    bugDebt: 0,
  };

  // Al arrancar se pagan las licencias de TODAS las plataformas, el coste base
  // del tamaño (docs/17 E1) y la cuota del motor licenciado (9.2):
  // comprometerse con un proyecto grande cuesta de entrada.
  const upfrontCost =
    platformIds.reduce((sum, id) => sum + getPlatform(id).licenseCost, 0) +
    balance.economy.sizeBaseCost[concept.size] +
    engine.upfrontFee;
  const next: GameState = {
    ...state,
    studio: {
      ...state.studio,
      capital: state.studio.capital - upfrontCost,
      awardHype: 0,
    },
    projects: [...state.projects, project],
    projectCounter: state.projectCounter + 1,
  };
  const platformNames = platformIds.map((id) => getPlatform(id).name).join(' + ');
  return appendLog(
    next,
    'proyecto',
    `Empieza el desarrollo de «${name}» (${platformNames}, motor: ${engine.name}).`,
  );
}

/** Acción: fijar el reparto de esfuerzo de una fase (se normaliza a suma 1). */
export function setFocus(
  state: GameState,
  phase: DevPhaseNumber,
  allocation: FocusAllocation,
  projectId?: string,
): GameState {
  const project = findProject(state, projectId);
  const focus: Project['focus'] = [...project.focus];
  focus[phase - 1] = normalizeAllocation(phase, allocation);
  return withProject(state, { ...project, focus });
}

/**
 * Acción: añadir/quitar una feature. Solo durante la fase de Concepto
 * (simplificación v1 de las decisiones de features de docs/02 paso 3) y solo
 * features desbloqueadas por era/investigación (docs/02 §3). Desde 9.3 una
 * feature que NO encaja con el género mete más bugs (misfitBugMult) y elegir
 * una variante de un trade-off desmarca a su hermana (variantGroup).
 */
export function toggleFeature(state: GameState, featureId: string, projectId?: string): GameState {
  const project = findProject(state, projectId);
  if (project.phase !== 1) {
    throw new Error('Las features se deciden durante la fase de Concepto');
  }
  const feature = getFeature(featureId);
  const chosen = project.chosenFeatureIds.includes(featureId);
  if (!chosen && !featureAvailable(state, feature)) {
    throw new Error(`${feature.name} aún no está desbloqueada (era o investigación)`);
  }
  // El motor gatea features (9.2): sin la capacidad, esa tecnología no cabe
  // en este juego — se eligió motor al concebir y las features lo respetan.
  if (
    !chosen &&
    feature.requiresEngineCapability &&
    !engineHasCapability(state, project.engineId, feature.requiresEngineCapability)
  ) {
    throw new Error(
      `${feature.name} exige un motor con la capacidad adecuada (el de este proyecto no la tiene)`,
    );
  }
  // Deuda de bugs de una feature en ESTE proyecto (9.3): forzar tecnología
  // donde no pega sale cara. Simétrica al quitarla (el género no cambia).
  const featureBugDebt = (f: Feature): number =>
    f.bugRisk *
    balance.development.featureBugScale *
    (featureGenreAffinity(f, project.genreId) === 'noEncaja'
      ? balance.quality.featureAffinity.misfitBugMult
      : 1);

  let ids = project.chosenFeatureIds;
  let bugDebt = project.bugDebt;
  if (chosen) {
    ids = ids.filter((id) => id !== featureId);
    bugDebt -= featureBugDebt(feature);
  } else {
    // Variantes de un trade-off (9.3): elegir una desmarca la otra.
    const sibling = chosenVariantSibling(feature, ids);
    if (sibling) {
      ids = ids.filter((id) => id !== sibling.id);
      bugDebt -= featureBugDebt(sibling);
    }
    ids = [...ids, featureId];
    bugDebt += featureBugDebt(feature);
  }
  const next: Project = {
    ...project,
    chosenFeatureIds: ids,
    bugDebt: Math.max(0, bugDebt),
  };
  return withProject(state, next);
}

/** Cuenta lanzamientos previos con la misma combinación tema×género (innovación). */
function comboRepeats(state: GameState, themeId: string, genreId: string): number {
  return state.releasedGames.filter((g) => g.themeId === themeId && g.genreId === genreId).length;
}

/**
 * Lanzamientos del mismo combo dentro de la ventana de fatiga (Fase 9.1,
 * docs/19 §9.1): la repetición reciente cansa a público y crítica; los
 * clásicos de hace años se perdonan (el público olvida).
 */
function recentComboRepeats(state: GameState, themeId: string, genreId: string): number {
  const window = balance.market.reviews.fatigue.repeatWindowWeeks;
  return state.releasedGames.filter(
    (g) =>
      g.themeId === themeId && g.genreId === genreId && state.week - g.releaseWeek < window,
  ).length;
}

/**
 * Stream del PRNG para la banda legible de la reseña (9.1): separado del resto
 * para no alterar sus secuencias (mismo criterio que engine/tick.ts).
 */
const RELEASE_STREAM = 8 << 20;

/** Empleados de la plantilla asignados al proyecto. */
function assignedTeam(state: GameState, project: Project): Employee[] {
  return state.staff.filter((e) => project.assignedStaff.includes(e.id));
}

/**
 * Fiebre del oro (docs/19 §9.4): un lanzamiento con reseña ≥ hitFeverBar puede
 * encender una fiebre sobre su género o su tema (a suertes del PRNG), salvo que
 * ese target ya esté en fiebre. Determinista: usa el stream de la banda, ya
 * consumido para el desvío de reseña, así que estas tiradas van después.
 */
function maybeIgniteHitFever(
  state: GameState,
  project: Project,
  review: number,
  rng: Rng,
): GameState {
  const f = balance.market.fevers;
  if (review < f.hitFeverBar) return state;
  if (rng.next() >= f.hitFeverChance) return state;
  const target: 'genre' | 'theme' = rng.next() < 0.5 ? 'genre' : 'theme';
  const targetId = target === 'genre' ? project.genreId : project.themeId;
  if (activeFeverFor(state.market.fevers, target, targetId, state.week)) return state;
  const fever = buildFever(target, targetId, state.week, 'hit', rng);
  const name = target === 'genre' ? getGenre(targetId).name : getTheme(targetId).name;
  const kind = target === 'genre' ? 'del género' : 'del tema';
  const next: GameState = {
    ...state,
    market: { ...state.market, fevers: [...(state.market.fevers ?? []), fever] },
  };
  return appendLog(
    next,
    'mercado',
    `🔥 El éxito de «${project.name}» enciende una fiebre ${kind} ${name}: todo el mundo quiere más.`,
  );
}

/** Convierte el proyecto terminado en un juego lanzado con reseña y desglose. */
function releaseProject(state: GameState, project: Project): GameState {
  const team = assignedTeam(state, project);
  const teamResult = computeTeamFactor(team, project.genreId);
  // Techo dinámico (9.1): madurez del estudio, mejor talento en el rol clave,
  // adecuación del MOTOR (9.2) y encaje de alcance (core/systems/maturity.ts).
  const ceiling = computeCeilingContext(
    state,
    team,
    project.genreId,
    project.size,
    project.engineId,
  );
  const engine = resolveEngine(state, project.engineId);
  const { q, breakdown } = computeQuality(project, {
    era: state.era,
    teamFactor: teamResult.teamFactor,
    comboRepeats: comboRepeats(state, project.themeId, project.genreId),
    innovationBonus: teamInnovationBonus(team),
    ceiling,
  });
  const fullBreakdown = {
    ...breakdown,
    teamParts: {
      competenceFactor: teamResult.competenceFactor,
      moraleFactor: teamResult.moraleFactor,
      synergyFactor: teamResult.synergyFactor,
    },
  };
  // Banda legible (9.1): el gusto crítico y el humor del mercado, determinista
  // (stream propio) y siempre explicado en el desglose.
  const bandRng = makeRng(state.seed, RELEASE_STREAM + state.week);
  const banda = bandRng.int(-balance.market.reviews.band, balance.market.reviews.band);
  // El mercado transforma Q en reseñas por segmento (docs/04 §5): listón de la
  // era, moda, expectativas del hype, fatiga de fórmula, banda y sesgo de cada
  // público (incluida la monetización).
  const reviews = computeSegmentReviews({
    quality: q,
    genreId: project.genreId,
    themeId: project.themeId,
    audience: project.audience,
    hype: project.hype,
    monetization: project.monetization,
    era: state.era,
    market: state.market,
    recentRepeats: recentComboRepeats(state, project.themeId, project.genreId),
    bandOffset: banda,
  });
  const review = reviews.average;
  // Castigo por sobre-hype (docs/17 E2): si el hype entró en zona roja y el
  // juego no cumple, la brecha se cobra en la cola de ventas (aquí, fijada al
  // lanzar) y en la reputación de quienes se sienten estafados (más abajo).
  // Desde 9.1 la brecha no está acotada (marketing sin tope): la cola tiene
  // suelo (tailPenaltyCap) pero el golpe de reputación escala completo.
  const overHypeBrecha = overHypeGap(project.hype, review);
  const o = balance.market.hype.overHype;
  const overHypeTailPenalty =
    Math.round(Math.min(o.tailPenaltyCap, overHypeBrecha * o.tailPenaltyMax) * 100) / 100;
  // Reencuadre de trayectoria (9.1): tu mejor juego HASTA AHORA es un logro,
  // aunque sea un 45 — eres una persona con un casete en un garaje.
  const previousBest = state.releasedGames.reduce((best, g) => Math.max(best, g.review), 0);
  const personalBest = state.releasedGames.length === 0 || review > previousBest;
  // Ventana disputada (9.5, docs/19 §9.5): lanzar el mismo género dentro de la
  // ventana de un bombazo de gigante aplasta el pico day-one (congelado aquí,
  // como el overHypeTailPenalty). La fecha rival era pública desde su anuncio.
  const contested = contestedWindowAt(state, project.genreId, state.week);
  const rivalCrush = contested
    ? {
        rivalName: contested.rivalName,
        gameName: contested.gameName,
        penalty: balance.rivals.window.crushPenalty,
      }
    : undefined;
  const released: ReleasedGame = {
    id: project.id,
    name: project.name,
    themeId: project.themeId,
    genreId: project.genreId,
    platformId: project.platformId,
    platformIds: project.platformIds ?? [project.platformId],
    // El motor queda congelado al lanzar (9.2): el nombre para la ficha y la
    // royalty del licenciado, que se cobrará semana a semana sobre las ventas.
    engineId: project.engineId ?? null,
    engineName: engine.name,
    royaltyPct: engine.royaltyPct,
    royaltyPaid: 0,
    audience: project.audience,
    size: project.size,
    price: project.price,
    monetization: project.monetization,
    quality: q,
    review,
    reviewsBySegment: reviews.bySegment,
    reviewMarket: reviews.info,
    hypeAtRelease: project.hype,
    saturationAtRelease: effectiveSaturation(state.market, project.genreId, project.themeId),
    verdict: reviewVerdict(review),
    breakdown: fullBreakdown,
    lines: buildReviewLines(fullBreakdown, project, reviews.info),
    releaseWeek: state.week,
    weeklySales: [],
    totalUnits: 0,
    totalRevenue: 0,
    mtxRevenue: 0,
    cost: releasedGameCost(project, state.week),
    salesActive: true,
    overPromised: project.overPromised,
    overHypeTailPenalty,
    personalBest,
    previousBestReview: state.releasedGames.length > 0 ? previousBest : undefined,
    rivalCrush,
  };
  let next: GameState = {
    ...state,
    // Solo sale del tablero el proyecto lanzado; el resto sigue (docs/02 §4).
    projects: state.projects.filter((p) => p.id !== project.id),
    releasedGames: [...state.releasedGames, released],
    // El lanzamiento inunda un poco su combo género+tema (docs/04 §3); si cae
    // sobre una fiebre, la satura más rápido (9.4: inundarla la quema antes).
    market: registerReleaseSaturation(state.market, project.genreId, project.themeId, state.week),
  };
  // Fiebre del oro (docs/19 §9.4): un HIT (reseña ≥ bar) puede encender una
  // fiebre sobre su género o su tema — determinista, con el stream de la banda.
  // La disfrutan los juegos de ese género/tema lanzados durante la ventana.
  next = maybeIgniteHitFever(next, project, review, bandRng);
  next = appendLog(
    next,
    'lanzamiento',
    `«${released.name}» sale a la venta: reseña media ${review}/100.` +
      (personalBest && state.releasedGames.length > 0 ? ' ¡Tu mejor juego hasta ahora!' : ''),
  );
  // El aplastamiento siempre se nombra (Pilar 2): sabes quién te robó los focos.
  if (rivalCrush) {
    next = appendLog(
      next,
      'ventas',
      `«${released.name}» sale en plena ventana de «${rivalCrush.gameName}» de ${rivalCrush.rivalName}: su campaña aplasta tu pico de salida.`,
    );
  }
  // El sobre-hype que no cumple se paga (docs/17 E2): golpe a hardcore/comunidad
  // proporcional a la brecha; la cola de ventas ya lo lleva en overHypeTailPenalty.
  if (overHypeBrecha > 0) {
    next = {
      ...next,
      studio: withReputationDeltas(next.studio, {
        hardcore: -o.repHit.hardcore * overHypeBrecha,
        comunidad: -o.repHit.comunidad * overHypeBrecha,
      }),
    };
    next = appendLog(
      next,
      'comunidad',
      `El bombo de «${released.name}» prometía más de lo que entrega (reseña ${review}): la cola de ventas se hunde y hardcore y comunidad se sienten estafados.`,
    );
  }
  // Desarrollar también enseña: puntos 💡 por lanzamiento (docs/02 §3).
  next = addReleaseResearchPoints(next, project.size);
  // El desglose te cuenta qué features encajaban (9.3, Pilar 2): esos encajes
  // quedan aprendidos gratis — de tus propios juegos siempre aprendes.
  next = learnFeatureInsights(next, project.chosenFeatureIds, project.genreId);
  // El dilema moral pasa factura (docs/06): reputación por segmento, deuda
  // por las palancas de codicia y contadores de legado.
  next = applyReleaseMoralEffects(next, released);
  // La capa social lo dramatiza (docs/07): directos de creadores, promesa
  // inflada, feed y posibles crisis — siempre trazables al lanzamiento.
  next = applyReleaseCommunityEffects(next, released.id, project.creatorCampaign);
  // La moral del equipo reacciona al resultado (docs/05 §4).
  return applyReleaseMorale(next, review);
}

/**
 * Un proyecto TERMINADO decide su salida (Fase 9.5, docs/19 §9.5). Normalmente
 * se lanza en el acto (lo de siempre); pero si hay ventana disputada de su
 * género, queda retenido con una decisión pendiente (lanzar igual o esquivar),
 * y si el jugador ya la retrasó, espera su fecha. Las semanas retenidas
 * cuentan como pausa: nadie desarrolla (el P&L no las cobra), pero la nómina
 * corre — ese es el precio, y es visible.
 */
function resolveFinishedProject(state: GameState, project: Project): GameState {
  const hold = (): GameState =>
    withProject(state, { ...project, pausedWeeks: (project.pausedWeeks ?? 0) + 1 });

  // Retrasado a propósito: espera a que pase la ventana (docs/19 §9.5).
  if (project.delayedUntilWeek !== undefined && state.week < project.delayedUntilWeek) {
    return hold();
  }
  // A la espera de que el jugador decida (el modal pausa; los bots resuelven).
  if (project.pendingRelease !== undefined) {
    return hold();
  }
  const contested = contestedWindowAt(state, project.genreId, state.week);
  if (contested !== null) {
    const next = withProject(state, {
      ...project,
      pendingRelease: {
        rivalId: contested.rivalId,
        rivalName: contested.rivalName,
        gameName: contested.gameName,
        releaseWeek: contested.releaseWeek,
        windowEndWeek: contested.endWeek,
      },
      pausedWeeks: (project.pausedWeeks ?? 0) + 1,
    });
    return appendLog(
      next,
      'proyecto',
      `«${project.name}» está listo… pero ${contested.rivalName} lanza «${contested.gameName}» (mismo género) en la misma ventana. ¿Lanzar igual o esquivar?`,
    );
  }
  return releaseProject(state, project);
}

/** Una semana de trabajo de UN proyecto; devuelve el estado con el avance o lanzamiento. */
function advanceOneProject(state: GameState, projectId: string): GameState {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return state;

  // Terminado y retenido (9.5): no trabaja, no acumula bugs, solo espera fecha.
  if (project.weeksSpent >= projectTotalWeeks(project)) {
    return resolveFinishedProject(state, project);
  }

  const team = assignedTeam(state, project);
  // Capacidad del equipo esta semana: ~1 por persona, con las herramientas del
  // MOTOR del proyecto (9.2: el devOutput lo pone el motor, no un nodo),
  // crunch y burnout encima (core/systems/staff.ts). capabilityBonus queda
  // para nodos que aún den devOutput (hoy ninguno).
  const output =
    computeTeamOutput(team, project.crunch) *
    capabilityBonus(state, 'devOutput') *
    (1 + resolveEngine(state, project.engineId).devOutputBonus);
  // Sin nadie trabajando el proyecto NO avanza: se pausa, no se cancela
  // (docs/18 V5). No sube weeksSpent, no acumula bugs, no cambia de fase y no
  // se lanza; al reasignar continúa donde estaba. Solo cuenta la semana en
  // pausa, para no cobrarla como desarrollo en el P&L.
  if (output <= 0) {
    return withProject(state, { ...project, pausedWeeks: (project.pausedWeeks ?? 0) + 1 });
  }

  // DOTACIÓN RELATIVA, no velocidad: la duración de un juego la fija su tamaño
  // (semanas de calendario) y la plantilla NO la acelera. Lo que decide la
  // capacidad del equipo es cómo de BIEN se ejecuta en ese plazo: con la
  // plantilla justa (sizeGate.minStaff) crewRatio = 1 y el QA rinde al ritmo
  // nominal; ir corto deja el juego a medio cocer (menos QA, más bugs) e ir
  // sobrado ayuda solo hasta maxCrewRatio (rendimientos decrecientes, Brooks).
  const crewExpected = balance.development.sizeGate[project.size].minStaff;
  const crewRatio = Math.min(output / crewExpected, balance.development.maxCrewRatio);

  const allocation = project.focus[project.phase - 1];
  const aspects = getDevPhase(project.phase).aspects;

  let design = 0;
  let tech = 0;
  let qa = 0;
  for (const aspect of aspects) {
    const effort = allocation[aspect.id] ?? 0;
    design += effort * aspect.designWeight;
    tech += effort * aspect.techWeight;
    qa += effort * aspect.qaWeight;
  }

  // Semanas de TRABAJO que salen esta semana real: 1, o las de dobles turnos si
  // hay crunch (docs/02 §6.1). Es la única forma de comprimir el plazo —y la
  // eliges tú—; la plantilla nunca lo acorta. Todo lo que se acumula por semana
  // escala con esto, así que el crunch también dobla la deuda de bugs: sale
  // antes, pero peor. Si no escalase, crunchear saldría gratis.
  const advance = project.crunch ? balance.staff.crunch.weeksPerTick : 1;

  // Bugs semanales (solo Concepto/Producción): los genera el ritmo del proyecto
  // y la prisa del crunch, no el número de cabezas (docs/03 factor D). Los
  // rasgos entran como media del equipo (la sensibilidad es de su composición,
  // no de su tamaño) y la falta de dotación pasa su propia factura.
  const traitBugs =
    team.length > 0
      ? team.reduce(
          (sum, e) => sum + e.traits.reduce((s, id) => s + (getTrait(id).modifiers.bugRisk ?? 0), 0),
          0,
        ) / team.length
      : 0;
  const weeklyBugs =
    project.phase < 3
      ? Math.max(
          0,
          (balance.development.baseBugsPerWeek +
            (project.crunch ? balance.staff.crunch.extraBugsPerWeek : 0) +
            traitBugs +
            balance.development.understaffBugsPerWeek * Math.max(0, 1 - crewRatio)) *
            advance,
        )
      : 0;

  const weeksSpent = project.weeksSpent + advance;
  let worked: Project = {
    ...project,
    weeksSpent,
    designPoints: project.designPoints + design * crewRatio * advance,
    techPoints: project.techPoints + tech * crewRatio * advance,
    // El QA profesional rinde más (docs/02 §3: capacidad qaEfficiency).
    qaInvested:
      project.qaInvested +
      qa *
        balance.development.qaReductionPerWeek *
        crewRatio *
        capabilityBonus(state, 'qaEfficiency') *
        advance,
    bugDebt: project.bugDebt + weeklyBugs,
  };

  const [w1, w2] = phaseWeeks(worked);
  const total = projectTotalWeeks(worked);

  if (weeksSpent >= total) {
    // Terminado esta misma semana: sale ya… salvo ventana disputada (9.5).
    return resolveFinishedProject(withProject(state, worked), worked);
  }

  const newPhase: DevPhaseNumber = weeksSpent >= w1 + w2 ? 3 : weeksSpent >= w1 ? 2 : 1;
  if (newPhase !== worked.phase) {
    worked = { ...worked, phase: newPhase };
    const next = withProject(state, worked);
    return appendLog(
      next,
      'fase',
      `«${worked.name}» entra en la fase de ${getDevPhase(newPhase).name}.`,
    );
  }

  return withProject(state, worked);
}

/**
 * Integración en el tick: una semana de trabajo de TODOS los proyectos en
 * curso (docs/02 §4: multi-proyecto desde el estudio consolidado). Cada
 * equipo asignado marca el output de su proyecto; los lanzamientos se
 * resuelven en orden de antigüedad.
 */
export function advanceProjects(state: GameState): GameState {
  const ids = state.projects.map((p) => p.id);
  let next = state;
  for (const id of ids) {
    next = advanceOneProject(next, id);
  }
  return next;
}

/**
 * Acción: lanzar IGUAL dentro de la ventana disputada (Fase 9.5). El juego
 * sale ya, con el pico day-one aplastado por la campaña del gigante
 * (rivalCrush, congelado en releaseProject). Decisión informada: el modal
 * enseña el castigo antes de confirmar.
 */
export function confirmContestedRelease(state: GameState, projectId?: string): GameState {
  const project = findProject(state, projectId);
  if (project.pendingRelease === undefined) {
    throw new Error('El proyecto no tiene un lanzamiento en ventana disputada');
  }
  const cleared: Project = { ...project, pendingRelease: undefined };
  return releaseProject(withProject(state, cleared), cleared);
}

/**
 * Acción: RETRASAR el lanzamiento para esquivar la ventana (Fase 9.5). El
 * juego espera en el cajón hasta la semana siguiente al cierre de la ventana
 * y sale solo (advanceProjects). El precio es visible: nómina y calendario
 * siguen corriendo, y el mercado no te espera.
 */
export function delayContestedRelease(state: GameState, projectId?: string): GameState {
  const project = findProject(state, projectId);
  const pending = project.pendingRelease;
  if (pending === undefined) {
    throw new Error('El proyecto no tiene un lanzamiento en ventana disputada');
  }
  const until = pending.windowEndWeek + 1;
  const next = withProject(state, {
    ...project,
    pendingRelease: undefined,
    delayedUntilWeek: until,
  });
  return appendLog(
    next,
    'proyecto',
    `«${project.name}» retrasa su lanzamiento ${until - state.week} semanas para esquivar «${pending.gameName}» de ${pending.rivalName}. La nómina sigue corriendo.`,
  );
}
