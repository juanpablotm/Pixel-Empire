import { balance } from '../../data/balance';
import { getDevPhase } from '../../data/devPhases';
import { getFeature } from '../../data/features';
import { getGenre } from '../../data/genres';
import { defaultMonetization, getMonetizationModel } from '../../data/monetization';
import { getPlatform } from '../../data/platforms';
import { getTheme } from '../../data/themes';
import { appendLog } from '../engine/log';
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
  clampHype,
  computeSegmentReviews,
  effectiveSaturation,
  platformAvailable,
  registerReleaseSaturation,
} from './market';
import { applyReleaseMoralEffects, lootBoxesBanned } from './morale';
import { computeQuality } from './quality';
import { addReleaseResearchPoints, capabilityBonus } from './research';
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
  platformId: string;
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

/** Estimación de duración y coste para la pantalla de concepción. */
export function estimateProject(size: ProjectSize, platformId: string): {
  weeks: number;
  cost: number;
} {
  const weeks = balance.development.phaseWeeksBySize[size] * 3;
  const cost =
    weeks * balance.economy.devCostPerPersonWeek + getPlatform(platformId).licenseCost;
  return { weeks, cost };
}

/**
 * Coste atribuible al juego al lanzarlo (docs/17 U4): licencia de plataforma +
 * desarrollo (semanas de calendario · coste por persona·semana) + marketing
 * comprado. Es el "costó" del P&L de "sale del mercado". No incluye la nómina
 * general del estudio (coste compartido entre proyectos), a propósito y de
 * forma legible (Pilar 2).
 */
export function releasedGameCost(project: Project, releaseWeek: number): number {
  const licenseCost = getPlatform(project.platformId).licenseCost;
  const devWeeks = Math.max(0, releaseWeek - (project.startWeek ?? releaseWeek));
  const devCost = devWeeks * balance.economy.devCostPerPersonWeek;
  const marketingCost = project.marketingUsed.reduce(
    (sum, level) => sum + (balance.economy.marketing.levels[level]?.cost ?? 0),
    0,
  );
  return Math.round(licenseCost + devCost + marketingCost);
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
    throw new Error(`El tema ${theme.name} aún no está disponible en esta era`);
  }
  if (!genreAvailable(state, genre)) {
    throw new Error(`El género ${genre.name} aún no está desbloqueado (era o investigación)`);
  }
  const platform = getPlatform(concept.platformId);
  if (!platformAvailable(platform, state.week)) {
    throw new Error(`${platform.name} no está a la venta (docs/04 §7)`);
  }

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
    // Los premios del año pasado inflan el anuncio (docs/06 §7); aun así el
    // hype de salida entra clampeado a su rango (docs/17 B2).
    hype: clampHype(state.studio.awardHype),
    weeksSpent: 0,
    designPoints: 0,
    techPoints: 0,
    qaInvested: 0,
    bugDebt: 0,
  };

  const next: GameState = {
    ...state,
    studio: {
      ...state.studio,
      capital: state.studio.capital - platform.licenseCost,
      awardHype: 0,
    },
    projects: [...state.projects, project],
    projectCounter: state.projectCounter + 1,
  };
  return appendLog(next, 'proyecto', `Empieza el desarrollo de «${name}» (${platform.name}).`);
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
 * features desbloqueadas por era/investigación (docs/02 §3).
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
  const next: Project = {
    ...project,
    chosenFeatureIds: chosen
      ? project.chosenFeatureIds.filter((id) => id !== featureId)
      : [...project.chosenFeatureIds, featureId],
    bugDebt: Math.max(0, project.bugDebt + (chosen ? -feature.bugRisk : feature.bugRisk)),
  };
  return withProject(state, next);
}

/** Cuenta lanzamientos previos con la misma combinación tema×género (innovación). */
function comboRepeats(state: GameState, themeId: string, genreId: string): number {
  return state.releasedGames.filter((g) => g.themeId === themeId && g.genreId === genreId).length;
}

/** Empleados de la plantilla asignados al proyecto. */
function assignedTeam(state: GameState, project: Project): Employee[] {
  return state.staff.filter((e) => project.assignedStaff.includes(e.id));
}

