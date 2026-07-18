import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getEra } from '../../data/eras';
import { FACTORY, FINAL_WEEK, INDIE, STUDIO, runFullGame, type Philosophy } from '../../test/bots';
import type { GameState, ScaleStage } from '../model/gameState';
import { computeLegacy } from './legacy';
import { aggregateReputation } from './reputation';

/**
 * CA de cierre de Fase 7G (docs/13 7G y docs/00 §9) + criterios de la Fase
 * 8.8 (docs/18 V4): los bots de partida completa (src/test/bots.ts) juegan
 * las tres filosofías de docs/01 §5 desde el garaje de 1980 hasta E7. Las
 * tres deben ser VIABLES y sentirse DISTINTAS; la curva de escala existe
 * (garaje → corporación) pero el avance SE COMPRA y llega tarde (nadie es
 * Corporación antes de E5); y el "punto dulce invencible" está muerto: un
 * estudio grande quema tanto que puede perder si no rinde.
 *
 * Complementa a philosophies.test.ts (la comparación quirúrgica de Fase 4 en
 * la ventana de E5 con palancas idénticas): aquí las filosofías divergen
 * también en ambición (equipo, tamaño de juego, etapa), como un jugador real.
 */

interface YearSnap {
  week: number;
  stage: ScaleStage;
  capital: number;
}

function playWithTrajectory(phil: Philosophy): { state: GameState; snaps: YearSnap[] } {
  const snaps: YearSnap[] = [];
  const state = runFullGame(phil, (s) =>
    snaps.push({ week: s.week, stage: s.studio.scaleStage, capital: s.studio.capital }),
  );
  return { state, snaps };
}

