import {
  advanceAwards,
  buildReviewLines,
  computeCeilingContext,
  computeQuality,
  computeSegmentReviews,
  computeTeamFactor,
  createInitialState,
  generateCandidates,
  makeRng,
  reviewVerdict,
  type ActiveCrisis,
  type CommunityPost,
  type Employee,
  type EraId,
  type GameState,
  type Project,
  type ReleasedGame,
  type ReviewLine,
} from '../core';
import { researchNodes } from '../data/research';
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

/** Pantallas válidas para `&pantalla=` (el tipo Screen no existe en runtime). */
const SCREENS: readonly Screen[] = [
  'estudio',
  'resena',
  'equipo',
  'mercado',
  'creadores',
  'investigacion',
  'finanzas',
  'legado',
];

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
  // 8 personas: justo el requisito de plantilla de la etapa 4 (docs/18 V4-c),
  // así ?demo=cronologia&eje=escala luce el botón "Ampliar estudio" habilitado
  // (con 1,84M de caja también cumple el capital) y la oficina sale llena.
  const staff = demoStaff(base, 8);
  const project = demoProject(staff.map((e) => e.id));
  // Un catálogo con las dos caras de docs/17 U2: lo que aún vende (con cola,
  // para el mini-gráfico) y lo retirado, que solo debe salir en el modal.
  const released = makeReleasedGame(88, 1520);
  const secondHit: ReleasedGame = {
    ...makeReleasedGame(74, 1498),
    id: 'demo-game-2',
    name: 'Ciudad Neón',
    themeId: 'cyberpunk',
    weeklySales: [88000, 61000, 44000, 33000, 27000, 22000, 19000, 16000, 14000, 12000, 11000, 9800],
    totalUnits: 356_800,
    totalRevenue: 12_400_000,
  };
  const retired: ReleasedGame = {
    ...makeReleasedGame(63, 1402),
    id: 'demo-game-0',
    name: 'Garaje Racer',
    weeklySales: [9000, 5000, 2000, 400],
    totalUnits: 16_400,
    totalRevenue: 410_000,
    salesActive: false,
  };
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
    releasedGames: [retired, secondHit, released],
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

/**
 * Escaparates de la Fase 9.1 (docs/19 §9.1): dos galas calculadas con el
 * NÚCLEO real (computeQuality + computeSegmentReviews + buildReviewLines),
 * como premiosDemo hace con advanceAwards — aquí no se inventa nada.
 *
 * · temprana: primer estudio de garaje en E1 — el techo de madurez manda,
 *   la nota es humilde y la gala la reencuadra como logro (récord personal).
 * · madura:   estudio consolidado de E5 con estrella y toda la I+D — techo
 *   alto, pero secuela con fatiga, hype alto y banda en contra: el desglose
 *   luce TODAS las líneas nuevas (techo, alcance, listón, fatiga, banda).
 */
