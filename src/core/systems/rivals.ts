import { balance } from '../../data/balance';
import { eraIndex } from '../../data/eras';
import { genres, getGenre } from '../../data/genres';
import { getRivalDef, rivalDefs, rivalGameTitles, rivalTierLabels, type RivalDef } from '../../data/rivals';
import { getTheme, themes } from '../../data/themes';
import { appendLog } from '../engine/log';
import { makeRng, type Rng } from '../engine/rng';
import type { EraId } from '../model/era';
import type { GameState } from '../model/gameState';
import type { Employee } from '../model/staff';
import type {
  RivalAnnouncement,
  RivalGame,
  RivalRuntime,
  RivalsState,
  RivalTier,
} from '../model/rivals';
import { dropFromLiveServices } from './liveService';
import { activeFeverFor, activeFevers, buildFever, registerReleaseSaturation } from './market';
import { withReputationDeltas } from './reputation';
import { dropFromSquads } from './squads';

/**
 * Estudios rivales (Fase 9.5, docs/19 §9.5 y docs/04 §9): la industria viva.
 * Cada semana los rivales anuncian y lanzan juegos (suman a la saturación de
 * docs/04 §3 y pueden encender fiebres, docs/04 §2.1), y su fuerza evoluciona
 * con sus resultados — crecen, decaen, promocionan de tier o cierran.
 *
 * Todo determinista (stream propio del PRNG) y legible (Pilar 2): cada
 * movimiento deja noticia y el panel de Industria enseña el estado completo.
 * Los perfiles viven en data/rivals.ts y los números en balance.rivals.
 */

/** Stream del PRNG de los rivales (tick.ts usa 1–8; ver engine/tick.ts). */
export const RIVALS_STREAM = 9 << 20;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Redondeo a 2 decimales: mantiene la fuerza legible en el save. */
const round2 = (n: number): number => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Estado inicial y activación por eras
// ---------------------------------------------------------------------------

/** Runtime de arranque de un estudio del roster (fuerza = baseline del tier). */
function freshRuntime(def: RivalDef, week: number, rng: Rng): RivalRuntime {
  const [min, max] = balance.rivals.initialAnnounceDelay;
  return {
    id: def.id,
    tier: def.tier,
    strength: balance.rivals.baseStrengthByTier[def.tier],
    weeksHigh: 0,
    weeksLow: 0,
    nextAnnounceWeek: week + rng.int(min, max),
    nextRelease: null,
    games: [],
    closed: false,
  };
}

/**
 * Estado inicial de la capa de rivales: los estudios cuya era ya llegó, con
 * sus primeros anuncios escalonados. Determinista por semilla (stream fijo:
 * lo usan igual una partida nueva, el sandbox y la migración v16).
 */
export function createInitialRivals(seed: number, week: number, era: EraId): RivalsState {
  const rng = makeRng(seed, RIVALS_STREAM);
  const idx = eraIndex(era);
  const studios = rivalDefs
    .filter((def) => eraIndex(def.appearsInEra) <= idx)
    .map((def) => freshRuntime(def, week, rng));
  return { studios, poachOffer: null };
}

// ---------------------------------------------------------------------------
// Elección de juego: combo, tamaño y título (perfiles legibles)
// ---------------------------------------------------------------------------

/** Géneros/temas ya aparecidos en la era: el catálogo de la industria. La
 * investigación NO gatea a los rivales (es TU conocimiento, docs/02 §3): si
 * la era lo trae, algún estudio lo estará haciendo ya. Los usan también las
 * filiales (9.7): estudios comprados A la industria, con su mismo catálogo. */
export function availableGenreIds(era: EraId): string[] {
  const idx = eraIndex(era);
  return genres.filter((g) => eraIndex(g.appearsInEra) <= idx).map((g) => g.id);
}

export function availableThemeIds(era: EraId): string[] {
  const idx = eraIndex(era);
  return themes.filter((t) => eraIndex(t.appearsInEra) <= idx).map((t) => t.id);
}

/** Género favorito si está disponible (specialtyChance); si no, uno cualquiera. */
function pickGenre(def: RivalDef, avail: readonly string[], rng: Rng): string {
  const specialty = def.specialtyGenres.filter((id) => avail.includes(id));
  if (specialty.length > 0 && rng.chance(balance.rivals.specialtyChance)) {
    return rng.pick(specialty);
  }
  return rng.pick(avail);
}

