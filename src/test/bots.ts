import { balance } from '../data/balance';
import { eraIndex, getEra } from '../data/eras';
import { featureGenreAffinity } from '../data/features';
import { researchNodes } from '../data/research';
import { createInitialState } from '../core/engine/initialState';
import { tick } from '../core/engine/tick';
import type { CrisisResponseId, DilemmaKind } from '../core/model/community';
import type { GameState } from '../core/model/gameState';
import type { MonetizationConfig } from '../core/model/moral';
import type { ProjectSize } from '../core/model/project';
import type { Employee } from '../core/model/staff';
import { resolveDilemma, respondToCrisis, type DilemmaChoice } from '../core/systems/community';
import {
  availableCredit,
  outstandingDebt,
  repayLoan,
  takeLoan,
  weeklyFixedCosts,
} from '../core/systems/economy';
import {
  availableLicensedEngines,
  buildableCapabilities,
  engineAdequacy01,
  engineBuildCost,
  engineHasCapability,
  maxBuildableGeneration,
  startEngineBuild,
} from '../core/systems/engines';
import { lootBoxesBanned } from '../core/systems/morale';
import { teamPower } from '../core/systems/maturity';
import {
  earlyAccessBlockReason,
  launchEarlyAccess,
} from '../core/systems/earlyAccess';
import {
  activeLiveServices,
  launchLiveService,
  liveServiceBlockReason,
  liveServiceStaffIds,
  liveServiceWeeklyNet,
  requiredLiveStaff,
  sunsetLiveService,
  toggleLiveServiceAssignment,
} from '../core/systems/liveService';
import {
  acquireStudio,
  acquisitionBlockReason,
  acquisitionPriceFor,
  sellSubsidiary,
  setSubsidiaryDirective,
  subsidiaryList,
  subsidiaryUpkeep,
} from '../core/systems/subsidiaries';
import { publisherOffersFor } from '../core/systems/publishers';
import {
  confirmContestedRelease,
  delayContestedRelease,
  estimateProject,
  projectTotalWeeks,
  sizeBlockReason,
  startProject,
  toggleFeature,
} from '../core/systems/projects';
import { comboPopularity } from '../core/systems/market';
import { computeFit } from '../core/systems/quality';
import { resolvePoachOffer } from '../core/systems/rivals';
import {
  buyResearch,
  researchNodeStatus,
  researchTheme,
  themeResearchCost,
  themeResearchStatus,
  toggleResearchAssignment,
} from '../core/systems/research';
import {
  expandBlockReason,
  expandStudio,
  hireBlockReason,
  hireCandidate,
  hiringCost,
  motivateEmployee,
  staffCap,
  toggleAssignment,
  trainEmployee,
} from '../core/systems/staff';
import {
  availableFeatures,
  availableGenres,
  availableMonetizationModels,
  availableThemes,
  monetizationFlagAvailable,
  researchableThemes,
} from '../core/systems/unlocks';

/**
 * Bots de balance de PARTIDA COMPLETA (docs/08 §8, Fase 7G): cada filosofía
 * de docs/01 §5 juega desde el garaje de 1980 hasta dos años dentro de E7,
 * tomando cada semana las decisiones de su arquetipo (tamaño, monetización,
 * plantilla, cuidado del equipo, crisis y dilemas). Los usan el test de CA
 * (core/systems/fullGame.test.ts) y los diagnósticos de balance.
 */

export const BOT_SEED = 4242;
/** Dos años dentro de E7: la partida completa de docs/02 §6. */
export const FINAL_WEEK = getEra('E7').startWeek + 104;

export interface Philosophy {
  name: string;
  /** Multiplicador sobre el precio recomendado (docs/06 §2). */
  priceMult: number;
  /** Agresividad MTX cuando el modelo existe (docs/09 §9). */
  aggressiveness: number;
  /** Mete loot boxes en cuanto se inventan (hasta que la ley las mate). */
  useLootBoxes: boolean;
  /** Usa premium+dlc honesto cuando existe (E4+). */
  useDlc: boolean;
  /** Forma y motiva al equipo con regularidad (palanca de integridad). */
  care: boolean;
  /** Plantilla objetivo por índice de era (0..6): la ambición del arquetipo. */
  teamTargetByEra: readonly number[];
  /** Techo de tamaño de proyecto que este arquetipo persigue. */
  sizeAmbition: 'indie' | 'media' | 'aaa';
  /** Etapa de escala máxima que compra (docs/18 V4-c): la identidad manda. */
  stageAmbition: 1 | 2 | 3 | 4 | 5;
  /**
   * Con quién firma cuando la caja no da (9.6, docs/19 §9.6): 'sinIp' no
   * vende el alma (rechaza tratos que se quedan la IP); 'siempre' coge el
   * cheque más gordo sin leer la letra pequeña.
   */
  publisherStance: 'sinIp' | 'siempre';
  /** Abre acceso anticipado en sus auto-publicados cuando existe (9.6). */
  useEarlyAccess: boolean;
  /**
   * Servicios en vivo (9.7, docs/19 §9.7): 'no' ni los toca; 'cuidado' opera
   * honesto (sin pase ni tienda) y mantiene la dotación; 'exprimido' les mete
   * pase + tienda agresiva — más caja, más pólvora.
   */
  liveOps: 'no' | 'cuidado' | 'exprimido';
  /**
   * Adquisiciones (9.7): 'no' no compra; si compra, la directiva de sus
   * filiales ('invertir' las construye, 'exprimir' las quema por caja).
   */
  acquisitions: 'no' | 'invertir' | 'exprimir';
  crisisResponse: CrisisResponseId;
  dilemma: Record<DilemmaKind, DilemmaChoice>;
  /**
   * Colchón (semanas del NUEVO coste fijo de la etapa) que exige tras ampliar
   * (docs/18 V4-c): los arquetipos son prudentes (52 ≈ un año); el optimizador
   * (10.1, docs/20 W8) aprieta y amplía en cuanto puede pagarlo con holgura
   * mínima — como un jugador competente. Default 52.
   */
  expandCushionWeeks?: number;
  /**
   * Fracción de los costes fijos de calendario que exige de colchón para
   * AUTO-PUBLICAR un tamaño (pickProject): los arquetipos exigen el calendario
   * entero (1, prudencia máxima); el optimizador arriesga más (0,5) y salta de
   * tamaño antes, apoyándose en el préstamo puente si hace falta. Default 1.
   */
  projectCushionMult?: number;
  /**
   * Encaje de alcance mínimo para ELEGIR un tamaño (10.1, docs/20 W8): un
   * jugador competente no lanza un tamaño que su equipo no puede ejecutar bien
   * — sobredimensionar hunde `alcance01` → Q → ventas (docs/19 §9.1). El
   * optimizador exige `teamPower(plantilla) / powerTarget[tamaño] ≥` este valor
   * antes de subir de tamaño. Undefined = sin gate de alcance.
   *
   * Desde 10.2-B los ARQUETIPOS también lo llevan, con una barra más laxa
   * (0,75 frente al 1,0 del optimizador): son ambiciosos, no suicidas. Sin él
   * la fábrica y el equilibrado encadenaban Grandes y Muy grandes con equipos
   * cortos y firmaban reseñas de 24–41 — y un bot que publica basura no mide
   * el diseño, mide su propia incompetencia (misma lección que el optimizador
   * sin gate en 10.1, docs/20 W8). Su identidad la sigue marcando
   * `sizeAmbition`; esto solo evita que se estrellen contra su propio techo.
   */
  scopeMinRatio?: number;
  /**
   * Endeudamiento AGRESIVO (Fase 10.2-A Exp1, docs/20): pide préstamo al MÁXIMO
   * disponible en cuanto eso le permita SUBIR DE ETAPA antes (cumple el gate de
   * plantilla y solo le falta capital para el requisito + la obra), y amortiza
   * en cuanto le sobra caja. Los arquetipos y el optimizador estándar son
   * prudentes (solo préstamo puente); esta variante prueba la hipótesis W8
   * ("Estudio grande en E2 temprana" = artefacto del préstamo casi gratis).
   * Undefined/false = comportamiento prudente. Default undefined.
   */
  aggressiveLoans?: boolean;
}

