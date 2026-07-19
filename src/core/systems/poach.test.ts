import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { makeRng } from '../engine/rng';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { Employee } from '../model/staff';
import { advanceRivals, resolvePoachOffer, RIVALS_STREAM } from './rivals';

/**
 * Robo de talento (Fase 9.5, docs/19 §9.5 + docs/05 §7). CA: un empleado con
 * lealtad baja puede irse a un rival — vía caza activa (oferta con
 * contraoferta) o al renunciar por su pie (ficha por la competencia y la
 * fortalece). Determinista por semilla; el fundador nunca se ficha.
 */

/** Una empleada cazable: lealtad hundida pero sin riesgo de renuncia propia
 * (lealtad > quits.loyaltyThreshold 30 y moral alta — la caza es del rival). */
function poachable(id: string, skill: number): Employee {
  return {
    id,
    name: `Vulnerable ${id}`,
    avatarSeed: id,
    specialty: 'diseno',
    skills: { diseno: skill, tecnica: 30, arte: 30, audio: 30, marketing: 30 },
    traits: [],
    morale: 80,
    energy: 80,
    loyalty: 35,
    salary: 800,
    level: 3,
    xp: 0,
    founder: false,
    burnedOut: false,
    weeksLowEnergy: 0,
  };
}

/** Corre advanceRivals con semillas crecientes hasta que salta una oferta. */
function fireOffer(skill: number): { state: GameState; seed: number } {
  for (let seed = 1; seed <= 400; seed++) {
    const base = createInitialState(seed);
    const s: GameState = { ...base, staff: [...base.staff, poachable('emp-1', skill)] };
    const after = advanceRivals(s, makeRng(seed, RIVALS_STREAM + s.week));
    if (after.rivals?.poachOffer) return { state: after, seed };
  }
  throw new Error('Ninguna semilla generó una oferta de caza en 400 intentos');
}

describe('CA 9.5: un empleado con lealtad baja puede irse a un rival', () => {
  it('la caza salta sobre el vulnerable, con la oferta sobre la mesa y noticia', () => {
    const { state } = fireOffer(85);
    const offer = state.rivals?.poachOffer;
    expect(offer?.employeeId).toBe('emp-1');
    expect(offer?.offeredSalary).toBe(Math.round(800 * balance.rivals.poach.offerSalaryMult));
    expect(state.log.some((e) => e.type === 'industria' && e.text.includes('quiere llevarse'))).toBe(
      true,
    );
  });

  it('dejarle ir: se marcha, el rival se fortalece (más por una estrella) y Empleador lo nota', () => {
    const { state } = fireOffer(85); // skill 85 ≥ starSkill: estrella
    const offer = state.rivals?.poachOffer;
    const before = state.rivals?.studios.find((r) => r.id === offer?.rivalId);
    const employerBefore = state.studio.reputation.empleador;

    const after = resolvePoachOffer(state, 'dejar');
    expect(after.staff.some((e) => e.id === 'emp-1')).toBe(false);
    expect(after.rivals?.poachOffer).toBeNull();
    const rival = after.rivals?.studios.find((r) => r.id === offer?.rivalId);
    expect(rival?.strength).toBeCloseTo(
      Math.min(100, (before?.strength ?? 0) + balance.rivals.poach.strengthGainStar),
      5,
    );
    expect(after.studio.reputation.empleador).toBeLessThan(employerBefore);
    expect(after.log.some((e) => e.text.includes('ficha por'))).toBe(true);
  });

  it('igualar la oferta: se queda para siempre con el salario nuevo y la lealtad arriba', () => {
    const { state } = fireOffer(85);
    const offer = state.rivals?.poachOffer;
    const after = resolvePoachOffer(state, 'igualar');
    const employee = after.staff.find((e) => e.id === 'emp-1');
    expect(employee?.salary).toBe(offer?.offeredSalary);
    expect(employee?.loyalty).toBe(35 + balance.rivals.poach.counterLoyaltyBoost);
    expect(after.rivals?.poachOffer).toBeNull();
  });

  it('una renuncia espontánea puede acabar fichando por la competencia', () => {
    // Moral y lealtad por los suelos: renuncia por su pie (docs/05 §7); el
    // PRNG decide si ficha por un rival. Se busca la semilla que lo muestra.
    for (let seed = 1; seed <= 60; seed++) {
      const base = createInitialState(seed);
      let s: GameState = {
        ...base,
        staff: [
          ...base.staff,
          { ...poachable('emp-2', 60), morale: 5, loyalty: 5, name: 'Quemado' },
        ],
      };
      for (let i = 0; i < 8 && s.staff.length > 1; i++) s = tick(s);
      if (s.staff.length === 1 && s.log.some((e) => e.text.includes('y ficha por'))) {
        // El rival que lo fichó quedó más fuerte que su baseline.
        const stronger = (s.rivals?.studios ?? []).some(
          (r) => r.strength > balance.rivals.baseStrengthByTier[r.tier],
        );
        expect(stronger).toBe(true);
        return;
      }
    }
    throw new Error('Ninguna semilla mostró una renuncia fichada por un rival');
  });

  it('el fundador y los leales no reciben ofertas', () => {
    // Sin nadie vulnerable (solo el fundador), jamás salta una oferta.
    for (let seed = 1; seed <= 50; seed++) {
      const s = createInitialState(seed);
      const after = advanceRivals(s, makeRng(seed, RIVALS_STREAM + s.week));
      expect(after.rivals?.poachOffer).toBeNull();
    }
  });
});
