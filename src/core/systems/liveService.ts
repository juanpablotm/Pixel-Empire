import { balance } from '../../data/balance';
import { eraAtLeast } from '../../data/eras';
import { monetizationFlagEras } from '../../data/monetization';
import { appendLog } from '../engine/log';
import type { Rng } from '../engine/rng';
import type { GameState } from '../model/gameState';
import type { LiveServiceState, ReleasedGame } from '../model/release';
import type { Segment } from '../model/market';
import { sizeAtLeast } from '../model/project';
import { addSentiment, spawnCrisis } from './community';
import { recordExpense, recordIncome } from './economy';
import { addReputationDebt } from './morale';
import { withReputationDeltas } from './reputation';

/**
 * Servicios en vivo / GaaS (Fase 9.7, docs/19 §9.7): operar un juego lanzado
 * como servicio con ingresos CONTINUOS a cambio de mantenimiento permanente
 * (equipo en exclusiva + servidores + contenido). Descuidarlo desangra la base
 * de jugadores y enfría a la comunidad (docs/07 §2); exprimirlo Y descuidarlo
 * estalla en review bombing (docs/07 §5). El tick es determinista — el PRNG
 * solo pone el sabor de la crisis si estalla (docs/07 §5, "el azar solo decide
 * el sabor"). Números en balance.liveOps.
 */

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const round2 = (n: number): number => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Lecturas puras (UI y validación)
// ---------------------------------------------------------------------------

/** ¿El estudio ya sabe operar servicios (docs/02 §3: nodo de E6)? */
export function liveServiceUnlocked(state: GameState): boolean {
  return state.research.unlocked.includes(balance.liveOps.requiresResearch);
}

/** Un servicio está VIVO si existe y no se ha cerrado. */
export function serviceOpen(game: ReleasedGame): boolean {
  return game.liveService !== undefined && game.liveService.closedWeek === undefined;
}

/** Juegos con servicio abierto (los "platos girando" del estudio). */
export function activeLiveServices(state: GameState): ReleasedGame[] {
  return state.releasedGames.filter(serviceOpen);
}

/** Plantilla que exige el servicio de un juego para careRatio 1. */
export function requiredLiveStaff(game: ReleasedGame): number {
  return balance.liveOps.requiredStaffBySize[game.size];
}

/** Cuidado 0..1: equipo asignado frente al requerido por el tamaño. */
export function liveServiceCareRatio(game: ReleasedGame): number {
  const svc = game.liveService;
  if (!svc) return 0;
  return clamp01(svc.assignedStaff.length / requiredLiveStaff(game));
}

/** ARPU efectivo del servicio: base × (1 + pase + tienda agresiva). */
export function liveServiceArpu(svc: LiveServiceState): number {
  const cfg = balance.liveOps;
  return (
    cfg.arpuPerPlayerWeek *
    (1 +
      (svc.hasBattlePass ? cfg.battlePassArpuBoost : 0) +
      cfg.aggressivenessArpuCoef * svc.aggressiveness)
  );
}

/** Upkeep semanal de servidores del servicio (💰). */
export function liveServiceUpkeep(game: ReleasedGame): number {
  const svc = game.liveService;
  if (!svc) return 0;
  const cfg = balance.liveOps;
  return Math.round(cfg.upkeepBaseBySize[game.size] + svc.players * cfg.upkeepPerPlayer);
}

/**
 * Neto semanal estimado del servicio a jugadores actuales (para la UI): bruto
 * menos royalty de motor y parte del publisher, menos servidores. No incluye
 * salarios (la nómina es un coste compartido, como en el P&L de docs/17 U4).
 */
export function liveServiceWeeklyNet(game: ReleasedGame): number {
  const svc = game.liveService;
  if (!svc) return 0;
  const gross = svc.players * liveServiceArpu(svc);
  const net = gross * (1 - (game.royaltyPct ?? 0) - (game.publisherShare ?? 0));
  return Math.round(net - liveServiceUpkeep(game));
}

