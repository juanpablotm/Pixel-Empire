import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { makeRng } from '../engine/rng';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { LiveServiceState, ReleasedGame } from '../model/release';
import type { Employee } from '../model/staff';
import {
  advanceLiveServices,
  launchLiveService,
  liveServiceBlockReason,
  liveServiceCareRatio,
  liveServiceWeeklyNet,
  sunsetLiveService,
  toggleLiveServiceAssignment,
} from './liveService';
import { createFounder } from './staff';

/**
 * Servicios en vivo (Fase 9.7, docs/19 §9.7): CA de la sub-fase —
 * un GaaS descuidado pierde jugadores e ingresos (y enfría la comunidad);
 * exprimido Y descuidado, estalla en review bombing (docs/07 §5); el motor
 * y el publisher siguen cobrando su parte del bruto; y el cierre golpea en
 * proporción a la parroquia abandonada. Semilla fija: determinista.
 */

const SEED = 977;

/** Juego lanzado listo para operarse: mediano, reseña 78, 40k unidades. */
function makeGame(overrides: Partial<ReleasedGame> = {}): ReleasedGame {
  return {
    id: 'juego-gaas',
    name: 'Reino de Sal Online',
    themeId: 'fantasia',
    genreId: 'rpg',
    platformId: 'pcCasero',
    audience: 'hardcore',
    size: 'mediano',
    price: 30,
    monetization: {
      model: 'premium',
      aggressiveness: 0,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    },
    quality: 78,
    review: 78,
    reviewsBySegment: { critica: 78, prensa: 78, hardcore: 78, casual: 78 },
    reviewMarket: { base: 78, modaBonus: 0, hypePenalty: 0 },
    hypeAtRelease: 0,
    saturationAtRelease: 0,
    verdict: 'Un mundo que pide vivir en él.',
    breakdown: {
      fit: 1,
      fitParts: { themeGenre: 1, genrePlatform: 1, audience: 1 },
      balanceScore: 1,
      dReal: 0.65,
      dIdeal: 0.65,
      featureScore: 0.5,
      polishScore: 1,
      bugLevel: 0,
      teamFactor: 0.95,
      innovationMod: 1.05,
      base: 0.875,
      qualityCap: 85,
    },
    lines: [],
    releaseWeek: 1,
    weeklySales: [],
    totalUnits: 40_000,
    totalRevenue: 0,
    mtxRevenue: 0,
    salesActive: true,
    ...overrides,
  };
}

/** Plantilla: fundador + N empleados clonados (ids únicos, sin fundador). */
function makeStaff(seed: number, extra: number): Employee[] {
  const founder = createFounder(seed);
  const clones = Array.from({ length: extra }, (_, i) => ({
    ...founder,
    id: `emp-${i + 1}`,
    name: `Empleado ${i + 1}`,
    founder: false,
    salary: 500,
  }));
  return [founder, ...clones];
}

/** Estado E6 con la investigación de servicios comprada y un juego lanzado. */
function makeState(game = makeGame(), staffExtra = 6): GameState {
  const base = createInitialState(SEED);
  return {
    ...base,
    week: 1900,
    era: 'E6',
    staff: makeStaff(SEED, staffExtra),
    studio: { ...base.studio, capital: 500_000, scaleStage: 4 },
    research: { ...base.research, unlocked: ['tecnologiaOnline', 'serviciosOnline'] },
    releasedGames: [game],
  };
}

/** Servicio abierto a mano (para tests quirúrgicos de advanceLiveServices). */
function openService(
  state: GameState,
  svc: Partial<LiveServiceState> = {},
): GameState {
  return {
    ...state,
    releasedGames: state.releasedGames.map((g) =>
      g.id === 'juego-gaas'
        ? {
            ...g,
            liveService: {
              startWeek: state.week,
              players: 20_000,
              peakPlayers: 20_000,
              assignedStaff: [],
              aggressiveness: 0,
              hasBattlePass: false,
              weeksNeglected: 0,
              neglectCrashed: false,
              revenue: 0,
              upkeepPaid: 0,
              ...svc,
            },
          }
        : g,
    ),
  };
}

const rng = () => makeRng(SEED, 999_999);