/**
 * Encaje de alcance mínimo de los ARQUETIPOS (Fase 10.2-B): algo más laxo que
 * el 1,0 del optimizador —se permiten estirarse un 10 % por encima de lo que su
 * equipo llena— pero no suicida. Con 0,75 el equilibrado seguía firmando Muy
 * grandes de reseña 24. Ver `Philosophy.scopeMinRatio`.
 */
const ARCHETYPE_SCOPE_MIN = 0.9;

/** Indie de culto: pequeño, honesto, mimando al equipo y al público. */
export const INDIE: Philosophy = {
  name: 'indie de culto',
  priceMult: 0.8,
  aggressiveness: 0,
  useLootBoxes: false,
  useDlc: false,
  care: true,
  // Con el gate de tamaños (docs/17 E1) el mediano exige 3 personas: el indie
  // llega a 4 pronto (3 al tajo + 1 en el laboratorio, que con el techo
  // tecnológico de 9.1 ya no es opcional) y sigue siendo de culto (≤6, lo que
  // exige comprar la etapa 3 — su techo por identidad).
  teamTargetByEra: [1, 4, 4, 5, 6, 6, 6],
  sizeAmbition: 'indie',
  stageAmbition: 3,
  // Firma cuando no queda otra, pero JAMÁS cede la IP (el alma no se vende);
  // y en cuanto existe el acceso anticipado, financia sus juegos con su
  // comunidad — la 1.0 llega sola a tiempo (el calendario del tamaño manda).
  publisherStance: 'sinIp',
  useEarlyAccess: true,
  // El indie ni opera servicios ni compra estudios: su identidad es el taller
  // pequeño (y su etapa 3 ni siquiera abre las adquisiciones).
  liveOps: 'no',
  acquisitions: 'no',
  crisisResponse: 'disculpa',
  dilemma: { leakAlpha: 'transparencia', sobreHype: 'moderar' },
  scopeMinRatio: ARCHETYPE_SCOPE_MIN,
};

/**
 * Fábrica AAA: crecer agresivo y exprimir la monetización (sin suicidarse).
 * Con las 5 etapas (docs/18 V4) su ambición llega hasta la Corporación y los
 * 40 de plantilla que exige el AAA — es quien estresa el overhead grande.
 * `care: true` por puro CINISMO, no por bondad: con el burn de la etapa 5
 * (docs/18 V4-d), un AAA mediocre quema millones — el talento es maquinaria y
 * la maquinaria se engrasa. Su codicia sigue intacta en precio, cajas y MTX.
 */
export const FACTORY: Philosophy = {
  name: 'fábrica AAA',
  priceMult: 1.1,
  aggressiveness: 0.7,
  useLootBoxes: true,
  useDlc: true,
  care: true,
  // Holgura sobre los mínimos (24 del AAA desde 10.2-B): un proyecto de 96
  // semanas exige rotar gente para no fundirla (docs/05 §4) — ir con la
  // plantilla justa convierte el tramo final en bugs y burnout (lección de
  // bots de 9.1). La nómina del GaaS no va aquí: maybeHire suma la dotación de
  // los servicios ABIERTOS (contratar de más "por si acaso" quebró a la
  // fábrica en E6 — lección de bots de 9.7).
  //
  // E6/E7 bajaron de 46/48 a 28/30 en 10.2-B (docs/20 W2-bis): con el AAA
  // aligerado, un ejército de 46 sería sobredimensionar por inercia — y ese
  // coste fijo corriendo en seco entre lanzamientos lumpy era justo el origen
  // del margen operativo negativo de E6.
  teamTargetByEra: [1, 4, 8, 12, 20, 28, 30],
  sizeAmbition: 'aaa',
  stageAmbition: 5,
  // El cheque más gordo, la IP da igual: los juegos son producto, no obra.
  publisherStance: 'siempre',
  useEarlyAccess: false,
  // El GaaS exprimido y las filiales quemadas: la codicia a escala macro.
  liveOps: 'exprimido',
  acquisitions: 'exprimir',
  crisisResponse: 'silencio',
  dilemma: { leakAlpha: 'capitalizar', sobreHype: 'prometer' },
  scopeMinRatio: ARCHETYPE_SCOPE_MIN,
};

/** Estudio equilibrado: crece con cabeza, DLC honesto, cuida al equipo. */
export const STUDIO: Philosophy = {
  name: 'estudio equilibrado',
  priceMult: 1,
  aggressiveness: 0,
  useLootBoxes: false,
  useDlc: true,
  care: true,
  // Holgura sobre el mínimo del muy grande (15): sin manos de sobra para
  // rotar, los proyectos de 72 semanas acaban en burnout y bugs (9.1).
  // La dotación de sus servicios abiertos la suma maybeHire (9.7).
  teamTargetByEra: [1, 4, 5, 8, 12, 18, 20],
  sizeAmbition: 'media',
  stageAmbition: 4,
  // Firma con cabeza (sin ceder la IP) y lanza a la antigua: sin EA.
  publisherStance: 'sinIp',
  useEarlyAccess: false,
  // Opera servicios HONESTOS (sin pase ni tienda) y construye sus filiales.
  liveOps: 'cuidado',
  acquisitions: 'invertir',
  crisisResponse: 'corporativo',
  dilemma: { leakAlpha: 'transparencia', sobreHype: 'moderar' },
  scopeMinRatio: ARCHETYPE_SCOPE_MIN,
};

/**
 * OPTIMIZADOR (Fase 10.1, docs/20 W8): sin filosofía moral — su único objetivo
 * es maximizar capital y crecer lo más rápido posible, jugando cerca de óptimo
 * con la información que el juego da. La "vara de medir honesta" que faltaba:
 * si un jugador competente rompe el balance (Corporación antes de E5, imprime
 * dinero, punto dulce invencible), este bot lo destapa.
 *
 * Comparte TODA la maquinaria competente de los otros bots (mejor Fit ×
 * popularidad, features por afinidad de género, motor al día, rotación de
 * energía, préstamo puente), pero SIN la prudencia de los arquetipos:
 * - amplía de etapa en cuanto puede pagarla con holgura mínima (expandCushion
 *   8 sem vs 52) — el jugador humano llega a Estudio grande en E2, los bots no;
 * - salta al mayor tamaño auto-publicable arriesgando más colchón (0,5×);
 * - monetización agresiva (MTX + DLC) pero SIN loot boxes: competente = no
 *   invita al escándalo/regulación que hunde ventas (y con ello, capital);
 * - gestiona crisis y dilemas para MINIMIZAR el daño a ventas, no por ética;
 * - exprime GaaS y filiales, y coge el cheque del publisher hasta destetarse.
 *
 * NO entra en los CA de las 3 filosofías (fullGame.test.ts): su papel es medir,
 * no validar. Determinista con semilla como los demás.
 */
export const OPTIMIZER: Philosophy = {
  name: 'optimizador',
  priceMult: 1.1,
  aggressiveness: 0.8,
  useLootBoxes: false,
  useDlc: true,
  care: true,
  // Ambición máxima, gateada solo por lo que la caja y la etapa permiten: sube
  // en cuanto le sale rentable (pickProject ya coge el mayor tamaño viable).
  // E6/E7 ajustados en 10.2-B al AAA aligerado (docs/20 W2-bis), como la
  // fábrica: el optimizador no paga nómina que su pipeline no necesita.
  teamTargetByEra: [1, 4, 9, 15, 26, 32, 34],
  sizeAmbition: 'aaa',
  stageAmbition: 5,
  // Coge el cheque más gordo mientras lo necesita; en cuanto la caja sostiene
  // el tamaño, se desteta (la regla `independent` de pickProject lo corta).
  publisherStance: 'siempre',
  useEarlyAccess: false,
  liveOps: 'exprimido',
  acquisitions: 'exprimir',
  crisisResponse: 'corporativo',
  // Minimiza el auto-daño: modera el sobre-hype (evita el castigo de cola) y es
  // transparente con los leaks (evita el backlash) — pura eficiencia, no ética.
  dilemma: { leakAlpha: 'transparencia', sobreHype: 'moderar' },
  expandCushionWeeks: 8,
  projectCushionMult: 0.5,
  scopeMinRatio: 1,
};

/**
 * OPTIMIZADOR CON ENDEUDAMIENTO AGRESIVO (Fase 10.2-A Exp1, docs/20): el
 * optimizador estándar, pero pidiendo préstamo al máximo para adelantar cada
 * salto de etapa (y amortizando cuando sobra caja). Es la vara del Experimento
 * 1: se corre en dos mundos (bug de préstamos restaurado vs interés arreglado)
 * para ver si el crédito casi gratis reproduce el "Estudio grande en E2" del
 * playtest. NO entra en ningún CA: es puro instrumento de medida.
 */
