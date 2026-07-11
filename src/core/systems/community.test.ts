import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getCreator } from '../../data/creators';
import { getCrisisDef } from '../../data/crises';
import { createInitialState } from '../engine/initialState';
import { makeRng } from '../engine/rng';
import { tick } from '../engine/tick';
import type { ReviewBomb } from '../model/community';
import type { GameState } from '../model/gameState';
import type { MonetizationConfig } from '../model/moral';
import type { ReleasedGame } from '../model/release';
import type { Employee } from '../model/staff';
import {
  advanceCommunity,
  applyReleaseCommunityEffects,
  assignCreatorKey,
  bombSalesFactor,
  computeStreamOutcome,
  keysAllowed,
  resolveDilemma,
  respondToCrisis,
  sentimentSalesModifier,
  spawnCrisis,
  visibleReview,
} from './community';
import { advanceSales } from './sales';
import { startProject, type ProjectConcept } from './projects';

/**
 * La capa social (docs/07), con semilla fija. Guardarraíl central de la fase
 * (CA de docs/11): TODA crisis y todo review bombing es trazable a una
 * decisión del jugador — mandar un juego roto a los creadores, prometer de
 * más, acumular deuda de codicia. Sin causa, no hay crisis. Nunca.
 */

const SEED = 42;

const honest: MonetizationConfig = {
  model: 'premium',
  aggressiveness: 0,
  hasLootBoxes: false,
  hasBattlePass: false,
  dayOneDLC: false,
};

const greedy: MonetizationConfig = {
  model: 'premium+mtx',
  aggressiveness: 1,
  hasLootBoxes: true,
  hasBattlePass: false,
  dayOneDLC: false,
};

const CONCEPT: ProjectConcept = {
  name: 'Mazmorras del Alba',
  themeId: 'fantasia',
  genreId: 'rpg',
  platformId: 'pcCasero',
  audience: 'hardcore',
  size: 'pequeno',
};

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-test',
    name: 'Empleada de prueba',
    avatarSeed: 'test',
    specialty: 'diseno',
    skills: { diseno: 60, tecnica: 40, arte: 30, audio: 30, marketing: 20 },
    traits: [],
    morale: 70,
    energy: 90,
    loyalty: 60,
    salary: 800,
    level: 3,
    xp: 0,
    founder: false,
    burnedOut: false,
    weeksLowEnergy: 0,
    ...overrides,
  };
}

/** Juego lanzado mínimo (mismo patrón que morale.test.ts). */
function makeGame(overrides: Partial<ReleasedGame> = {}): ReleasedGame {
  return {
    id: 'proyecto-9',
    name: 'Juego social',
    themeId: 'fantasia',
    genreId: 'rpg',
    platformId: 'pcCasero',
    audience: 'hardcore',
    size: 'pequeno',
    price: 20,
    monetization: honest,
    quality: 80,
    review: 80,
    reviewsBySegment: { critica: 80, prensa: 80, hardcore: 80, casual: 80 },
    reviewMarket: { base: 80, modaBonus: 0, hypePenalty: 0 },
    hypeAtRelease: 0,
    saturationAtRelease: 0,
    verdict: '—',
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
    totalUnits: 0,
    totalRevenue: 0,
    mtxRevenue: 0,
    salesActive: true,
    ...overrides,
  };
}

function withGame(state: GameState, game: ReleasedGame): GameState {
  return { ...state, releasedGames: [...state.releasedGames, game] };
}

/** Estado con proyecto en Producción (fase 2), listo para repartir claves. */
function withProject(state = createInitialState(SEED)): GameState {
  const started = startProject(state, CONCEPT);
  const project = started.projects[0];
  return { ...started, projects: [{ ...project, phase: 2 }] };
}

const rng = () => makeRng(SEED, 999);

// ---------------------------------------------------------------------------

