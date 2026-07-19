/**
 * Informe de la industria rival (Fase 9.5, docs/08 §8): corre bots de
 * partida completa y escupe cómo evolucionó la industria — lanzamientos,
 * fiebres por origen, tiers, cierres — y la gala con nominados reales
 * (premios ganados por era, techo de los nominados vs barByEra). Herramienta
 * de playtest, no un test:
 *
 *   npx vite-node src/test/rivalsReport.ts
 */
import { getAwardCategory } from '../data/awards';
import { balance } from '../data/balance';
import { getRivalDef, rivalTierLabels } from '../data/rivals';
import type { GameState } from '../core/model/gameState';
import type { Fever } from '../core/model/market';
import { rivalNominees } from '../core/systems/awards';
import { FACTORY, INDIE, STUDIO, runFullGame } from './bots';

/** Fiebres vistas a lo largo de la partida, contadas por origen. */
function countFevers(history: Fever[][]): Record<Fever['source'], number> {
  const seen = new Set<string>();
  const bySource: Record<Fever['source'], number> = { organica: 0, hit: 0, rival: 0 };
  for (const fevers of history) {
    for (const f of fevers) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      bySource[f.source] += 1;
    }
  }
  return bySource;
}

function industrySnapshot(s: GameState): string {
  return (s.rivals?.studios ?? [])
    .map((r) => {
      const def = getRivalDef(r.id);
      const status = r.closed ? 'CERRADO' : `${rivalTierLabels[r.tier]} · fuerza ${Math.round(r.strength)}`;
      const releases = r.games.length > 0 ? ` · últimos: ${r.games.map((g) => g.review).join(',')}` : '';
      return `  ${def.name.padEnd(20)} ${status}${releases}`;
    })
    .join('\n');
}

for (const phil of [INDIE, FACTORY, STUDIO]) {
  console.log(`\n=== industria vista desde: ${phil.name} ===`);
  const feverHistory: Fever[][] = [];
  // Techo anual de los nominados reales al GOTY, agrupado por era (para
  // compararlo con awards.competition.barByEra, la calibración de 8.10).
  const topByEra = new Map<string, number[]>();
  const end = runFullGame(phil, (s) => {
    feverHistory.push([...(s.market.fevers ?? [])]);
    const top = rivalNominees(s, getAwardCategory('goty'))[0];
    if (top) {
      const list = topByEra.get(s.era) ?? [];
      list.push(top.score);
      topByEra.set(s.era, list);
    }
  });
  const fevers = countFevers(feverHistory);
  console.log(`fiebres vistas → orgánicas ${fevers.organica} · hit propio ${fevers.hit} · rival ${fevers.rival}`);
  console.log(`estudios al final (semana ${end.week}, ${end.era}):`);
  console.log(industrySnapshot(end));
  const closed = (end.rivals?.studios ?? []).filter((r) => r.closed).length;
  console.log(`cerrados: ${closed} · log 'industria' reciente: ${end.log.filter((e) => e.type === 'industria').length} entradas`);
  const envelope = [...topByEra.entries()]
    .map(([era, tops]) => {
      const mean = tops.reduce((a, b) => a + b, 0) / tops.length;
      const bar = balance.awards.competition.barByEra[era as keyof typeof balance.awards.competition.barByEra];
      return `${era} top GOTY medio ${mean.toFixed(1)} (barByEra ${bar})`;
    })
    .join(' · ');
  console.log(`envolvente de nominados: ${envelope}`);
  const awardsByEra = end.studio.awards.map((a) => `${a.year}:${a.categoryId}`).join(', ') || '—';
  console.log(`premios ganados: ${awardsByEra}`);
  const crushed = end.releasedGames.filter((g) => g.rivalCrush).length;
  const delayed = end.log.filter((e) => e.text.includes('retrasa su lanzamiento')).length;
  console.log(`ventanas: ${crushed} lanzamientos aplastados · ${delayed} retrasos para esquivar`);
}