/**
 * Por qué este juego NO puede operarse como servicio, o null si puede. Único
 * punto de verdad: launchLiveService valida con esto y la UI lo muestra
 * atenuando el botón (docs/08 §6: la UI no calcula reglas).
 */
export function liveServiceBlockReason(state: GameState, game: ReleasedGame): string | null {
  const cfg = balance.liveOps;
  if (!liveServiceUnlocked(state)) {
    return 'Falta la investigación «Juegos como servicio» (llega con la era de los servicios)';
  }
  if (serviceOpen(game)) return 'El juego ya se opera como servicio';
  if (game.liveService?.closedWeek !== undefined) {
    return 'El servicio ya cerró: la comunidad no vuelve dos veces';
  }
  if (game.ipOwner === 'publisher') {
    return `La IP es de ${game.publisherName ?? 'tu publisher'}: no es tuya para operarla (docs/19 §9.6)`;
  }
  if (!sizeAtLeast(game.size, cfg.minSize)) {
    return 'Un juego pequeño no sostiene un servicio: mediano o mayor';
  }
  if (!game.salesActive) return 'El juego ya salió del mercado';
  return null;
}

// ---------------------------------------------------------------------------
// Acciones del jugador
// ---------------------------------------------------------------------------

function requireGame(state: GameState, gameId: string): ReleasedGame {
  const game = state.releasedGames.find((g) => g.id === gameId);
  if (!game) throw new Error(`Juego desconocido: ${gameId}`);
  return game;
}

function withGame(
  state: GameState,
  gameId: string,
  update: (game: ReleasedGame) => ReleasedGame,
): GameState {
  return {
    ...state,
    releasedGames: state.releasedGames.map((g) => (g.id === gameId ? update(g) : g)),
  };
}

/** Escala un mapa de deltas de reputación por un factor. */
function scaleDeltas(
  deltas: Partial<Record<Segment, number>>,
  factor: number,
): Partial<Record<Segment, number>> {
  const scaled: Partial<Record<Segment, number>> = {};
  for (const [seg, v] of Object.entries(deltas) as [Segment, number][]) {
    scaled[seg] = round2(v * factor);
  }
  return scaled;
}

export interface LiveServiceConfig {
  hasBattlePass: boolean;
  /** 0..1 (0 = honesto, 1 = exprimidor), como MonetizationConfig. */
  aggressiveness: number;
}

/**
 * Acción: operar un juego lanzado como SERVICIO en vivo (docs/19 §9.7). La
 * parroquia inicial sale de las unidades vendidas y la reseña; añadir pase o
 * tienda agresiva a un juego ya vendido es media palanca de codicia (golpe y
 * deuda a convertLeverFactor de la escala del lanzamiento, docs/06 §2).
 */
export function launchLiveService(
  state: GameState,
  gameId: string,
  config: LiveServiceConfig,
): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const game = requireGame(state, gameId);
  const blocked = liveServiceBlockReason(state, game);
  if (blocked) throw new Error(blocked);
  if (config.hasBattlePass && !eraAtLeast(state.era, monetizationFlagEras.battlePass)) {
    throw new Error('El pase de batalla aún no se ha inventado (llega con los servicios)');
  }
  const aggressiveness = clamp01(config.aggressiveness);

  const cfg = balance.liveOps;
  const players = Math.round(game.totalUnits * cfg.seedShare * (game.review / 100));
  const svc: LiveServiceState = {
    startWeek: state.week,
    players,
    peakPlayers: players,
    assignedStaff: [],
    aggressiveness,
    hasBattlePass: config.hasBattlePass,
    weeksNeglected: 0,
    neglectCrashed: false,
    revenue: 0,
    upkeepPaid: 0,
  };

  let next = withGame(state, gameId, (g) => ({ ...g, liveService: svc }));
  next = {
    ...next,
    stats: { ...next.stats, liveServicesOpened: (next.stats.liveServicesOpened ?? 0) + 1 },
  };

  // Media palanca de codicia al convertir (docs/06 §2): el público ya compró
  // el juego; abrirle una tienda dentro tiene su precio en cariño y pólvora.
  const levers = balance.reputation.levers;
  const debt = balance.moral.debt;
  const f = cfg.convertLeverFactor;
  let studio = next.studio;
  if (config.hasBattlePass) {
    studio = withReputationDeltas(studio, scaleDeltas(levers.battlePass, f));
    studio = addReputationDebt(studio, 'mtxAgresivas', round2(debt.battlePassRelease * f));
  }
  if (aggressiveness > 0) {
    studio = withReputationDeltas(
      studio,
      scaleDeltas(levers.mtxPerAggression, f * aggressiveness),
    );
    studio = addReputationDebt(
      studio,
      'mtxAgresivas',
      round2(debt.mtxAggressionRelease * f * aggressiveness),
    );
  }
  next = { ...next, studio };

  return appendLog(
    next,
    'estudio',
    `«${game.name}» pasa a operarse como SERVICIO en vivo: ${players.toLocaleString(
      'es-ES',
    )} jugadores esperan contenido cada semana. Asigna equipo o la parroquia se irá.`,
  );
}

