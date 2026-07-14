import {
  createInitialState,
  generateCandidates,
  type ActiveCrisis,
  type CommunityPost,
  type Employee,
  type EraId,
  type GameState,
  type Project,
  type ReleasedGame,
  type ReviewLine,
} from '../core';
import { eraOrder, getEra } from '../data/eras';
import { useGameStore, type ImportantNotice, type Screen } from '../state/store';

/**
 * Arnés de demostración SOLO para desarrollo (docs/13: "verificación visual").
 * No forma parte del juego: con `?demo=studio` o `?demo=gala` siembra un
 * estado de escaparate en el store para capturar la vista principal (Oficina
 * Viva) y la gala de reseña sin tener que jugar hasta ahí. Guardado tras
 * `import.meta.env.DEV`, así que Vite lo elimina del build de producción.
 *
 * Solo construye estado de PRESENTACIÓN a partir de tipos del núcleo; no
 * calcula reglas de juego (docs/08). No se usa en tests.
 */

const DEMO_SEED = 20240712;

/** Reparte staff de escaparate: el fundador + una tanda de candidatos adoptados. */
function demoStaff(base: GameState, count: number): Employee[] {
  const extra = generateCandidates(DEMO_SEED, 5, 60, count - 1);
  return [base.staff[0], ...extra].map((e, i) => ({
    ...e,
    founder: i === 0,
    morale: 62 + ((i * 7) % 22),
    energy: 58 + ((i * 11) % 30),
  }));
}

/** Un proyecto a media Producción, con puntos y algo de deuda de bugs (para orbes). */
function demoProject(assignedIds: string[]): Project {
  return {
    id: 'demo-proj',
    name: 'Némesis Solar',
    themeId: 'espacio',
    genreId: 'shooter',
    platformId: 'pcCasero',
    audience: 'amplio',
    size: 'mediano',
    price: 40,
    monetization: {
      model: 'premium+mtx',
      aggressiveness: 0.5,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    },
    marketingUsed: [1],
    creatorCampaign: [],
    overPromised: false,
    phase: 2,
    focus: [
      { motor: 0.34, jugabilidad: 0.4, historia: 0.26 },
      { dialogos: 0.3, nivelMundo: 0.42, ia: 0.28 },
      { graficos: 0.4, sonido: 0.3, qa: 0.3 },
    ],
    chosenFeatureIds: [],
    assignedStaff: assignedIds,
    crunch: false,
    hype: 0.44,
    weeksSpent: 9,
    designPoints: 168,
    techPoints: 132,
    qaInvested: 0,
    bugDebt: 5.2,
  };
}

/** Feed de comunidad de escaparate (docs/10 §7.3). */
const demoFeed: CommunityPost[] = [
  { week: 1522, mood: 'positivo', author: '@rgb_rita', text: '«Némesis Solar» pinta espectacular en el último tráiler 🚀', hashtag: '#NémesisSolar' },
  { week: 1523, mood: 'neutro', author: '@lurker_lu', text: '¿Alguien más nota que este estudio se está poniendo agresivo con las tiendas dentro del juego?' },
  { week: 1524, mood: 'positivo', author: '@combo_bro', text: 'El estudio que hizo Mazmorras del Alba nunca falla. Comprado a ciegas.', hashtag: '#HypeTrain' },
  { week: 1524, mood: 'negativo', author: '@modo_foto', text: 'Como metan otra tienda de skins, me bajo. Ojito.', hashtag: '#NoPayToWin' },
  { week: 1525, mood: 'positivo', author: '@pixel_pau', text: 'La banda sonora filtrada es una locura. Estos saben lo que hacen.' },
];

/** Estado de escaparate: la vista principal con la Oficina Viva a pleno rendimiento. */
function studioDemo(): GameState {
  const base = createInitialState(DEMO_SEED);
  const staff = demoStaff(base, 7);
  const project = demoProject(staff.map((e) => e.id));
  const released = makeReleasedGame(88, 1520);
  return {
    ...base,
    week: 1526,
    era: 'E5',
    studio: {
      ...base.studio,
      capital: 1_840_000,
      scaleStage: 3,
      moralDrift: -0.46,
      reputation: {
        critica: 78,
        prensa: 66,
        hardcore: 84,
        casual: 52,
        comunidad: 71,
        empleador: 58,
      },
    },
    staff,
    projects: [project],
    releasedGames: [released],
    community: { ...base.community, sentiment: 68, feed: demoFeed },
    log: [
      { week: 1525, type: 'comunidad', text: 'El hype por «Némesis Solar» sigue creciendo.' },
      { week: 1522, type: 'lanzamiento', text: '«Órbita Rota» reseñó 88/100. ¡Un éxito!' },
      { week: 1520, type: 'moral', text: 'Decidiste añadir microtransacciones a «Némesis Solar».' },
    ],
  };
}