/** Nombre base de un título (sin el número de secuela). */
function titleBase(name: string): string {
  return name.replace(/ \d+$/, '');
}

/** «Neón Roto» → «Neón Roto 2» → «Neón Roto 3»: numeración determinista. */
function sequelName(name: string, games: readonly { name: string }[]): string {
  const base = titleBase(name);
  let maxN = 1;
  for (const g of games) {
    if (titleBase(g.name) !== base) continue;
    const m = g.name.match(/ (\d+)$/);
    maxN = Math.max(maxN, m ? parseInt(m[1], 10) : 1);
  }
  return `${base} ${maxN + 1}`;
}

/** Título nuevo del pool (evitando repetir los suyos); agotado el pool, secuela.
 * Compartido con las filiales (9.7), que también publican del mismo pool. */
export function pickTitle(games: readonly { name: string }[], rng: Rng): string {
  const used = new Set(games.map((g) => titleBase(g.name)));
  const fresh = rivalGameTitles.filter((t) => !used.has(t));
  if (fresh.length > 0) return rng.pick(fresh);
  return sequelName(rng.pick(rivalGameTitles), games);
}

/**
 * Qué anuncia un rival (docs/19 §9.5, IA legible por perfil): la fábrica
 * exprime secuelas de su mejor juego (inunda su género hasta saturarlo,
 * docs/04 §3), el oportunista persigue la fiebre activa (la quema antes,
 * docs/04 §2.1) y el de prestigio busca combo fresco.
 */
function pickConcept(
  state: GameState,
  def: RivalDef,
  runtime: RivalRuntime,
  rng: Rng,
): { gameName: string; genreId: string; themeId: string } {
  const b = balance.rivals;
  const genresAvail = availableGenreIds(state.era);
  const themesAvail = availableThemeIds(state.era);

  if (def.profile === 'fabrica' && runtime.games.length > 0 && rng.chance(b.sequelChance)) {
    const best = runtime.games.reduce((a, g) => (g.review > a.review ? g : a));
    return { gameName: sequelName(best.name, runtime.games), genreId: best.genreId, themeId: best.themeId };
  }

  if (def.profile === 'oportunista') {
    const fevers = activeFevers(state.market.fevers, state.week);
    if (fevers.length > 0 && rng.chance(b.chaseFeverChance)) {
      const fever = rng.pick(fevers);
      const combo =
        fever.target === 'genre'
          ? { genreId: fever.targetId, themeId: rng.pick(themesAvail) }
          : { genreId: pickGenre(def, genresAvail, rng), themeId: fever.targetId };
      return { gameName: pickTitle(runtime.games, rng), ...combo };
    }
  }

  return {
    gameName: pickTitle(runtime.games, rng),
    genreId: pickGenre(def, genresAvail, rng),
    themeId: rng.pick(themesAvail),
  };
}

// ---------------------------------------------------------------------------
// Reseña y evolución de fuerza
// ---------------------------------------------------------------------------

/**
 * Reseña de un lanzamiento rival: uniforme en el rango de su tier, desplazada
 * por su fuerza y su perfil (balance.rivals). Misma escala 0..100 que la tuya.
 */
export function rollRivalReview(
  tier: RivalTier,
  profile: RivalDef['profile'],
  strength: number,
  rng: Rng,
): number {
  const b = balance.rivals;
  const [min, max] = b.reviewRangeByTier[tier];
  const roll = min + rng.next() * (max - min);
  const adj = (b.strengthReviewSpan * (strength - b.baseStrengthByTier[tier])) / 50;
  return Math.round(clamp(roll + adj + b.reviewBiasByProfile[profile], 5, 98));
}

/** La fuerza reacciona al resultado: hit suma, flop resta (umbral por tier). */
function strengthAfterRelease(tier: RivalTier, strength: number, review: number): number {
  const b = balance.rivals;
  if (review >= b.hitReviewByTier[tier]) return clamp(strength + b.strengthHitGain, 0, 100);
  if (review <= b.flopReviewByTier[tier]) return clamp(strength - b.strengthFlopLoss, 0, 100);
  return strength;
}

const TIER_UP: Partial<Record<RivalTier, RivalTier>> = { indie: 'medio', medio: 'gigante' };
const TIER_DOWN: Partial<Record<RivalTier, RivalTier>> = { gigante: 'medio', medio: 'indie' };

// ---------------------------------------------------------------------------
// El tick de la industria
// ---------------------------------------------------------------------------

