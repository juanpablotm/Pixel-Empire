import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getEra } from '../../data/eras';
import { availableMonetizationModels } from '../systems/unlocks';
import { createSandboxState } from './initialState';
import { tick } from './tick';

/**
 * Modo sandbox (Fase 7G, docs/01 §7): misma simulación, punto de partida
 * generoso y era a elegir. Puro, determinista y consistente con el gating
 * por era (docs/02 §5).
 */
describe('createSandboxState', () => {
  it('arranca en la era elegida, con su semana histórica y su mercado', () => {
    const state = createSandboxState(99, 'E5');
    expect(state.era).toBe('E5');
    expect(state.week).toBe(getEra('E5').startWeek);
    expect(state.studio.capital).toBe(balance.sandbox.initialCapital);
    expect(state.research.points).toBe(balance.sandbox.researchPoints);
    // El mercado existe y está poblado para esa semana (docs/04).
    expect(Object.keys(state.market.genres).length).toBeGreaterThan(0);
    expect(Object.keys(state.market.platforms).length).toBeGreaterThan(0);
    // El contenido gateado por era ya está desbloqueado (docs/02 §5).
    expect(availableMonetizationModels(state).map((m) => m.id)).toContain('premium+mtx');
  });

  it('es determinista y avanza sin romper la era', () => {
    const a = createSandboxState(7, 'E3');
    const b = createSandboxState(7, 'E3');
    expect(a).toEqual(b);
    let state = a;
    for (let i = 0; i < 8; i++) state = tick(state);
    expect(state.era).toBe('E3');
    expect(state.gameOver).toBeNull();
    // La riqueza del sandbox no salta a etapas de escala sin plantilla: la
    // etapa 2 llega por capital, las grandes exigen equipo (docs/02 §4).
    expect(state.studio.scaleStage).toBeLessThanOrEqual(2);
  });

  it('en E1 equivale a una partida normal pero rica (semana 1, garaje)', () => {
    const state = createSandboxState(3, 'E1');
    expect(state.week).toBe(balance.time.startWeek);
    expect(state.staff).toHaveLength(1);
    expect(state.projects).toHaveLength(0);
  });
});
