import { balance } from '../../data/balance';
import { eraIndex } from '../../data/eras';
import { getGenre } from '../../data/genres';
import { getRivalDef } from '../../data/rivals';
import { appendLog } from '../engine/log';
import type { Rng } from '../engine/rng';
import type { GameState } from '../model/gameState';
import type { RivalRuntime } from '../model/rivals';
import type { Subsidiary, SubsidiaryDirective, SubsidiaryGame } from '../model/subsidiary';
import { recordExpense, recordIncome } from './economy';
import { registerReleaseSaturation } from './market';
import { addReputationDebt } from './morale';
import { withReputationDeltas } from './reputation';
import { availableGenreIds, availableThemeIds, pickTitle } from './rivals';

/**
 * Adquisiciones y filiales (Fase 9.7, docs/19 §9.7): comprar un estudio rival
 * lo saca de la competencia (docs/04 §9) y lo convierte en una FILIAL que hace
 * juegos sola: desembolso grande + overhead continuo a cambio de un ingreso
 * pasivo que depende de cómo la gestiones (directiva, docs/02 §4). Exprimirla
 * rinde más HOY y hunde moral → talento → reseñas mañana, con tu fama de
 * Empleador sangrando por el camino (docs/06 §2): el dilema, a escala macro.
 *
 * Precios deterministas sin PRNG (patrón publisherOffersFor, 9.6); el tick de
 * las filiales usa su propio stream (SUBSIDIARIES_STREAM). Números en
 * balance.acquisitions.
 */

/** Stream del PRNG de las filiales (tick.ts usa 1–9 y rivals el 9). */
export const SUBSIDIARIES_STREAM = 10 << 20;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
const round2 = (n: number): number => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Lecturas puras: precios, elegibilidad y P&L
// ---------------------------------------------------------------------------

/** Filiales del estudio (los saves previos arrancan sin el campo). */
export function subsidiaryList(state: GameState): Subsidiary[] {
  return state.subsidiaries ?? [];
}

function requireRuntime(state: GameState, rivalId: string): RivalRuntime {
  const runtime = state.rivals?.studios.find((r) => r.id === rivalId);
  if (!runtime) throw new Error(`Estudio rival desconocido: ${rivalId}`);
  return runtime;
}

function requireSubsidiary(state: GameState, subsidiaryId: string): Subsidiary {
  const sub = subsidiaryList(state).find((s) => s.id === subsidiaryId);
  if (!sub) throw new Error(`Filial desconocida: ${subsidiaryId}`);
  return sub;
}

/** Precio de compra sobre una fuerza/talento dado (fórmula única, docs/19 §9.7). */
function priceFor(tier: RivalRuntime['tier'], strength: number): number | null {
  const cfg = balance.acquisitions;
  const base = cfg.priceByTier[tier];
  if (base === undefined) return null;
  const factor = cfg.priceStrengthBase + (strength / 100) * cfg.priceStrengthSpan;
  return Math.round((base * factor) / 1000) * 1000;
}

/**
 * Precio determinista de adquirir un rival AHORA (sin PRNG): base de su tier
 * actual × su fuerza. Null si su tier no está en venta (gigantes).
 */
export function acquisitionPriceFor(state: GameState, rivalId: string): number | null {
  const runtime = requireRuntime(state, rivalId);
  return priceFor(runtime.tier, runtime.strength);
}

/**
 * Por qué NO puedes comprar este estudio, o null si puedes. Único punto de
 * verdad: acquireStudio valida con esto y la UI lo enseña atenuado.
 */
export function acquisitionBlockReason(state: GameState, rivalId: string): string | null {
  const cfg = balance.acquisitions;
  const runtime = state.rivals?.studios.find((r) => r.id === rivalId);
  if (!runtime || runtime.closed) return 'Ese estudio ya no existe';
  if (runtime.acquiredWeek !== undefined) return 'Ya es tuyo';
  if (state.studio.scaleStage < cfg.minStage) {
    return 'Las adquisiciones llegan con el Estudio grande (docs/02 §4)';
  }
  if (!cfg.buyableTiers.includes(runtime.tier)) {
    return 'Los gigantes no están en venta';
  }
  if (runtime.strength >= cfg.refuseAboveStrength) {
    return `${getRivalDef(rivalId).name} está en racha y no quiere vender`;
  }
  const price = priceFor(runtime.tier, runtime.strength);
  if (price !== null && state.studio.capital < price) {
    return 'No hay caja para esta compra';
  }
  return null;
}

