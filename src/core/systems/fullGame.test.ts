import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getEra } from '../../data/eras';
import { FACTORY, INDIE, STUDIO, runFullGame, type Philosophy } from '../../test/bots';
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
    // La fábrica en Corporación NO es riesgo cero: su caja final queda muy por
    // debajo del pico histórico — sostener la torre se come los millones si
    // los lanzamientos no rinden (con peor juego, la misma partida quiebra).
    expect(factory.stats.peakCapital).toBeGreaterThan(factory.studio.capital * 2);
    // Y su libro de caja reciente tiene semanas en rojo: el burn es real.
    expect(factory.cashflow.some((c) => c.expenses > c.income)).toBe(true);
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
