import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getPlatform } from '../../data/platforms';
import { createInitialState, createSandboxState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { Employee } from '../model/staff';
import {
  publisherAdvance,
  publisherBlockReason,
  publisherOffersFor,
} from './publishers';
import { getPublisher } from '../../data/publishers';
import { launchMarketingCampaign } from './economy';
import { projectTotalWeeks, releasedGameCost, startProject } from './projects';

/**
 * Publishers (Fase 9.6, docs/19 §9.6): la muleta útil pero cara. Ofertas
 * deterministas, firma que congela el trato, reparto ~70/30 del bruto,
 * IP cedida y el arco de independencia. Semilla fija (docs/08 §8).
 */

const SEED = 42;

const CONCEPT = {
  name: 'Mazmorras del Alba',
  themeId: 'fantasia',
  genreId: 'rpg',
  platformId: 'pcCasero',
  audience: 'amplio',
  size: 'pequeno',
} as const;

/** Estado sin industria rival: los lanzamientos de test salen sin ventana. */
function calmState(): GameState {
  const base = createInitialState(SEED);
  return { ...base, rivals: { studios: [], poachOffer: null } };
}

/** Fuerza el proyecto en curso a "terminado" y avanza para que se lance. */
function forceRelease(state: GameState): GameState {
  const project = state.projects[state.projects.length - 1];
  const done = { ...project, phase: 3 as const, weeksSpent: projectTotalWeeks(project) + 1 };
  return tick({
    ...state,
    projects: state.projects.map((p) => (p.id === project.id ? done : p)),
  });
}

describe('ofertas de publisher (docs/19 §9.6) — deterministas y filtradas', () => {
  it('en 1980 hay ofertas para un juego pequeño, y son las de E1', () => {
    const offers = publisherOffersFor(calmState(), 'pequeno');
    expect(offers.map((o) => o.publisherId).sort()).toEqual(['cartuchoBros', 'magnavista']);
    // Ordenadas por adelanto: la tentación primero.
    expect(offers[0].advance).toBeGreaterThanOrEqual(offers[1].advance);
    // Misma entrada → misma oferta (sin PRNG).
    expect(publisherOffersFor(calmState(), 'pequeno')).toEqual(offers);
  });

  it('el AAA de garaje no tiene padrino: nadie financia ese tamaño en E1', () => {
    expect(publisherOffersFor(calmState(), 'aaa')).toEqual([]);
  });

  it('el sello de prestigio exige reputación: sin renombre no se sienta', () => {
    const e3 = createSandboxState(SEED, 'E3');
    // Reputación neutra (50) < 60: Nébula no aparece.
    expect(publisherBlockReason(e3, getPublisher('nebula'), 'pequeno')).toMatch(/renombre/);
    const famous: GameState = {
      ...e3,
      studio: {
        ...e3.studio,
        reputation: Object.fromEntries(
          Object.entries(e3.studio.reputation).map(([k]) => [k, 80]),
        ) as GameState['studio']['reputation'],
      },
    };
    expect(publisherBlockReason(famous, getPublisher('nebula'), 'pequeno')).toBeNull();
  });

  it('la reputación mejora el adelanto (cuando ya casi no lo necesitas)', () => {
    const base = calmState();
    const famous: GameState = {
      ...base,
      studio: {
        ...base.studio,
        reputation: { ...base.studio.reputation, prensa: 90, critica: 90 },
      },
    };
    const def = getPublisher('magnavista');
    expect(publisherAdvance(def, 'pequeno', famous)).toBeGreaterThan(
      publisherAdvance(def, 'pequeno', base),
    );
  });
});

describe('la firma (docs/19 §9.6): el publisher pone el dinero', () => {
  it('firmar ingresa el adelanto y NO cobra los costes de arranque', () => {
    const before = calmState();
    const offer = publisherOffersFor(before, 'pequeno').find(
      (o) => o.publisherId === 'magnavista',
    )!;
    const after = startProject(before, { ...CONCEPT, publisherId: 'magnavista' });
    // Capital: sube el adelanto entero (el arranque lo paga el publisher).
    expect(after.studio.capital).toBe(before.studio.capital + offer.advance);
    // El trato queda congelado en el proyecto.
    const deal = after.projects[0].publisherDeal!;
    expect(deal.publisherName).toBe('Magnavista Corp');
    expect(deal.revShare).toBe(0.75);
    expect(deal.keepsIp).toBe(true);
    expect(deal.advance).toBe(offer.advance);
    expect(deal.marketingBudgetLeft).toBe(offer.marketingBudget);
    // El arco del negocio cuenta el trato y el historial lo nombra.
    expect(after.stats.publisherDeals).toBe(1);
    expect(after.log.some((e) => /se firma con Magnavista/.test(e.text))).toBe(true);
  });

  it('auto-publicarse paga el arranque de tu caja (lo de siempre)', () => {
    const before = calmState();
    const after = startProject(before, CONCEPT);
    const license = getPlatform(CONCEPT.platformId).licenseCost;
    expect(after.studio.capital).toBe(
      before.studio.capital - license - balance.economy.sizeBaseCost.pequeno,
    );
    expect(after.projects[0].publisherDeal).toBeUndefined();
    expect(after.stats.publisherDeals ?? 0).toBe(0);
  });

  it('la exclusividad de plataforma se respeta: con kit biplataforma y 2 plataformas, Cartucho Bros. no firma', () => {
    const base = calmState();
    const withEngine: GameState = {
      ...base,
      engines: [
        {
          id: 'motor-1',
          name: 'Motor Casero',
          generation: 1,
          techLevel: 3,
          capabilities: ['biplataforma'],
          builtWeek: 1,
        },
      ],
    };
    const concept = {
      ...CONCEPT,
      platformIds: ['pcCasero', 'commo64'],
      engineId: 'motor-1',
    };
    expect(() =>
      startProject(withEngine, { ...concept, publisherId: 'cartuchoBros' }),
    ).toThrow(/exclusividad/);
    // Magnavista no la exige: firma el multiplataforma sin quejarse.
    expect(() =>
      startProject(withEngine, { ...concept, publisherId: 'magnavista' }),
    ).not.toThrow();
  });

  it('la bolsa de marketing del publisher paga tus campañas hasta agotarse', () => {
    const signed = startProject(calmState(), { ...CONCEPT, publisherId: 'magnavista' });
    const project = signed.projects[0];
    const budget = project.publisherDeal!.marketingBudgetLeft;
    // El marketing arranca en Producción: adelantamos la fase.
    const inProduction: GameState = {
      ...signed,
      projects: [{ ...project, phase: 2 as const }],
    };
    const capital0 = inProduction.studio.capital;
    // Nivel 0 (2.000): la bolsa (4.500) lo cubre entero.
    const afterFirst = launchMarketingCampaign(inProduction, 0);
    expect(afterFirst.studio.capital).toBe(capital0);
    expect(afterFirst.projects[0].publisherDeal!.marketingBudgetLeft).toBe(budget - 2_000);
    // Nivel 1 (10.000): quedaban 2.500 — el resto lo pagas tú.
    const afterSecond = launchMarketingCampaign(afterFirst, 1);
    expect(afterSecond.studio.capital).toBe(capital0 - (10_000 - (budget - 2_000)));
    expect(afterSecond.projects[0].publisherDeal!.marketingBudgetLeft).toBe(0);
    expect(afterSecond.projects[0].publisherDeal!.marketingCovered).toBe(budget);
    // El P&L no te cobra lo que pagó el publisher (releasedGameCost).
    const cost = releasedGameCost(afterSecond.projects[0], afterSecond.week + 10);
    expect(cost).toBe(10 * balance.economy.devCostPerPersonWeek + (12_000 - budget));
  });
});

describe('el reparto (docs/19 §9.6): entra dinero antes, te quedas ~30 %', () => {
  it('el publisher se lleva su % del bruto cada semana; tu neto es el resto', () => {
    const released = forceRelease(
      startProject(calmState(), { ...CONCEPT, publisherId: 'magnavista' }),
    );
    let state = released;
    for (let i = 0; i < 4; i++) state = tick(state);
    const game = state.releasedGames[0];
    expect(game.publisherName).toBe('Magnavista Corp');
    expect(game.publisherShare).toBe(0.75);
    expect(game.ipOwner).toBe('publisher');
    // Bruto = unidades × precio (premium, sin MTX ni royalty de motor): el
    // publisher acumula su parte y tu totalRevenue es el neto.
    expect(game.totalUnits).toBeGreaterThan(0);
    const gross = game.totalRevenue + (game.publisherPaid ?? 0);
    expect(game.publisherPaid).toBeGreaterThan(0);
    // Reparto dentro del redondeo semanal: ~75 % para el publisher.
    expect((game.publisherPaid ?? 0) / gross).toBeCloseTo(0.75, 1);
    expect(state.stats.publisherPaidTotal).toBe(game.publisherPaid);
  });

  it('auto-publicar el MISMO juego cuesta más al inicio pero rinde más por venta', () => {
    const signedStart = startProject(calmState(), { ...CONCEPT, publisherId: 'cartuchoBros' });
    const selfStart = startProject(calmState(), CONCEPT);
    // Con publisher la caja ARRANCA mejor: adelanto vs pagar el arranque.
    expect(signedStart.studio.capital).toBeGreaterThan(selfStart.studio.capital);

    let signed = forceRelease(signedStart);
    let self = forceRelease(selfStart);
    for (let i = 0; i < 4; i++) {
      signed = tick(signed);
      self = tick(self);
    }
    const gSigned = signed.releasedGames[0];
    const gSelf = self.releasedGames[0];
    // La red del publisher agranda el pastel: el firmado llega a MÁS gente…
    expect(gSigned.totalUnits).toBeGreaterThan(gSelf.totalUnits);
    // …pero el auto-publicado se queda el bruto entero y gana bastante más
    // (30 % de un pastel +25 % sigue siendo ~0.375 del pastel entero).
    expect(gSelf.totalRevenue).toBeGreaterThan(gSigned.totalRevenue * 2);
    expect(gSelf.publisherPaid).toBeUndefined();
    expect(gSelf.ipOwner).toBe('estudio');
    // El coste del P&L del firmado no incluye el arranque (lo pagó el publisher).
    expect(gSigned.cost!).toBeLessThan(gSelf.cost!);
  });
});

describe('el arco del negocio: independizarse es una meta sentida', () => {
  it('el primer juego ≥ mediano auto-publicado tras un trato marca la independencia', () => {
    // Primer juego con publisher (la muleta del garaje).
    let state = forceRelease(startProject(calmState(), { ...CONCEPT, publisherId: 'magnavista' }));
    expect(state.stats.independenceWeek).toBeUndefined();

    // El estudio crece (etapa 2, 3 personas) y se la juega solo con un mediano.
    const filler = (id: string): Employee => ({
      id,
      name: id,
      avatarSeed: id,
      specialty: 'tecnica',
      skills: { diseno: 40, tecnica: 60, arte: 40, audio: 40, marketing: 40 },
      traits: [],
      morale: 70,
      energy: 80,
      loyalty: 70,
      salary: 500,
      level: 1,
      xp: 0,
      founder: false,
      burnedOut: false,
      weeksLowEnergy: 0,
    });
    state = {
      ...state,
      studio: { ...state.studio, scaleStage: 2, capital: 500_000 },
      staff: [state.staff[0], filler('e1'), filler('e2')],
    };
    state = startProject(state, { ...CONCEPT, name: 'Mi juego, mis reglas', size: 'mediano' });
    state = forceRelease(state);
    expect(state.stats.independenceWeek).toBe(state.week - 1);
    expect(state.log.some((e) => /Te has independizado/.test(e.text))).toBe(true);

    // Solo se celebra una vez.
    const memoWeek = state.stats.independenceWeek;
    state = startProject(state, { ...CONCEPT, name: 'Otro más', size: 'mediano' });
    state = forceRelease(state);
    expect(state.stats.independenceWeek).toBe(memoWeek);
  });
});