/** Overhead semanal de una filial según su directiva. */
export function subsidiaryUpkeep(sub: Subsidiary): number {
  const cfg = balance.acquisitions;
  return Math.round((cfg.upkeepByTier[sub.tier] ?? 0) * cfg.directives[sub.directive].upkeepFactor);
}

/**
 * Precio de venta HOY: la fórmula de compra sobre su talento actual ×
 * sellFactor. Solo recuperas de sobra lo pagado si la hiciste crecer.
 */
export function subsidiarySellPrice(sub: Subsidiary): number {
  const cfg = balance.acquisitions;
  const now = priceFor(sub.tier, sub.talent) ?? 0;
  return Math.round((now * cfg.sellFactor) / 1000) * 1000;
}

// ---------------------------------------------------------------------------
// Acciones del jugador
// ---------------------------------------------------------------------------

/**
 * Acción: ADQUIRIR un estudio rival (docs/19 §9.7). Paga el precio, saca al
 * rival de la competencia para siempre (deja de anunciar, lanzar, saturar,
 * cazar y nominar) y abre la filial: su talento hereda la fuerza del estudio
 * y su directiva arranca en autónomo.
 */
export function acquireStudio(state: GameState, rivalId: string): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const blocked = acquisitionBlockReason(state, rivalId);
  if (blocked) throw new Error(blocked);
  const runtime = requireRuntime(state, rivalId);
  const rivals = state.rivals;
  if (!rivals) throw new Error('La industria aún no existe');
  const def = getRivalDef(rivalId);
  const cfg = balance.acquisitions;
  const price = priceFor(runtime.tier, runtime.strength) as number;

  const gap = cfg.releaseGapByTier[runtime.tier] ?? [20, 40];
  const sub: Subsidiary = {
    id: rivalId,
    name: def.name,
    tier: runtime.tier,
    acquiredWeek: state.week,
    price,
    talent: runtime.strength,
    morale: cfg.initialMorale,
    directive: 'autonomo',
    // Primer lanzamiento a mitad de su cadencia (determinista: la acción no
    // tira del PRNG, como las ofertas de publisher de 9.6).
    nextReleaseWeek: state.week + Math.round((gap[0] + gap[1]) / 2),
    weeksMoraleLow: 0,
    pendingIncome: 0,
    revenue: 0,
    upkeepPaid: 0,
    games: [],
  };

  const next: GameState = {
    ...state,
    studio: { ...state.studio, capital: state.studio.capital - price },
    stats: { ...state.stats, subsidiariesBought: (state.stats.subsidiariesBought ?? 0) + 1 },
    subsidiaries: [...subsidiaryList(state), sub],
    rivals: {
      ...rivals,
      studios: rivals.studios.map((r) =>
        r.id === rivalId ? { ...r, acquiredWeek: state.week, nextRelease: null } : r,
      ),
      // Si justo este rival te estaba tentando a alguien, la oferta muere:
      // ahora el cazador es tuyo.
      poachOffer: rivals.poachOffer?.rivalId === rivalId ? null : rivals.poachOffer,
    },
  };
  return appendLog(
    next,
    'industria',
    `🏢 Compras ${def.name} por ${price.toLocaleString('es-ES')} 💰: sale de la competencia y pasa a ser tu FILIAL. Su gente sigue haciendo juegos — ahora para ti.`,
  );
}

/** Acción: fijar la directiva de gestión de una filial (docs/02 §4). */
export function setSubsidiaryDirective(
  state: GameState,
  subsidiaryId: string,
  directive: SubsidiaryDirective,
): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const sub = requireSubsidiary(state, subsidiaryId);
  if (sub.directive === directive) return state;
  const next: GameState = {
    ...state,
    subsidiaries: subsidiaryList(state).map((s) =>
      s.id === subsidiaryId ? { ...s, directive } : s,
    ),
  };
  const texts: Record<SubsidiaryDirective, string> = {
    exprimir: `Ordenas EXPRIMIR ${sub.name}: más lanzamientos y más caja hoy… y una casa que se quema.`,
    autonomo: `${sub.name} vuelve a gestión autónoma: su ritmo, su gente.`,
    invertir: `Decides INVERTIR en ${sub.name}: cuesta más cada semana y construye moral y talento.`,
  };
  return appendLog(next, 'industria', texts[directive]);
}

