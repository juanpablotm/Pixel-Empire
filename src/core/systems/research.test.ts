import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getEra } from '../../data/eras';
import { getFeature } from '../../data/features';
import { researchNodeUnlocks } from '../../data/research';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import { createMarketState } from './market';
import { startProject, toggleFeature } from './projects';
import {
  advanceResearch,
  buyResearch,
  capabilityBonus,
  researchNodeStatus,
  toggleResearchAssignment,
} from './research';
import { toggleAssignment } from './staff';
import { featureAvailable, genreAvailable } from './unlocks';
import { genres } from '../../data/genres';

/**
 * Investigación (docs/02 §3): puntos 💡 por persona·semana y por lanzar
 * juegos; árbol gateado por era con prerrequisitos; capacidades de estudio y
 * desbloqueos de contenido. Semilla fija; los nodos viven en data/research.ts.
 */

const SEED = 42;

function atEra(eraId: 'E1' | 'E2' | 'E4' | 'E5' | 'E6', points = 0): GameState {
  const week = getEra(eraId).startWeek;
  const base = createInitialState(SEED);
  return {
    ...base,
    week,
    era: eraId,
    market: createMarketState(week),
    research: { ...base.research, points },
  };
}

describe('puntos 💡 (docs/12 §6: ~1 por persona·semana en I+D)', () => {
  it('sin nadie en I+D no se acumula nada', () => {
    const state = createInitialState(SEED);
    expect(advanceResearch(state).research.points).toBe(0);
  });

  it('asignar al fundador a I+D lo saca del proyecto y produce 1 💡/semana', () => {
    let state = startProject(createInitialState(SEED), {
      name: 'Cobaya',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
    });
    expect(state.projects[0].assignedStaff).toContain('fundador');
    state = toggleResearchAssignment(state, 'fundador');
    expect(state.research.rdStaff).toEqual(['fundador']);
    expect(state.projects[0].assignedStaff).not.toContain('fundador');
    expect(advanceResearch(state).research.points).toBe(1);
  });

  it('volver a asignarlo al proyecto lo saca de I+D (nadie está en dos sitios)', () => {
    let state = startProject(createInitialState(SEED), {
      name: 'Cobaya',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
    });
    state = toggleResearchAssignment(state, 'fundador');
    state = toggleAssignment(state, 'fundador');
    expect(state.research.rdStaff).toEqual([]);
    expect(state.projects[0].assignedStaff).toContain('fundador');
  });

  it('lanzar un juego da puntos por tamaño (docs/02 §3)', () => {
    let state = startProject(createInitialState(SEED), {
      name: 'Escuela',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
    });
    while (state.projects.length > 0) state = tick(state);
    expect(state.research.points).toBeGreaterThanOrEqual(
      balance.research.releasePointsBySize.pequeno,
    );
  });
});

describe('el árbol: era, prerrequisitos y compra (docs/02 §3)', () => {
  it('un nodo de E2 está bloqueado en E1 aunque haya puntos', () => {
    const state = { ...createInitialState(SEED), research: { points: 999, unlocked: [], rdStaff: [] } };
    expect(researchNodeStatus(state, 'motorPropio1')).toBe('bloqueado');
    expect(() => buyResearch(state, 'motorPropio1')).toThrow(/no se puede investigar/);
  });

  it('sin puntos suficientes no se compra', () => {
    const state = atEra('E2', 5);
    expect(researchNodeStatus(state, 'motorPropio1')).toBe('sinPuntos');
    expect(() => buyResearch(state, 'motorPropio1')).toThrow(/Faltan puntos/);
  });

  it('comprar descuenta puntos, desbloquea y no se puede repetir', () => {
    const state = buyResearch(atEra('E2', 30), 'motorPropio1');
    expect(state.research.unlocked).toContain('motorPropio1');
    expect(state.research.points).toBe(5);
    expect(state.log.some((e) => e.type === 'investigacion')).toBe(true);
    expect(() => buyResearch(state, 'motorPropio1')).toThrow(/ya está investigado/);
  });

  it('los prerrequisitos encadenan: Motor propio II exige el I', () => {
    const e4 = atEra('E4', 999);
    expect(researchNodeStatus(e4, 'motorPropio2')).toBe('bloqueado');
    const conMotor1 = {
      ...e4,
      research: { ...e4.research, unlocked: ['motorPropio1'] },
    };
    expect(researchNodeStatus(conMotor1, 'motorPropio2')).toBe('disponible');
  });
});

describe('capacidades de estudio y desbloqueo de contenido (docs/02 §3)', () => {
  it('el motor propio acelera la producción (devOutput)', () => {
    const base = startProject(atEra('E2', 0), {
      name: 'Con motor',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
    });
    const withEngine = {
      ...base,
      research: { ...base.research, unlocked: ['motorPropio1'] },
    };
    expect(capabilityBonus(withEngine, 'devOutput')).toBeCloseTo(1.1, 10);
    const slow = tick(base);
    const fast = tick(withEngine);
    expect(fast.projects[0].weeksSpent).toBeGreaterThan(slow.projects[0].weeksSpent);
  });

  it('el multijugador online exige su tecnología además de la era', () => {
    const e4 = atEra('E4');
    const feature = getFeature('multijugadorOnline');
    expect(featureAvailable(e4, feature)).toBe(false);
    const investigada = {
      ...e4,
      research: { ...e4.research, unlocked: ['tecnologiaOnline'] },
    };
    expect(featureAvailable(investigada, feature)).toBe(true);

    let state = startProject(investigada, {
      name: 'Online SA',
      themeId: 'militar',
      genreId: 'shooter',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
    });
    // Sin investigar lanza; investigada se puede elegir.
    expect(() => toggleFeature({ ...state, research: e4.research }, 'multijugadorOnline')).toThrow(
      /era o investigación/,
    );
    state = toggleFeature(state, 'multijugadorOnline');
    expect(state.projects[0].chosenFeatureIds).toContain('multijugadorOnline');
  });

  it('el Sandbox llega con la generación procedural (género por investigación)', () => {
    const e5 = atEra('E5');
    const sandbox = genres.find((g) => g.id === 'sandbox');
    expect(sandbox).toBeDefined();
    expect(genreAvailable(e5, sandbox!)).toBe(false);
    const investigada = {
      ...e5,
      research: { ...e5.research, unlocked: ['generacionProcedural'] },
    };
    expect(genreAvailable(investigada, sandbox!)).toBe(true);
    // La relación nodo→contenido se deriva del propio contenido (docs/09 §7).
    expect(researchNodeUnlocks('generacionProcedural').genres).toContain('sandbox');
  });

  it('el tick acumula investigación de forma determinista', () => {
    let state = atEra('E2', 0);
    state = toggleResearchAssignment(state, 'fundador');
    const a = tick(state);
    const b = tick(state);
    expect(a).toEqual(b);
    expect(a.research.points).toBe(1);
  });
});
