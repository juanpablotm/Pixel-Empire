import { balance } from '../../data/balance';
import { eraAtLeast } from '../../data/eras';
import { getPlatform } from '../../data/platforms';
import { appendLog } from '../engine/log';
import type { GameState } from '../model/gameState';
import type { Project } from '../model/project';
import { addSentiment } from './community';
import { recordIncome } from './economy';
import { marketSize } from './market';
import { findProject, projectTotalWeeks } from './projects';
import { withReputationDeltas } from './reputation';

/**
 * Early Access (Fase 9.6, docs/19 §9.6 y docs/07 §4.1): lanzar a medio hacer.
 * Entra dinero antes y la comunidad pule el juego (QA y bugs), PERO el reloj
 * corre: pasada la paciencia, cada semana sin 1.0 quema sentimiento y
 * reputación — progresivo, avisado y trazable (Pilar 2). Solo juegos
 * AUTO-publicados: el publisher controla el lanzamiento de los suyos.
 * La conversión a 1.0 (canibalización del pico, traición si sale floja) vive
 * en systems/projects.ts, donde se lanza.
 */

/** El acceso anticipado existe desde su era (E5: tiendas digitales). */
export function earlyAccessAvailable(state: GameState): boolean {
  return eraAtLeast(state.era, balance.earlyAccess.appearsInEra);
}

/**
 * Por qué este proyecto NO puede abrir su acceso anticipado, o null si puede.
 * Único punto de verdad: launchEarlyAccess valida con esto y la UI lo muestra
 * atenuando el botón (docs/08 §6: la UI no calcula reglas).
 */
export function earlyAccessBlockReason(state: GameState, project: Project): string | null {
  const cfg = balance.earlyAccess;
  if (!earlyAccessAvailable(state)) {
    return 'El acceso anticipado aún no existe (llega con las tiendas digitales)';
  }
  if (project.earlyAccess !== undefined) {
    return 'El juego ya está en acceso anticipado';
  }
  if (project.publisherDeal !== undefined) {
    return `${project.publisherDeal.publisherName} controla el lanzamiento: sin acceso anticipado`;
  }
  if (project.phase < cfg.minPhase) {
    return 'Demasiado pronto: el acceso anticipado se abre en la fase de Pulido';
  }
  if (project.weeksSpent >= projectTotalWeeks(project)) {
    return 'El juego ya está terminado: lánzalo';
  }
  return null;
}

/**
 * Acción: abrir el acceso anticipado de un proyecto (sin id, el primero).
 * El juego empieza a venderse a medio hacer mientras el desarrollo sigue; la
 * comunidad espera la 1.0 con paciencia limitada (balance.earlyAccess).
 */
export function launchEarlyAccess(state: GameState, projectId?: string): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const project = findProject(state, projectId);
  const blocked = earlyAccessBlockReason(state, project);
  if (blocked) throw new Error(blocked);

  const next: GameState = {
    ...state,
    projects: state.projects.map((p) =>
      p.id === project.id
        ? { ...p, earlyAccess: { startWeek: state.week, unitsSold: 0, revenue: 0 } }
        : p,
    ),
  };
  return appendLog(
    next,
    'proyecto',
    `«${project.name}» abre su ACCESO ANTICIPADO: entra dinero y feedback desde ya. La comunidad espera la 1.0 — no la hagas esperar de más.`,
  );
}

/**
 * Demanda semanal del acceso anticipado: la misma base que las ventas reales
 * (bases instaladas × factor de tamaño × popularidad normalizada, docs/04 §6)
 * pero a escala de "juego a medias sin reseña" (salesScale), empujada por el
 * hype (acotado a 1: el bombo atrae curiosos, no compra fe infinita) y
 * enfriándose sola semana a semana (la novedad se agota sin 1.0).
 */