/**
 * Avanza los rivales 1 semana (docs/08 §4; va justo tras advanceMarket en el
 * tick, con las fiebres del día). Función pura: anuncios, lanzamientos
 * (saturación + posible fiebre), evolución de fuerza y transiciones de tier.
 */
export function advanceRivals(state: GameState, rng: Rng): GameState {
  const rivals = state.rivals;
  if (!rivals) return state;
  const b = balance.rivals;
  const week = state.week;
  const eraIdx = eraIndex(state.era);
  const news: { type: 'industria' | 'mercado'; text: string }[] = [];

  let market = state.market;
  let studios = rivals.studios.map((r) => ({ ...r }));

  // 1) Entran en escena los estudios cuya era acaba de llegar (roster
  //    escalonado: la industria crece contigo, docs/19 §9.5).
  const present = new Set(studios.map((r) => r.id));
  for (const def of rivalDefs) {
    if (present.has(def.id) || eraIndex(def.appearsInEra) > eraIdx) continue;
    studios.push(freshRuntime(def, week, rng));
    news.push({
      type: 'industria',
      text: `Un estudio nuevo entra en escena: ${def.name} (${rivalTierLabels[def.tier].toLowerCase()}).`,
    });
  }

  studios = studios.map((runtime) => {
    // Un estudio adquirido (9.7) ya no compite: vive como filial tuya en
    // GameState.subsidiaries y aquí solo queda su historia.
    if (runtime.closed || runtime.acquiredWeek !== undefined) return runtime;
    const def = getRivalDef(runtime.id);
    let r = runtime;

    // 2) La fuerza revierte despacio al baseline del tier (el momento se
    //    gana y se pierde; sin hits, la inercia te devuelve a tu sitio).
    const base = b.baseStrengthByTier[r.tier];
    r.strength = round2(clamp(r.strength + (base - r.strength) * b.strengthRevertRate, 0, 100));

    // 3) Contadores de promoción / caída (sostenido, no un pico de suerte).
    r.weeksHigh = r.strength >= b.tierShift.promoteBar && r.tier !== 'gigante' ? r.weeksHigh + 1 : 0;
    r.weeksLow = r.strength <= b.tierShift.demoteBar ? r.weeksLow + 1 : 0;

    if (r.weeksHigh >= b.tierShift.sustainWeeks) {
      const up = TIER_UP[r.tier] as RivalTier;
      r = { ...r, tier: up, weeksHigh: 0, weeksLow: 0 };
      news.push({
        type: 'industria',
        text:
          up === 'gigante'
            ? `${def.name} entra en la liga de los gigantes: su próximo lanzamiento moverá el mercado.`
            : `${def.name} se consolida como ${rivalTierLabels[up].toLowerCase()}: la industria le hace hueco.`,
      });
    } else if (r.weeksLow >= b.tierShift.closeWeeks && r.tier === 'indie' && r.strength <= b.tierShift.closeBar) {
      r = { ...r, closed: true, nextRelease: null };
      news.push({
        type: 'industria',
        text: `${def.name} cierra sus puertas: la industria pierde un estudio.`,
      });
      return r;
    } else if (r.weeksLow >= b.tierShift.sustainWeeks && r.tier !== 'indie') {
      const down = TIER_DOWN[r.tier] as RivalTier;
      r = { ...r, tier: down, weeksHigh: 0, weeksLow: 0 };
      news.push({
        type: 'industria',
        text: `${def.name} se desinfla: baja a ${rivalTierLabels[down].toLowerCase()}. Los despachos hierven.`,
      });
    }

    // 4) Anuncio del próximo juego (visible en el calendario de Industria; la
    //    campaña de un gigante define una ventana disputada, docs/19 §9.5).
    if (r.nextRelease === null && week >= r.nextAnnounceWeek) {
      const concept = pickConcept(state, def, r, rng);
      const lead = rng.int(b.announceLeadWeeks[0], b.announceLeadWeeks[1]);
      const announcement: RivalAnnouncement = {
        ...concept,
        size: b.sizeByTierEra[r.tier][eraIdx],
        announcedWeek: week,
        releaseWeek: week + lead,
        hyped: r.tier === 'gigante',
      };
      r = { ...r, nextRelease: announcement };
      if (announcement.hyped) {
        news.push({
          type: 'industria',
          text: `📅 ${def.name} anuncia «${announcement.gameName}» (${getGenre(announcement.genreId).name}) con campaña masiva: sale en ~${lead} semanas. Mala fecha para estrenar un juego del género.`,
        });
      }
    }

    // 5) Lanzamiento: satura su combo (docs/04 §3) y, si es un bombazo,
    //    puede encender una fiebre (docs/04 §2.1 — "los rivales llegan en 9.5").
    if (r.nextRelease !== null && week >= r.nextRelease.releaseWeek) {
      const rel = r.nextRelease;
      const review = rollRivalReview(r.tier, def.profile, r.strength, rng);
      market = registerReleaseSaturation(market, rel.genreId, rel.themeId, week);

      let feverIgnited = false;
      if (review >= balance.market.fevers.hitFeverBar && rng.chance(b.feverChance)) {
        const target: 'genre' | 'theme' = rng.next() < 0.5 ? 'genre' : 'theme';
        const targetId = target === 'genre' ? rel.genreId : rel.themeId;
        if (!activeFeverFor(market.fevers, target, targetId, week)) {
          const fever = buildFever(target, targetId, week, 'rival', rng);
          market = { ...market, fevers: [...(market.fevers ?? []), fever] };
          feverIgnited = true;
          const kind = target === 'genre' ? 'del género' : 'del tema';
          const name = target === 'genre' ? getGenre(targetId).name : getTheme(targetId).name;
          news.push({
            type: 'mercado',
            text: `🔥 El bombazo de ${def.name} con «${rel.gameName}» enciende una fiebre ${kind} ${name}: todo el mundo quiere más.`,
          });
        }
      }

      const game: RivalGame = {
        name: rel.gameName,
        genreId: rel.genreId,
        themeId: rel.themeId,
        size: rel.size,
        review,
        releaseWeek: week,
        hyped: rel.hyped,
        feverIgnited: feverIgnited || undefined,
      };
      const gap = rng.int(b.announceGapByTier[r.tier][0], b.announceGapByTier[r.tier][1]);
      r = {
        ...r,
        strength: strengthAfterRelease(r.tier, r.strength, review),
        games: [...r.games, game].slice(-b.maxGamesKept),
        nextRelease: null,
        nextAnnounceWeek: week + gap,
      };
      const isHit = review >= b.hitReviewByTier[r.tier];
      const isFlop = review <= b.flopReviewByTier[r.tier];
      // Ruido bajo control: los lanzamientos indie solo son noticia cuando hay
      // historia (hit o batacazo); el panel de Industria los enseña todos.
      if (r.tier !== 'indie' || isHit || isFlop) {
        const flavor = isHit ? ' La industria aplaude.' : isFlop ? ' Un tropiezo sonado.' : '';
        news.push({
          type: 'industria',
          text: `${def.name} lanza «${rel.gameName}» (${getGenre(rel.genreId).name}): reseña ${review}.${flavor}`,
        });
      }
    }

    return r;
  });

  // 6) Caza de talento (docs/19 §9.5 + docs/05 §7): si no hay oferta pendiente,
  //    un rival puede tentar a un empleado con la lealtad hundida. La mala fama
  //    de Empleador atrae buitres; el fundador no se ficha.
  let poachOffer = rivals.poachOffer;
  if (poachOffer !== null && !state.staff.some((e) => e.id === poachOffer?.employeeId)) {
    poachOffer = null; // el empleado ya no está (renunció): la oferta caduca
  }
  if (poachOffer === null) {
    const p = balance.rivals.poach;
    const hunters = studios.filter((r) => !r.closed && r.acquiredWeek === undefined);
    const repFactor = p.employerRepBase - state.studio.reputation.empleador / 100;
    const vulnerable = state.staff.filter((e) => !e.founder && e.loyalty < p.loyaltyThreshold);
    for (const employee of vulnerable) {
      if (hunters.length === 0) break;
      if (!rng.chance(p.chancePerVulnerable * repFactor)) continue;
      // El cazador se elige a peso de fuerza: los fuertes fichan más.
      const totalStrength = hunters.reduce((sum, r) => sum + r.strength, 0);
      let roll = rng.next() * Math.max(1, totalStrength);
      let hunter = hunters[0];
      for (const r of hunters) {
        roll -= r.strength;
        if (roll <= 0) {
          hunter = r;
          break;
        }
      }
      poachOffer = {
        rivalId: hunter.id,
        employeeId: employee.id,
        offeredSalary: Math.round(employee.salary * p.offerSalaryMult),
        week,
      };
      news.push({
        type: 'industria',
        text: `${getRivalDef(hunter.id).name} quiere llevarse a ${employee.name}: ofrece ${poachOffer.offeredSalary} 💰/semana. ¿Igualas la oferta o le dejas ir?`,
      });
      break; // una oferta a la vez: cada caza es un momento, no una lista
    }
  }

  let next: GameState = { ...state, market, rivals: { studios, poachOffer } };
  for (const item of news) {
    next = appendLog(next, item.type, item.text);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Robo de talento: resolución de la oferta y renuncias con destino
// ---------------------------------------------------------------------------

/** ¿Cuenta como estrella (docs/05 §2): skill ≥ starSkill en su especialidad? */
function isStar(employee: Employee): boolean {
  return employee.skills[employee.specialty] >= balance.rivals.poach.starSkill;
}

/** Suma fuerza a un rival (fichaje conseguido); devuelve los estudios nuevos. */
function strengthenRival(
  studios: readonly RivalRuntime[],
  rivalId: string,
  gain: number,
): RivalRuntime[] {
  return studios.map((r) =>
    r.id === rivalId ? { ...r, strength: Math.min(100, round2(r.strength + gain)) } : r,
  );
}

/** Saca al empleado de plantilla, proyectos, I+D, subequipos y servicios en
 * vivo (como una renuncia). */
function removeEmployee(state: GameState, employeeId: string): GameState {
  const next: GameState = {
    ...state,
    staff: state.staff.filter((e) => e.id !== employeeId),
    projects: state.projects.map((p) =>
      p.assignedStaff.includes(employeeId)
        ? { ...p, assignedStaff: p.assignedStaff.filter((id) => id !== employeeId) }
        : p,
    ),
    research: {
      ...state.research,
      rdStaff: state.research.rdStaff.filter((id) => id !== employeeId),
    },
  };
  return dropFromLiveServices(dropFromSquads(next, [employeeId]), [employeeId]);
}

export type PoachResolution = 'igualar' | 'dejar';

/**
 * Acción: resolver la oferta de caza (docs/19 §9.5). `igualar` = su salario
 * pasa a ser el de la oferta PARA SIEMPRE y la lealtad respira (pagar para
 * retener es un coste permanente, no un clic). `dejar` = se marcha al rival,
 * que se fortalece (mucho más si era una estrella) — y la plantilla lo ve.
 */
export function resolvePoachOffer(state: GameState, resolution: PoachResolution): GameState {
  const rivals = state.rivals;
  const offer = rivals?.poachOffer;
  if (!rivals || !offer) throw new Error('No hay ninguna oferta de caza pendiente');
  const p = balance.rivals.poach;
  const rivalName = getRivalDef(offer.rivalId).name;
  const employee = state.staff.find((e) => e.id === offer.employeeId);

  // El empleado pudo irse por su pie mientras tanto: la oferta caduca sin más.
  if (!employee) {
    return { ...state, rivals: { ...rivals, poachOffer: null } };
  }

  if (resolution === 'igualar') {
    const next: GameState = {
      ...state,
      rivals: { ...rivals, poachOffer: null },
      staff: state.staff.map((e) =>
        e.id === employee.id
          ? {
              ...e,
              salary: Math.max(e.salary, offer.offeredSalary),
              loyalty: Math.min(100, e.loyalty + p.counterLoyaltyBoost),
              morale: Math.min(100, e.morale + p.counterMoraleBoost),
            }
          : e,
      ),
    };
    return appendLog(
      next,
      'staff',
      `Igualas la oferta de ${rivalName}: ${employee.name} se queda, con ${offer.offeredSalary} 💰/semana. Sentirse valorado también cuenta.`,
    );
  }

  const gain = isStar(employee) ? p.strengthGainStar : p.strengthGain;
  let next = removeEmployee(state, employee.id);
  next = {
    ...next,
    rivals: {
      studios: strengthenRival(rivals.studios, offer.rivalId, gain),
      poachOffer: null,
    },
    studio: withReputationDeltas(next.studio, { empleador: -p.employerRepHit }),
  };
  return appendLog(
    next,
    'industria',
    `${employee.name} ficha por ${rivalName}${isStar(employee) ? ': se llevan a una estrella y lo celebran a bombo y platillo' : ''}. La competencia se fortalece con tu gente.`,
  );
}

/**
 * Una renuncia espontánea puede acabar en la competencia (docs/05 §7): el
 * PRNG decide si el que se va ficha por un rival (que se fortalece) o
 * desaparece del sector. Lo llama advanceStaff al procesar renuncias.
 * Devuelve el estado (quizá con el rival reforzado) y el texto del suceso.
 */
export function signQuitterWithRival(
  state: GameState,
  quitter: Employee,
  rng: Rng,
): { state: GameState; text: string } {
  const rivals = state.rivals;
  const p = balance.rivals.poach;
  const open = (rivals?.studios ?? []).filter((r) => !r.closed && r.acquiredWeek === undefined);
  if (!rivals || open.length === 0 || !rng.chance(p.quitSignChance)) {
    return { state, text: `${quitter.name} renuncia, harto del trato recibido.` };
  }
  const hunter = open[rng.int(0, open.length - 1)];
  const gain = isStar(quitter) ? p.strengthGainStar : p.strengthGain;
  return {
    state: {
      ...state,
      rivals: { ...rivals, studios: strengthenRival(rivals.studios, hunter.id, gain) },
    },
    text: `${quitter.name} renuncia… y ficha por ${getRivalDef(hunter.id).name}. Tu descontento es su plantilla.`,
  };
}

// ---------------------------------------------------------------------------
// Lecturas para la UI y otros sistemas (selectores puros)
// ---------------------------------------------------------------------------

/** Estudios vivos e independientes (el panel enseña aparte cerrados y
 * adquiridos): los únicos que anuncian, lanzan, disputan ventanas y cazan. */
export function activeRivalStudios(state: GameState): RivalRuntime[] {
  return (state.rivals?.studios ?? []).filter(
    (r) => !r.closed && r.acquiredWeek === undefined,
  );
}

/**
 * Lanzamientos rivales ya ANUNCIADOS y aún no salidos, ordenados por fecha:
 * el calendario del panel de Industria (docs/19 §9.5 — decides con
 * información, no te sorprenden).
 */
export function announcedReleases(
  state: GameState,
): { rival: RivalRuntime; announcement: RivalAnnouncement }[] {
  return activeRivalStudios(state)
    .filter((r) => r.nextRelease !== null && r.nextRelease.announcedWeek <= state.week)
    .map((r) => ({ rival: r, announcement: r.nextRelease as RivalAnnouncement }))
    .sort((a, b) => a.announcement.releaseWeek - b.announcement.releaseWeek);
}

/**
 * Ventana disputada sobre un género en una semana (docs/19 §9.5): el bombazo
 * con campaña de un GIGANTE domina la conversación ±radiusWeeks alrededor de
 * su fecha. Devuelve la ventana que más tarde termina (esquivarla esquiva
 * todas), o null. Determinista y previsible: la fecha rival es pública desde
 * su anuncio (calendario de Industria), así que nunca es una emboscada.
 */
export interface ContestedWindow {
  rivalId: string;
  rivalName: string;
  gameName: string;
  /** Semana de lanzamiento del bombazo rival. */
  releaseWeek: number;
  /** Última semana dentro de la ventana disputada. */
  endWeek: number;
}

export function contestedWindowAt(
  state: GameState,
  genreId: string,
  week: number,
): ContestedWindow | null {
  const radius = balance.rivals.window.radiusWeeks;
  let best: ContestedWindow | null = null;
  const consider = (rivalId: string, gameName: string, releaseWeek: number) => {
    if (Math.abs(releaseWeek - week) > radius) return;
    const candidate: ContestedWindow = {
      rivalId,
      rivalName: getRivalDef(rivalId).name,
      gameName,
      releaseWeek,
      endWeek: releaseWeek + radius,
    };
    if (best === null || candidate.endWeek > best.endWeek) best = candidate;
  };
  for (const r of activeRivalStudios(state)) {
    if (r.nextRelease?.hyped && r.nextRelease.genreId === genreId) {
      consider(r.id, r.nextRelease.gameName, r.nextRelease.releaseWeek);
    }
    for (const g of r.games) {
      if (g.hyped && g.genreId === genreId) consider(r.id, g.name, g.releaseWeek);
    }
  }
  return best;
}

/** Lanzamientos rivales recientes (todas las casas), del más nuevo al más viejo. */
export function recentRivalGames(
  state: GameState,
  maxItems = 12,
): { rival: RivalRuntime; game: RivalGame }[] {
  const all = (state.rivals?.studios ?? []).flatMap((rival) =>
    rival.games.map((game) => ({ rival, game })),
  );
  return all.sort((a, b) => b.game.releaseWeek - a.game.releaseWeek).slice(0, maxItems);
}
