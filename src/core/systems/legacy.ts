import { balance } from '../../data/balance';
import { legacyDominantAxis, legacyVerdicts, legacyVerdictThresholds } from '../../data/legacyTexts';
import { appendLog } from '../engine/log';
import type { GameState } from '../model/gameState';
import type { LegacyProfile } from '../model/moral';
import { aggregateReputation } from './reputation';

/**
 * Puntuación de Legado (docs/06 §6): al cierre no hay victoria única, sino un
 * perfil multi-dimensional (Riqueza/Prestigio/Impacto/Obras/Ética) que cuenta
 * la historia del estudio. Cada filosofía maximiza ejes distintos. El Museo
 * del Legado visual llega en Fase 6; aquí, el cálculo y una pantalla básica.
 */

const clamp01to100 = (value: number): number => Math.min(100, Math.max(0, value));

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Calcula el perfil de Legado del estado actual (función pura, docs/06 §6). */
export function computeLegacy(state: GameState): LegacyProfile {
  const cfg = balance.legacy;
  const games = state.releasedGames;
  const rep = state.studio.reputation;

  // Riqueza: capital acumulado histórico (docs/06 §6).
  const peak = Math.max(state.stats.peakCapital, state.studio.capital);
  const riqueza = clamp01to100((peak / cfg.wealthCapitalScale) * 100);

  // Prestigio: reputación media ponderada + calidad histórica de las reseñas.
  const avgReview =
    games.length === 0 ? 0 : games.reduce((sum, g) => sum + g.review, 0) / games.length;
  const prestigio = clamp01to100(
    cfg.prestigeRepWeight * aggregateReputation(rep) + cfg.prestigeReviewWeight * avgReview,
  );

  // Impacto: definir modas antes que nadie + récords de ventas.
  const bestSeller = games.reduce((max, g) => Math.max(max, g.totalUnits), 0);
  const impacto = clamp01to100(
    state.stats.earlyTrendReleases * cfg.impactPerEarlyRelease +
      Math.min(1, bestSeller / cfg.impactBestSellerScale) * cfg.impactBestSellerWeight,
  );

  // Obras maestras: juegos con reseña 90+ (docs/06 §6).
  const masterpieces = games.filter((g) => g.review >= cfg.masterpieceReview).length;
  const obras = clamp01to100(masterpieces * cfg.masterpiecePoints);

  // Ética: trato al equipo + honestidad, menos los pecados acumulados.
  const etica = clamp01to100(
    cfg.ethicsEmployerWeight * (rep.empleador ?? 50) +
      cfg.ethicsCommunityWeight * (rep.comunidad ?? 50) -
      state.stats.scandalCount * cfg.ethicsScandalPenalty -
      Math.min(cfg.ethicsCrunchPenaltyCap, state.stats.crunchWeeks * cfg.ethicsCrunchWeekPenalty) -
      state.stats.firedCount * cfg.ethicsFiredPenalty,
  );

  const profile: LegacyProfile = {
    riqueza: round1(riqueza),
    prestigio: round1(prestigio),
    impacto: round1(impacto),
    obras: round1(obras),
    etica: round1(etica),
    masterpieces,
    verdict: '',
  };
  return { ...profile, verdict: legacyVerdict(profile, state) };
}

/** Frase-retrato del perfil: cada final cuenta una historia (docs/06 §6). */
function legacyVerdict(profile: LegacyProfile, state: GameState): string {
  const { high, low } = legacyVerdictThresholds;

  if (state.gameOver?.reason === 'bancarrota' && state.stats.scandalCount > 0) {
    return legacyVerdicts.crashedAndBurned;
  }
  if (profile.riqueza >= high && profile.etica <= low) return legacyVerdicts.richButHated;
  if (profile.riqueza >= high && profile.prestigio >= high) return legacyVerdicts.richAndLoved;
  if (profile.obras >= high && profile.etica >= high) return legacyVerdicts.artisan;
  if (profile.prestigio >= high && profile.riqueza <= low) return legacyVerdicts.belovedButPoor;

  const dominant = legacyDominantAxis(profile);
  if (dominant === 'impacto' && profile.impacto >= high) return legacyVerdicts.pioneer;
  if (dominant === 'riqueza' && profile.riqueza >= high) return legacyVerdicts.richButHated;
  if (dominant === 'prestigio' && profile.prestigio >= high) return legacyVerdicts.belovedButPoor;
  if (dominant === 'obras' && profile.obras >= high) return legacyVerdicts.artisan;
  if (dominant === 'etica' && profile.etica >= high) return legacyVerdicts.belovedButPoor;
  return legacyVerdicts.greyFactory;
}

/**
 * Acción: cerrar el estudio voluntariamente para contemplar el Legado
 * (docs/06 §6: el cierre de partida calcula el perfil).
 */
export function retireStudio(state: GameState): GameState {
  if (state.gameOver) throw new Error('La partida ya ha terminado');
  const next: GameState = {
    ...state,
    gameOver: { week: state.week, reason: 'retiro' },
  };
  return appendLog(next, 'fin', 'El estudio cierra sus puertas por decisión propia. Queda el legado.');
}