function escaladaDemo(mature: boolean): GameState {
  const base = createInitialState(DEMO_SEED);

  /** Historial mínimo válido: solo pesan tamaño y reseña (madurez + récord). */
  const pastGame = (i: number, size: ReleasedGame['size'], review: number): ReleasedGame => ({
    ...makeReleasedGame(review, 40 + i * 20),
    id: `past-${i}`,
    name: `Clásico ${i + 1}`,
    size,
    weeklySales: [],
    totalUnits: 12_000,
    totalRevenue: 240_000,
    salesActive: false,
    streams: undefined,
    creatorSpikeBoost: undefined,
  });

  const state: GameState = mature
    ? {
        ...base,
        week: getEra('E5').startWeek + 40,
        era: 'E5',
        studio: { ...base.studio, capital: 6_200_000, scaleStage: 5 },
        staff: demoStaff(base, 8).map((e, i) => ({
          ...e,
          // Equipo veterano en forma: la madurez también se nota en la gente.
          morale: 84 + ((i * 5) % 10),
          energy: 88 + ((i * 7) % 12),
          // Una ESTRELLA en el rol clave del RPG (docs/19: la obra maestra la exige).
          skills: i === 1 ? { ...e.skills, diseno: 91 } : e.skills,
        })),
        releasedGames: [
          ...Array.from({ length: 14 }, (_, i) => pastGame(i, 'mediano', 60 + (i % 12))),
          ...Array.from({ length: 8 }, (_, i) => pastGame(14 + i, 'grande', 66 + (i % 10))),
          ...Array.from({ length: 6 }, (_, i) => pastGame(22 + i, 'muyGrande', 70 + (i % 8))),
        ],
        research: { ...base.research, unlocked: researchNodes.map((n) => n.id) },
      }
    : {
        ...base,
        week: 41,
        // Un primer intento humilde ya lanzado: el récord que vamos a batir.
        releasedGames: [pastGame(0, 'pequeno', 41)],
      };

  const project: Project = {
    ...demoProject(state.staff.map((e) => e.id)),
    id: 'demo-91',
    name: mature ? 'Mazmorras del Alba III' : 'Cueva de Cristal',
    themeId: 'fantasia',
    genreId: 'rpg',
    audience: 'hardcore',
    size: mature ? 'mediano' : 'pequeno',
    monetization: {
      model: 'premium',
      aggressiveness: 0,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    },
    // Ejecución cuidada: balance ideal del RPG (0.65) y QA hecho.
    designPoints: 6.5,
    techPoints: 3.5,
    chosenFeatureIds: mature
      ? ['mundoAbierto', 'fisicasAvanzadas', 'sistemaCrafteo', 'finalRamificado']
      : ['mundoAbierto', 'fisicasAvanzadas'],
    qaInvested: 0.3,
    bugDebt: mature ? 0.3 : 0.28,
    hype: mature ? 0.35 : 0.12,
  };

  const teamResult = computeTeamFactor(state.staff, project.genreId);
  const ceiling = computeCeilingContext(state, state.staff, project.genreId, project.size);
  const { q, breakdown } = computeQuality(project, {
    era: state.era,
    teamFactor: teamResult.teamFactor,
    comboRepeats: mature ? 1 : 0,
    ceiling,
  });
  const reviews = computeSegmentReviews({
    quality: q,
    genreId: project.genreId,
    themeId: project.themeId,
    audience: project.audience,
    hype: project.hype,
    monetization: project.monetization,
    era: state.era,
    market: state.market,
    // La secuela madura arrastra fatiga de fórmula; la banda sopla en contra
    // (madura) o a favor (temprana) para lucir ambas caras de la línea.
    recentRepeats: mature ? 1 : 0,
    bandOffset: mature ? -2 : 2,
  });
  const review = reviews.average;
  const previousBest = state.releasedGames.reduce((best, g) => Math.max(best, g.review), 0);

  const game: ReleasedGame = {
    ...makeReleasedGame(review, state.week),
    id: 'demo-91',
    name: project.name,
    themeId: project.themeId,
    genreId: project.genreId,
    audience: project.audience,
    size: project.size,
    monetization: project.monetization,
    quality: q,
    reviewsBySegment: reviews.bySegment,
    reviewMarket: reviews.info,
    hypeAtRelease: project.hype,
    verdict: reviewVerdict(review),
    breakdown: {
      ...breakdown,
      teamParts: {
        competenceFactor: teamResult.competenceFactor,
        moraleFactor: teamResult.moraleFactor,
        synergyFactor: teamResult.synergyFactor,
      },
    },
    lines: buildReviewLines(breakdown, project, reviews.info),
    weeklySales: [],
    totalUnits: 0,
    totalRevenue: 0,
    streams: undefined,
    creatorSpikeBoost: undefined,
    personalBest: review > previousBest,
    previousBestReview: previousBest,
  };

  return { ...state, releasedGames: [...state.releasedGames, game] };
}

/**
 * Estado de escaparate: la gala anual de premios (docs/18 V7). El ranking NO
 * se inventa aquí: se siembra un año con un lanzamiento y se deja que el
 * núcleo (`advanceAwards`) resuelva la ceremonia de verdad, igual que en el
 * tick. `ganas` siembra el caso aspiracional (E7, un AAA y prestigio de
 * megacorporación); si no, el caso normal: te nominan y quedas en el ranking.
 */
function premiosDemo(ganas: boolean): GameState {
  const base = studioDemo();
  const week = 52 * 4; // semana de gala (múltiplo del intervalo anual)
  const game: ReleasedGame = {
    ...makeReleasedGame(ganas ? 88 : 84, week - 20),
    size: ganas ? 'aaa' : 'mediano',
    reviewsBySegment: ganas
      ? { critica: 88, prensa: 88, hardcore: 85, casual: 85 }
      : { critica: 84, prensa: 82, hardcore: 80, casual: 78 },
  };
  const prestige = ganas ? 95 : 55;
  const seeded: GameState = {
    ...base,
    week,
    era: ganas ? 'E7' : 'E2',
    releasedGames: [game],
    studio: {
      ...base.studio,
      awards: [],
      lastCeremony: null,
      awardHype: 0,
      reputation: { ...base.studio.reputation, critica: prestige, prensa: prestige },
    },
  };
  // El mismo stream que usa el tick (core/engine/tick.ts) para la gala.
  return advanceAwards(seeded, makeRng(seeded.seed, (7 << 20) + week));
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
    { id: 4, kind: 'scaleUp', stage: 4, stageName: 'Estudio grande', cost: 750_000 },
  ];
}

/**
 * Estado de escaparate: la progresión del conocimiento (docs/17 P1/P2). Un
 * estudio de E5 con 💡 para gastar, un par de temas ya investigados y ningún
 * nodo de conocimiento comprado: la pantalla de I+D luce los "Temas por
 * investigar" y los nodos de "Inteligencia de mercado" con su "Revela:".
 */
function knowledgeDemo(): GameState {
  const base = studioDemo();
  return {
    ...base,
    research: { ...base.research, points: 42, unlocked: [], themes: ['zombis', 'cyberpunk'], insights: [] },
  };
}

/** Sitúa el estado de escaparate en otra era (para capturar sus pieles, 7E). */
function withEra(state: GameState, era: EraId): GameState {
  return { ...state, era, week: getEra(era).startWeek + 26 };
}

