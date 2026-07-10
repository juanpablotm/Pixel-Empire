import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import { startProject } from './projects';

const SEED = 42;

describe('economía mínima de Fase 1 (docs/06 §4)', () => {
  it('sin proyecto solo se paga el coste fijo semanal', () => {
    const before = createInitialState(SEED);
    const after = tick(before);
    expect(after.studio.capital).toBe(before.studio.capital - balance.economy.weeklyUpkeep);
    expect(after.negativeWeeks).toBe(0);
  });

  it('con proyecto se paga además el desarrollo (1 persona·semana en el garaje)', () => {
    const before = startProject(createInitialState(SEED), {
      name: 'Prueba',
      themeId: 'fantasia',
      genreId: 'rpg',
      platformId: 'pcCasero',
      audience: 'amplio',
      size: 'pequeno',
    });
    const after = tick(before);
    expect(after.studio.capital).toBe(
      before.studio.capital -
        balance.economy.weeklyUpkeep -
        balance.economy.devCostPerPersonWeek,
    );
  });

  it('capital negativo sostenido = bancarrota = fin de partida (docs/06 §1)', () => {
    let state = { ...createInitialState(SEED), studio: { capital: 50 } };

    state = tick(state); // capital -50: empieza la cuenta atrás
    expect(state.studio.capital).toBeLessThan(0);
    expect(state.negativeWeeks).toBe(1);
    expect(state.log.some((e) => e.type === 'economia')).toBe(true);
    expect(state.gameOver).toBeNull();

    for (let i = 1; i < balance.economy.bankruptcyGraceWeeks; i++) {
      state = tick(state);
    }
    expect(state.negativeWeeks).toBe(balance.economy.bankruptcyGraceWeeks);
    expect(state.gameOver).not.toBeNull();
    expect(state.gameOver?.reason).toBe('bancarrota');
    expect(state.log.some((e) => e.type === 'fin')).toBe(true);
  });

  it('tras el game over el mundo se congela', () => {
    let state = { ...createInitialState(SEED), studio: { capital: 0 } };
    for (let i = 0; i <= balance.economy.bankruptcyGraceWeeks; i++) state = tick(state);
    expect(state.gameOver).not.toBeNull();

    const frozen = tick(state);
    expect(frozen).toBe(state); // ni siquiera avanza la semana
  });

  it('volver a números verdes reinicia la cuenta atrás de bancarrota', () => {
    let state = { ...createInitialState(SEED), studio: { capital: 150 } };
    state = tick(state); // 50
    state = tick(state); // -50 → negativeWeeks 1
    expect(state.negativeWeeks).toBe(1);

    // Un ingreso providencial saca la caja del rojo.
    state = { ...state, studio: { capital: 5_000 } };
    state = tick(state);
    expect(state.negativeWeeks).toBe(0);
    expect(state.gameOver).toBeNull();
  });
});