export const AGGRO_OPTIMIZER: Philosophy = {
  ...OPTIMIZER,
  name: 'optimizador agresivo',
  aggressiveLoans: true,
};

/** Tamaños de menor a mayor: para bajar al mayor permitido por el gate (E1). */
const SIZE_ORDER: readonly ProjectSize[] = ['pequeno', 'mediano', 'grande', 'muyGrande', 'aaa'];

/** Techo de tamaño por ambición del arquetipo (identidad, no capacidad). */
const SIZE_CEILING: Record<Philosophy['sizeAmbition'], ProjectSize> = {
  indie: 'mediano',
  media: 'muyGrande',
  aaa: 'aaa',
};

/**
 * Tamaño Y financiación del siguiente juego (docs/17 E1 + 9.6, docs/19 §9.6):
 * el mayor tamaño que (a) no supere la ambición del arquetipo, (b) pase el
 * gate real (plantilla + etapa, vía sizeBlockReason) y (c) SE PUEDA PAGAR —
 * y ahí está la gracia de 9.6:
 *
 * - AUTO-PUBLICADO si la caja aguanta el proyecto entero (coste estimado +
 *   ~3/4 de los costes fijos de su calendario): te quedas todo — la opción
 *   del que puede. Con el overhead de 8.8, empezar lo que la caja no puede
 *   terminar es la trampa mortal; el bot no la pisa.
 * - FIRMADO con publisher si el tamaño se te escapa pero el adelanto + el
 *   arranque a su cargo lo vuelven viable: la muleta que financia el SALTO
 *   de tamaño que aún no te puedes permitir… al 70 %. La postura del
 *   arquetipo filtra ('sinIp' no vende el alma; 'siempre' coge el cheque).
 * - Si ni firmado sale, baja de tamaño. El suelo es el pequeño: solo, si la
 *   caja da; firmado, si está en apuros (mejor pobre que muerto).
 *
 * Así el arco emerge del propio bot: al principio firma (los saltos y los
 * apuros), y en cuanto la caja sostiene el tamaño, se independiza — la
 * liberación GANADA que pide el CA.
 */
function pickProject(
  state: GameState,
  phil: Philosophy,
  genreId: string,
): { size: ProjectSize; publisherId: string | null } {
  // La postura solo gatea la IP ('sinIp' no vende el alma; 'siempre' firma lo
  // que haga falta — Goliath incluido). El criterio económico es el mismo para
  // todos: el reparto menos leonino, con el adelanto de desempate. Elegir por
  // cheque gordo (Magnavista, 75 %) es la espiral de la muerte: el 25 %
  // restante nunca da para destetarse — lección de bots de esta fase.
  const bestOffer = (size: ProjectSize) => {
    const offers = publisherOffersFor(state, size).filter(
      (o) => phil.publisherStance === 'siempre' || !o.keepsIp,
    );
    if (offers.length === 0) return null;
    return [...offers].sort((a, b) => a.revShare - b.revShare || b.advance - a.advance)[0];
  };

  const fixed = weeklyFixedCosts(state);
  // Auto-publicarse exige aguantar el proyecto Y sus costes fijos de
  // calendario: quedarse sin caja a mitad es la trampa mortal. Los arquetipos
  // exigen el calendario ENTERO (mult 1); el optimizador arriesga más (0,5) y
  // salta de tamaño antes, con el préstamo puente de red (docs/20 W8).
  const cushionMult = phil.projectCushionMult ?? 1;
  const selfCushion = (estimate: { cost: number; weeks: number }) =>
    estimate.cost + estimate.weeks * fixed * cushionMult;
  // La liberación GANADA no se devuelve (CA 9.6b): tras independizarse, nadie
  // se re-hipoteca por un salto de tamaño — se baja de tamaño y punto. Firmar
  // queda solo como tabla de salvación del pequeño (mejor pobre que muerto).
  // Sin esta regla, los sumideros de 9.7 (obras, filiales) rozaban la caja en
  // los saltos y el bot volvía al publisher en E3+ — el arco se rompía.
  const independent = state.stats.independenceWeek !== undefined;
  const ceiling = SIZE_ORDER.indexOf(SIZE_CEILING[phil.sizeAmbition]);
  for (let i = ceiling; i > 0; i--) {
    const size = SIZE_ORDER[i];
    if (sizeBlockReason(state, size) !== null) continue;
    // Competente (optimizador, docs/20 W8): no subir a un tamaño que el equipo
    // no puede ejecutar bien. Pasar el gate de plantilla MÍNIMA no basta —
    // `alcance01` mide poder vs objetivo del tamaño (9.1) y sobredimensionar
    // con un equipo flojo hunde Q y la reseña (y con ella las ventas). Se sube
    // de tamaño creciendo el equipo, no forzando la máquina.
    if (
      phil.scopeMinRatio !== undefined &&
      teamPower(state.staff, genreId) / balance.quality.scope.powerTarget[size] <
        phil.scopeMinRatio
    ) {
      continue;
    }
    const estimate = estimateProject(size, 'pcCasero');
    if (state.studio.capital > selfCushion(estimate)) {
      return { size, publisherId: null };
    }
    if (independent) continue;
    const offer = bestOffer(size);
    if (
      offer !== null &&
      state.studio.capital + offer.advance > 0.75 * (estimate.cost + estimate.weeks * fixed)
    ) {
      return { size, publisherId: offer.publisherId };
    }
  }
  const small = estimateProject('pequeno', 'pcCasero');
  if (state.studio.capital > selfCushion(small)) {
    return { size: 'pequeno', publisherId: null };
  }
  return { size: 'pequeno', publisherId: bestOffer('pequeno')?.publisherId ?? null };
}

/**
 * Semanas de respiro tras lanzar (parches, vacaciones, preproducción). Cortas
 * a propósito: desde que el calendario es honesto, el desarrollo YA dura lo que
 * dura el tamaño (6–120 semanas) y la nómina corre mientras tanto. Quedarse
 * parado medio año más es tirar el dinero; el descanso real lo gobierna la
 * energía (REST_TO_START), no un respiro fijo.
 */
const BREATHER_BY_SIZE: Record<ProjectSize, number> = {
  pequeno: 2,
  mediano: 3,
  grande: 4,
  muyGrande: 5,
  aaa: 6,
};

/** true si el estudio sigue de respiro tras su último lanzamiento. */
function onBreather(state: GameState): boolean {
  const last = state.releasedGames[state.releasedGames.length - 1];
  if (!last) return false;
  return state.week - last.releaseWeek < BREATHER_BY_SIZE[last.size];
}

/** Monetización del arquetipo adaptada a la era y a la ley (docs/09 §9). */
function pickMonetization(state: GameState, phil: Philosophy): MonetizationConfig {
  const models = availableMonetizationModels(state).map((m) => m.id);
  if (phil.aggressiveness > 0 && models.includes('premium+mtx')) {
    return {
      model: 'premium+mtx',
      aggressiveness: phil.aggressiveness,
      hasLootBoxes:
        phil.useLootBoxes &&
        monetizationFlagAvailable(state, 'lootBoxes') &&
        !lootBoxesBanned(state),
      hasBattlePass: false,
      dayOneDLC: false,
    };
  }
  if (phil.useDlc && models.includes('premium+dlc')) {
    return {
      model: 'premium+dlc',
      aggressiveness: 0,
      hasLootBoxes: false,
      hasBattlePass: false,
      dayOneDLC: false,
    };
  }
  return {
    model: 'premium',
    aggressiveness: 0,
    hasLootBoxes: false,
    hasBattlePass: false,
    dayOneDLC: false,
  };
}

/**
 * El motor propio gana si se queda a menos de esto de adecuación del mejor
 * licenciado: la royalty es para siempre y el activo se amortiza (docs/19
 * §9.2). Solo se licencia cuando el propio va claramente desfasado.
 */
const ENGINE_OWN_MARGIN = 0.1;

/** El mejor motor propio (por nivel), o null si aún no hay taller. */
function bestOwnedEngine(state: GameState) {
  const engines = state.engines ?? [];
  return engines.reduce<(typeof engines)[number] | null>(
    (best, e) => (best === null || e.techLevel > best.techLevel ? e : best),
    null,
  );
}