/**
 * Acción: asignar o retirar a un empleado del servicio de un juego. Asignarlo
 * lo saca de cualquier proyecto, de I+D y de otros servicios: nadie está en
 * dos sitios a la vez (docs/02 §4). El equipo del servicio trabaja (se
 * desgasta y gana XP) como el de I+D.
 */
export function toggleLiveServiceAssignment(
  state: GameState,
  gameId: string,
  employeeId: string,
): GameState {
  const game = requireGame(state, gameId);
  const svc = game.liveService;
  if (!svc || svc.closedWeek !== undefined) {
    throw new Error('El juego no tiene un servicio abierto');
  }
  if (!state.staff.some((e) => e.id === employeeId)) {
    throw new Error(`Empleado desconocido: ${employeeId}`);
  }

  const assigned = svc.assignedStaff.includes(employeeId);
  if (assigned) {
    return withGame(state, gameId, (g) => ({
      ...g,
      liveService: {
        ...(g.liveService as LiveServiceState),
        assignedStaff: (g.liveService as LiveServiceState).assignedStaff.filter(
          (id) => id !== employeeId,
        ),
      },
    }));
  }

  // Sacarlo de todo lo demás: proyectos, I+D y cualquier otro servicio.
  let next = dropFromLiveServices(state, [employeeId]);
  next = {
    ...next,
    projects: next.projects.map((p) =>
      p.assignedStaff.includes(employeeId)
        ? { ...p, assignedStaff: p.assignedStaff.filter((id) => id !== employeeId) }
        : p,
    ),
    research: {
      ...next.research,
      rdStaff: next.research.rdStaff.filter((id) => id !== employeeId),
    },
  };
  return withGame(next, gameId, (g) => ({
    ...g,
    liveService: {
      ...(g.liveService as LiveServiceState),
      assignedStaff: [...(g.liveService as LiveServiceState).assignedStaff, employeeId],
    },
  }));
}

/**
 * Saneado: saca a estos empleados de todos los servicios (renuncias, despidos,
 * fichajes de rivales). Mismo patrón que dropFromSquads (docs/18 V5).
 */
export function dropFromLiveServices(state: GameState, employeeIds: readonly string[]): GameState {
  if (employeeIds.length === 0) return state;
  const ids = new Set(employeeIds);
  if (
    !state.releasedGames.some((g) => g.liveService?.assignedStaff.some((id) => ids.has(id)))
  ) {
    return state;
  }
  return {
    ...state,
    releasedGames: state.releasedGames.map((g) =>
      g.liveService?.assignedStaff.some((id) => ids.has(id))
        ? {
            ...g,
            liveService: {
              ...g.liveService,
              assignedStaff: g.liveService.assignedStaff.filter((id) => !ids.has(id)),
            },
          }
        : g,
    ),
  };
}

/** Ids de empleados ocupados en algún servicio abierto (para la UI de equipo). */
export function liveServiceStaffIds(state: GameState): Set<string> {
  const ids = new Set<string>();
  for (const game of activeLiveServices(state)) {
    for (const id of (game.liveService as LiveServiceState).assignedStaff) ids.add(id);
  }
  return ids;
}