describe('sentimiento de comunidad (docs/07 §2, CA: termómetro que modula ventas)', () => {
  it('el modificador de ventas sigue al termómetro: 50 neutro, 100 al alza, 0 hundido', () => {
    const coef = balance.community.sentiment.salesCoef;
    expect(sentimentSalesModifier(50)).toBe(1);
    expect(sentimentSalesModifier(100)).toBeCloseTo(1 + coef, 6);
    expect(sentimentSalesModifier(0)).toBeCloseTo(1 - coef, 6);
  });

  it('un lanzamiento querido calienta el termómetro; uno codicioso lo enfría', () => {
    const base = createInitialState(SEED);

    const loved = makeGame({ review: 90, price: 14 }); // generoso y brillante
    const afterLoved = applyReleaseCommunityEffects(withGame(base, loved), loved.id, []);
    expect(afterLoved.community.sentiment).toBeGreaterThan(base.community.sentiment);

    const hated = makeGame({ review: 45, monetization: greedy });
    const afterHated = applyReleaseCommunityEffects(withGame(base, hated), hated.id, []);
    expect(afterHated.community.sentiment).toBeLessThan(base.community.sentiment);
  });

  it('el feed se genera con plantillas + variables (el nombre del juego aparece)', () => {
    const base = createInitialState(SEED);
    const game = makeGame({ review: 90 });
    const after = applyReleaseCommunityEffects(withGame(base, game), game.id, []);
    expect(after.community.feed.length).toBeGreaterThan(0);
    expect(after.community.feed.some((p) => p.text.includes(game.name))).toBe(true);
    // Y está acotado.
    expect(after.community.feed.length).toBeLessThanOrEqual(balance.community.feed.maxPosts);
  });

  it('semana a semana, el humor revierte hacia la reputación de comunidad', () => {
    const base = createInitialState(SEED);
    const cold: GameState = {
      ...base,
      community: { ...base.community, sentiment: 20 },
    };
    const after = advanceCommunity(cold, rng());
    expect(after.community.sentiment).toBeGreaterThan(20); // sube hacia rep 50
  });

  it('el sentimiento modula las ventas en el tick (boca a boca, docs/04 §6)', () => {
    const state = withGame(createInitialState(SEED), makeGame());
    const happy: GameState = { ...state, community: { ...state.community, sentiment: 95 } };
    const angry: GameState = { ...state, community: { ...state.community, sentiment: 5 } };
    const soldHappy = advanceSales(happy, makeRng(SEED, 1)).releasedGames[0].weeklySales[0];
    const soldAngry = advanceSales(angry, makeRng(SEED, 1)).releasedGames[0].weeklySales[0];
    expect(soldHappy).toBeGreaterThan(soldAngry);
  });
});