/**
 * 💡 que hay que RESERVAR para la próxima obra de motor (si la arquitectura ya
 * permite una generación mejor que la del taller): con el motor como término
 * tecnológico del techo (9.2), quedarse sin puntos para la obra es condenarse
 * a topar bajo — el jugador previsor no se los gasta en otra cosa.
 */
function engineReservePoints(state: GameState): number {
  if (state.engineBuild) return 0;
  const best = bestOwnedEngine(state);
  const targetGen = maxBuildableGeneration(state);
  if (targetGen <= (best?.generation ?? 0)) return 0;
  const capabilities = [
    ...new Set([...(best?.capabilities ?? []), ...buildableCapabilities(state)]),
  ];
  return engineBuildCost(state, targetGen, capabilities, best?.id ?? null).points;
}

/**
 * El taller de motores (docs/19 §9.2): mantiene el motor propio al día.
 * Construye la primera obra en cuanto la arquitectura lo permite y MEJORA el
 * motor cuando la I+D desbloquea una generación superior — el sumidero
 * recurrente de la fase. Con prudencia de jugador: tras pagar la obra deben
 * quedar ~26 semanas de costes fijos (la obra no puede fundir la producción).
 */
function manageEngines(state: GameState, phil: Philosophy): GameState {
  if (state.engineBuild) return state;
  const best = bestOwnedEngine(state);
  const targetGen = maxBuildableGeneration(state);
  if (targetGen <= (best?.generation ?? 0)) return state;
  const capabilities = [
    ...new Set([...(best?.capabilities ?? []), ...buildableCapabilities(state)]),
  ];
  const cost = engineBuildCost(state, targetGen, capabilities, best?.id ?? null);
  if (state.research.points < cost.points) return state;
  if (state.studio.capital - cost.money < 26 * weeklyFixedCosts(state)) return state;
  return startEngineBuild(state, {
    upgradeOf: best?.id ?? null,
    name: best ? undefined : `Motor ${phil.name}`,
    generation: targetGen,
    capabilities,
  });
}

/**
 * Motor con el que concebir (docs/19 §9.2): el de mejor adecuación al
 * proyecto, prefiriendo el PROPIO (sin royalty, amortiza) salvo que un
 * licenciado le saque ventaja real — el puente clásico cuando tu motor se ha
 * quedado viejo y la obra nueva aún no llega.
 */
function pickEngine(state: GameState, size: ProjectSize, genreId: string): string | null {
  let ownId: string | null = null;
  let ownAdequacy = engineAdequacy01(state, null, size, genreId);
  for (const engine of state.engines ?? []) {
    const adequacy = engineAdequacy01(state, engine.id, size, genreId);
    if (adequacy > ownAdequacy) {
      ownAdequacy = adequacy;
      ownId = engine.id;
    }
  }
  let licensed: { id: string; adequacy: number; fee: number } | null = null;
  for (const def of availableLicensedEngines(state)) {
    const adequacy = engineAdequacy01(state, def.id, size, genreId);
    if (
      licensed === null ||
      adequacy > licensed.adequacy ||
      (adequacy === licensed.adequacy && def.upfrontFee < licensed.fee)
    ) {
      licensed = { id: def.id, adequacy, fee: def.upfrontFee };
    }
  }
  if (
    licensed !== null &&
    licensed.adequacy > ownAdequacy + ENGINE_OWN_MARGIN &&
    state.studio.capital > licensed.fee + 26 * weeklyFixedCosts(state)
  ) {
    return licensed.id;
  }
  return ownId;
}

/** ¿El combo tema×género se lanzó dentro de la ventana de refrito? */
function isRehash(state: GameState, themeId: string, genreId: string): boolean {
  const windowStart = state.week - balance.moral.rehashWindowWeeks;
  return state.releasedGames.some(
    (g) => g.themeId === themeId && g.genreId === genreId && g.releaseWeek >= windowStart,
  );
}

/** Empieza el siguiente juego del bot: mejor combo fresco + features al alcance. */
function startNextGame(state: GameState, phil: Philosophy, gameNumber: number): GameState {
  // Como un jugador mirando el medidor de Fit (docs/03 factor A) Y el panel de
  // tendencias (docs/04 §2): de los combos tema×género frescos (sin refrito),
  // el de mejor fit × popularidad. Determinista.
  //
  // La popularidad no es opcional: un combo de fit perfecto sobre un tema
  // muerto no vende (el Oeste en E3 está a 0.15). El panel existe justo para
  // que esa decisión sea informada, así que el bot lo lee igual que el jugador.
  let combo: { themeId: string; genreId: string } | null = null;
  let bestScore = -1;
  for (const theme of availableThemes(state)) {
    for (const genre of availableGenres(state)) {
      if (isRehash(state, theme.id, genre.id)) continue;
      const { fit } = computeFit({
        themeId: theme.id,
        genreId: genre.id,
        platformId: 'pcCasero',
        audience: 'amplio',
      });
      const score = fit * comboPopularity(state.market, genre.id, theme.id);
      if (score > bestScore) {
        bestScore = score;
        combo = { themeId: theme.id, genreId: genre.id };
      }
    }
  }
  if (combo === null) return state; // sin combo fresco: espera una semana

  // Tamaño y financiación a la vez (9.6): el publisher es lo que vuelve
  // viable el salto de tamaño que la caja aún no aguanta. Los bots lanzan
  // monoplataforma, así que la exclusividad de plataforma no muerde.
  const { size, publisherId } = pickProject(state, phil, combo.genreId);
  const recommended = balance.economy.priceBySize[size];
  let next = startProject(state, {
    name: `${phil.name} ${gameNumber + 1}`,
    themeId: combo.themeId,
    genreId: combo.genreId,
    platformId: 'pcCasero',
    audience: 'amplio',
    size,
    // El motor se elige por adecuación (9.2): propio si aguanta, licenciado
    // de puente cuando el propio va desfasado y la caja soporta la cuota.
    engineId: pickEngine(state, size, combo.genreId),
    price: Math.round(recommended * phil.priceMult),
    monetization: pickMonetization(state, phil),
    publisherId,
  });

  // Features hasta el objetivo de alcance del tamaño (docs/03 factor C), por
  // VALOR EFECTIVO para el género (9.3): un jugador con criterio no mete lo
  // que no pega (bugs y coste sin calidad) y de cada trade-off coge una sola
  // variante. Como con computeFit, el bot "ve" el encaje sin pagar el nodo
  // (juega como un jugador experimentado; probar el gateo por conocimiento
  // llevó a la fábrica a la bancarrota apilando misfits a ciegas). Misma
  // regla para los tres bots (comparación justa). Las gateadas por capacidad
  // de motor (9.2) se saltan si el motor elegido no la tiene.
  const project = next.projects[next.projects.length - 1];
  const target = balance.quality.featureScopeTarget[size];
  const aff = balance.quality.featureAffinity;
  const affMult = { encaja: aff.encajaMult, neutro: aff.neutroMult, noEncaja: aff.noEncajaMult };
  const pool = [...availableFeatures(next)]
    .filter(
      (f) =>
        f.requiresEngineCapability === undefined ||
        engineHasCapability(next, project.engineId, f.requiresEngineCapability),
    )
    .map((f) => ({
      feature: f,
      eff: f.qualityValue * affMult[featureGenreAffinity(f, combo.genreId)],
    }))
    .filter(({ eff }) => eff > 0)
    .sort((a, b) => b.eff - a.eff || a.feature.id.localeCompare(b.feature.id));
  let scope = 0;
  const pickedGroups = new Set<string>();
  for (const { feature, eff } of pool) {
    if (scope >= target) break;
    if (feature.variantGroup !== undefined) {
      if (pickedGroups.has(feature.variantGroup)) continue;
      pickedGroups.add(feature.variantGroup);
    }
    next = toggleFeature(next, feature.id, project.id);
    scope += eff;
  }
  return next;
}

/**
 * Compra la ampliación de estudio cuando el núcleo la habilita (docs/18 V4-c),
 * hasta el techo de ambición del arquetipo: el indie no quiere una torre. Con
 * prudencia de jugador listo: no basta cumplir el umbral — se compra cuando el
 * desembolso SOBRA por encima del requisito, para no quedarse sin caja de
 * producción justo al estrenar una oficina más cara de mantener.
 */