/**
 * Acción: cerrar el servicio (sunset). Libera al equipo y golpea a
 * comunidad/hardcore y al sentimiento en proporción a los jugadores que dejas
 * tirados (docs/19 §9.7): cerrar un servicio moribundo apenas duele.
 */
export function sunsetLiveService(state: GameState, gameId: string): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const game = requireGame(state, gameId);
  const svc = game.liveService;
  if (!svc || svc.closedWeek !== undefined) {
    throw new Error('El juego no tiene un servicio abierto');
  }

  const cfg = balance.liveOps;
  const scale = clamp01(svc.players / cfg.refPlayers);
  let next = withGame(state, gameId, (g) => ({
    ...g,
    liveService: {
      ...(g.liveService as LiveServiceState),
      assignedStaff: [],
      weeksNeglected: 0,
      closedWeek: state.week,
      closedReason: 'cerrado' as const,
    },
  }));
  next = {
    ...next,
    studio: withReputationDeltas(next.studio, {
      comunidad: -round2(cfg.sunset.repHitMax.comunidad * scale),
      hardcore: -round2(cfg.sunset.repHitMax.hardcore * scale),
    }),
    community: addSentiment(next.community, -cfg.sunset.sentimentHitMax * scale),
  };
  return appendLog(
    next,
    'estudio',
    svc.players >= cfg.minPlayers
      ? `Cierras el servicio de «${game.name}» con ${svc.players.toLocaleString(
          'es-ES',
        )} jugadores dentro. Los foros arden un rato; el equipo vuelve a casa.`
      : `El servicio de «${game.name}» cierra sus servidores. Quedaba poca gente: nadie protesta.`,
  );
}

// ---------------------------------------------------------------------------
// El tick del servicio (docs/19 §9.7): jugadores, caja y consecuencias
// ---------------------------------------------------------------------------

/**
 * Avanza todos los servicios 1 semana (tras advanceSales: los que compran esta
 * semana pueden unirse al servicio). Determinista: churn, crecimiento e
 * ingresos son fórmula pura; el rng SOLO pone el sabor de la crisis si un
 * servicio exprimido y descuidado estalla (docs/07 §5).
 */