describe('roster de creadores y claves (docs/07 §3, CA: recurso limitado y casting)', () => {
  it('las claves son limitadas por lanzamiento y cuestan dinero y dan hype', () => {
    let s = withProject();
    const capital = s.studio.capital;
    const hype = s.projects[0].hype;

    s = assignCreatorKey(s, 'clubMeister');
    expect(s.studio.capital).toBe(capital - getCreator('clubMeister').acquisitionCost);
    expect(s.projects[0].hype).toBeGreaterThan(hype);
    expect(s.projects[0].creatorCampaign).toEqual(['clubMeister']);

    // No se puede repetir creador…
    expect(() => assignCreatorKey(s, 'clubMeister')).toThrow(/ya tiene clave/);

    // …ni superar el límite (pequeño = 2 claves).
    s = assignCreatorKey(s, 'pixelSemanal');
    expect(keysAllowed('pequeno')).toBe(2);
    expect(() => assignCreatorKey(s, 'columnaVega')).toThrow(/No quedan claves/);
  });

  it('demasiado pronto no hay claves: el reparto arranca con la Producción', () => {
    const s = startProject(createInitialState(SEED), CONCEPT); // fase 1
    expect(() => assignCreatorKey(s, 'pixelSemanal')).toThrow(/Demasiado pronto/);
  });

  it('resultadoCreador = fit × calidad × bugs: el casting importa (docs/07 §3)', () => {
    // Club Meister (competitivo hardcore) adora la estrategia hardcore…
    const strategyGame = { genreId: 'estrategia', audience: 'hardcore' as const, quality: 85 };
    const goodCast = computeStreamOutcome(getCreator('clubMeister'), strategyGame, 0);
    // …y Tele-Arcade (variedades masivo) se aburre con ella.
    const badCast = computeStreamOutcome(getCreator('teleArcade'), strategyGame, 0);
    expect(goodCast.outcome).toBeGreaterThan(badCast.outcome);
    expect(goodCast.fit).toBeGreaterThan(badCast.fit);

    // Los bugs hunden el mismo directo (factorBugs).
    const buggy = computeStreamOutcome(getCreator('clubMeister'), strategyGame, 0.5);
    expect(buggy.outcome).toBeLessThan(goodCast.outcome);
    expect(buggy.bugFactor).toBeLessThan(1);

    // La exigencia sube el listón: mismo juego mediocre, el crítico lo sufre más.
    const mediocre = { genreId: 'aventura', audience: 'amplio' as const, quality: 62 };
    const easygoing = computeStreamOutcome(getCreator('megaJoystick'), mediocre, 0);
    const demanding = computeStreamOutcome(getCreator('columnaVega'), mediocre, 0);
    expect(demanding.qualityFactor).toBeLessThan(easygoing.qualityFactor);
  });

  it('un buen directo empuja ventas y reputación del segmento del creador', () => {
    const base = createInitialState(SEED);
    const game = makeGame({ genreId: 'estrategia', quality: 85, review: 85 });
    const before = base.studio.reputation.hardcore;

    const after = applyReleaseCommunityEffects(withGame(base, game), game.id, ['clubMeister']);
    const released = after.releasedGames[0];

    expect(released.streams).toHaveLength(1);
    expect(released.streams![0].tier).toBe('exito');
    expect(released.creatorSpikeBoost).toBeGreaterThan(0);
    // El público del creador (hardcore) te quiere más.
    expect(after.studio.reputation.hardcore).toBeGreaterThan(before);
    // Y el empuje se nota en las ventas de salida.
    const boosted = advanceSales(after, makeRng(SEED, 1)).releasedGames[0].weeklySales[0];
    const plain = advanceSales(withGame(base, game), makeRng(SEED, 1)).releasedGames[0]
      .weeklySales[0];
    expect(boosted).toBeGreaterThan(plain);
  });

  it('mal fit = directo tibio o contraproducente: castigo, no premio', () => {
    const base = createInitialState(SEED);
    // Sim lento de gestión al Variedades masivo (docs/07 §3): mala idea.
    const game = makeGame({ genreId: 'estrategia', audience: 'hardcore', quality: 62, review: 62 });
    const after = applyReleaseCommunityEffects(withGame(base, game), game.id, ['teleArcade']);
    const stream = after.releasedGames[0].streams![0];
    expect(stream.tier === 'tibio' || stream.tier === 'desastre').toBe(true);
  });
});

describe('bug en directo (docs/07 §3 y CA: trazable, nunca azar arbitrario)', () => {
  const buggyBreakdown = (bugLevel: number) => ({
    ...makeGame().breakdown,
    bugLevel,
    polishScore: 1 - bugLevel,
  });

  it('mandar un juego roto a los creadores dispara el momento viral y la crisis', () => {
    const base = createInitialState(SEED);
    const buggy = makeGame({ breakdown: buggyBreakdown(0.5), review: 70 });
    const after = applyReleaseCommunityEffects(withGame(base, buggy), buggy.id, [
      'clubMeister',
      'pixelSemanal',
    ]);

    // Exactamente una víctima (el PRNG solo elige a quién, docs/07 §5).
    const victims = after.releasedGames[0].streams!.filter((s) => s.liveBug);
    expect(victims).toHaveLength(1);
    expect(victims[0].tier).toBe('desastre');

    // La crisis está abierta, señala al juego y trae review bombing.
    const crisis = after.community.crises.find((c) => c.cause === 'bugEnDirecto');
    expect(crisis).toBeDefined();
    expect(crisis!.status).toBe('abierta');
    expect(crisis!.gameId).toBe(buggy.id);
    expect(after.community.bombs.some((b) => b.gameId === buggy.id)).toBe(true);
  });

  it('el mismo juego roto SIN claves no estalla: la causa es tu decisión de casting', () => {
    const base = createInitialState(SEED);
    const buggy = makeGame({ breakdown: buggyBreakdown(0.5), review: 70 });
    const after = applyReleaseCommunityEffects(withGame(base, buggy), buggy.id, []);
    expect(after.community.crises).toHaveLength(0);
    expect(after.community.bombs).toHaveLength(0);
  });

  it('un juego pulido con claves jamás sufre el bug viral (el azar no arruina)', () => {
    const base = createInitialState(SEED);
    const clean = makeGame({ breakdown: buggyBreakdown(0.1) });
    const after = applyReleaseCommunityEffects(withGame(base, clean), clean.id, [
      'clubMeister',
      'pixelSemanal',
    ]);
    expect(after.releasedGames[0].streams!.every((s) => !s.liveBug)).toBe(true);
    expect(after.community.crises).toHaveLength(0);
  });
});

