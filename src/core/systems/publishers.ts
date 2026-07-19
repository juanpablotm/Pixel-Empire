import { balance } from '../../data/balance';
import { getPublisher, publisherDefs, type PublisherDef } from '../../data/publishers';
import { eraAtLeast } from '../../data/eras';
import type { GameState } from '../model/gameState';
import type { ProjectSize, PublisherDeal } from '../model/project';
import { aggregateReputation } from './reputation';

/**
 * Publishers (Fase 9.6, docs/19 §9.6 y docs/06 §4.1): ofertas DETERMINISTAS y
 * sin PRNG — la oferta se calcula del perfil del publisher (data/publishers.ts)
 * + el tamaño del proyecto + tu reputación, y se explica sola en la tarjeta
 * (Pilar 2). Firmar congela los términos en el proyecto; el reparto semanal lo
 * cobra advanceSales y la bolsa de marketing la gasta launchMarketingCampaign.
 */

/** Una oferta concreta sobre la mesa: lo que la tarjeta enseña y se firma. */
export interface PublisherOffer {
  publisherId: string;
  publisherName: string;
  blurb: string;
  /** Fracción del bruto que se queda el publisher (0..1). */
  revShare: number;
  /** Adelanto en 💰 que te ingresa al firmar (no recuperable). */
  advance: number;
  /** Además paga los costes de arranque (licencias + coste base + motor). */
  keepsIp: boolean;
  exclusivePlatform: boolean;
  /** Bolsa de marketing que pagará por este juego. */
  marketingBudget: number;
  /** Su red de distribución: demanda del juego × (1 + boost). */
  distributionBoost: number;
}

/** Reputación que mira un publisher: la media de prensa y crítica. */
function pressReputation01(state: GameState): number {
  const rep = state.studio.reputation;
  return ((rep.prensa + rep.critica) / 2) / 100;
}

/** Semanas de calendario base de un tamaño (sin features, que aún no existen). */
function baseWeeks(size: ProjectSize): number {
  return balance.development.phaseWeeksBySize[size] * 3;
}

/**
 * El adelanto de un publisher para un tamaño: cubre el coste de desarrollo
 * estimado (semanas × devCost) × cobertura del perfil × ajuste por reputación
 * (mejor fama → algo mejores términos: cuando ya casi no lo necesitas, te
 * tratan bien). Redondeado para que la tarjeta sea legible.
 */
export function publisherAdvance(
  def: PublisherDef,
  size: ProjectSize,
  state: GameState,
): number {
  const a = balance.publishers.advance;
  const repFactor =
    a.repFactorMin + (a.repFactorMax - a.repFactorMin) * pressReputation01(state);
  const raw =
    baseWeeks(size) * balance.economy.devCostPerPersonWeek * def.advanceCoverage * repFactor;
  return Math.round(raw / a.roundTo) * a.roundTo;
}

/** Bolsa de marketing del trato: base por tamaño × multiplicador del perfil. */
export function publisherMarketingBudget(def: PublisherDef, size: ProjectSize): number {
  return Math.round(balance.publishers.marketingBudgetBySize[size] * def.marketingBudgetMult);
}

/**
 * Por qué un publisher NO se sienta contigo para este tamaño, o null si su
 * oferta está disponible. Único punto de verdad: publisherOffersFor filtra con
 * esto y startProject lo re-valida al firmar (docs/08 §6).
 */
export function publisherBlockReason(
  state: GameState,
  def: PublisherDef,
  size: ProjectSize,
): string | null {
  if (!eraAtLeast(state.era, def.appearsInEra)) {
    return `${def.name} aún no existe en esta era`;
  }
  if (def.retiresInEra !== undefined && eraAtLeast(state.era, def.retiresInEra)) {
    return `${def.name} ya no firma tratos (fuera del negocio)`;
  }
  if (!def.sizes.includes(size)) {
    return `${def.name} no financia proyectos de este tamaño`;
  }
  if (aggregateReputation(state.studio.reputation) < def.minReputation) {
    return `${def.name} solo firma con estudios de renombre (reputación ≥ ${def.minReputation})`;
  }
  return null;
}

/** Ensambla la oferta concreta de un publisher para un tamaño. */
export function buildPublisherOffer(
  state: GameState,
  def: PublisherDef,
  size: ProjectSize,
): PublisherOffer {
  return {
    publisherId: def.id,
    publisherName: def.name,
    blurb: def.blurb,
    revShare: def.revShare,
    advance: publisherAdvance(def, size, state),
    keepsIp: def.demandsIp,
    exclusivePlatform: def.exclusivePlatform,
    marketingBudget: publisherMarketingBudget(def, size),
    distributionBoost: def.distributionBoost,
  };
}

/**
 * Las ofertas sobre la mesa para un proyecto de este tamaño, ordenadas por
 * adelanto (la tentación primero). Deterministas: mismo estado → mismas
 * ofertas. La tarjeta "Auto-publicado" no es una oferta: es la ausencia de una.
 */
export function publisherOffersFor(state: GameState, size: ProjectSize): PublisherOffer[] {
  return publisherDefs
    .filter((def) => publisherBlockReason(state, def, size) === null)
    .map((def) => buildPublisherOffer(state, def, size))
    .sort((a, b) => b.advance - a.advance || a.publisherId.localeCompare(b.publisherId));
}

/** El trato congelado que viaja en el proyecto al firmar una oferta. */
export function dealFromOffer(offer: PublisherOffer, upfrontCovered: number): PublisherDeal {
  return {
    publisherId: offer.publisherId,
    publisherName: offer.publisherName,
    revShare: offer.revShare,
    advance: offer.advance,
    keepsIp: offer.keepsIp,
    distributionBoost: offer.distributionBoost,
    marketingBudgetLeft: offer.marketingBudget,
    marketingCovered: 0,
    upfrontCovered,
  };
}

export { getPublisher, publisherDefs };
export type { PublisherDef };