export function advanceLiveServices(state: GameState, rng: Rng): GameState {
  if (!state.releasedGames.some(serviceOpen)) return state;
  const cfg = balance.liveOps;

  let next = state;
  let income = 0;
  let expenses = 0;
  let publisherPaid = 0;

  for (const gameId of next.releasedGames.filter(serviceOpen).map((g) => g.id)) {
    const game = next.releasedGames.find((g) => g.id === gameId);
    const svc = game?.liveService;
    if (!game || !svc || svc.closedWeek !== undefined) continue;

    const care = liveServiceCareRatio(game);

    // 1) La parroquia: churn (base + descuido) contra contenido y sangre nueva.
    const churn = cfg.baseChurn + cfg.neglectChurn * (1 - care);
    const growth = cfg.contentGrowth * care * (game.review / 100);
    const joiners = game.salesActive
      ? (game.weeklySales[game.weeklySales.length - 1] ?? 0) * cfg.joinRate
      : 0;
    const players = Math.max(0, Math.round(svc.players * (1 - churn + growth) + joiners));

    // 2) La caja: ARPU × jugadores, con el motor y el publisher cobrando su
    //    parte del bruto como siempre (9.2/9.6: "para siempre" es para siempre).
    const gross = Math.round(svc.players * liveServiceArpu(svc));
    const royalty = Math.round(gross * (game.royaltyPct ?? 0));
    const pubCut = Math.round(gross * (game.publisherShare ?? 0));
    const net = gross - royalty - pubCut;
    const upkeep = liveServiceUpkeep(game);
    income += net;
    expenses += upkeep;
    publisherPaid += pubCut;

    // 3) Descuido: contador, aviso y — exprimido — estallido (docs/07 §5).
    const neglected = care < cfg.neglect.bar;
    const weeksNeglected = neglected ? svc.weeksNeglected + 1 : 0;
    const squeezed = svc.aggressiveness >= cfg.squeezeBar || svc.hasBattlePass;

    next = withGame(next, gameId, (g) => ({
      ...g,
      liveService: {
        ...(g.liveService as LiveServiceState),
        players,
        peakPlayers: Math.max((g.liveService as LiveServiceState).peakPlayers, players),
        weeksNeglected,
        neglectCrashed: neglected ? (g.liveService as LiveServiceState).neglectCrashed : false,
        revenue: (g.liveService as LiveServiceState).revenue + net,
        upkeepPaid: (g.liveService as LiveServiceState).upkeepPaid + upkeep,
      },
      royaltyPaid: royalty > 0 ? (g.royaltyPaid ?? 0) + royalty : g.royaltyPaid,
      publisherPaid:
        g.publisherShare !== undefined ? (g.publisherPaid ?? 0) + pubCut : g.publisherPaid,
    }));

    if (neglected) {
      next = {
        ...next,
        community: addSentiment(next.community, -cfg.neglect.sentimentPerWeek),
      };
      if (
        weeksNeglected === cfg.neglect.noticeWeeks ||
        (weeksNeglected > cfg.neglect.noticeWeeks &&
          (weeksNeglected - cfg.neglect.noticeWeeks) % cfg.neglect.logEveryWeeks === 0)
      ) {
        next = appendLog(
          next,
          'comunidad',
          `El servicio de «${game.name}» está DESCUIDADO (equipo al ${Math.round(
            care * 100,
          )} %): sin contenido, los jugadores se van y la comunidad se enfría.`,
        );
      }
      if (squeezed && weeksNeglected === cfg.neglect.crashWeeks) {
        const updated = next.releasedGames.find((g) => g.id === gameId);
        if (updated && !(updated.liveService as LiveServiceState).neglectCrashed) {
          // Exprimir sin mantener es la promesa rota del GaaS: estalla como
          // crisis con review bombing sobre el juego (docs/07 §5), una vez
          // por racha de descuido. Trazable: tú abriste la tienda y te fuiste.
          next = withGame(next, gameId, (g) => ({
            ...g,
            liveService: { ...(g.liveService as LiveServiceState), neglectCrashed: true },
          }));
          next = spawnCrisis(next, rng, 'mtxAgresivas', gameId, cfg.neglect.crashSeverity);
        }
      }
    }

    // 4) La tienda agresiva gotea pólvora mientras el servicio viva
    //    (docs/06 §5): exprimir a más gente acumula más deuda.
    if (svc.aggressiveness >= cfg.squeezeBar && svc.players > 0) {
      next = {
        ...next,
        studio: addReputationDebt(
          next.studio,
          'mtxAgresivas',
          round2(cfg.squeezeDebtPerWeek * svc.aggressiveness * clamp01(svc.players / cfg.refPlayers)),
        ),
      };
    }

    // 5) Un servicio sin parroquia se apaga solo, sin pena (docs/19 §9.7).
    if (players < cfg.minPlayers) {
      next = withGame(next, gameId, (g) => ({
        ...g,
        liveService: {
          ...(g.liveService as LiveServiceState),
          assignedStaff: [],
          closedWeek: next.week,
          closedReason: 'apagado' as const,
        },
      }));
      next = appendLog(
        next,
        'estudio',
        `El servicio de «${game.name}» se apaga: quedaban menos de ${cfg.minPlayers.toLocaleString(
          'es-ES',
        )} jugadores. El equipo queda libre.`,
      );
    }
  }

  if (income > 0 || expenses > 0) {
    next = {
      ...next,
      studio: { ...next.studio, capital: next.studio.capital + income - expenses },
      stats: {
        ...next.stats,
        totalRevenue: next.stats.totalRevenue + income,
        publisherPaidTotal:
          publisherPaid > 0
            ? (next.stats.publisherPaidTotal ?? 0) + publisherPaid
            : next.stats.publisherPaidTotal,
      },
    };
    next = recordIncome(next, income);
    next = recordExpense(next, expenses);
  }
  return next;
}