describe('review bombing (docs/07 §5, CA: estado TEMPORAL sobre nota visible y ventas)', () => {
  const bomb: ReviewBomb = {
    gameId: 'proyecto-9',
    cause: 'promesaRota',
    startWeek: 1,
    weeksLeft: 3,
    reviewPenalty: 15,
    salesPenalty: 0.6,
  };

  function bombed(): GameState {
    const s = withGame(createInitialState(SEED), makeGame());
    return { ...s, community: { ...s.community, bombs: [bomb] } };
  }

  it('hunde la nota visible sin tocar la real, y las ventas del juego señalado', () => {
    const s = bombed();
    const game = s.releasedGames[0];
    expect(visibleReview(game, s.community)).toBe(game.review - 15);
    expect(bombSalesFactor(s.community, game.id)).toBe(0.6);

    const hit = advanceSales(s, makeRng(SEED, 1)).releasedGames[0].weeklySales[0];
    const free = advanceSales(withGame(createInitialState(SEED), makeGame()), makeRng(SEED, 1))
      .releasedGames[0].weeklySales[0];
    expect(hit).toBeLessThan(free);
  });

  it('amaina con el tiempo: al expirar, la nota visible se recupera sola', () => {
    let s = bombed();
    for (let i = 0; i < 3; i++) {
      s = advanceCommunity(s, makeRng(SEED, 100 + i));
      s = { ...s, week: s.week + 1 };
    }
    expect(s.community.bombs).toHaveLength(0);
    expect(visibleReview(s.releasedGames[0], s.community)).toBe(s.releasedGames[0].review);
  });
});

