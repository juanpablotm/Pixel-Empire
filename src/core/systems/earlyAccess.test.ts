import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { platforms } from '../../data/platforms';
import { createInitialState, createSandboxState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { Project } from '../model/project';
import {
  advanceEarlyAccess,
  earlyAccessBlockReason,
  launchEarlyAccess,
} from './earlyAccess';
import { expectedWeeklyUnits, platformAvailable } from './market';
import { projectTotalWeeks, startProject } from './projects';

/**
 * Early Access (Fase 9.6, docs/19 §9.6 y docs/07 §4.1): dinero y feedback
 * antes de la 1.0, con la comunidad mirando el reloj. Semilla fija.
 */

const SEED = 42;

/** Partida en E5 (donde nace el EA), sin industria rival que dispute ventanas. */
function e5State(): GameState {
  const base = createSandboxState(SEED, 'E5');
  return { ...base, rivals: { studios: [], poachOffer: null } };
}

/** Primera plataforma a la venta en la semana del estado. */
function livePlatform(state: GameState): string {
  const p = platforms.find((pl) => platformAvailable(pl, state.week));
  if (!p) throw new Error('Sin plataforma viva en esta semana');
  return p.id;
}

/** Concibe un pequeño auto-publicado y lo deja en la fase de Pulido. */
function projectInPolish(state = e5State(), engineId?: string): GameState {
  const started = startProject(state, {
    name: 'Promesas del Vacío',
    themeId: 'fantasia',
    genreId: 'rpg',
    platformId: livePlatform(state),
    audience: 'amplio',
    size: 'pequeno',
    engineId,
  });
  const p = started.projects[0];
  const [w1, w2] = [
    balance.development.phaseWeeksBySize.pequeno,
    balance.development.phaseWeeksBySize.pequeno,
  ];
  return {
    ...started,
    projects: [{ ...p, phase: 3 as const, weeksSpent: w1 + w2 + 1, bugDebt: 2 }],
  };
}

/**
 * Un estudio E5 CURTIDO (no el garaje imposible de 9.1): 25 lanzamientos a la
 * espalda (madurez), fundador estrella (talento) y etapa 3. Con un motor
 * licenciado moderno, su techo permite reseñas por encima del listón de
 * traición — el caso real de quien usa EA a mitad de partida.
 */
function matureE5State(): GameState {
  const base = e5State();
  const veteran = Array.from({ length: 25 }, (_, i) => ({
    id: `viejo-${i}`,
    name: `Clásico ${i}`,
    themeId: 'deportes',
    genreId: 'deportivo',
    platformId: 'pcCasero',
    audience: 'amplio' as const,
    size: 'grande' as const,
    price: 45,
    monetization: {
      model: 'premium' as const,
      aggressiveness: 0,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    },
    quality: 70,
    review: 70,
    reviewsBySegment: {},
    reviewMarket: { base: 70, modaBonus: 0, hypePenalty: 0 },
    hypeAtRelease: 0,
    saturationAtRelease: 0,
    verdict: '',
    breakdown: {
      fit: 1,
      fitParts: { themeGenre: 1, genrePlatform: 1, audience: 1 },
      balanceScore: 1,
      dReal: 0.5,
      dIdeal: 0.5,
      featureScore: 0.5,
      polishScore: 1,
      bugLevel: 0,
      teamFactor: 1,
      innovationMod: 1,
      base: 0.8,
      qualityCap: 85,
    },
    lines: [],
    releaseWeek: 1,
    weeklySales: [],
    totalUnits: 0,
    totalRevenue: 0,
    mtxRevenue: 0,
    salesActive: false,
  }));
  const founder = {
    ...base.staff[0],
    skills: { diseno: 95, tecnica: 95, arte: 95, audio: 95, marketing: 95 },
  };
  return {
    ...base,
    releasedGames: veteran,
    staff: [founder],
    studio: { ...base.studio, scaleStage: 3 },
  };
}

describe('gate del Early Access (docs/19 §9.6): quién, cuándo y quién no', () => {
  it('no existe antes de su era (llega con las tiendas digitales, E5)', () => {
    const e1 = createInitialState(SEED);
    const started = startProject(e1, {
      name: 'Demasiado pronto',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
    });
    expect(earlyAccessBlockReason(started, started.projects[0])).toMatch(/aún no existe/);
  });

  it('exige la fase de Pulido y rechaza los juegos con publisher', () => {
    const state = e5State();
    const started = startProject(state, {
      name: 'A medio hacer',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: livePlatform(state),
      audience: 'amplio',
      size: 'pequeno',
      publisherId: 'indieForge',
    });
    // Con publisher, ni en Pulido: él controla el lanzamiento.
    const withDeal = {
      ...started.projects[0],
      phase: 3 as const,
      weeksSpent: 40,
    };
    expect(
      earlyAccessBlockReason({ ...started, projects: [withDeal] }, withDeal),
    ).toMatch(/controla el lanzamiento/);
    // Auto-publicado pero en Concepto: demasiado pronto.
    const selfEarly = startProject(state, {
      name: 'Aún en concepto',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: livePlatform(state),
      audience: 'amplio',
      size: 'pequeno',
    });
    expect(earlyAccessBlockReason(selfEarly, selfEarly.projects[0])).toMatch(/Pulido/);
    // En Pulido y auto-publicado: adelante.
    const ready = projectInPolish();
    expect(earlyAccessBlockReason(ready, ready.projects[0])).toBeNull();
  });
});

describe('el goteo del EA: entra dinero y el juego mejora (docs/07 §4.1)', () => {
  it('abrir el acceso anticipado vende, cobra y pule semana a semana', () => {
    const opened = launchEarlyAccess(projectInPolish());
    expect(opened.log.some((e) => /ACCESO ANTICIPADO/.test(e.text))).toBe(true);

    const before = opened.projects[0];
    const after = advanceEarlyAccess({ ...opened, week: opened.week + 1 });
    const project = after.projects[0];
    const ea = project.earlyAccess!;
    // Vende y cobra: unidades > 0, ingresos = unidades × precio × descuento EA.
    expect(ea.unitsSold).toBeGreaterThan(0);
    expect(ea.revenue).toBe(
      Math.round(ea.unitsSold * project.price * balance.earlyAccess.priceFactor),
    );
    expect(after.studio.capital).toBe(opened.studio.capital + ea.revenue);
    expect(after.stats.totalRevenue).toBe(opened.stats.totalRevenue + ea.revenue);
    // Feedback: más QA, menos deuda de bugs (la comunidad reporta).
    expect(project.qaInvested).toBeCloseTo(
      before.qaInvested + balance.earlyAccess.feedbackQaPerWeek,
      8,
    );
    expect(project.bugDebt).toBeCloseTo(
      before.bugDebt - balance.earlyAccess.feedbackBugFixPerWeek,
      8,
    );
  });

  it('la paciencia agotada quema sentimiento y reputación, y crece con la demora', () => {
    const cfg = balance.earlyAccess;
    const opened = launchEarlyAccess(projectInPolish());
    const overdueBy = (weeksOver: number): GameState => {
      const p = opened.projects[0];
      const aged: Project = {
        ...p,
        earlyAccess: {
          ...p.earlyAccess!,
          startWeek: opened.week - cfg.patienceWeeks - weeksOver,
        },
      };
      return advanceEarlyAccess({ ...opened, projects: [aged] });
    };

    // Dentro de la paciencia: nada se quema.
    const inGrace = overdueBy(-10);
    expect(inGrace.community.sentiment).toBe(opened.community.sentiment);
    expect(inGrace.studio.reputation.comunidad).toBe(opened.studio.reputation.comunidad);

    // Pasada la paciencia: sentimiento y reputación gotean, con aviso legible.
    const overdue = overdueBy(cfg.burn.rampWeeks);
    expect(overdue.community.sentiment).toBeLessThan(opened.community.sentiment);
    expect(overdue.studio.reputation.comunidad).toBeLessThan(
      opened.studio.reputation.comunidad,
    );
    expect(overdue.studio.reputation.hardcore).toBeLessThan(
      opened.studio.reputation.hardcore,
    );

    // La rampa: demorarse el doble quema más por semana.
    const slightly = overdueBy(Math.round(cfg.burn.rampWeeks / 4));
    expect(opened.community.sentiment - overdue.community.sentiment).toBeGreaterThan(
      opened.community.sentiment - slightly.community.sentiment,
    );

    // El primer aviso al agotarse la paciencia queda en el historial (Pilar 2).
    const firstBurn = overdueBy(1);
    expect(firstBurn.log.some((e) => /pierde la paciencia/.test(e.text))).toBe(true);
  });
});

describe('la 1.0 (docs/19 §9.6): canibalización del pico y traición si sale floja', () => {
  /** Lleva un proyecto en EA al lanzamiento con la calidad indicada. */
  function releaseFromEa(opts: {
    good: boolean;
    eaUnits: number;
    state?: GameState;
    engineId?: string;
  }): GameState {
    const opened = launchEarlyAccess(projectInPolish(opts.state, opts.engineId));
    const p = opened.projects[0];
    const done: Project = {
      ...p,
      weeksSpent: projectTotalWeeks(p) + 1,
      // Bueno: puntos decentes y sin bugs. Flojo: sin pulir y con deuda.
      designPoints: opts.good ? 40 : 0.3,
      techPoints: opts.good ? 22 : 0.3,
      qaInvested: opts.good ? 10 : 0,
      bugDebt: opts.good ? 0 : 5,
      earlyAccess: {
        ...p.earlyAccess!,
        unitsSold: opts.eaUnits,
        revenue: opts.eaUnits * 10,
      },
    };
    return tick({ ...opened, projects: [done] });
  }

  it('los compradores de EA recortan el pico day-one (y queda nombrado)', () => {
    const state = releaseFromEa({ good: true, eaUnits: 100_000 });
    const game = state.releasedGames[0];
    const info = game.earlyAccessInfo!;
    expect(info.units).toBe(100_000);
    expect(info.spikePenalty).toBeGreaterThan(0);
    expect(info.spikePenalty).toBeLessThanOrEqual(balance.earlyAccess.spike.maxPenalty);
    // El pico con penalización vende menos que el mismo juego sin historia EA.
    const noEa = { ...game, earlyAccessInfo: undefined };
    expect(expectedWeeklyUnits(game, 0, state.market)).toBeLessThan(
      expectedWeeklyUnits(noEa, 0, state.market),
    );
    // La cola no se toca: lejos del pico, ambos venden (casi exactamente)
    // igual — el residuo es el pico ya evaporado (spikeDecay^30).
    expect(expectedWeeklyUnits(game, 30, state.market)).toBeCloseTo(
      expectedWeeklyUnits(noEa, 30, state.market),
      3,
    );
    // La 1.0 se nombra en el historial.
    expect(state.log.some((e) => /alcanza la 1\.0/.test(e.text))).toBe(true);
  });

  it('una 1.0 floja tras vender la promesa quema más que la misma 1.0 sin compradores', () => {
    const betrayed = releaseFromEa({ good: false, eaUnits: 100_000 });
    const unnoticed = releaseFromEa({ good: false, eaUnits: 0 });
    const gameBad = betrayed.releasedGames[0];
    expect(gameBad.review).toBeLessThan(balance.earlyAccess.betrayal.reviewBar);
    // Mismo juego y misma reseña; la diferencia es quién compró la promesa.
    expect(betrayed.studio.reputation.comunidad).toBeLessThan(
      unnoticed.studio.reputation.comunidad,
    );
    expect(betrayed.studio.reputation.hardcore).toBeLessThan(
      unnoticed.studio.reputation.hardcore,
    );
    expect(betrayed.community.sentiment).toBeLessThan(unnoticed.community.sentiment);
    expect(betrayed.log.some((e) => /se sienten estafados/.test(e.text))).toBe(true);
  });

  it('una 1.0 a la altura (estudio curtido) no dispara la traición', () => {
    // El garaje recién plantado en E5 no PUEDE pasar el listón (techo de
    // madurez de 9.1): el caso real de EA es el estudio de media partida.
    const state = releaseFromEa({
      good: true,
      eaUnits: 100_000,
      state: matureE5State(),
      engineId: 'unify',
    });
    const game = state.releasedGames[0];
    expect(game.review).toBeGreaterThanOrEqual(balance.earlyAccess.betrayal.reviewBar);
    expect(state.log.some((e) => /se sienten estafados/.test(e.text))).toBe(false);
  });
});
