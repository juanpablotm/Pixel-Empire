import { creators, type CreatorDef } from '../../data/creators';
import { eraAtLeast } from '../../data/eras';
import { features } from '../../data/features';
import { genres } from '../../data/genres';
import {
  monetizationFlagEras,
  monetizationModels,
  type MonetizationModelDef,
} from '../../data/monetization';
import { platforms } from '../../data/platforms';
import { themes } from '../../data/themes';
import type { Feature, Genre, Platform, Theme } from '../model/content';
import type { GameState } from '../model/gameState';

/**
 * Disponibilidad del contenido (docs/09 §7): todo lo gateado por era
 * (`appearsInEra`) y por investigación (`requiresResearch`) pasa por aquí.
 * La concepción, las features y la monetización validan con estas funciones;
 * la UI las usa para mostrar solo lo desbloqueado (docs/10 §14).
 */

type Gated = { appearsInEra: Genre['appearsInEra']; requiresResearch?: string };

function contentAvailable(state: GameState, item: Gated): boolean {
  if (!eraAtLeast(state.era, item.appearsInEra)) return false;
  if (item.requiresResearch && !state.research.unlocked.includes(item.requiresResearch)) {
    return false;
  }
  return true;
}

export function genreAvailable(state: GameState, genre: Genre): boolean {
  return contentAvailable(state, genre);
}

export function availableGenres(state: GameState): Genre[] {
  return genres.filter((g) => contentAvailable(state, g));
}

export function themeAvailable(state: GameState, theme: Theme): boolean {
  return contentAvailable(state, theme);
}

export function availableThemes(state: GameState): Theme[] {
  return themes.filter((t) => contentAvailable(state, t));
}

export function featureAvailable(state: GameState, feature: Feature): boolean {
  return contentAvailable(state, feature);
}

export function availableFeatures(state: GameState): Feature[] {
  return features.filter((f) => contentAvailable(state, f));
}

/**
 * Plataformas visibles en la era actual (el estar "a la venta" además
 * depende de releaseWeek/endWeek; ver platformAvailable en market.ts).
 */
export function availablePlatforms(state: GameState): Platform[] {
  return platforms.filter((p) => eraAtLeast(state.era, p.appearsInEra));
}

/** Modelos de negocio desbloqueados en la era actual (docs/02 §5). */
export function availableMonetizationModels(state: GameState): MonetizationModelDef[] {
  return monetizationModels.filter((m) => eraAtLeast(state.era, m.appearsInEra));
}

/** ¿Las loot boxes / el pase de batalla ya se han inventado? (docs/02 §5). */
export function monetizationFlagAvailable(
  state: GameState,
  flag: keyof typeof monetizationFlagEras,
): boolean {
  return eraAtLeast(state.era, monetizationFlagEras[flag]);
}

/** Roster de creadores de la era actual (docs/07 §7 y docs/09 §8). */
export function availableCreatorDefs(state: GameState): CreatorDef[] {
  return creators.filter((c) => eraAtLeast(state.era, c.appearsInEra));
}
