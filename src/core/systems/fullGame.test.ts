import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { FACTORY, INDIE, STUDIO, runFullGame } from '../../test/bots';
import type { GameState } from '../model/gameState';
import { computeLegacy } from './legacy';
import { aggregateReputation } from './reputation';

/**
 * CA de cierre de Fase 7G (docs/13 7G y docs/00 §9): los bots de partida
 * completa (src/test/bots.ts) juegan las tres filosofías de docs/01 §5 desde
 * el garaje de 1980 hasta E7. Las tres deben ser VIABLES y sentirse
 * DISTINTAS, y la curva de escala debe existir (garaje → corporación).
 *
 * Complementa a philosophies.test.ts (la comparación quirúrgica de Fase 4 en
 * la ventana de E5 con palancas idénticas): aquí las filosofías divergen
 * también en ambición (equipo, tamaño de juego), como un jugador real.
 */

describe('Bots de partida completa: las tres filosofías de docs/01 §5 (docs/00 §9)', () => {
  const indie = runFullGame(INDIE);
  const factory = runFullGame(FACTORY);
  const studio = runFullGame(STUDIO);
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
    // a ~100–130. La banda vigila regresiones de ritmo, no el objetivo humano.
    for (const { name, state } of bots) {
      expect(state.releasedGames.length, `${name}: juegos lanzados`).toBeGreaterThanOrEqual(30);
      expect(state.releasedGames.length, `${name}: juegos lanzados`).toBeLessThanOrEqual(160);
    }
  });

  it('curva de escala (docs/00 §9.4): la fábrica se hace grande, el indie sigue de culto', () => {
    expect(factory.studio.scaleStage).toBeGreaterThanOrEqual(3);
    expect(factory.staff.length).toBeGreaterThanOrEqual(10);
    expect(studio.studio.scaleStage).toBeGreaterThanOrEqual(3);
    expect(indie.staff.length).toBeLessThanOrEqual(6);
    // Y aun así el indie prospera: viable no significa grande.
    expect(indie.studio.capital).toBeGreaterThan(balance.economy.initialCapital);
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
    // La balanza visible acaba inclinada a lados opuestos (docs/10 §7.4).
    expect(factory.studio.moralDrift).toBeLessThan(0);
    expect(indie.studio.moralDrift).toBeGreaterThanOrEqual(0);
  });
});