describe('gestión de crisis (docs/07 §5 y docs/10 §10.8, CA: respuestas que mueven segmentos)', () => {
  /** Crisis de loot boxes con juego señalado, severidad forzada vía deuda. */
  function inCrisis(severityRaw = 0.8): GameState {
    const base = withGame(createInitialState(SEED), makeGame({ monetization: greedy }));
    return spawnCrisis(base, rng(), 'lootboxes', 'proyecto-9', severityRaw);
  }

  it('estalla con reloj, review bombing y feed en llamas', () => {
    const s = inCrisis();
    const crisis = s.community.crises[0];
    expect(crisis.status).toBe('abierta');
    expect(crisis.deadlineWeek).toBe(s.week + getCrisisDef('lootboxes').deadlineWeeks);
    expect(s.community.bombs).toHaveLength(1);
    expect(s.community.feed.some((p) => p.hashtag === getCrisisDef('lootboxes').hashtag)).toBe(true);
    expect(s.community.sentiment).toBeLessThan(50);
  });

  it('disculpa sincera: cuesta dinero, recupera comunidad/hardcore y acorta el bombing', () => {
    const s = inCrisis();
    const before = s.studio;
    const bombWeeks = s.community.bombs[0].weeksLeft;

    const after = respondToCrisis(s, s.community.crises[0].id, 'disculpa');
    expect(after.studio.capital).toBeLessThan(before.capital);
    expect(after.studio.reputation.comunidad).toBeGreaterThan(before.reputation.comunidad);
    expect(after.studio.reputation.hardcore).toBeGreaterThan(before.reputation.hardcore);
    expect(after.community.crises[0].status).toBe('gestionada');
    const bombAfter = after.community.bombs[0];
    expect(bombAfter === undefined || bombAfter.weeksLeft < bombWeeks).toBe(true);
  });

  it('comunicado corporativo: barato y suele empeorar con hardcore/comunidad', () => {
    const s = inCrisis();
    const before = s.studio.reputation;
    const after = respondToCrisis(s, s.community.crises[0].id, 'corporativo');
    expect(after.studio.reputation.hardcore).toBeLessThan(before.hardcore);
    expect(after.studio.reputation.comunidad).toBeLessThan(before.comunidad);
  });

  it('echar culpas cuela en crisis pequeñas… y se destapa SIEMPRE en las gordas', () => {
    const small = inCrisis(0.3);
    const smallCrisis = small.community.crises[0];
    expect(smallCrisis.severity).toBeLessThan(balance.community.crisis.culparBackfireSeverity);
    const afterSmall = respondToCrisis(small, smallCrisis.id, 'culpar');
    expect(afterSmall.studio.reputation.casual).toBeGreaterThanOrEqual(
      small.studio.reputation.casual,
    );

    const big = inCrisis(1);
    expect(big.community.crises[0].severity).toBeGreaterThanOrEqual(
      balance.community.crisis.culparBackfireSeverity,
    );
    const beforeBig = big.studio.reputation;
    const afterBig = respondToCrisis(big, big.community.crises[0].id, 'culpar');
    // Backfire determinista: prensa/crítica/comunidad se desploman.
    expect(afterBig.studio.reputation.prensa).toBeLessThan(beforeBig.prensa);
    expect(afterBig.studio.reputation.critica).toBeLessThan(beforeBig.critica);
    expect(afterBig.studio.reputation.comunidad).toBeLessThan(beforeBig.comunidad);
  });

  it('revertir la decisión: quita las loot boxes del juego y apaga el bombing', () => {
    const s = inCrisis();
    const after = respondToCrisis(s, s.community.crises[0].id, 'revertir');
    expect(after.releasedGames[0].monetization.hasLootBoxes).toBe(false);
    expect(after.community.bombs).toHaveLength(0);
    expect(after.studio.reputation.comunidad).toBeGreaterThan(s.studio.reputation.comunidad);
  });

  it('el reloj corre: ignorar la crisis fuerza el desenlace (tarde y peor)', () => {
    const s = inCrisis();
    const crisis = s.community.crises[0];
    const late = advanceCommunity({ ...s, week: crisis.deadlineWeek }, rng());
    const resolved = late.community.crises.find((c) => c.id === crisis.id)!;
    expect(resolved.status === 'amainada' || resolved.status === 'podrida').toBe(true);
    expect(resolved.responseId).toBe('silencio');
  });

  it('la reputación previa modula el desenlace (CA): querido = suave, odiado = incendio', () => {
    const base = withGame(createInitialState(SEED), makeGame({ monetization: greedy }));
    const loved: GameState = {
      ...base,
      studio: {
        ...base.studio,
        reputation: { critica: 90, prensa: 90, hardcore: 90, casual: 90, comunidad: 90, empleador: 90 },
      },
    };
    const hated: GameState = {
      ...base,
      studio: {
        ...base.studio,
        reputation: { critica: 15, prensa: 15, hardcore: 15, casual: 15, comunidad: 15, empleador: 15 },
      },
    };

    // 1) El colchón amortigua la severidad al estallar (crisis más suaves).
    const lovedCrisis = spawnCrisis(loved, rng(), 'lootboxes', 'proyecto-9', 0.7);
    const hatedCrisis = spawnCrisis(hated, rng(), 'lootboxes', 'proyecto-9', 0.7);
    expect(lovedCrisis.community.crises[0].severity).toBeLessThan(
      hatedCrisis.community.crises[0].severity,
    );

    // 2) Y el silencio amaina si te quieren, se pudre si te odian.
    const lovedSilence = respondToCrisis(
      lovedCrisis,
      lovedCrisis.community.crises[0].id,
      'silencio',
    );
    expect(lovedSilence.community.crises[0].status).toBe('amainada');

    const hatedSilence = respondToCrisis(
      hatedCrisis,
      hatedCrisis.community.crises[0].id,
      'silencio',
    );
    expect(hatedSilence.community.crises[0].status).toBe('podrida');
    // Pudrirse alarga el bombardeo.
    expect(hatedSilence.community.bombs[0].weeksLeft).toBeGreaterThan(
      hatedCrisis.community.bombs[0].weeksLeft,
    );
  });

  it('los escándalos de la Fase 4 estallan aquí como crisis ligadas al juego culpable', () => {
    const base = withGame(createInitialState(SEED), makeGame({ monetization: greedy }));
    const withScandal: GameState = {
      ...base,
      scandals: [
        {
          source: 'lootboxes',
          startWeek: base.week,
          weeksLeft: 8,
          salesPenalty: 0.75,
          magnitude: 0.8,
        },
      ],
    };
    const after = advanceCommunity(withScandal, rng());
    const crisis = after.community.crises.find((c) => c.cause === 'lootboxes');
    expect(crisis).toBeDefined();
    expect(crisis!.gameId).toBe('proyecto-9'); // el juego con cajas, señalado
    expect(after.community.bombs.some((b) => b.gameId === 'proyecto-9')).toBe(true);
  });
});