function maybeExpand(state: GameState, phil: Philosophy): GameState {
  const stage = state.studio.scaleStage;
  if (stage >= phil.stageAmbition || stage >= 5) return state;
  if (expandBlockReason(state) !== null) return state;
  const target = (stage + 1) as 2 | 3 | 4 | 5;
  // Tras pagar debe quedar colchón del coste fijo NUEVO (el overhead de la
  // etapa comprada, docs/18 V4-d): mudarse a una oficina que no puedes
  // mantener es la trampa clásica. Los arquetipos guardan ~1 año (52 sem); el
  // optimizador aprieta (8 sem) y amplía en cuanto puede pagarlo (docs/20 W8).
  const newWeeklyFixed =
    weeklyFixedCosts(state) +
    balance.economy.upkeepExtraByStage[target] -
    balance.economy.upkeepExtraByStage[stage];
  const cost = balance.staff.scale.upgradeCostByStage[target];
  if (state.studio.capital - cost < (phil.expandCushionWeeks ?? 52) * newWeeklyFixed) {
    return state;
  }
  return expandStudio(state);
}

/**
 * Deuda que un jugador prudente acepta cargar (Fase 10.2-B, docs/20
 * §Préstamos): desde que la cuota obligatoria drena caja cada semana, endeudarse
 * sin techo es cavarse la tumba. El tope se fija por SERVICIO de deuda — la
 * cuota no puede comerse más de un tercio del coste fijo semanal —, que con la
 * tasa actual equivale a ~13 semanas de costes fijos de deuda viva. Sin este
 * techo el bot pedía 1,3k cada semana para sobrevivir, la cuota crecía con la
 * deuda y la espiral lo mataba: exactamente el comportamiento que el rediseño
 * quiere castigar, pero que un jugador competente no comete.
 */
const DEBT_SERVICE_MAX_SHARE = 1 / 3;

function maxAffordableDebt(fixed: number): number {
  return (DEBT_SERVICE_MAX_SHARE * fixed) / balance.economy.loans.minPaymentRate;
}

/**
 * Gestión de la línea de crédito (docs/06 §4), como un jugador solvente: si
 * hay un proyecto en vuelo y el runway se acorta, pide un préstamo puente
 * —acotado a lo que puede servir— en vez de dejar que la bancarrota se coma el
 * juego a medias; y amortiza con lo que le SOBRE por encima de su colchón de
 * trabajo, porque arrastrar deuda ya cuesta caja todas las semanas.
 */
function manageLoans(state: GameState, phil: Philosophy): GameState {
  const fixed = weeklyFixedCosts(state);
  if (phil.aggressiveLoans) return manageLoansAggressive(state, phil, fixed);
  // Desde 10.1 (docs/20 W1) el interés capitaliza y desde 10.2-B la cuota
  // drena caja: se amortiza la DEUDA VIVA (principal + interés) con el
  // excedente sobre el colchón de trabajo + la hucha del salto de tamaño, en
  // vez de esperar a poder saldarla de golpe (que en apuros no llega nunca).
  const debt = outstandingDebt(state);
  if (debt > 0) {
    const buffer = 26 * fixed + ambitionSavings(state, phil);
    const spare = state.studio.capital - buffer;
    if (spare > 0) return repayLoan(state, Math.min(debt, spare));
  }
  if (state.projects.length > 0 && state.studio.capital < 8 * fixed) {
    const room = Math.min(availableCredit(state), maxAffordableDebt(fixed) - debt);
    if (room > 0) return takeLoan(state, Math.round(Math.min(room, 26 * fixed)));
  }
  return state;
}

/**
 * Endeudamiento AGRESIVO (Fase 10.2-A Exp1, docs/20): pide al máximo para
 * ADELANTAR el salto de etapa y amortiza en cuanto sobra caja. Prueba la
 * hipótesis W8 (el préstamo casi gratis reproduce "Estudio grande en E2").
 */
function manageLoansAggressive(
  state: GameState,
  phil: Philosophy,
  fixed: number,
): GameState {
  // Amortiza pronto (colchón de 26 sem, no 52) y de forma PARCIAL desde
  // 10.2-B: con la cuota obligatoria drenando caja, esperar a saldarla de
  // golpe es quedarse pagando intereses de más.
  const debt = outstandingDebt(state);
  if (debt > 0) {
    const spare = state.studio.capital - 26 * fixed;
    if (spare > 0) return repayLoan(state, Math.min(debt, spare));
  }
  const stage = state.studio.scaleStage;
  if (stage < phil.stageAmbition && stage < 5 && availableCredit(state) > 0) {
    const target = (stage + 1) as 2 | 3 | 4 | 5;
    const req = balance.staff.scale.requirementsByStage[target];
    // Solo si el gate de PLANTILLA ya está: si aún falta gente, el crédito no
    // adelanta nada (no se puede ampliar). Cuando solo falta capital, se pide
    // para alcanzar el requisito + la obra + el colchón que exige maybeExpand.
    if (state.staff.length >= req.staff) {
      const upgradeCost = balance.staff.scale.upgradeCostByStage[target];
      const newWeeklyFixed =
        fixed +
        balance.economy.upkeepExtraByStage[target] -
        balance.economy.upkeepExtraByStage[stage];
      const targetCapital = Math.max(
        req.capital,
        upgradeCost + (phil.expandCushionWeeks ?? 52) * newWeeklyFixed,
      );
      const gap = targetCapital - state.studio.capital;
      if (gap > 0) {
        return takeLoan(state, Math.min(availableCredit(state), gap));
      }
    }
  }
  // Sin salto de etapa a la vista: préstamo puente clásico si un proyecto en
  // vuelo se queda sin runway (no morir a medias).
  if (
    state.projects.length > 0 &&
    state.studio.capital < 8 * fixed &&
    availableCredit(state) > 0
  ) {
    return takeLoan(state, Math.min(availableCredit(state), 26 * fixed));
  }
  return state;
}

/**
 * Ingreso semanal SOSTENIBLE del estudio: la media del libro de caja entero
 * (hasta 52 semanas, `economy.cashflowMaxWeeks`), no la ventana corta de la
 * espiral. Las ventas son a tirones —pico al lanzar, cola, y meses secos
 * mientras se desarrolla—, así que una media de 12 semanas dice "no ingresas
 * nada" justo en mitad de un proyecto y congelaría la plantilla. El año entero
 * es la escala a la que un jugador juzga si puede permitirse a alguien.
 */
function sustainableWeeklyIncome(state: GameState): number {
  if (state.cashflow.length === 0) return 0;
  return state.cashflow.reduce((sum, e) => sum + e.income, 0) / state.cashflow.length;
}

/** Contrata del pool si el arquetipo quiere crecer y la caja lo sostiene.
 * Desde 9.7 el objetivo suma la dotación de los servicios ABIERTOS: la
 * nómina del GaaS se contrata cuando el plato existe, no por si acaso. */
function maybeHire(state: GameState, phil: Philosophy): GameState {
  const liveNeeds = activeLiveServices(state).reduce(
    (sum, g) => sum + requiredLiveStaff(g),
    0,
  );
  const target = phil.teamTargetByEra[eraIndex(state.era)] + liveNeeds;
  if (state.studio.scaleStage < 2 || state.staff.length >= target) return state;
  // Con un servicio recién abierto el hueco es grande y el reloj corre (el
  // descuido quema): la corporación contrata en tandas, hasta 3 por semana.
  let next = state;
  const rounds = target - next.staff.length > 4 ? 3 : 1;
  for (let round = 0; round < rounds && next.staff.length < target; round += 1) {
    // El aforo de la etapa manda (docs/17 B1): sin hueco, no se intenta.
    if (hireBlockReason(next) !== null) return next;
    if (next.candidates.length === 0) return next;
    // El más hábil en su especialidad, prefiriendo especialidades que faltan…
    const staffBySpec = new Map<string, number>();
    for (const e of next.staff) {
      staffBySpec.set(e.specialty, (staffBySpec.get(e.specialty) ?? 0) + 1);
    }
    const rank = (c: Employee) =>
      (staffBySpec.get(c.specialty) ?? 0) * 1000 - c.skills[c.specialty];
    // …pero SOLO entre los que el estudio puede SOSTENER (Fase 10.2-B): la
    // nómina resultante tiene que caber en lo que se ingresa de verdad. Sin
    // esta regla el bot fichaba una ESTRELLA de 2.000 💰/semana con ingresos de
    // garaje (~1.100 💰/semana): quedaba insolvente para siempre, encerrado en
    // juegos pequeños que no pagaban su propia nómina, y sobrevivía solo
    // porque hasta 10.2-B el crédito era gratis e infinito (con la cuota
    // obligatoria, la fábrica y el equilibrado quebraban en E2). Un jugador
    // competente empieza fichando juniors y sube de categoría cuando el
    // negocio lo aguanta.
    const fixed = weeklyFixedCosts(next);
    const income = sustainableWeeklyIncome(next);
    const affordable = next.candidates.filter(
      (c) =>
        next.studio.capital - hiringCost(c) - 26 * (fixed + c.salary) >= 0 &&
        // Sostenible por el NEGOCIO (la nómina cabe en lo que se ingresa) o
        // por la CAJA (un año entero de esa nómina en el banco): el estudio
        // rico puede invertir en talento por delante de sus ingresos; el
        // garaje, no.
        (fixed + c.salary <= income || next.studio.capital >= 52 * (fixed + c.salary)),
    );
    if (affordable.length === 0) return next;
    const candidate = [...affordable].sort((a, b) => rank(a) - rank(b))[0];
    next = hireCandidate(next, candidate.id);
  }
  return next;
}

