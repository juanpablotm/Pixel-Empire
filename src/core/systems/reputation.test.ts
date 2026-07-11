import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { segments } from '../../data/segments';
import { createInitialState } from '../engine/initialState';
import {
  aggregateReputation,
  applyReputationDeltas,
  communitySalesModifier,
  employerPoolModifiers,
  initialReputation,
  mergeDeltas,
} from './reputation';
import { generateCandidates, salaryTierOf } from './staff';

const SEED = 42;

describe('reputación segmentada (docs/06 §1, CA)', () => {
  it('es un vector con los 6 segmentos, nunca un escalar', () => {
    const rep = initialReputation();
    expect(Object.keys(rep).sort()).toEqual(
      ['casual', 'comunidad', 'critica', 'empleador', 'hardcore', 'prensa'].sort(),
    );
    for (const segment of segments) {
      expect(rep[segment.id]).toBe(balance.reputation.initial);
    }
  });

  it('la agregada es la media ponderada por los pesos de data/segments.ts', () => {
    const rep = initialReputation();
    expect(aggregateReputation(rep)).toBe(50);

    // Subir solo la crítica mueve la agregada según su peso.
    const critica = segments.find((s) => s.id === 'critica')!;
    const moved = { ...rep, critica: 100 };
    expect(aggregateReputation(moved)).toBeCloseTo(50 + 50 * critica.repWeight, 6);
  });

  it('asimetría (docs/06 §3): perder reputación es más rápido que ganarla', () => {
    const rep = initialReputation();
    const up = applyReputationDeltas(rep, { hardcore: 4 });
    const down = applyReputationDeltas(rep, { hardcore: -4 });
    expect(up.hardcore - 50).toBeCloseTo(4, 6);
    expect(50 - down.hardcore).toBeCloseTo(4 * balance.reputation.lossMultiplier, 6);
  });

  it('los deltas quedan acotados a [0, 100] y no tocan otros segmentos', () => {
    const rep = initialReputation();
    const floored = applyReputationDeltas(rep, { casual: -500 });
    const capped = applyReputationDeltas(rep, { casual: 500 });
    expect(floored.casual).toBe(0);
    expect(capped.casual).toBe(100);
    expect(floored.hardcore).toBe(50);
  });

  it('mergeDeltas suma palancas antes de aplicar la asimetría una sola vez', () => {
    const merged = mergeDeltas({ hardcore: -2, casual: 1 }, { hardcore: -3 });
    expect(merged).toEqual({ hardcore: -5, casual: 1 });
  });
});

describe('lo que la reputación proyecta sobre el juego (docs/05 §7 y docs/06 §3)', () => {
  it('colchón de comunidad: quererte multiplica las ventas, odiarte las hunde', () => {
    const state = createInitialState(SEED);
    expect(communitySalesModifier(state.studio)).toBe(1);

    const loved = { ...state.studio, reputation: { ...state.studio.reputation, comunidad: 100 } };
    const hated = { ...state.studio, reputation: { ...state.studio.reputation, comunidad: 0 } };
    expect(communitySalesModifier(loved)).toBeCloseTo(1 + balance.reputation.communitySalesCoef, 6);
    expect(communitySalesModifier(hated)).toBeCloseTo(1 - balance.reputation.communitySalesCoef, 6);
  });

  it('con reputación de empleador 50 el pool de candidatos es el neutro de siempre', () => {
    const neutral = employerPoolModifiers(50);
    expect(neutral.tierFactor).toBeCloseTo(1, 6);
    expect(neutral.salaryPremium).toBeCloseTo(1, 6);
    // Y generateCandidates sin reputación equivale a rep 50 (compatibilidad Fase 2).
    expect(generateCandidates(SEED, 1)).toEqual(generateCandidates(SEED, 1, 50));
  });

  it('mala fama de empleador: peor talento y más caro; buena fama: mejor y más barato', () => {
    const bad = employerPoolModifiers(0);
    const good = employerPoolModifiers(100);
    expect(bad.tierFactor).toBeLessThan(1);
    expect(bad.salaryPremium).toBeGreaterThan(1);
    expect(good.tierFactor).toBeGreaterThan(1);
    expect(good.salaryPremium).toBeLessThan(1);

    // En muchos pools, la fama alta produce al menos tantos senior/estrella
    // como la baja, y salarios por tramo más baratos (determinista por semilla).
    let seniorPlusBad = 0;
    let seniorPlusGood = 0;
    for (let week = 1; week <= 40; week++) {
      for (const c of generateCandidates(SEED, week, 5)) {
        if (salaryTierOf(c) !== 'junior') seniorPlusBad++;
      }
      for (const c of generateCandidates(SEED, week, 95)) {
        if (salaryTierOf(c) !== 'junior') seniorPlusGood++;
      }
    }
    expect(seniorPlusGood).toBeGreaterThan(seniorPlusBad);

    // La prima salarial se aplica sobre el salario base del tramo generado.
    const premium = employerPoolModifiers(5).salaryPremium;
    const salariesWithPremium = Object.values(balance.staff.salaries).map((s) =>
      Math.round(s * premium),
    );
    for (const candidate of generateCandidates(SEED, 1, 5)) {
      expect(salariesWithPremium).toContain(candidate.salary);
    }
  });
});