/** Convierte el proyecto terminado en un juego lanzado con reseña y desglose. */
function releaseProject(state: GameState, project: Project): GameState {
  const team = assignedTeam(state, project);
  const teamResult = computeTeamFactor(team, project.genreId);
  const { q, breakdown } = computeQuality(project, {
    era: state.era,
    teamFactor: teamResult.teamFactor,
    comboRepeats: comboRepeats(state, project.themeId, project.genreId),
    innovationBonus: teamInnovationBonus(team),
  });
  const fullBreakdown = {
    ...breakdown,
    teamParts: {
      competenceFactor: teamResult.competenceFactor,
      moraleFactor: teamResult.moraleFactor,
      synergyFactor: teamResult.synergyFactor,
    },
  };
  // El mercado transforma Q en reseñas por segmento (docs/04 §5): moda,
  // expectativas del hype y sesgo de cada público (incluida la monetización).
  const reviews = computeSegmentReviews({
    quality: q,
    genreId: project.genreId,
    themeId: project.themeId,
    audience: project.audience,
    hype: project.hype,
    monetization: project.monetization,
    era: state.era,
    market: state.market,
  });
  const review = reviews.average;
  const released: ReleasedGame = {
    id: project.id,
    name: project.name,
    themeId: project.themeId,
    genreId: project.genreId,
    platformId: project.platformId,
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
    lines: buildReviewLines(fullBreakdown, project),
    releaseWeek: state.week,
    weeklySales: [],
    totalUnits: 0,
    totalRevenue: 0,
    mtxRevenue: 0,
    cost: releasedGameCost(project, state.week),
    salesActive: true,
    overPromised: project.overPromised,
  };
  let next: GameState = {
    ...state,
    // Solo sale del tablero el proyecto lanzado; el resto sigue (docs/02 §4).
    projects: state.projects.filter((p) => p.id !== project.id),
    releasedGames: [...state.releasedGames, released],
    // El lanzamiento inunda un poco su combo género+tema (docs/04 §3).
    market: registerReleaseSaturation(state.market, project.genreId, project.themeId),
  };
  next = appendLog(
    next,
    'lanzamiento',
    `«${released.name}» sale a la venta: reseña media ${review}/100.`,
  );
  // Desarrollar también enseña: puntos 💡 por lanzamiento (docs/02 §3).
  next = addReleaseResearchPoints(next, project.size);
  // El dilema moral pasa factura (docs/06): reputación por segmento, deuda
  // por las palancas de codicia y contadores de legado.
  next = applyReleaseMoralEffects(next, released);
  // La capa social lo dramatiza (docs/07): directos de creadores, promesa
  // inflada, feed y posibles crisis — siempre trazables al lanzamiento.
  next = applyReleaseCommunityEffects(next, released.id, project.creatorCampaign);
  // La moral del equipo reacciona al resultado (docs/05 §4).
  return applyReleaseMorale(next, review);
}

/** Una semana de trabajo de UN proyecto; devuelve el estado con el avance o lanzamiento. */
function advanceOneProject(state: GameState, projectId: string): GameState {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return state;

  const team = assignedTeam(state, project);
  // El motor propio acelera la producción (docs/02 §3: capacidades de estudio).
  const output = computeTeamOutput(team, project.crunch) * capabilityBonus(state, 'devOutput');
  if (output <= 0) return state; // sin nadie asignado, el proyecto no avanza

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

  // Bugs semanales (solo Concepto/Producción): base y prisa del crunch escalan
  // con el output; los rasgos suman (o restan) por persona (docs/03 factor D).
  const traitBugs = team.reduce(
    (sum, e) => sum + e.traits.reduce((s, id) => s + (getTrait(id).modifiers.bugRisk ?? 0), 0),
    0,
  );
  const weeklyBugs =
    project.phase < 3
      ? Math.max(
          0,
          (balance.development.baseBugsPerWeek +
            (project.crunch ? balance.staff.crunch.extraBugsPerWeek : 0)) *
            output +
            traitBugs,
        )
      : 0;

  const weeksSpent = project.weeksSpent + output;
  let worked: Project = {
    ...project,
    weeksSpent,
    designPoints: project.designPoints + design * output,
    techPoints: project.techPoints + tech * output,
    // El QA profesional rinde más (docs/02 §3: capacidad qaEfficiency).
    qaInvested:
      project.qaInvested +
      qa * balance.development.qaReductionPerWeek * output * capabilityBonus(state, 'qaEfficiency'),
    bugDebt: project.bugDebt + weeklyBugs,
  };

  const [w1, w2] = phaseWeeks(worked);
  const total = projectTotalWeeks(worked);

  if (weeksSpent >= total) {
    return releaseProject(state, worked);
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
