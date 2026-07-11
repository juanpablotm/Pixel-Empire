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
  computeSegmentReviews,
  effectiveSaturation,
  platformAvailable,
  registerReleaseSaturation,
} from './market';
import { applyReleaseMoralEffects, lootBoxesBanned } from './morale';
import { computeQuality } from './quality';
import { buildReviewLines, reviewVerdict } from './review';
import {
  applyReleaseMorale,
  computeTeamFactor,
  computeTeamOutput,
  teamInnovationBonus,
} from './staff';
import { getTrait } from '../../data/traits';
import type { Employee } from '../model/staff';

/**
 * Ciclo de vida del proyecto (docs/02 §2): concepción → 3 fases de desarrollo →
 * lanzamiento. Acciones puras del jugador + integración en el tick.
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

/**
 * Valida una configuración de monetización (docs/09 §9): las MTX exigen un
 * modelo con tienda, el DLC day-one exige un modelo con DLC, y la regulación
 * puede haber prohibido las loot boxes (docs/06 §5).
 */
function validateMonetization(state: GameState, config: MonetizationConfig): void {
  const model = getMonetizationModel(config.model);
  if (config.aggressiveness < 0 || config.aggressiveness > 1) {
    throw new Error('La agresividad de monetización debe estar entre 0 y 1');
  }
  if ((config.hasLootBoxes || config.hasBattlePass || config.aggressiveness > 0) && !model.supportsMtx) {
    throw new Error(`El modelo ${model.name} no admite microtransacciones`);
  }
  if (config.dayOneDLC && !model.supportsDayOneDlc) {
    throw new Error(`El modelo ${model.name} no admite DLC day-one`);
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
 * Acción: empezar un proyecto nuevo (docs/02 paso 1). En el garaje solo puede
 * haber un proyecto a la vez. Precio y monetización son palancas morales
 * (docs/06 §2) y quedan fijados en la concepción.
 */
export function startProject(state: GameState, concept: ProjectConcept): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  if (state.projects.length > 0) throw new Error('Ya hay un proyecto en desarrollo');
  const name = concept.name.trim();
  if (name === '') throw new Error('El juego necesita un nombre');
  // Validar que el contenido existe (lanzan si el id es desconocido).
  getTheme(concept.themeId);
  getGenre(concept.genreId);
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
    // Por defecto toda la plantilla arranca el proyecto (docs/02 §2 paso 2).
    assignedStaff: state.staff.map((e) => e.id),
    crunch: false,
    hype: 0,
    weeksSpent: 0,
    designPoints: 0,
    techPoints: 0,
    qaInvested: 0,
    bugDebt: 0,
  };

  const next: GameState = {
    ...state,
    studio: { ...state.studio, capital: state.studio.capital - platform.licenseCost },
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
): GameState {
  const project = state.projects[0];
  if (!project) throw new Error('No hay proyecto en desarrollo');
  const focus: Project['focus'] = [...project.focus];
  focus[phase - 1] = normalizeAllocation(phase, allocation);
  return { ...state, projects: [{ ...project, focus }] };
}

/**
 * Acción: añadir/quitar una feature. Solo durante la fase de Concepto
 * (simplificación v1 de las decisiones de features de docs/02 paso 3).
 */
export function toggleFeature(state: GameState, featureId: string): GameState {
  const project = state.projects[0];
  if (!project) throw new Error('No hay proyecto en desarrollo');
  if (project.phase !== 1) {
    throw new Error('Las features se deciden durante la fase de Concepto');
  }
  const feature = getFeature(featureId);
  const chosen = project.chosenFeatureIds.includes(featureId);
  const next: Project = {
    ...project,
    chosenFeatureIds: chosen
      ? project.chosenFeatureIds.filter((id) => id !== featureId)
      : [...project.chosenFeatureIds, featureId],
    bugDebt: Math.max(0, project.bugDebt + (chosen ? -feature.bugRisk : feature.bugRisk)),
  };
  return { ...state, projects: [next] };
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
    salesActive: true,
    overPromised: project.overPromised,
  };
  let next: GameState = {
    ...state,
    projects: [],
    releasedGames: [...state.releasedGames, released],
    // El lanzamiento inunda un poco su combo género+tema (docs/04 §3).
    market: registerReleaseSaturation(state.market, project.genreId, project.themeId),
  };
  next = appendLog(
    next,
    'lanzamiento',
    `«${released.name}» sale a la venta: reseña media ${review}/100.`,
  );
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
 * Integración en el tick: una semana de trabajo del proyecto activo.
 * El equipo asignado marca el output (velocidad de rasgos × crunch × burnout,
 * en "semanas de fundador"); se acumulan puntos de Diseño/Técnica según el
 * reparto de esfuerzo, deuda de bugs en Concepto/Producción (más con crunch y
 * rasgos descuidados), inversión de QA en Pulido, y se avanza de fase o lanza.
 */
export function advanceProjects(state: GameState): GameState {
  const project = state.projects[0];
  if (!project) return state;

  const team = assignedTeam(state, project);
  const output = computeTeamOutput(team, project.crunch);
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
    qaInvested: project.qaInvested + qa * balance.development.qaReductionPerWeek * output,
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
    const next: GameState = { ...state, projects: [worked] };
    return appendLog(
      next,
      'fase',
      `«${worked.name}» entra en la fase de ${getDevPhase(newPhase).name}.`,
    );
  }

  return { ...state, projects: [worked] };
}