/**
 * Acción: VENDER la filial a un holding sin cara. Recuperas parte del valor
 * actual (talento manda); el estudio no vuelve a la competencia.
 */
export function sellSubsidiary(state: GameState, subsidiaryId: string): GameState {
  if (state.gameOver) throw new Error('La partida ha terminado');
  const sub = requireSubsidiary(state, subsidiaryId);
  const price = subsidiarySellPrice(sub);
  const next: GameState = {
    ...state,
    studio: { ...state.studio, capital: state.studio.capital + price },
    subsidiaries: subsidiaryList(state).filter((s) => s.id !== subsidiaryId),
  };
  return appendLog(
    next,
    'industria',
    `Vendes ${sub.name} por ${price.toLocaleString('es-ES')} 💰 (pagaste ${sub.price.toLocaleString(
      'es-ES',
    )}). Un holding sin cara se la queda.`,
  );
}

// ---------------------------------------------------------------------------
// El tick de las filiales (docs/19 §9.7): overhead, lanzamientos y deriva
// ---------------------------------------------------------------------------

/** Elige combo para el lanzamiento de la filial (especialidad de la casa). */
function pickSubsidiaryConcept(
  state: GameState,
  sub: Subsidiary,
  rng: Rng,
): { gameName: string; genreId: string; themeId: string } {
  const def = getRivalDef(sub.id);
  const genresAvail = availableGenreIds(state.era);
  const themesAvail = availableThemeIds(state.era);
  const specialty = def.specialtyGenres.filter((id) => genresAvail.includes(id));
  const genreId =
    specialty.length > 0 && rng.chance(balance.rivals.specialtyChance)
      ? rng.pick(specialty)
      : rng.pick(genresAvail);
  return { gameName: pickTitle(sub.games, rng), genreId, themeId: rng.pick(themesAvail) };
}

/**
 * Avanza las filiales 1 semana (docs/08 §4; va tras advanceRivals, con su
 * propio stream): overhead continuo, cobro del bote pendiente, deriva de
 * moral/talento según directiva, éxodo si la moral se hunde, y lanzamientos
 * autónomos que SUMAN a la saturación del mercado (tu filial también pisa
 * géneros, docs/04 §3) y engordan el bote.
 */
