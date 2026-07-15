import { eraForWeek, eraIndex, getEra } from '../../data/eras';
import {
  monetizationFlagEras,
  monetizationFlagLabels,
  monetizationModels,
} from '../../data/monetization';
import { platforms } from '../../data/platforms';
import { appendLog } from '../engine/log';
import type { EraId } from '../model/era';
import type { GameState } from '../model/gameState';

/**
 * Avance de eras (docs/02 §5): el paso de era es automático por el avance del
 * tiempo, con un evento de transición que resume qué cambia. Las 7 eras y sus
 * semanas de inicio viven en data/eras.ts (data-driven, nada hardcodeado);
 * el listón de calidad por era, en data/balance.ts.
 */

/**
 * Qué estrena una era en plataformas y en negocio (docs/02 §5). Se DERIVA del
 * propio contenido (`appearsInEra`), como manda docs/09 §7: no hay listas
 * paralelas que se puedan desincronizar del catálogo. Lo usan el beat de
 * transición (docs/10 §7.6) y la cronología de eras (docs/17 U1).
 */
export interface EraNovelties {
  platforms: string[];
  business: string[];
}

export function eraNovelties(era: EraId): EraNovelties {
  const flags = (Object.keys(monetizationFlagEras) as (keyof typeof monetizationFlagEras)[])
    .filter((flag) => monetizationFlagEras[flag] === era)
    .map((flag) => monetizationFlagLabels[flag]);

  return {
    platforms: platforms.filter((p) => p.appearsInEra === era).map((p) => p.name),
    business: [
      ...monetizationModels.filter((m) => m.appearsInEra === era).map((m) => m.name),
      ...flags,
    ],
  };
}

/**
 * Último paso del tick (tras avanzar la semana): si la semana ya pertenece a
 * una era posterior, el mundo cambia. Nunca retrocede: los estados de test o
 * de sandbox que fuerzan una era futura se respetan.
 */
export function advanceEras(state: GameState): GameState {
  const target = eraForWeek(state.week);
  if (eraIndex(target) <= eraIndex(state.era)) return state;

  const def = getEra(target);
  let next: GameState = { ...state, era: target };
  next = appendLog(
    next,
    'era',
    `🌍 NUEVA ERA — ${def.name} (${def.period}): ${def.transitionHeadline}`,
  );
  return next;
}
