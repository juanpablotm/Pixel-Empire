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
import { availableCredit, repayLoan, takeLoan, weeklyFixedCosts } from '../core/systems/economy';
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
import {
  earlyAccessBlockReason,
  launchEarlyAccess,
} from '../core/systems/earlyAccess';
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
  crisisResponse: CrisisResponseId;
  dilemma: Record<DilemmaKind, DilemmaChoice>;
}

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
  crisisResponse: 'disculpa',
  dilemma: { leakAlpha: 'transparencia', sobreHype: 'moderar' },
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
  // Holgura sobre los mínimos (40 del AAA): un proyecto de 120 semanas exige
  // rotar gente para no fundirla (docs/05 §4) — ir con la plantilla justa
  // convierte el tramo final en bugs y burnout (lección de bots de 9.1).
  teamTargetByEra: [1, 4, 8, 12, 20, 46, 48],
  sizeAmbition: 'aaa',
  stageAmbition: 5,
  // El cheque más gordo, la IP da igual: los juegos son producto, no obra.
  publisherStance: 'siempre',
  useEarlyAccess: false,
  crisisResponse: 'silencio',
  dilemma: { leakAlpha: 'capitalizar', sobreHype: 'prometer' },
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
  teamTargetByEra: [1, 4, 5, 8, 12, 18, 20],
  sizeAmbition: 'media',
  stageAmbition: 4,
  // Firma con cabeza (sin ceder la IP) y lanza a la antigua: sin EA.
  publisherStance: 'sinIp',
  useEarlyAccess: false,
  crisisResponse: 'corporativo',
  dilemma: { leakAlpha: 'transparencia', sobreHype: 'moderar' },
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
  // calendario COMPLETOS: quedarse sin caja a mitad es la trampa mortal.
  const selfCushion = (estimate: { cost: number; weeks: number }) =>
    estimate.cost + estimate.weeks * fixed;
  const ceiling = SIZE_ORDER.indexOf(SIZE_CEILING[phil.sizeAmbition]);
  for (let i = ceiling; i > 0; i--) {
    const size = SIZE_ORDER[i];
    if (sizeBlockReason(state, size) !== null) continue;
    const estimate = estimateProject(size, 'pcCasero');
    if (state.studio.capital > selfCushion(estimate)) {
      return { size, publisherId: null };
    }
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
  const { size, publisherId } = pickProject(state, phil);
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
  // Tras pagar debe quedar ~1 año del coste fijo NUEVO (el overhead de la
  // etapa comprada, docs/18 V4-d): mudarse a una oficina que no puedes
  // mantener es la trampa clásica — el bot no cae en ella.
  const newWeeklyFixed =
    weeklyFixedCosts(state) +
    balance.economy.upkeepExtraByStage[target] -
    balance.economy.upkeepExtraByStage[stage];
  const cost = balance.staff.scale.upgradeCostByStage[target];
  if (state.studio.capital - cost < 52 * newWeeklyFixed) return state;
  return expandStudio(state);
}

/**
 * Gestión de la línea de crédito (docs/06 §4), como un jugador solvente: si
 * hay un proyecto en vuelo y el runway se acorta, pide un préstamo puente en
 * vez de dejar que la bancarrota se coma el juego a medias; cuando la caja
 * sobra, amortiza para dejar de pagar el ~1 %/semana.
 */
function manageLoans(state: GameState): GameState {
  const fixed = weeklyFixedCosts(state);
  if (
    state.projects.length > 0 &&
    state.studio.capital < 8 * fixed &&
    availableCredit(state) > 0
  ) {
    return takeLoan(state, Math.min(availableCredit(state), 26 * fixed));
  }
  if (
    state.loanPrincipal > 0 &&
    state.studio.capital > state.loanPrincipal + 52 * fixed
  ) {
    return repayLoan(state, state.loanPrincipal);
  }
  return state;
}

/** Contrata del pool si el arquetipo quiere crecer y la caja lo sostiene. */
function maybeHire(state: GameState, phil: Philosophy): GameState {
  const target = phil.teamTargetByEra[eraIndex(state.era)];
  if (state.studio.scaleStage < 2 || state.staff.length >= target) return state;
  // El aforo de la etapa manda (docs/17 B1): sin hueco, no se intenta.
  if (hireBlockReason(state) !== null) return state;
  if (state.candidates.length === 0) return state;
  // El más hábil en su especialidad, prefiriendo especialidades que faltan.
  const staffBySpec = new Map<string, number>();
  for (const e of state.staff) {
    staffBySpec.set(e.specialty, (staffBySpec.get(e.specialty) ?? 0) + 1);
  }
  const rank = (c: Employee) =>
    (staffBySpec.get(c.specialty) ?? 0) * 1000 - c.skills[c.specialty];
  const candidate = [...state.candidates].sort((a, b) => rank(a) - rank(b))[0];
  // Regla de prudencia compartida: contratar solo con ~medio año de nómina.
  const runwayAfter =
    state.studio.capital -
    hiringCost(candidate) -
    26 * (weeklyFixedCosts(state) + candidate.salary);
  if (runwayAfter < 0) return state;
  return hireCandidate(state, candidate.id);
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
  for (const employee of next.staff) {
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
 */
const MOTOR_NODE_IDS = new Set([
  'motorPropio1',
  'motorPropio2',
  'motorPropio3',
  'tecnologia3d',
  'kitBiplataforma',
  'pipelineMultiplataforma',
  'tecnologiaOnline',
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
  // El laboratorio solo se lleva manos que SOBREN: dejar un proyecto grande
  // por debajo de su plantilla esperada hunde el QA y el alcance (docs/02
  // §6.1 crewRatio + docs/19 §9.1 encaje) — nadie investigaría a ese precio.
  const neededByProjects = next.projects.reduce(
    (sum, p) => sum + balance.development.sizeGate[p.size].minStaff,
    0,
  );
  const spare = Math.max(0, next.staff.length - neededByProjects);
  const rdTarget = Math.min(spare, next.staff.length >= 10 ? 2 : next.staff.length >= 4 ? 1 : 0);
  while (next.research.rdStaff.filter((id) => id !== 'fundador').length < rdTarget) {
    const candidate = next.staff
      .filter(
        (e) =>
          !e.founder &&
          !assignedToProject.has(e.id) &&
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
  state = maybeExpand(state, phil);
  state = manageLoans(state);
  state = manageEngines(state, phil);
  state = maybeResearch(state);
  state = maybeHire(state, phil);
  state = maybeCare(state, phil);
  state = manageEnergy(state);
  state = manageResearchStaff(state);
  // 3. Un juego en marcha casi siempre (docs/02 §2), pero entre juego y
  // juego el estudio respira (energía + semanas de respiro post-lanzamiento):
  // sin descanso, el burnout hunde la calidad — y eso es diseño. Los del
  // laboratorio quedan fuera del corte de energía: su rotación es aparte.
  if (
    state.projects.length === 0 &&
    !onBreather(state) &&
    state.staff.every(
      (e) => e.energy >= REST_TO_START || state.research.rdStaff.includes(e.id),
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