describe('elegibilidad y conversión (docs/19 §9.7)', () => {
  it('sin la investigación «Juegos como servicio» no se puede operar', () => {
    const state = { ...makeState(), research: { ...makeState().research, unlocked: [] } };
    expect(liveServiceBlockReason(state, state.releasedGames[0])).toMatch(/investigación/i);
  });

  it('un pequeño no sostiene un servicio; un mediano sí', () => {
    const state = makeState(makeGame({ size: 'pequeno' }));
    expect(liveServiceBlockReason(state, state.releasedGames[0])).toMatch(/pequeño/i);
    const ok = makeState();
    expect(liveServiceBlockReason(ok, ok.releasedGames[0])).toBeNull();
  });

  it('si el publisher se quedó la IP, el juego no es tuyo para operarlo (promesa de 9.6)', () => {
    const state = makeState(
      makeGame({ ipOwner: 'publisher', publisherName: 'Vex Interactive', publisherShare: 0.7 }),
    );
    expect(liveServiceBlockReason(state, state.releasedGames[0])).toMatch(/Vex Interactive/);
    expect(() => launchLiveService(state, 'juego-gaas', { hasBattlePass: false, aggressiveness: 0 })).toThrow();
  });

  it('convertir siembra jugadores = unidades × seedShare × (reseña/100)', () => {
    const state = launchLiveService(makeState(), 'juego-gaas', {
      hasBattlePass: false,
      aggressiveness: 0,
    });
    const svc = state.releasedGames[0].liveService;
    const cfg = balance.liveOps;
    expect(svc?.players).toBe(Math.round(40_000 * cfg.seedShare * 0.78));
    expect(svc?.assignedStaff).toEqual([]);
  });

  it('abrir pase/tienda a un juego vendido es media palanca: deuda y golpe a hardcore', () => {
    const before = makeState();
    const after = launchLiveService(before, 'juego-gaas', {
      hasBattlePass: true,
      aggressiveness: 0.8,
    });
    expect(after.studio.debtBySource.mtxAgresivas ?? 0).toBeGreaterThan(0);
    expect(after.studio.reputation.hardcore).toBeLessThan(before.studio.reputation.hardcore);
  });
});

describe('CA 9.7a — un servicio descuidado pierde jugadores e ingresos', () => {
  it('sin equipo, la parroquia se desangra mucho más rápido que bien dotado', () => {
    const cared0 = openService(makeState());
    // Equipo completo para un mediano (3 personas): careRatio 1.
    let cared = cared0;
    for (const id of ['emp-1', 'emp-2', 'emp-3']) {
      cared = toggleLiveServiceAssignment(cared, 'juego-gaas', id);
    }
    expect(liveServiceCareRatio(cared.releasedGames[0])).toBe(1);
    let neglected = openService(makeState());

    for (let i = 0; i < 12; i += 1) {
      cared = advanceLiveServices(cared, rng());
      neglected = advanceLiveServices(neglected, rng());
    }

    const caredSvc = cared.releasedGames[0].liveService as LiveServiceState;
    const negSvc = neglected.releasedGames[0].liveService as LiveServiceState;
    // Descuidado pierde jugadores a un ritmo brutal (churn 10 %/sem vs ~0).
    expect(negSvc.players).toBeLessThan(caredSvc.players * 0.65);
    // …y con ellos, los ingresos semanales.
    expect(liveServiceWeeklyNet(neglected.releasedGames[0])).toBeLessThan(
      liveServiceWeeklyNet(cared.releasedGames[0]),
    );
    // El descuido queda avisado en el historial (Pilar 2) y enfría el sentimiento.
    expect(neglected.log.some((l) => l.text.includes('DESCUIDADO'))).toBe(true);
    expect(neglected.community.sentiment).toBeLessThan(cared.community.sentiment);
  });

  it('el equipo del servicio cobra su neto: bruto − motor − publisher − servidores', () => {
    const state = openService(
      makeState(makeGame({ royaltyPct: 0.1, publisherShare: 0.6, publisherName: 'Vex' })),
    );
    const next = advanceLiveServices(state, rng());
    const game = next.releasedGames[0];
    const svc = game.liveService as LiveServiceState;
    const gross = Math.round(20_000 * balance.liveOps.arpuPerPlayerWeek);
    const royalty = Math.round(gross * 0.1);
    const pubCut = Math.round(gross * 0.6);
    const net = gross - royalty - pubCut;
    expect(svc.revenue).toBe(net);
    expect(game.royaltyPaid).toBe(royalty);
    expect(game.publisherPaid).toBe(pubCut);
    const upkeep =
      balance.liveOps.upkeepBaseBySize.mediano + Math.round(20_000 * balance.liveOps.upkeepPerPlayer);
    expect(svc.upkeepPaid).toBe(upkeep);
    expect(next.studio.capital).toBe(state.studio.capital + net - upkeep);
  });

  it('un juego con servicio abierto no sale de tiendas por goteo bajo', () => {
    // Lanzado hace 300 semanas: sus ventas semanales son ~0 (< cutoff).
    const dying = makeGame({ releaseWeek: 1600 });
    let withService = openService(makeState(dying));
    let without = makeState(dying);
    withService = tick(withService);
    without = tick(without);
    expect(withService.releasedGames[0].salesActive).toBe(true);
    expect(without.releasedGames[0].salesActive).toBe(false);
  });
});