/** Un juego lanzado de escaparate (para la gala y la estantería). */
function makeReleasedGame(review: number, releaseWeek: number): ReleasedGame {
  const lines: ReviewLine[] = [
    { factor: 'fit', tone: 'good', title: 'Encaje impecable', detail: 'ciencia-ficción y shooter para un público amplio: justo lo que pedía el mercado.' },
    { factor: 'balance', tone: 'good', title: 'Diseño y técnica en equilibrio', detail: 'ni un motor vacío ni una idea sin pulir.' },
    { factor: 'features', tone: 'ok', title: 'Contenido correcto', detail: 'cumple, aunque le faltó alguna característica estrella.' },
    { factor: 'polish', tone: 'good', title: 'Acabado brillante', detail: 'prácticamente sin bugs en el lanzamiento.' },
    { factor: 'team', tone: 'good', title: 'Un equipo en racha', detail: 'moral alta y química: se nota en cada detalle.' },
    { factor: 'innovation', tone: 'ok', title: 'Ideas conocidas', detail: 'brilla en la ejecución más que en la sorpresa.' },
  ];
  return {
    id: 'demo-game',
    name: 'Órbita Rota',
    themeId: 'espacio',
    genreId: 'shooter',
    platformId: 'pcCasero',
    audience: 'amplio',
    size: 'mediano',
    price: 40,
    monetization: {
      model: 'premium',
      aggressiveness: 0,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    },
    quality: 84,
    review,
    reviewsBySegment: { critica: 90, prensa: 85, hardcore: 91, casual: 82 },
    reviewMarket: { base: 84, modaBonus: 5, hypePenalty: 1 },
    hypeAtRelease: 0.52,
    saturationAtRelease: 0.1,
    verdict: 'Una carta de amor al espacio: de lo mejor del año.',
    breakdown: {
      fit: 0.92,
      fitParts: { themeGenre: 0.9, genrePlatform: 0.95, audience: 0.9 },
      balanceScore: 0.88,
      dReal: 0.56,
      dIdeal: 0.55,
      featureScore: 0.7,
      polishScore: 0.94,
      bugLevel: 0.06,
      teamFactor: 1.12,
      teamParts: { competenceFactor: 1.1, moraleFactor: 1.08, synergyFactor: 1.05 },
      innovationMod: 1.02,
      base: 0.85,
      qualityCap: 90,
    },
    lines,
    releaseWeek,
    weeklySales: [42000, 68000, 51000, 39000],
    totalUnits: 200000,
    totalRevenue: 8000000,
    mtxRevenue: 0,
    salesActive: true,
    streams: [
      { creatorId: 'pixelSemanal', outcome: 0.86, fit: 0.9, qualityFactor: 0.9, bugFactor: 0.94, tier: 'exito', liveBug: false, salesBoost: 0.22 },
      { creatorId: 'megaJoystick', outcome: 0.71, fit: 0.78, qualityFactor: 0.9, bugFactor: 0.95, tier: 'exito', liveBug: false, salesBoost: 0.14 },
    ],
    creatorSpikeBoost: 0.36,
    overPromised: false,
  };
}

/** Estado de escaparate: la gala de reseña de un hitazo (docs/10 §7.1). */
function galaDemo(): GameState {
  const base = studioDemo();
  const game = makeReleasedGame(88, base.week);
  return { ...base, releasedGames: [game] };
}

/** Estado de escaparate: una crisis abierta con su reloj (docs/10 §10.8). */
function crisisDemo(): GameState {
  const base = studioDemo();
  const crisis: ActiveCrisis = {
    id: 'demo-crisis',
    cause: 'mtxAgresivas',
    gameId: 'demo-game',
    startWeek: base.week - 1,
    deadlineWeek: base.week + 2,
    severity: 0.72,
    status: 'abierta',
  };
  const rageFeed: CommunityPost[] = [
    { week: base.week, mood: 'negativo', author: '@combo_bro', text: 'Pay-to-win descarado. Reembolso pedido.', hashtag: '#PayToLose' },
    { week: base.week, mood: 'negativo', author: '@modo_foto', text: 'Nos vieron la cara con la tienda. Boicot.', hashtag: '#PayToLose' },
    ...demoFeed.slice(0, 3),
  ];
  return {
    ...base,
    community: { ...base.community, sentiment: 31, feed: rageFeed, crises: [crisis] },
  };
}