describe('Bots de partida completa: las tres filosofías de docs/01 §5 (docs/00 §9)', () => {
  const indieRun = playWithTrajectory(INDIE);
  const factoryRun = playWithTrajectory(FACTORY);
  const studioRun = playWithTrajectory(STUDIO);
  const indie = indieRun.state;
  const factory = factoryRun.state;
  const studio = studioRun.state;
  const bots = [
    { name: INDIE.name, state: indie },
    { name: FACTORY.name, state: factory },
    { name: STUDIO.name, state: studio },
  ];

  it('rejugabilidad (1/2): las tres llegan vivas al final de E7', () => {
    for (const { name, state } of bots) {
      expect(state.gameOver, `${name}: game over`).toBeNull();
      expect(state.era, `${name}: era final`).toBe('E7');
      expect(state.studio.capital, `${name}: caja final`).toBeGreaterThan(0);
    }
  });

  it('ritmo de partida (docs/02 §6): decenas de lanzamientos, cada uno cuenta', () => {
    // El objetivo humano es 35–45 juegos; un bot incansable de 46 años llega
    // a ~50–90. La banda vigila regresiones de ritmo, no el objetivo humano.
    for (const { name, state } of bots) {
      expect(state.releasedGames.length, `${name}: juegos lanzados`).toBeGreaterThanOrEqual(30);
      expect(state.releasedGames.length, `${name}: juegos lanzados`).toBeLessThanOrEqual(160);
    }
  });

  it('curva de escala (docs/00 §9.4): la fábrica llega a Corporación, el indie sigue de culto', () => {
    expect(factory.studio.scaleStage).toBe(5);
    expect(factory.staff.length).toBeGreaterThanOrEqual(
      balance.development.sizeGate.aaa.minStaff,
    );
    // Y de verdad ejercita la cima: lanza al menos un AAA (docs/18 V4-b).
    expect(factory.releasedGames.some((g) => g.size === 'aaa')).toBe(true);
    expect(studio.studio.scaleStage).toBeGreaterThanOrEqual(4);
    expect(studio.releasedGames.some((g) => g.size === 'muyGrande')).toBe(true);
    expect(indie.staff.length).toBeLessThanOrEqual(6);
    // Y aun así el indie prospera: viable no significa grande.
    expect(indie.studio.capital).toBeGreaterThan(balance.economy.initialCapital);
  });

  it('el avance se compra y llega tarde (docs/18 V4-c): nadie es Corporación antes de E5', () => {
    const e5Start = getEra('E5').startWeek;
    for (const { snaps } of [indieRun, factoryRun, studioRun]) {
      for (const snap of snaps.filter((s) => s.week <= e5Start)) {
        expect(snap.stage, `semana ${snap.week}`).toBeLessThan(5);
      }
    }
  });

  it('el "punto dulce" ha muerto (docs/18 V4-d): la corporación quema y puede perder', () => {
    // La fábrica NO es riesgo cero. Desde la 9.2 el riesgo se mide en la
    // TRAYECTORIA, no en la foto final: con el motor propio manteniendo el
    // techo al día, la fábrica puede acabar en máximos — pero por el camino
    // hay tramos donde sostener la ambición (overhead + obras de motor +
    // lanzamientos que la crítica hunde) se come la caja a lo grande. Su peor
    // drawdown pico→valle supera el 25 % de la caja: con peor juego, esa
    // misma curva es una quiebra.
    //
    // (El margen del dilema sigue el de la 9.1: la codicia rinde MÁS por
    // diseño — mtx 0.85 — y su contrapeso es la reputación por los suelos,
    // los escándalos y la fatiga, no la ruina garantizada.)
    let peak = 0;
    let maxDrawdown = 0;
    for (const snap of factoryRun.snaps) {
      peak = Math.max(peak, snap.capital);
      if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - snap.capital) / peak);
    }
    expect(maxDrawdown).toBeGreaterThan(0.25);
    // Y su libro de caja reciente tiene semanas en rojo: el burn es real.
    expect(factory.cashflow.some((c) => c.expenses > c.income)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // CA de la Fase 9.1 (docs/19 §9.1): "el juego que no se resuelve"
  // -------------------------------------------------------------------------

  it('CA 9.1(a): el juego NO se resuelve en E2 — nadie imprime 80+ pronto', () => {
    const e3Start = getEra('E3').startWeek;
    for (const { name, state } of bots) {
      const early = state.releasedGames.filter((g) => g.releaseWeek < e3Start);
      expect(early.length, `${name}: lanzamientos antes de E3`).toBeGreaterThan(10);
      // Ninguna obra maestra (85+) antes de E3, ni de nota ni de calidad
      // interna: el techo dinámico lo hace imposible, no improbable.
      for (const g of early) {
        expect(g.review, `${name}: «${g.name}» sem ${g.releaseWeek}`).toBeLessThan(85);
        expect(g.quality, `${name}: «${g.name}» sem ${g.releaseWeek}`).toBeLessThan(80);
      }
      // Y las notas tempranas viven en la media tabla: nada de imprimir 80+.
      const early80s = early.filter((g) => g.review >= 80).length;
      expect(early80s / early.length, `${name}: proporción de 80+ tempranos`).toBeLessThan(0.1);
    }
  });

  it('CA 9.1(b): las obras maestras aparecen a media/tarde partida y se ganan', () => {
    // Alguna filosofía alcanza el 85+ (se puede ganar)…
    const masters = bots.map(({ state }) =>
      state.releasedGames.find((g) => g.review >= 85),
    );
    expect(masters.some((g) => g !== undefined)).toBe(true);
    // …pero nunca antes del 40 % de la partida (media/tarde, docs/19 §9.1).
    for (const [i, first] of masters.entries()) {
      if (first) {
        expect(
          first.releaseWeek,
          `${bots[i].name}: primera obra maestra`,
        ).toBeGreaterThan(FINAL_WEEK * 0.4);
      }
    }
  });

  it('CA 9.1(d): la escalada no rompe la viabilidad — las tres siguen creciendo', () => {
    // Complemento del test de rejugabilidad: además de llegar vivas, las tres
    // multiplican con creces el capital inicial (la escalada endurece la
    // partida, no la convierte en una marcha fúnebre).
    for (const { name, state } of bots) {
      expect(state.studio.capital, `${name}: caja final`).toBeGreaterThan(
        balance.economy.initialCapital * 100,
      );
    }
  });

  it('tensión moral (docs/00 §9.3): la codicia paga de verdad…', () => {
    const perUnit = (s: GameState) => {
      const revenue = s.releasedGames.reduce((sum, g) => sum + g.totalRevenue, 0);
      const units = s.releasedGames.reduce((sum, g) => sum + g.totalUnits, 0);
      return revenue / units;
    };
    // Tentación real: cada unidad vendida deja bastante más dinero.
    expect(perUnit(factory)).toBeGreaterThan(perUnit(indie) * 1.25);
    expect(factory.stats.totalRevenue).toBeGreaterThan(indie.stats.totalRevenue);
  });

  it('…pero cobra su precio: escándalos, regulación y reputación rota', () => {
    expect(factory.stats.scandalCount).toBeGreaterThanOrEqual(2);
    expect(indie.stats.scandalCount).toBe(0);
    // La presión regulatoria de las loot boxes existe en la partida codiciosa.
    expect(
      (factory.regulation.pressure['lootbox-ban'] ?? 0) +
        (factory.regulation.enacted.includes('lootbox-ban') ? 99 : 0),
    ).toBeGreaterThan(0);
    // Los segmentos con memoria castigan: los hardcore odian a la fábrica.
    expect(factory.studio.reputation.hardcore).toBeLessThan(
      indie.studio.reputation.hardcore - 10,
    );
    expect(aggregateReputation(indie.studio.reputation)).toBeGreaterThan(
      aggregateReputation(factory.studio.reputation),
    );
  });

  it('los legados cuentan tres historias distintas (docs/06 §6)', () => {
    const indieLegacy = computeLegacy(indie);
    const factoryLegacy = computeLegacy(factory);
    const studioLegacy = computeLegacy(studio);
    expect(indieLegacy.etica).toBeGreaterThan(factoryLegacy.etica + 15);
    expect(studioLegacy.etica).toBeGreaterThan(factoryLegacy.etica);
    expect(factoryLegacy.riqueza).toBeGreaterThanOrEqual(indieLegacy.riqueza);
    // La balanza visible del indie acaba del lado íntegro; la de la fábrica,
    // nunca por encima (su cuidado del equipo es cínico, pero las palancas de
    // codicia — cajas, MTX, silencio — la lastran en cada lanzamiento).
    expect(indie.studio.moralDrift).toBeGreaterThanOrEqual(0);
    expect(factory.studio.moralDrift).toBeLessThanOrEqual(indie.studio.moralDrift);
  });
});