export function advanceSubsidiaries(state: GameState, rng: Rng): GameState {
  const subs = subsidiaryList(state);
  if (subs.length === 0) return state;
  const cfg = balance.acquisitions;
  const week = state.week;
  const eraIdx = eraIndex(state.era);

  let income = 0;
  let expenses = 0;
  let employerRepDelta = 0;
  let crunchDebt = 0;
  let market = state.market;
  const news: string[] = [];
  const exodusRivalGains: string[] = [];

  const updated = subs.map((current) => {
    let sub = { ...current };
    const d = cfg.directives[sub.directive];

    // 1) Overhead continuo: la filial cuesta dinero exista lo que exista.
    const upkeep = subsidiaryUpkeep(sub);
    expenses += upkeep;
    sub.upkeepPaid += upkeep;

    // 2) Cobro del bote pendiente: el ingreso pasivo es un flujo, no cheques.
    const payout = Math.round(sub.pendingIncome * cfg.payoutRate);
    if (payout > 0) {
      income += payout;
      sub.revenue += payout;
      sub.pendingIncome = Math.round(sub.pendingIncome - payout);
    }

    // 3) Moral: la directiva la construye o la quema; en autónomo revierte
    //    despacio a su baseline. El talento SIGUE a la moral (docs/19 §9.7),
    //    entre el suelo del cascarón y el techo de la mejor casa posible.
    let morale = sub.morale + d.moralePerWeek;
    if (sub.directive === 'autonomo') {
      morale += (cfg.moraleBaseline - morale) * cfg.moraleRevertRate;
    }
    sub.morale = round2(clamp(morale, 0, 100));
    sub.talent = round2(
      clamp(
        sub.talent + (sub.morale - 50) * cfg.talentDriftPerMoralePoint + d.talentPerWeek,
        cfg.talentFloor,
        cfg.talentCap,
      ),
    );

    // 4) Éxodo (docs/05 §7 a escala de filial): moral hundida sostenida →
    //    el talento se va, y vuelve a la industria (un rival se refuerza).
    if (sub.morale < cfg.exodus.moraleBar) {
      sub.weeksMoraleLow += 1;
      if (sub.weeksMoraleLow >= cfg.exodus.weeks) {
        sub.weeksMoraleLow = 0;
        sub.talent = round2(Math.max(cfg.talentFloor, sub.talent - cfg.exodus.talentHit));
        exodusRivalGains.push(sub.id);
        news.push(
          `Fuga de talento en ${sub.name}: la plantilla huye de la casa exprimida y su nivel cae.`,
        );
      }
    } else {
      sub.weeksMoraleLow = 0;
    }

    // 5) Tu fama de Empleador y la pólvora del crunch gotean con la directiva
    //    (docs/06 §2): exprimir una filial es exprimir a TU gente.
    employerRepDelta += d.employerRepPerWeek;
    crunchDebt += d.debtPerWeek;

    // 6) Lanzamiento autónomo: la reseña sigue al TALENTO (rango del tier ±
    //    talentReviewSpan, más sesgos de perfil y directiva) y el bote tiene
    //    SUELO de calidad — un flop no genera nada. El combo SATURA el
    //    mercado como cualquier lanzamiento (docs/04 §3).
    if (week >= sub.nextReleaseWeek) {
      const def = getRivalDef(sub.id);
      const concept = pickSubsidiaryConcept(state, sub, rng);
      const size = balance.rivals.sizeByTierEra[sub.tier][eraIdx];
      const [minR, maxR] = balance.rivals.reviewRangeByTier[sub.tier];
      const roll = minR + rng.next() * (maxR - minR);
      const talentAdj =
        (cfg.talentReviewSpan * (sub.talent - balance.rivals.baseStrengthByTier[sub.tier])) / 50;
      const review = Math.round(
        clamp(
          roll + talentAdj + balance.rivals.reviewBiasByProfile[def.profile] + d.reviewBias,
          5,
          98,
        ),
      );
      const quality01 = clamp(
        (review - cfg.bountyReviewFloor) / cfg.bountyReviewSpan,
        0,
        1,
      );
      const bounty = Math.round(
        cfg.bountyBySize[size] * quality01 ** cfg.bountyExponent * d.incomeMult,
      );
      const game: SubsidiaryGame = {
        name: concept.gameName,
        genreId: concept.genreId,
        themeId: concept.themeId,
        size,
        review,
        releaseWeek: week,
        bounty,
      };
      market = registerReleaseSaturation(market, concept.genreId, concept.themeId, week);
      const gap = cfg.releaseGapByTier[sub.tier] ?? [20, 40];
      sub = {
        ...sub,
        pendingIncome: sub.pendingIncome + bounty,
        games: [...sub.games, game].slice(-cfg.maxGamesKept),
        nextReleaseWeek: week + Math.max(4, Math.round(rng.int(gap[0], gap[1]) * d.gapFactor)),
      };
      news.push(
        `Tu filial ${sub.name} lanza «${game.name}» (${getGenre(game.genreId).name}): reseña ${review}. El bote sube en ${bounty.toLocaleString('es-ES')} 💰.`,
      );
    }

    return sub;
  });

  let next: GameState = { ...state, market, subsidiaries: updated };

  // El talento fugado ficha por la competencia viva (docs/05 §7).
  if (exodusRivalGains.length > 0 && next.rivals) {
    let studios = next.rivals.studios;
    for (const fromId of exodusRivalGains) {
      const open = studios.filter(
        (r) => !r.closed && r.acquiredWeek === undefined && r.id !== fromId,
      );
      if (open.length === 0) break;
      const target = open[rng.int(0, open.length - 1)];
      studios = studios.map((r) =>
        r.id === target.id
          ? { ...r, strength: round2(Math.min(100, r.strength + cfg.exodus.rivalStrengthGain)) }
          : r,
      );
    }
    next = { ...next, rivals: { ...next.rivals, studios } };
  }

  if (employerRepDelta !== 0) {
    next = {
      ...next,
      studio: withReputationDeltas(next.studio, { empleador: round2(employerRepDelta) }),
    };
  }
  if (crunchDebt > 0) {
    next = { ...next, studio: addReputationDebt(next.studio, 'crunch', round2(crunchDebt)) };
  }

  if (income > 0 || expenses > 0) {
    next = {
      ...next,
      studio: { ...next.studio, capital: next.studio.capital + income - expenses },
      stats: { ...next.stats, totalRevenue: next.stats.totalRevenue + income },
    };
    next = recordIncome(next, income);
    next = recordExpense(next, expenses);
  }

  for (const text of news) {
    next = appendLog(next, 'industria', text);
  }
  return next;
}