/**
 * Aplica el escaparate pedido por la query string. Devuelve true si sembró algo.
 *
 * De paso expone el store en `window` para la verificación por CDP (docs/08 §8:
 * Chrome headless, porque en el Browser pane rAF no dispara): permite leer el
 * estado real tras conducir la UI, en vez de deducirlo del DOM. Dev-only como
 * todo este arnés — Vite lo elimina del build.
 */
export function applyDemoFromQuery(): boolean {
  if (!import.meta.env.DEV) return false;
  (window as Window & { useGameStore?: typeof useGameStore }).useGameStore = useGameStore;
  const params = new URLSearchParams(window.location.search);
  const demo = params.get('demo');
  if (!demo) return false;

  // `&era=E4` recoloca cualquier escaparate en esa era (piel incluida).
  const eraParam = params.get('era');
  const era: EraId | null =
    eraParam !== null && (eraOrder as readonly string[]).includes(eraParam)
      ? (eraParam as EraId)
      : null;

  // `&pantalla=equipo` abre cualquier escaparate en otra pantalla: sirve para
  // auditar el contraste de una piel donde vive el texto (docs/18 V1).
  const screenParam = params.get('pantalla');
  const forcedScreen: Screen | null =
    screenParam !== null && SCREENS.includes(screenParam as Screen) ? (screenParam as Screen) : null;

  const seed = (game: GameState, screen: Screen, reviewGameId: string | null) =>
    useGameStore.setState({
      game: era !== null ? withEra(game, era) : game,
      screen: forcedScreen ?? screen,
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
  // La escalada de 9.1 (docs/19 §9.1): la gala de un primer juego humilde
  // (reencuadrado como logro) o, con `&madura=1`, la de un estudio hecho y
  // derecho con fatiga de fórmula y banda en contra. Núcleo real, no atrezzo.
  if (demo === 'escalada') {
    seed(escaladaDemo(params.get('madura') === '1'), 'resena', 'demo-91');
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
  // La progresión del conocimiento (docs/17 P1/P2): la pantalla de I+D con los
  // temas por investigar y los nodos de conocimiento de mercado.
  if (demo === 'conocimiento') {
    seed(knowledgeDemo(), 'investigacion', null);
    return true;
  }
  // El arranque A CIEGAS (docs/17 P2): partida recién fundada con el modal de
  // concepción abierto — Fit "por descubrir" y precio de referencia oculto.
  if (demo === 'aciegas') {
    // `&era=` también manda aquí: la cabecera promete que recoloca CUALQUIER
    // escaparate, y hace falta para auditar el modal sobre pieles como el
    // cristal de E7. Sin ella, esta rama se quedaba clavada en E1.
    const fresh = createInitialState(DEMO_SEED);
    useGameStore.setState({
      game: era !== null ? withEra(fresh, era) : fresh,
      screen: 'estudio',
      speed: 0,
      reviewGameId: null,
      activeProjectId: null,
      appMode: 'game',
      sessionActive: true,
      tutorialStep: null,
      conceptionOpen: true,
    });
    return true;
  }
  // Los avisos importantes que pausan el tiempo (docs/17 U4): el modal de P&L
  // al frente. `&era=E4` reviste el estudio de fondo con su piel.
  if (demo === 'aviso') {
    seed(studioDemo(), 'estudio', null);
    useGameStore.setState({ pendingNotices: noticeQueue() });
    return true;
  }
  // La gala anual competitiva (docs/18 V7): el ranking con nominados ficticios
  // y tu puesto. `&ganas=1` captura el puesto 1.º (con confeti); si no, el caso
  // realista de las eras tempranas: nominado, pero no ganas.
  if (demo === 'premios') {
    const game = premiosDemo(params.get('ganas') === '1');
    seed(game, 'estudio', null);
    useGameStore.setState({ awardsWeek: game.studio.lastCeremony?.week ?? null });
    return true;
  }
  // El beat de transición de era (7E): overlay sobre la piel de la era vieja.
  if (demo === 'era') {
    seed(studioDemo(), 'estudio', null);
    useGameStore.setState({ eraTransition: era ?? 'E5' });
    return true;
  }
  // Las cronologías (docs/17 U1): `&eje=escala` para la de etapas. El estudio
  // de escaparate (E5, consolidado) luce los tres estados de nodo a la vez.
  if (demo === 'cronologia') {
    seed(studioDemo(), 'estudio', null);
    useGameStore.setState({ timeline: params.get('eje') === 'escala' ? 'escala' : 'eras' });
    return true;
  }
  // El tutorial guiado (7F) en una partida recién fundada; `&step=N` salta
  // directo a un paso del guion (ui/onboarding/steps.ts) para capturarlo.
  if (demo === 'tutorial') {
    const stepParam = Number(params.get('step') ?? '0');
    // El tutorial real solo ocurre en E1 (partida recién fundada), pero `&era=`
    // sigue valiendo para auditar su guía sobre cualquier piel.
    const fresh = createInitialState(DEMO_SEED);
    useGameStore.setState({
      game: era !== null ? withEra(fresh, era) : fresh,
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