/** Cuidado del equipo (formar/motivar): la palanca de integridad (docs/05 §6). */
function maybeCare(state: GameState, phil: Philosophy): GameState {
  if (!phil.care) return state;
  let next = state;
  if (next.week % 8 === 0 && next.studio.capital > 40_000) {
    const weakest = [...next.staff].sort(
      (a, b) => a.skills[a.specialty] - b.skills[b.specialty],
    )[0];
    next = trainEmployee(next, weakest.id, weakest.specialty);
  }
  if (next.studio.capital > 20_000) {
    const low = next.staff.find((e) => e.morale < 45);
    if (low) next = motivateEmployee(next, low.id, 'bonus');
  }
  return next;
}

/** Energía mínima de toda la plantilla para arrancar el siguiente juego. */
const REST_TO_START = 60;
/** Umbrales de rotación durante un proyecto: sale agotado, entra descansado. */
const ROTATE_OUT_ENERGY = 25;
const ROTATE_IN_ENERGY = 65;
/** Descanso PREVENTIVO (9.2): con holgura, el cansado descansa antes de agotarse. */
const PREVENTIVE_REST_ENERGY = 50;
/** Recta final: todo el mundo remata el lanzamiento (nadie descansa). */
const FINALE_WEEKS = 6;
const FINALE_MIN_ENERGY = 40;

/**
 * Gestión de energía como la haría un jugador (docs/05 §4): el que se agota
 * sale a descansar y el descansado vuelve al tajo. Sin esto, encadenar juegos
 * lleva a toda la plantilla al burnout — y eso es diseño, no un bug.
 *
 * Lección de la 9.2: rotar SOLO por agotamiento sincroniza a la plantilla —
 * todos se agotan la misma semana, el proyecto pasa semanas en cuadro (3/48)
 * y si el lanzamiento cae ahí, el alcance se hunde (Q ~30). Un jugador
 * escalona: mientras el proyecto vaya sobrado sobre la plantilla esperada de
 * su tamaño, el más cansado descansa ANTES de agotarse; y en la recta final
 * todo el mundo vuelve al tajo a rematar el lanzamiento.
 */
function manageEnergy(state: GameState): GameState {
  const project = state.projects[0];
  if (!project) return state;
  let next = state;
  const finale = projectTotalWeeks(project) - project.weeksSpent <= FINALE_WEEKS;
  // Los del servicio en vivo (9.7) no se tocan: su rotación va aparte
  // (manageLiveOps) y robárselos al plato girando es la negligencia que
  // el descuido castiga.
  const inLive = liveServiceStaffIds(next);
  for (const employee of next.staff) {
    if (inLive.has(employee.id)) continue;
    const assigned = next.projects[0].assignedStaff.includes(employee.id);
    const inRd = next.research.rdStaff.includes(employee.id);
    if (assigned && !finale && employee.energy < ROTATE_OUT_ENERGY) {
      next = toggleAssignment(next, employee.id, project.id);
    } else if (
      !assigned &&
      !inRd &&
      (employee.energy >= ROTATE_IN_ENERGY ||
        (finale && employee.energy >= FINALE_MIN_ENERGY))
    ) {
      next = toggleAssignment(next, employee.id, project.id);
    }
  }
  if (finale) return next;
  // Rotación escalonada: los huecos de descanso son los que sobran sobre la
  // plantilla esperada del tamaño (sizeGate.minStaff); se los llevan los más
  // cansados. Así la cohorte se desincroniza y el equipo nunca cae en bloque.
  const current = next.projects[0];
  const gate = balance.development.sizeGate[current.size].minStaff;
  const assignedEmployees = next.staff.filter((e) => current.assignedStaff.includes(e.id));
  const slots = assignedEmployees.length - gate;
  if (slots > 0) {
    const tired = assignedEmployees
      .filter((e) => e.energy < PREVENTIVE_REST_ENERGY)
      .sort((a, b) => a.energy - b.energy || a.id.localeCompare(b.id))
      .slice(0, slots);
    for (const e of tired) next = toggleAssignment(next, e.id, project.id);
  }
  return next;
}

/**
 * Investigación del bot (misma regla los tres). Variedad primero pero con
 * mesura (docs/17 P1): un jugador listo desbloquea unos cuantos temas para no
 * repetirse (el refrito castiga) y luego destina los 💡 a las capacidades del
 * árbol. El bot NO paga el atajo predictivo (nodos `reveals`, docs/17 P2): ya
 * "ve" el mercado con computeFit, así que esas pistas no le aportan nada.
 */
/**
 * Nodos al servicio del MOTOR (9.2): arquitectura, capacidades y su cadena.
 * Están exentos de la reserva de obra — comprarlos ES trabajar para el motor.
 * Desde 9.7, `serviciosOnline` entra en la lista: es la infraestructura del
 * negocio GaaS (sin ella no hay servicios) y esperar a que sobren 220 💡
 * tras la reserva de la obra gen-7 la dejaba sin comprar toda la partida.
 */
const MOTOR_NODE_IDS = new Set([
  'motorPropio1',
  'motorPropio2',
  'motorPropio3',
  'tecnologia3d',
  'kitBiplataforma',
  'pipelineMultiplataforma',
  'tecnologiaOnline',
  'serviciosOnline',
]);

function maybeResearch(state: GameState): GameState {
  // Capacidades primero: motores/QA/marketing componen ingreso y calidad, así
  // que rinden más que la variedad (un jugador listo invierte ahí antes). El
  // bot NO paga el atajo predictivo (nodos `reveals`, docs/17 P2): ya "ve" el
  // mercado con computeFit. Con los 💡 que sobren, desbloquea temas para no
  // repetirse (el refrito castiga, docs/17 P1).
  //
  // Desde 9.2 la obra del motor también cuesta 💡: los nodos que no sirven al
  // motor respetan su reserva (engineReservePoints) — comprarse el QA
  // automatizado justo cuando tocaba pagar la obra era condenarse a topar.
  const buildReserve = engineReservePoints(state);
  for (const node of researchNodes) {
    if (node.reveals) continue;
    if (researchNodeStatus(state, node.id) !== 'disponible') continue;
    if (!MOTOR_NODE_IDS.has(node.id) && state.research.points < node.cost + buildReserve) {
      continue;
    }
    return buyResearch(state, node.id);
  }
  // Reserva para el nodo de capacidad más barato aún sin comprar, AUNQUE su
  // era no haya llegado (9.1): entrar en E2 sin la arquitectura del primer
  // motor es condenarse a un techo de 55 durante años — el jugador previsor
  // ahorra ANTES del cambio de era. Sin la reserva el bot se funde los puntos
  // en temas —siempre más baratos— y no desbloquea NINGUNA capacidad (la
  // fábrica quebraba en E2 por esto en la 8.10).
  const nodeReserve =
    researchNodes
      .filter((n) => !n.reveals && researchNodeStatus(state, n.id) !== 'comprado')
      .sort((a, b) => a.cost - b.cost)[0]?.cost ?? 0;
  const reserve = Math.max(nodeReserve, buildReserve);

  const theme = researchableThemes(state)
    .filter((t) => themeResearchStatus(state, t.id) === 'disponible')
    .sort(
      (a, b) => themeResearchCost(a.id) - themeResearchCost(b.id) || a.id.localeCompare(b.id),
    )[0];
  if (theme && state.research.points >= themeResearchCost(theme.id) + reserve) {
    return researchTheme(state, theme.id);
  }
  return state;
}

