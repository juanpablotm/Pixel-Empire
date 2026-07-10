import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import type { Project } from '../model/project';
import { computeBugLevel, computeFit, computeQuality, fitBand, realDesignShare } from './quality';

/**
 * Sistema de calidad (docs/03): fórmulas, medidor de Fit y los tres
 * "ejemplos trabajados" de docs/03 §6. Todo determinista: sin semilla siquiera.
 */

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proyecto-test',
    name: 'Juego de prueba',
    themeId: 'fantasia',
    genreId: 'rpg',
    platformId: 'pcCasero',
    audience: 'hardcore',
    size: 'pequeno',
    price: 20,
    phase: 3,
    focus: [{}, {}, {}],
    chosenFeatureIds: [],
    weeksSpent: 6,
    designPoints: 6.5,
    techPoints: 3.5,
    qaInvested: 0.2,
    bugDebt: 0.1,
    ...overrides,
  };
}

const GARAJE = { era: 'E1' as const, teamFactor: 0.95, comboRepeats: 0 };

describe('computeFit — Factor A (docs/03)', () => {
  it('combinación perfecta: Fantasía×RPG en PC Casero para Hardcore', () => {
    const { fit, parts } = computeFit({
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'hardcore',
    });
    expect(parts).toEqual({ themeGenre: 1.0, genrePlatform: 1.0, audience: 1.0 });
    expect(fit).toBe(1.0);
    expect(fitBand(fit)).toBe('verde');
  });

  it('combinación mala: Deportes×Aventura para Infantil', () => {
    const { fit } = computeFit({
      themeId: 'deportes',
      genreId: 'aventura',
      platformId: 'pcCasero',
      audience: 'infantil',
    });
    // 0.5·0.25 + 0.25·0.75 + 0.25·0.5 = 0.4375
    expect(fit).toBeCloseTo(0.4375, 10);
    expect(fitBand(fit)).toBe('rojo');
  });

  it('combinación intermedia da ámbar', () => {
    const { fit } = computeFit({
      themeId: 'fantasia',
      genreId: 'estrategia',
      platformId: 'commo64',
      audience: 'amplio',
    });
    // 0.5·0.75 + 0.25·0.5 + 0.25·0.75 = 0.6875
    expect(fit).toBeCloseTo(0.6875, 10);
    expect(fitBand(fit)).toBe('ambar');
  });
});

describe('computeQuality — fórmula de composición (docs/03 §3)', () => {
  it('reproduce la fórmula con valores calculados a mano', () => {
    const project = makeProject({
      themeId: 'fantasia',
      genreId: 'estrategia', // ideal 0.55/0.45
      audience: 'hardcore',
      designPoints: 5.5,
      techPoints: 4.5,
      chosenFeatureIds: ['multijugadorLocal'], // valorCalidad 1 → featureScore 0.25
      bugDebt: 0.3,
      qaInvested: 0.1, // bugLevel 0.2 → polish 0.8
    });
    const { q, breakdown } = computeQuality(project, {
      era: 'E1',
      teamFactor: 1.0,
      comboRepeats: 1, // innovationMod = 1.05 - 0.05 = 1.0
    });

    // fit = 0.5·0.75 + 0.25·1.0 + 0.25·1.0 = 0.875
    expect(breakdown.fit).toBeCloseTo(0.875, 10);
    expect(breakdown.balanceScore).toBeCloseTo(1.0, 10); // dReal 0.55 = ideal
    expect(breakdown.featureScore).toBeCloseTo(0.25, 10);
    expect(breakdown.polishScore).toBeCloseTo(0.8, 10);
    expect(breakdown.innovationMod).toBeCloseTo(1.0, 10);
    // base = 0.3·0.875 + 0.25·1 + 0.2·0.25 + 0.25·0.8 = 0.7625
    expect(breakdown.base).toBeCloseTo(0.7625, 10);
    expect(q).toBe(76);
  });

  it('aplica el techo de calidad por era (docs/03 §3)', () => {
    const project = makeProject({
      designPoints: 6.5, // ideal exacto para RPG
      techPoints: 3.5,
      chosenFeatureIds: ['mundoAbierto', 'fisicasAvanzadas'], // 5 ≥ objetivo 4 → 1.0
      bugDebt: 0,
      qaInvested: 0,
    });
    const { q, breakdown } = computeQuality(project, {
      era: 'E1',
      teamFactor: 1.2,
      comboRepeats: 0,
    });
    const cap = balance.quality.capByEraSize.E1?.pequeno ?? 100;
    expect(breakdown.base).toBeCloseTo(1.0, 10);
    expect(breakdown.qualityCap).toBe(cap);
    expect(q).toBe(cap);
  });

  it('el innovationMod queda dentro del rango 0.9–1.15 [DECIDIDO docs/12 §3]', () => {
    const fresh = computeQuality(makeProject(), { ...GARAJE, comboRepeats: 0 });
    const worn = computeQuality(makeProject(), { ...GARAJE, comboRepeats: 10 });
    expect(fresh.breakdown.innovationMod).toBeLessThanOrEqual(balance.quality.innovation.max);
    expect(worn.breakdown.innovationMod).toBe(balance.quality.innovation.min);
  });

  it('computeBugLevel acumula y el QA la reduce con clamp 0..1', () => {
    expect(computeBugLevel(0.3, 0.1)).toBeCloseTo(0.2, 10);
    expect(computeBugLevel(0.1, 0.5)).toBe(0);
    expect(computeBugLevel(2.5, 0)).toBe(1);
  });

  it('realDesignShare devuelve 0.5 sin trabajo acumulado', () => {
    expect(realDesignShare(0, 0)).toBe(0.5);
    expect(realDesignShare(3, 1)).toBeCloseTo(0.75, 10);
  });
});

