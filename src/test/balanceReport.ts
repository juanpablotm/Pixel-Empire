/**
 * Informe de balance (docs/08 §8, Fase 7G): corre los bots de partida
 * completa y escupe la trayectoria anual de cada filosofía + su legado.
 * Herramienta de playtest, no un test:
 *
 *   npx vite-node src/test/balanceReport.ts
 */
import { computeLegacy } from '../core/systems/legacy';
import { aggregateReputation } from '../core/systems/reputation';
import type { GameState } from '../core/model/gameState';
import { eraForWeek } from '../data/eras';
import { FACTORY, INDIE, OPTIMIZER, STUDIO, runFullGame } from './bots';

function snap(s: GameState): string {
  const year = 1979 + Math.ceil(s.week / 52);
  const rev = s.releasedGames.reduce((a, g) => a + g.totalRevenue, 0);
  // 9.1: la escalada a vista de pájaro — mejor reseña histórica, techo del
  // último juego y nº de obras maestras (85+).
  const best = s.releasedGames.reduce((max, g) => Math.max(max, g.review), 0);
  const masterpieces = s.releasedGames.filter((g) => g.review >= 85).length;
  const lastCap = s.releasedGames[s.releasedGames.length - 1]?.breakdown.qualityCap ?? 0;
  return [
    `a${year} w${s.week} ${s.era}`,
    `cap ${Math.round(s.studio.capital / 1000)}k`,
    `staff ${s.staff.length}`,
    `stage ${s.studio.scaleStage}`,
    `games ${s.releasedGames.length}`,
    `rev ${Math.round(rev / 1000)}k`,
    `rep ${Math.round(aggregateReputation(s.studio.reputation))}`,
    `debt ${s.studio.reputationDebt.toFixed(1)}`,
    `scand ${s.stats.scandalCount}`,
    `drift ${s.studio.moralDrift.toFixed(2)}`,
    `💡${s.research.points}/${s.research.unlocked.length}n`,
    `best ${Math.round(best)}`,
    `techo ${Math.round(lastCap)}`,
    `85+ ×${masterpieces}`,
  ].join(' · ');
}

/**
 * La curva de dependencia del publisher (9.6, docs/19 §9.6): lanzamientos
 * firmados vs auto-publicados por era. El arco sano: casi todo firmado en
 * E1–E2, casi nada desde que la caja se sostiene sola.
 */
function publisherCurve(s: GameState): string {
  const eras = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'];
  const byEra = eras.map((era) => {
    const bounds = s.releasedGames.filter((g) => eraOfWeek(g.releaseWeek) === era);
    const signed = bounds.filter((g) => g.publisherName !== undefined).length;
    return `${era} ${signed}/${bounds.length}`;
  });
  const paid = s.stats.publisherPaidTotal ?? 0;
  const indep = s.stats.independenceWeek;
  return (
    `firmados/lanzados por era: ${byEra.join(' · ')}\n` +
    `  el peaje del publisher: ${Math.round(paid / 1000)}k 💰 · ` +
    `independencia: ${indep !== undefined ? `semana ${indep} (año ${1979 + Math.ceil(indep / 52)})` : '—'} · ` +
    `EA usados: ${s.releasedGames.filter((g) => g.earlyAccessInfo !== undefined).length}`
  );
}

function eraOfWeek(week: number): string {
  return eraForWeek(week);
}

/**
 * El late-game de 9.7 (docs/19 §9.7): cuánto del final de partida vive en
 * macro-gestión — servicios operados y su P&L, filiales en cartera y el suyo.
 * El objetivo del rebalanceo: ingreso jugoso PERO con obligación (el upkeep y
 * la nómina de los platos pesan), y ninguna máquina de dinero gratis.
 */
function lateGameCurve(s: GameState): string {
  const k = (n: number) => `${Math.round(n / 1000)}k`;
  const services = s.releasedGames.filter((g) => g.liveService !== undefined);
  const open = services.filter((g) => g.liveService?.closedWeek === undefined);
  const players = open.reduce((a, g) => a + (g.liveService?.players ?? 0), 0);
  const svcRevenue = services.reduce((a, g) => a + (g.liveService?.revenue ?? 0), 0);
  const svcUpkeep = services.reduce((a, g) => a + (g.liveService?.upkeepPaid ?? 0), 0);
  const subs = s.subsidiaries ?? [];
  const subRevenue = subs.reduce((a, x) => a + x.revenue, 0);
  const subUpkeep = subs.reduce((a, x) => a + x.upkeepPaid, 0);
  const subPrice = subs.reduce((a, x) => a + x.price, 0);
  const subGames = subs.reduce((a, x) => a + x.games.length, 0);
  return (
    `GaaS: ${s.stats.liveServicesOpened ?? 0} abiertos (${open.length} vivos, ${players.toLocaleString('es-ES')} jugadores) · ` +
    `ingresó ${k(svcRevenue)} − servidores ${k(svcUpkeep)}\n` +
    `  filiales: ${s.stats.subsidiariesBought ?? 0} compradas, ${subs.length} en cartera (invertidos ${k(subPrice)}) · ` +
    `ingresó ${k(subRevenue)} − overhead ${k(subUpkeep)} · ${subGames} juegos propios · ` +
    `talento ${subs.map((x) => `${x.name} ${Math.round(x.talent)}(${x.directive})`).join(', ') || '—'}`
  );
}

for (const phil of [INDIE, FACTORY, STUDIO, OPTIMIZER]) {
  console.log(`\n=== ${phil.name} ===`);
  const snaps: string[] = [];
  const end = runFullGame(phil, (s) => snaps.push(snap(s)));
  // Imprime 1 de cada 4 años para no inundar la consola.
  snaps.filter((_, i) => i % 4 === 3).forEach((l) => console.log(l));
  console.log('FINAL →', snap(end));
  if (end.gameOver) console.log('GAME OVER:', JSON.stringify(end.gameOver));
  console.log('legado:', JSON.stringify(computeLegacy(end)));
  console.log(publisherCurve(end));
  console.log(lateGameCurve(end));
  console.log('reseñas:', end.releasedGames.map((g) => Math.round(g.review)).join(','));
  const last = end.releasedGames[end.releasedGames.length - 1];
  if (last) {
    console.log(
      `último juego: ${last.name} · ${last.size} · Q ${Math.round(last.quality)} · reseña ${Math.round(last.review)} · ${last.totalUnits} uds · ${Math.round(last.totalRevenue / 1000)}k 💰 · ${last.monetization.model}`,
    );
  }
}