/**
 * Personal en I+D (9.1): con el techo tecnológico (docs/19 §9.1) la
 * investigación deja de ser opcional, así que el bot hace lo que haría un
 * jugador: el fundador investiga en los respiros entre juegos, y un estudio
 * con plantilla mantiene una plaza fija en el laboratorio (dos desde 10).
 * La energía rota igual que en los proyectos: el agotado sale a descansar.
 */
function manageResearchStaff(state: GameState): GameState {
  let next = state;
  // Sale del laboratorio quien está fundido (pasa a descansar)…
  for (const id of [...next.research.rdStaff]) {
    const employee = next.staff.find((e) => e.id === id);
    if (!employee || employee.energy < ROTATE_OUT_ENERGY) {
      next = toggleResearchAssignment(next, id);
    }
  }
  // …y el fundador vuelve al tajo en cuanto hay juego en marcha.
  if (next.projects.length > 0 && next.research.rdStaff.includes('fundador')) {
    next = toggleResearchAssignment(next, 'fundador');
  }

  const assignedToProject = new Set(next.projects.flatMap((p) => p.assignedStaff));
  const inLiveService = liveServiceStaffIds(next);
  // El laboratorio solo se lleva manos que SOBREN: dejar un proyecto grande
  // por debajo de su plantilla esperada hunde el QA y el alcance (docs/02
  // §6.1 crewRatio + docs/19 §9.1 encaje) — nadie investigaría a ese precio.
  // Los platos girando (9.7) también cuentan como ocupación comprometida.
  const neededByProjects = next.projects.reduce(
    (sum, p) => sum + balance.development.sizeGate[p.size].minStaff,
    0,
  );
  const neededByServices = activeLiveServices(next).reduce(
    (sum, g) => sum + requiredLiveStaff(g),
    0,
  );
  const spare = Math.max(0, next.staff.length - neededByProjects - neededByServices);
  const rdTarget = Math.min(spare, next.staff.length >= 10 ? 2 : next.staff.length >= 4 ? 1 : 0);
  while (next.research.rdStaff.filter((id) => id !== 'fundador').length < rdTarget) {
    const candidate = next.staff
      .filter(
        (e) =>
          !e.founder &&
          !assignedToProject.has(e.id) &&
          !inLiveService.has(e.id) &&
          !next.research.rdStaff.includes(e.id) &&
          e.energy >= ROTATE_IN_ENERGY,
      )
      .sort((a, b) => b.energy - a.energy || a.id.localeCompare(b.id))[0];
    if (!candidate) break;
    next = toggleResearchAssignment(next, candidate.id);
  }

  // En los respiros, el fundador investiga si viene descansado (garaje: es la
  // única fuente de 💡 que no depende de lanzar).
  if (
    next.projects.length === 0 &&
    !next.research.rdStaff.includes('fundador') &&
    (next.staff.find((e) => e.id === 'fundador')?.energy ?? 0) >= ROTATE_IN_ENERGY
  ) {
    next = toggleResearchAssignment(next, 'fundador');
  }
  return next;
}

/** Tope de platos girando a la vez: obligación sí, malabarismo suicida no. */
const MAX_LIVE_SERVICES = 2;
/** Solo se opera un juego que la gente quiera habitar (reseña mínima). */
const LIVE_REVIEW_BAR = 60;
/** Tope de filiales: comprarse la industria entera mataría la competencia. */
const MAX_SUBSIDIARIES = 3;

/**
 * Servicios en vivo del bot (9.7, docs/19 §9.7), como un jugador que asume la
 * obligación: cierra el que sangra dinero, rota la dotación (el agotado sale,
 * el descansado entra hasta la plantilla requerida) y abre uno nuevo SOLO si
 * la plantilla tiene holgura para sostenerlo sin robarle manos al pipeline.
 * Va antes de manageEnergy: los platos comprometidos se dotan primero y el
 * proyecto se queda el resto (sobredotar un proyecto rinde poco; descuidar
 * un servicio desangra).
 */
/** Semanas de infradotación crónica tras las que el bot cierra el servicio. */
const LIVE_UNDERSTAFFED_SUNSET = 12;

function manageLiveOps(state: GameState, phil: Philosophy): GameState {
  if (phil.liveOps === 'no') return state;
  let next = state;

  // 1) El que sangra dinero se cierra; y el infradotado CRÓNICO también —
  //    un jugador sensato corta antes de que el descuido pudra a la comunidad
  //    (mantener un plato que no puedes girar es la peor opción).
  for (const game of activeLiveServices(next)) {
    const chronic = (game.liveService?.weeksNeglected ?? 0) >= LIVE_UNDERSTAFFED_SUNSET;
    if (liveServiceWeeklyNet(game) < 0 || chronic) {
      next = sunsetLiveService(next, game.id);
    }
  }

  // 2) Dotación: sale el fundido, entra el descansado hasta la requerida.
  for (const game of activeLiveServices(next)) {
    const svc = game.liveService;
    if (!svc) continue;
    for (const id of [...svc.assignedStaff]) {
      const employee = next.staff.find((e) => e.id === id);
      if (!employee || employee.energy < ROTATE_OUT_ENERGY) {
        next = toggleLiveServiceAssignment(next, game.id, id);
      }
    }
    const required = requiredLiveStaff(game);
    const current = () =>
      next.releasedGames.find((g) => g.id === game.id)?.liveService?.assignedStaff.length ?? 0;
    if (current() >= required) continue;
    const busy = new Set([
      ...next.projects.flatMap((p) => p.assignedStaff),
      ...next.research.rdStaff,
      ...liveServiceStaffIds(next),
    ]);
    const rested = next.staff
      .filter((e) => !e.founder && !busy.has(e.id) && e.energy >= ROTATE_IN_ENERGY)
      .sort((a, b) => b.energy - a.energy || a.id.localeCompare(b.id));
    for (const candidate of rested) {
      if (current() >= required) break;
      next = toggleLiveServiceAssignment(next, game.id, candidate.id);
    }
  }

  // 3) Abrir un servicio nuevo: el mejor juego elegible (la parroquia sigue a
  //    la reseña) y SOLO si la dotación es sostenible contra el pipeline
  //    TÍPICO del arquetipo — con la holgura actual O contratando (queda
  //    aforo y la caja aguanta la nómina nueva): la capacidad del GaaS se
  //    compra en nómina cuando el plato EXISTE, no por si acaso.
  const services = activeLiveServices(next);
  if (services.length >= MAX_LIVE_SERVICES) return next;
  const pipelineNeeds = Math.max(
    next.projects.reduce((sum, p) => sum + balance.development.sizeGate[p.size].minStaff, 0),
    balance.development.sizeGate[SIZE_CEILING[phil.sizeAmbition]].minStaff,
  );
  const neededByServices = services.reduce((sum, g) => sum + requiredLiveStaff(g), 0);
  const spare =
    next.staff.length - pipelineNeeds - neededByServices - next.research.rdStaff.length;
  const hireRoom = Math.max(0, staffCap(next) - next.staff.length);
  const candidate = [...next.releasedGames]
    .filter((g) => g.review >= LIVE_REVIEW_BAR && liveServiceBlockReason(next, g) === null)
    .sort((a, b) => b.review - a.review || b.releaseWeek - a.releaseWeek)[0];
  if (candidate) {
    const required = requiredLiveStaff(candidate);
    const missing = Math.max(0, required - Math.max(0, spare));
    const payrollOk =
      next.studio.capital > 26 * (weeklyFixedCosts(next) + missing * 800);
    if (spare >= required || (missing <= hireRoom && payrollOk)) {
      next = launchLiveService(next, candidate.id, {
        hasBattlePass:
          phil.liveOps === 'exprimido' && monetizationFlagAvailable(next, 'battlePass'),
        aggressiveness: phil.liveOps === 'exprimido' ? Math.max(0.6, phil.aggressiveness) : 0,
      });
    }
  }
  return next;
}