describe('ejemplos trabajados de docs/03 §6', () => {
  it('Ejemplo 1 — Indie pulido: Q ≈ 80 (alto, cerca del techo de E1)', () => {
    const project = makeProject({
      // Pequeño, Fantasía×RPG (fit alto), balance casi ideal, pocas features, cero bugs.
      designPoints: 6.5,
      techPoints: 3.5,
      chosenFeatureIds: ['finalRamificado'],
      bugDebt: 0.08,
      qaInvested: 0.2,
    });
    const { q, breakdown } = computeQuality(project, GARAJE);
    expect(q).toBeGreaterThanOrEqual(78);
    expect(q).toBeLessThanOrEqual(85);
    expect(breakdown.polishScore).toBe(1);
  });

  it('Ejemplo 2 — Ambición mal ejecutada: buen concepto pero Q ≈ 48', () => {
    const project = makeProject({
      size: 'grande',
      designPoints: 5,
      techPoints: 5, // lejos del ideal RPG 0.65
      chosenFeatureIds: [
        'mundoAbierto',
        'fisicasAvanzadas',
        'sistemaCrafteo',
        'multijugadorLocal',
        'finalRamificado',
      ],
      bugDebt: 0.9,
      qaInvested: 0.1, // bugLevel 0.8: plagado
    });
    // Equipo en crunch: teamFactor 0.7 (docs/03 §6; el sistema de equipo llega en Fase 2).
    const { q } = computeQuality(project, { era: 'E1', teamFactor: 0.7, comboRepeats: 0 });
    expect(q).toBeGreaterThanOrEqual(42);
    expect(q).toBeLessThanOrEqual(55);
  });

  it('Ejemplo 3 — Clon seguro: fit perfecto, cero innovación, Q ≈ 72', () => {
    const project = makeProject({
      designPoints: 6,
      techPoints: 4,
      chosenFeatureIds: ['sistemaCrafteo', 'finalRamificado'], // 3/4 = 0.75
      bugDebt: 0.25,
      qaInvested: 0.1, // polish 0.85
    });
    const { q, breakdown } = computeQuality(project, { ...GARAJE, comboRepeats: 3 });
    expect(breakdown.innovationMod).toBe(balance.quality.innovation.min);
    expect(q).toBeGreaterThanOrEqual(68);
    expect(q).toBeLessThanOrEqual(78);
  });

  it('los tres ejemplos mantienen el orden esperado: indie > clon > ambición rota', () => {
    const indie = computeQuality(
      makeProject({
        designPoints: 6.5,
        techPoints: 3.5,
        chosenFeatureIds: ['finalRamificado'],
        bugDebt: 0.08,
        qaInvested: 0.2,
      }),
      GARAJE,
    ).q;
    const clon = computeQuality(
      makeProject({
        designPoints: 6,
        techPoints: 4,
        chosenFeatureIds: ['sistemaCrafteo', 'finalRamificado'],
        bugDebt: 0.25,
        qaInvested: 0.1,
      }),
      { ...GARAJE, comboRepeats: 3 },
    ).q;
    const roto = computeQuality(
      makeProject({
        size: 'grande',
        designPoints: 5,
        techPoints: 5,
        chosenFeatureIds: [
          'mundoAbierto',
          'fisicasAvanzadas',
          'sistemaCrafteo',
          'multijugadorLocal',
          'finalRamificado',
        ],
        bugDebt: 0.9,
        qaInvested: 0.1,
      }),
      { era: 'E1', teamFactor: 0.7, comboRepeats: 0 },
    ).q;

    expect(indie).toBeGreaterThan(clon);
    expect(clon).toBeGreaterThan(roto);
  });
});