describe('hype, leaks y promesa (docs/07 §4, CA: dilemas con doble filo)', () => {
  it('cruzar la zona roja del manómetro dispara el dilema de sobre-hype (una vez)', () => {
    let s = withProject();
    s = { ...s, projects: [{ ...s.projects[0], hype: 0.7 }] };
    s = advanceCommunity(s, rng());
    expect(s.community.dilemmas.map((d) => d.kind)).toEqual(['sobreHype']);

    // Prometer la luna: hype arriba y promesa marcada (trazable).
    const promised = resolveDilemma(s, 'sobreHype', 'prometer');
    expect(promised.projects[0].hype).toBeGreaterThan(0.7);
    expect(promised.projects[0].overPromised).toBe(true);

    // Moderar: el hype baja de la zona roja y la comunidad lo agradece.
    const moderated = resolveDilemma(s, 'sobreHype', 'moderar');
    expect(moderated.projects[0].hype).toBeLessThan(balance.market.hype.overHypeThreshold);
    expect(moderated.community.sentiment).toBeGreaterThan(s.community.sentiment);

    // No se repite: ya disparado para este proyecto.
    const again = advanceCommunity(moderated, rng());
    expect(again.community.dilemmas).toHaveLength(0);
  });

  it('el leak exige empleados y hype; el PRNG solo decide el timing (sabor)', () => {
    let s = withProject();
    s = {
      ...s,
      staff: [...s.staff, makeEmployee()],
      projects: [{ ...s.projects[0], hype: 0.4 }],
    };

    let fired = false;
    for (let i = 0; i < 40 && !fired; i++) {
      s = advanceCommunity(s, makeRng(SEED, 5000 + i));
      fired = s.community.dilemmas.some((d) => d.kind === 'leakAlpha');
      s = { ...s, week: s.week + 1 };
    }
    expect(fired).toBe(true);

    // Capitalizar el leak: +hype y promesa marcada (docs/07 §4).
    const capitalized = resolveDilemma(s, 'leakAlpha', 'capitalizar');
    expect(capitalized.projects[0].hype).toBeGreaterThan(0.4);
    expect(capitalized.projects[0].overPromised).toBe(true);

    // Transparencia: −hype, +confianza de comunidad.
    const transparent = resolveDilemma(s, 'leakAlpha', 'transparencia');
    expect(transparent.projects[0].hype).toBeLessThan(s.projects[0].hype);
    expect(transparent.studio.reputation.comunidad).toBeGreaterThan(
      s.studio.reputation.comunidad,
    );
    expect(transparent.projects[0].overPromised).toBe(false);
  });

  it('sin empleados nadie filtra: el fundador solo en el garaje no sufre leaks', () => {
    let s = withProject();
    s = { ...s, projects: [{ ...s.projects[0], hype: 0.5 }] };
    for (let i = 0; i < 40; i++) {
      s = advanceCommunity(s, makeRng(SEED, 7000 + i));
      s = { ...s, week: s.week + 1 };
    }
    expect(s.community.dilemmas.every((d) => d.kind !== 'leakAlpha')).toBe(true);
  });

  it('promesa rota: la crisis estalla proporcional a la brecha promesa/realidad', () => {
    const base = createInitialState(SEED);

    // Sobre-prometido y flojo: crisis segura, severidad ∝ brecha (docs/07 §5).
    const flop = makeGame({ overPromised: true, hypeAtRelease: 1, review: 40, quality: 40 });
    const afterFlop = applyReleaseCommunityEffects(withGame(base, flop), flop.id, []);
    const flopCrisis = afterFlop.community.crises.find((c) => c.cause === 'promesaRota');
    expect(flopCrisis).toBeDefined();

    const meh = makeGame({ overPromised: true, hypeAtRelease: 1, review: 62, quality: 62 });
    const afterMeh = applyReleaseCommunityEffects(withGame(base, meh), meh.id, []);
    const mehCrisis = afterMeh.community.crises.find((c) => c.cause === 'promesaRota');
    expect(mehCrisis).toBeDefined();
    expect(flopCrisis!.severity).toBeGreaterThan(mehCrisis!.severity);
  });

  it('sobre-hype que CUMPLE no estalla: premio de sentimiento, no castigo', () => {
    const base = createInitialState(SEED);
    const delivers = makeGame({ overPromised: true, hypeAtRelease: 1, review: 88, quality: 88 });
    const after = applyReleaseCommunityEffects(withGame(base, delivers), delivers.id, []);
    expect(after.community.crises).toHaveLength(0);
    expect(after.community.sentiment).toBeGreaterThan(base.community.sentiment);
  });

  it('sin sobre-promesa, un flop con hype normal NO es crisis (solo reseñas duras)', () => {
    const base = createInitialState(SEED);
    const flop = makeGame({ overPromised: false, hypeAtRelease: 0.9, review: 40 });
    const after = applyReleaseCommunityEffects(withGame(base, flop), flop.id, []);
    expect(after.community.crises).toHaveLength(0);
  });
});