/**
 * Adquisiciones del bot (9.7): compra el estudio en venta más barato cuando
 * la caja SOBRA (colchón de un año de fijos tras pagar), le fija su directiva
 * de arquetipo y vende los cascarones (talento hundido cuyo flujo ya no paga
 * ni el overhead). La fábrica compra-exprime-vende; el equilibrado construye.
 */
/**
 * La hucha del salto: mientras el tamaño-ambición del arquetipo esté
 * desbloqueado pero AÚN no autofinanciado, el bot ahorra para él — los
 * caprichos (filiales) no pueden comerse la hucha. Sin esto, la fábrica se
 * gastaba el colchón del AAA en comprar estudios y, con la regla de no
 * re-firmar (CA 9.6b), moría sin lanzar un AAA jamás.
 */
function ambitionSavings(state: GameState, phil: Philosophy): number {
  const size = SIZE_CEILING[phil.sizeAmbition];
  if (state.projects.some((p) => p.size === size)) return 0; // ya está en vuelo
  if (sizeBlockReason(state, size) !== null) return 0;
  const estimate = estimateProject(size, 'pcCasero');
  return estimate.cost + estimate.weeks * weeklyFixedCosts(state);
}

function manageAcquisitions(state: GameState, phil: Philosophy): GameState {
  if (phil.acquisitions === 'no') return state;
  let next = state;
  for (const sub of subsidiaryList(next)) {
    if (sub.directive !== phil.acquisitions) {
      next = setSubsidiaryDirective(next, sub.id, phil.acquisitions);
    }
  }
  for (const sub of subsidiaryList(next)) {
    const flow = sub.pendingIncome * balance.acquisitions.payoutRate;
    if (sub.talent <= 22 && flow < subsidiaryUpkeep(sub)) {
      next = sellSubsidiary(next, sub.id);
    }
  }
  if (subsidiaryList(next).length >= MAX_SUBSIDIARIES) return next;
  const fixed = weeklyFixedCosts(next);
  const target = (next.rivals?.studios ?? [])
    .filter((r) => acquisitionBlockReason(next, r.id) === null)
    .map((r) => ({ id: r.id, price: acquisitionPriceFor(next, r.id) ?? Infinity }))
    .sort((a, b) => a.price - b.price)[0];
  if (
    target &&
    next.studio.capital > target.price + 52 * fixed + ambitionSavings(next, phil)
  ) {
    next = acquireStudio(next, target.id);
    next = setSubsidiaryDirective(next, target.id, phil.acquisitions);
  }
  return next;
}

/** Un paso de decisiones del bot (sin tick): visible para diagnósticos. */
export function botDecide(state: GameState, phil: Philosophy, gamesStarted: number): {
  state: GameState;
  gamesStarted: number;
} {
  // 1. La capa social no espera: dilemas y crisis según el arquetipo.
  for (const dilemma of [...state.community.dilemmas]) {
    state = resolveDilemma(state, dilemma.kind, phil.dilemma[dilemma.kind]);
  }
  for (const crisis of state.community.crises.filter((c) => c.status === 'abierta')) {
    state = respondToCrisis(state, crisis.id, phil.crisisResponse);
  }
  // Caza de talento (9.5): iguala solo por las ESTRELLAS (el techo de 9.1 las
  // necesita) y solo si la caja aguanta; a los demás les desea suerte. Igual
  // para los tres bots: la fábrica retiene por cinismo, el indie por cariño.
  const offer = state.rivals?.poachOffer;
  if (offer) {
    const target = state.staff.find((e) => e.id === offer.employeeId);
    const star =
      target !== undefined &&
      target.skills[target.specialty] >= balance.rivals.poach.starSkill;
    const canAfford = state.studio.capital > 26 * weeklyFixedCosts(state);
    state = resolvePoachOffer(state, star && canAfford ? 'igualar' : 'dejar');
  }
  // Ventana disputada (9.5): como un jugador informado — esquiva el bombazo
  // del gigante si la espera es corta Y la caja aguanta la nómina extra; si
  // no, lanza igual y come el aplastamiento del pico (decisión, no azar).
  for (const project of state.projects.filter((p) => p.pendingRelease !== undefined)) {
    const pending = project.pendingRelease as NonNullable<typeof project.pendingRelease>;
    const wait = pending.windowEndWeek + 1 - state.week;
    const canAfford = state.studio.capital > (wait + 8) * weeklyFixedCosts(state);
    state =
      wait <= 6 && canAfford
        ? delayContestedRelease(state, project.id)
        : confirmContestedRelease(state, project.id);
  }
  // Early Access (9.6): el arquetipo que lo usa abre el acceso anticipado de
  // sus auto-publicados al entrar en Pulido. Disciplinado por construcción:
  // la 1.0 llega sola con el calendario del tamaño (6–18 semanas de Pulido),
  // muy por debajo de la paciencia — dinero y feedback sin quemar a nadie.
  if (phil.useEarlyAccess) {
    for (const project of state.projects) {
      if (earlyAccessBlockReason(state, project) === null) {
        state = launchEarlyAccess(state, project.id);
      }
    }
  }
  // 2. Estudio: ampliación (se compra, docs/18 V4-c), crédito, taller de
  // motores (9.2), investigación, plantilla, cuidado y rotación de energía.
  // Los platos girando (9.7) se dotan ANTES que el proyecto: son obligación.
  state = maybeExpand(state, phil);
  state = manageLoans(state, phil);
  // Investigar ANTES de encargar obra de motor (9.7): los nodos pendientes
  // (serviciosOnline incluido) se compran con prioridad — sin el orden, la
  // obra gen-7 se comía los 💡 cada vez que rozaban los 120 y el nodo del
  // GaaS se quedaba sin comprar la partida entera.
  state = maybeResearch(state);
  state = manageEngines(state, phil);
  state = maybeHire(state, phil);
  state = maybeCare(state, phil);
  state = manageLiveOps(state, phil);
  // En la CORPORACIÓN el laboratorio se dota antes que el proyecto (9.7):
  // manageEnergy enchufa al proyecto a todo descansado libre, y con un AAA en
  // marcha la fábrica se quedaba SIN I+D años enteros (0 💡/semana) — el nodo
  // del GaaS llegaba en 2022 con sus hits ya fuera de tiendas. Dos plazas de
  // 40+ no le duelen al AAA. En etapas menores el orden clásico se mantiene:
  // dotar el laboratorio primero disparó la economía de 💡 de TODA la partida
  // (×20) y desplazó las trayectorias calibradas de 9.1–9.6.
  if (state.studio.scaleStage >= 5) {
    state = manageResearchStaff(state);
    state = manageEnergy(state);
  } else {
    state = manageEnergy(state);
    state = manageResearchStaff(state);
  }
  state = manageAcquisitions(state, phil);
  // 3. Un juego en marcha casi siempre (docs/02 §2), pero entre juego y
  // juego el estudio respira (energía + semanas de respiro post-lanzamiento):
  // sin descanso, el burnout hunde la calidad — y eso es diseño. Los del
  // laboratorio quedan fuera del corte de energía: su rotación es aparte.
  const inLiveOps = liveServiceStaffIds(state);
  if (
    state.projects.length === 0 &&
    !onBreather(state) &&
    state.staff.every(
      (e) =>
        e.energy >= REST_TO_START ||
        state.research.rdStaff.includes(e.id) ||
        // El equipo del servicio trabaja aparte: su cansancio no frena el
        // siguiente juego (su rotación vive en manageLiveOps).
        inLiveOps.has(e.id),
    )
  ) {
    // El laboratorio no retiene al fundador cuando toca arrancar: vuelve al
    // tajo y el siguiente juego lo ficha (startProject toma a los libres).
    if (state.research.rdStaff.includes('fundador')) {
      state = toggleResearchAssignment(state, 'fundador');
    }
    const before = state.projects.length;
    state = startNextGame(state, phil, gamesStarted);
    if (state.projects.length > before) gamesStarted++;
  }
  return { state, gamesStarted };
}

/** Juega la partida completa con la filosofía dada (decisiones → tick). */
export function runFullGame(
  phil: Philosophy,
  onYear?: (state: GameState) => void,
): GameState {
  let state = createInitialState(BOT_SEED);
  let gamesStarted = 0;
  while (state.week < FINAL_WEEK && state.gameOver === null) {
    const step = botDecide(state, phil, gamesStarted);
    state = step.state;
    gamesStarted = step.gamesStarted;
    state = tick(state);
    if (onYear && state.week % 52 === 0) onYear(state);
  }
  return state;
}
