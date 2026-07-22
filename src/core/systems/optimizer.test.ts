import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getEra } from '../../data/eras';
import { BOT_SEED, OPTIMIZER, botDecide, runFullGame } from '../../test/bots';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';

/**
 * El bot OPTIMIZADOR (Fase 10.1, docs/20 W8): la "vara de medir honesta". No
 * tiene filosofía moral; juega cerca de óptimo (mejor Fit, features por
 * afinidad, tamaño que el equipo puede ejecutar, ampliación agresiva pero
 * viable, monetización codiciosa sin auto-sabotaje). Su papel es MEDIR, no
 * validar las 3 filosofías (eso lo hace fullGame.test.ts). Aquí verificamos que
 * es determinista y que —hoy— NO resuelve el juego: es el CA de balance que la
 * 10.2 hereda (docs/08 §8, docs/11). Los números concretos viven en el informe
 * (src/test/optimizerReport.ts), no en asserts frágiles.
 */
describe('Bot optimizador (docs/20 W8)', () => {
  it('es DETERMINISTA con semilla: dos partidas idénticas dan el mismo estado', () => {
    const a = runFullGame(OPTIMIZER);
    const b = runFullGame(OPTIMIZER);
    expect(a.week).toBe(b.week);
    expect(a.studio.capital).toBe(b.studio.capital);
    expect(a.studio.scaleStage).toBe(b.studio.scaleStage);
    expect(a.releasedGames.length).toBe(b.releasedGames.length);
    // Igualdad estructural: misma semilla + mismas decisiones = mismo resultado.
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // Timeout propio: son DOS partidas completas (2×2393 ticks) y con la suite
    // en paralelo se sale de los 5 s por defecto — el caso es lento, no frágil.
  }, 20_000);

  it('juega de verdad: llega vivo al final de E7, lanza decenas de juegos y crece', () => {
    const end = runFullGame(OPTIMIZER);
    expect(end.gameOver).toBeNull();
    expect(end.era).toBe('E7');
    expect(end.releasedGames.length).toBeGreaterThan(30);
    expect(end.studio.capital).toBeGreaterThan(balance.economy.initialCapital * 100);
    // Y de verdad aprieta: alcanza la Corporación (no se queda de culto).
    expect(end.studio.scaleStage).toBe(5);
  });

  it('CA de balance (W8): ni el optimizador es Corporación antes de E5', () => {
    // El hallazgo de W8: si un jugador competente rompiera el gate de escala,
    // aquí saltaría. Hoy NO lo rompe — la 10.2 debe conservar esta condición.
    const e5Start = getEra('E5').startWeek;
    let s = createInitialState(BOT_SEED);
    let games = 0;
    while (s.week < e5Start && s.gameOver === null) {
      const step = botDecide(s, OPTIMIZER, games);
      s = step.state;
      games = step.gamesStarted;
      s = tick(s);
      expect(s.studio.scaleStage, `semana ${s.week}`).toBeLessThan(5);
    }
  });

  it('CA de balance (W8): no hay punto dulce invencible — la escala grande quema', () => {
    // "No imprime dinero": aun jugando cerca de óptimo, sostener la ambición
    // (overhead de Corporación + obras de motor + AAA que la crítica endurece)
    // deja semanas en rojo en el libro de caja reciente. El burn es real.
    const end = runFullGame(OPTIMIZER);
    expect(end.cashflow.some((c) => c.expenses > c.income)).toBe(true);
  });
});