describe('guardarraíl de la fase (CA docs/11): sin causa del jugador, no hay crisis', () => {
  it('un estudio honesto con juego pulido y buen casting no sufre crisis en 60 semanas', () => {
    // Lanzamiento honesto, pulido, con claves bien repartidas y sin deuda.
    let s = withGame(
      createInitialState(SEED),
      makeGame({ review: 82, quality: 82, monetization: honest }),
    );
    s = applyReleaseCommunityEffects(s, 'proyecto-9', ['clubMeister', 'pixelSemanal']);
    expect(s.community.crises).toHaveLength(0);

    for (let i = 0; i < 60; i++) s = tick(s);

    expect(s.community.crises).toHaveLength(0);
    expect(s.community.bombs).toHaveLength(0);
    expect(s.scandals).toHaveLength(0);
  });

  it('determinismo: misma semilla y mismas decisiones = misma capa social', () => {
    const run = () => {
      let s = withGame(createInitialState(SEED), makeGame({ breakdown: { ...makeGame().breakdown, bugLevel: 0.5 } }));
      s = applyReleaseCommunityEffects(s, 'proyecto-9', ['clubMeister', 'pixelSemanal']);
      for (let i = 0; i < 10; i++) s = tick(s);
      return s;
    };
    const a = run();
    const b = run();
    expect(a.community).toEqual(b.community);
    expect(a.studio.reputation).toEqual(b.studio.reputation);
  });
});