export function expectedEarlyAccessUnits(
  state: GameState,
  project: Project,
  weeksInEa: number,
): number {
  const cfg = balance.earlyAccess;
  const s = balance.sales;
  const platformIds = project.platformIds ?? [project.platformId];
  const installed = platformIds.reduce(
    (sum, id) => sum + marketSize(getPlatform(id), project.audience, state.market),
    0,
  );
  const base = balance.market.popularity.base;
  const popFactor =
    s.popDemandScale *
    ((state.market.genres[project.genreId]?.pop ?? base) / base) *
    ((state.market.themes[project.themeId]?.pop ?? base) / base);
  const demand = installed * s.sizeDemandFactor[project.size] * popFactor;
  return (
    demand *
    cfg.salesScale *
    (1 + cfg.hypeCoef * Math.min(project.hype, 1)) *
    cfg.weeklyDecay ** weeksInEa
  );
}

/**
 * Una semana de acceso anticipado para todos los proyectos que lo tengan
 * abierto (integración en el tick, tras advanceProjects): ventas EA a caja,
 * feedback de la comunidad al proyecto (QA y bugs) y, agotada la paciencia,
 * la quema progresiva de sentimiento y reputación. Determinista (sin ruido:
 * el goteo EA es estable; el drama queda para el lanzamiento).
 */
export function advanceEarlyAccess(state: GameState): GameState {
  if (!state.projects.some((p) => p.earlyAccess !== undefined)) return state;
  const cfg = balance.earlyAccess;

  let next = state;
  let income = 0;

  for (const current of next.projects.map((p) => p.id)) {
    const project = next.projects.find((p) => p.id === current);
    const ea = project?.earlyAccess;
    if (!project || !ea) continue;

    const weeksIn = next.week - ea.startWeek;

    // Ventas de la semana: unidades a precio EA (con descuento). El modelo de
    // negocio no entra: en EA se compra el juego, no sus MTX (llegan con la 1.0).
    const units = Math.round(expectedEarlyAccessUnits(next, project, weeksIn));
    const revenue = Math.round(units * project.price * cfg.priceFactor);
    income += revenue;

    // Feedback (docs/07 §4.1): la comunidad reporta bugs y pule el diseño.
    // El juego llega mejor a la 1.0 que su gemelo a puerta cerrada.
    const updated: Project = {
      ...project,
      qaInvested: project.qaInvested + cfg.feedbackQaPerWeek,
      bugDebt: Math.max(0, project.bugDebt - cfg.feedbackBugFixPerWeek),
      earlyAccess: {
        ...ea,
        unitsSold: ea.unitsSold + units,
        revenue: ea.revenue + revenue,
      },
    };
    next = {
      ...next,
      studio: { ...next.studio, capital: next.studio.capital + revenue },
      projects: next.projects.map((p) => (p.id === project.id ? updated : p)),
    };

    // Paciencia agotada (docs/07 §4.1): quema progresiva, avisada y trazable.
    const weeksOver = weeksIn - cfg.patienceWeeks;
    if (weeksOver > 0) {
      const b = cfg.burn;
      const ramp = Math.min(b.rampMaxFactor, weeksOver / b.rampWeeks);
      next = {
        ...next,
        community: addSentiment(next.community, -b.sentimentPerWeek * ramp),
        studio: withReputationDeltas(next.studio, {
          comunidad: -b.repPerWeek.comunidad * ramp,
          hardcore: -b.repPerWeek.hardcore * ramp,
        }),
      };
      if (weeksOver === 1 || weeksOver % b.logEveryWeeks === 0) {
        next = appendLog(
          next,
          'comunidad',
          weeksOver === 1
            ? `La comunidad pierde la paciencia con «${project.name}»: ${Math.floor(
                weeksIn / 4,
              )} meses en acceso anticipado y la 1.0 sin fecha. Cada semana quema confianza.`
            : `«${project.name}» sigue en acceso anticipado (${Math.floor(
                weeksIn / 4,
              )} meses): la comunidad se quema y la reputación gotea.`,
        );
      }
    }
  }

  if (income > 0) {
    next = {
      ...next,
      stats: { ...next.stats, totalRevenue: next.stats.totalRevenue + income },
    };
    next = recordIncome(next, income);
  }
  return next;
}