describe('CA 9.7a bis — exprimido y descuidado, estalla (docs/07 §5)', () => {
  it('a las crashWeeks de descuido con tienda agresiva: crisis + review bombing, una por racha', () => {
    let state = openService(makeState(), { aggressiveness: 0.8 });
    const weeks = balance.liveOps.neglect.crashWeeks + 4;
    for (let i = 0; i < weeks; i += 1) {
      state = advanceLiveServices(state, makeRng(SEED, 500_000 + i));
    }
    const crises = state.community.crises.filter((c) => c.gameId === 'juego-gaas');
    expect(crises).toHaveLength(1);
    expect(crises[0].cause).toBe('mtxAgresivas');
    expect(state.community.bombs.some((b) => b.gameId === 'juego-gaas')).toBe(true);
    // La tienda agresiva además gotea deuda semana a semana (docs/06 §5).
    expect(state.studio.debtBySource.mtxAgresivas ?? 0).toBeGreaterThan(0);
  });

  it('un servicio honesto y descuidado se enfría pero NO estalla', () => {
    let state = openService(makeState(), { aggressiveness: 0 });
    for (let i = 0; i < balance.liveOps.neglect.crashWeeks + 4; i += 1) {
      state = advanceLiveServices(state, makeRng(SEED, 600_000 + i));
    }
    expect(state.community.crises).toHaveLength(0);
  });
});

describe('cierre del servicio (sunset)', () => {
  it('cerrar con parroquia dentro golpea comunidad/sentimiento en proporción', () => {
    const big = sunsetLiveService(openService(makeState(), { players: 40_000 }), 'juego-gaas');
    const small = sunsetLiveService(openService(makeState(), { players: 600 }), 'juego-gaas');
    const base = makeState();
    const bigHit = base.studio.reputation.comunidad - big.studio.reputation.comunidad;
    const smallHit = base.studio.reputation.comunidad - small.studio.reputation.comunidad;
    expect(bigHit).toBeGreaterThan(smallHit);
    expect(big.releasedGames[0].liveService?.closedWeek).toBe(big.week);
    expect(big.releasedGames[0].liveService?.assignedStaff).toEqual([]);
    // No se reabre: la comunidad no vuelve dos veces.
    expect(liveServiceBlockReason(big, big.releasedGames[0])).toMatch(/ya cerró/i);
  });

  it('bajo minPlayers el servicio se apaga solo, sin golpe de reputación', () => {
    const before = openService(makeState(), { players: 520 });
    // Sin equipo, churn 10 %/sem: en 1 semana cae bajo los 500.
    const after = advanceLiveServices(before, rng());
    const svc = after.releasedGames[0].liveService as LiveServiceState;
    expect(svc.closedReason).toBe('apagado');
    expect(after.studio.reputation.comunidad).toBe(before.studio.reputation.comunidad);
  });
});

describe('capacidad ocupada: el plato girando compite con los proyectos', () => {
  it('asignar al servicio saca del proyecto y de I+D (y al revés)', () => {
    let state = openService(makeState());
    state = {
      ...state,
      projects: [
        {
          id: 'p1',
          name: 'Proyecto X',
          themeId: 'fantasia',
          genreId: 'rpg',
          platformId: 'pcCasero',
          platformIds: ['pcCasero'],
          audience: 'hardcore',
          size: 'pequeno',
          price: 20,
          monetization: {
            model: 'premium',
            aggressiveness: 0,
            hasLootBoxes: false,
            hasBattlePass: false,
            dayOneDLC: false,
          },
          marketingUsed: [],
          creatorCampaign: [],
          overPromised: false,
          startWeek: state.week,
          phase: 1,
          focus: [{ diseno: 1 }, { diseno: 1 }, { diseno: 1 }],
          chosenFeatureIds: [],
          assignedStaff: ['emp-1'],
          crunch: false,
          hype: 0,
          weeksSpent: 0,
          designPoints: 0,
          techPoints: 0,
          qaInvested: 0,
          bugDebt: 0,
        },
      ],
    };
    state = toggleLiveServiceAssignment(state, 'juego-gaas', 'emp-1');
    expect(state.projects[0].assignedStaff).toEqual([]);
    expect(state.releasedGames[0].liveService?.assignedStaff).toEqual(['emp-1']);
  });
});