/** Estado de escaparate: la campaña de creadores con el Directo (docs/10 §7.2). */
function creatorsDemo(): GameState {
  const base = studioDemo();
  // Un directo con bug viral para lucir el sello CLIP'D (docs/07 §3).
  const game = makeReleasedGame(74, base.week - 4);
  game.streams = [
    { creatorId: 'pixelSemanal', outcome: 0.82, fit: 0.9, qualityFactor: 0.88, bugFactor: 0.9, tier: 'exito', liveBug: false, salesBoost: 0.2 },
    { creatorId: 'megaJoystick', outcome: 0.24, fit: 0.6, qualityFactor: 0.7, bugFactor: 0.3, tier: 'desastre', liveBug: true, salesBoost: 0 },
  ];
  return { ...base, releasedGames: [game] };
}

/**
 * Cola de avisos importantes de escaparate (docs/17 U4): el P&L de salida del
 * mercado al frente (para la captura), seguido de renuncia, bancarrota y
 * subida de etapa, para revisar el drenado uno a uno.
 */
function noticeQueue(): ImportantNotice[] {
  return [
    {
      id: 1,
      kind: 'marketExit',
      gameId: 'demo-game',
      gameName: 'Órbita Rota',
      revenue: 1_240_000,
      cost: 465_000,
      units: 41_800,
    },
    { id: 2, kind: 'staffLeft', employeeName: 'Marta Navarro', role: 'Técnica' },
    { id: 3, kind: 'bankruptcyWarning', graceWeeks: 8 },
    { id: 4, kind: 'scaleUp', stage: 4, stageName: 'Corporación' },
  ];
}

/** Sitúa el estado de escaparate en otra era (para capturar sus pieles, 7E). */
function withEra(state: GameState, era: EraId): GameState {
  return { ...state, era, week: getEra(era).startWeek + 26 };
}

/** Aplica el escaparate pedido por la query string. Devuelve true si sembró algo. */
export function applyDemoFromQuery(): boolean {
  if (!import.meta.env.DEV) return false;
  const params = new URLSearchParams(window.location.search);
  const demo = params.get('demo');
  if (!demo) return false;

  // `&era=E4` recoloca cualquier escaparate en esa era (piel incluida).
  const eraParam = params.get('era');
  const era: EraId | null =
    eraParam !== null && (eraOrder as readonly string[]).includes(eraParam)
      ? (eraParam as EraId)
      : null;

  const seed = (game: GameState, screen: Screen, reviewGameId: string | null) =>
    useGameStore.setState({
      game: era !== null ? withEra(game, era) : game,
      screen,
      speed: 0,
      reviewGameId,
      activeProjectId: 'demo-proj',
      // Los escaparates son partidas en marcha, nunca el título (Fase 7F).
      appMode: 'game',
      sessionActive: true,
      tutorialStep: null,
    });

  if (demo === 'studio') {
    seed(studioDemo(), 'estudio', null);
    return true;
  }
  if (demo === 'gala') {
    seed(galaDemo(), 'resena', 'demo-game');
    return true;
  }
  if (demo === 'crisis') {
    seed(crisisDemo(), 'estudio', null);
    return true;
  }
  if (demo === 'creators') {
    seed(creatorsDemo(), 'creadores', null);
    return true;
  }
  // Los avisos importantes que pausan el tiempo (docs/17 U4): el modal de P&L
  // al frente. `&era=E4` reviste el estudio de fondo con su piel.
  if (demo === 'aviso') {
    seed(studioDemo(), 'estudio', null);
    useGameStore.setState({ pendingNotices: noticeQueue() });
    return true;
  }
  // El beat de transición de era (7E): overlay sobre la piel de la era vieja.
  if (demo === 'era') {
    seed(studioDemo(), 'estudio', null);
    useGameStore.setState({ eraTransition: era ?? 'E5' });
    return true;
  }
  // El tutorial guiado (7F) en una partida recién fundada; `&step=N` salta
  // directo a un paso del guion (ui/onboarding/steps.ts) para capturarlo.
  if (demo === 'tutorial') {
    const stepParam = Number(params.get('step') ?? '0');
    useGameStore.setState({
      game: createInitialState(DEMO_SEED),
      screen: 'estudio',
      speed: 0,
      reviewGameId: null,
      activeProjectId: null,
      appMode: 'game',
      sessionActive: true,
      tutorialStep: Number.isInteger(stepParam) && stepParam >= 0 ? stepParam : 0,
    });
    return true;
  }
  return false;
}
