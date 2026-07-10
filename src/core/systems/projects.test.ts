import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import {
  projectTotalWeeks,
  setFocus,
  startProject,
  toggleFeature,
  type ProjectConcept,
} from './projects';

const SEED = 42;

const CONCEPT: ProjectConcept = {
  name: 'Mazmorras del Alba',
  themeId: 'fantasia',
  genreId: 'rpg',
  platformId: 'pcCasero',
  audience: 'hardcore',
  size: 'pequeno',
};

function withProject(concept: ProjectConcept = CONCEPT): GameState {
  return startProject(createInitialState(SEED), concept);
}

/** Avanza ticks hasta acumular `count` lanzamientos (con tope de seguridad). */
function runUntilRelease(state: GameState, count = 1, maxTicks = 60): GameState {
  let s = state;
  for (let i = 0; i < maxTicks && s.releasedGames.length < count; i++) {
    s = tick(s);
  }
  return s;
}

describe('startProject — concepción (docs/02 §2 paso 1)', () => {
  it('crea el proyecto con precio por tamaño de data/balance.ts', () => {
    const state = withProject();
    expect(state.projects).toHaveLength(1);
    const p = state.projects[0];
    expect(p.id).toBe('proyecto-1');
    expect(p.phase).toBe(1);
    expect(p.price).toBe(balance.economy.priceBySize.pequeno);
    expect(state.projectCounter).toBe(1);
    expect(state.log.some((e) => e.type === 'proyecto')).toBe(true);
  });

  it('el reparto de esfuerzo por defecto es uniforme y suma 1', () => {
    const p = withProject().projects[0];
    for (const allocation of p.focus) {
      const total = Object.values(allocation).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 10);
    }
  });

  it('rechaza un segundo proyecto simultáneo (garaje) y nombres vacíos', () => {
    const state = withProject();
    expect(() => startProject(state, { ...CONCEPT, name: 'Otro' })).toThrow(/Ya hay un proyecto/);
    expect(() => startProject(createInitialState(SEED), { ...CONCEPT, name: '   ' })).toThrow(
      /nombre/,
    );
  });

  it('rechaza contenido desconocido', () => {
    expect(() =>
      startProject(createInitialState(SEED), { ...CONCEPT, themeId: 'inexistente' }),
    ).toThrow(/Tema desconocido/);
  });
});

describe('setFocus y toggleFeature — decisiones de desarrollo', () => {
  it('setFocus normaliza el reparto a suma 1', () => {
    const state = setFocus(withProject(), 1, { motor: 2, jugabilidad: 1, historia: 1 });
    const allocation = state.projects[0].focus[0];
    expect(allocation.motor).toBeCloseTo(0.5, 10);
    expect(allocation.jugabilidad).toBeCloseTo(0.25, 10);
    expect(allocation.historia).toBeCloseTo(0.25, 10);
  });

  it('toggleFeature añade la feature y su riesgo de bugs; quitarla lo devuelve', () => {
    let state = toggleFeature(withProject(), 'fisicasAvanzadas');
    expect(state.projects[0].chosenFeatureIds).toEqual(['fisicasAvanzadas']);
    expect(state.projects[0].bugDebt).toBeCloseTo(0.15, 10);

    state = toggleFeature(state, 'fisicasAvanzadas');
    expect(state.projects[0].chosenFeatureIds).toEqual([]);
    expect(state.projects[0].bugDebt).toBeCloseTo(0, 10);
  });

  it('las features alargan la fase de Producción', () => {
    const sinFeatures = withProject();
    expect(projectTotalWeeks(sinFeatures.projects[0])).toBe(6);
    const conCrafteo = toggleFeature(sinFeatures, 'sistemaCrafteo');
    expect(projectTotalWeeks(conCrafteo.projects[0])).toBe(8);
  });

  it('las features se cierran al salir de la fase de Concepto', () => {
    let state = withProject(); // pequeño: fase de Concepto = 2 semanas
    state = tick(state);
    state = tick(state); // entra en Producción
    expect(state.projects[0].phase).toBe(2);
    expect(() => toggleFeature(state, 'multijugadorLocal')).toThrow(/Concepto/);
  });
});

describe('desarrollo por fases hasta el lanzamiento (docs/02 §2 pasos 3 y 6)', () => {
  it('atraviesa Concepto → Producción → Pulido en las semanas correctas', () => {
    let state = withProject();
    expect(state.projects[0].phase).toBe(1);
    state = tick(state);
    expect(state.projects[0].phase).toBe(1);
    state = tick(state);
    expect(state.projects[0].phase).toBe(2);
    state = tick(tick(state));
    expect(state.projects[0].phase).toBe(3);
    expect(state.log.filter((e) => e.type === 'fase')).toHaveLength(2);
  });

  it('acumula deuda de bugs en Concepto/Producción y QA en Pulido', () => {
    let state = withProject();
    for (let i = 0; i < 4; i++) state = tick(state); // Concepto + Producción
    const tras4 = state.projects[0];
    expect(tras4.bugDebt).toBeCloseTo(4 * balance.development.baseBugsPerWeek, 10);
    expect(tras4.qaInvested).toBe(0);

    state = tick(state); // primera semana de Pulido (⅓ del esfuerzo en QA por defecto)
    const enPulido = state.projects[0];
    expect(enPulido.bugDebt).toBeCloseTo(tras4.bugDebt, 10); // en Pulido no crece
    expect(enPulido.qaInvested).toBeCloseTo(
      (1 / 3) * balance.development.qaReductionPerWeek,
      10,
    );
  });

  it('al terminar lanza el juego con reseña, desglose y veredicto', () => {
    const state = runUntilRelease(withProject());
    expect(state.projects).toHaveLength(0);
    expect(state.releasedGames).toHaveLength(1);

    const game = state.releasedGames[0];
    expect(game.name).toBe(CONCEPT.name);
    expect(game.releaseWeek).toBe(balance.time.startWeek + 5); // 6 semanas de desarrollo
    expect(game.review).toBe(game.quality);
    expect(game.quality).toBeGreaterThan(0);
    expect(game.quality).toBeLessThanOrEqual(100);
    expect(game.verdict).not.toBe('');
    expect(game.lines).toHaveLength(6);
    expect(game.lines.map((l) => l.factor)).toEqual([
      'fit',
      'balance',
      'features',
      'polish',
      'team',
      'innovation',
    ]);
    expect(state.log.some((e) => e.type === 'lanzamiento')).toBe(true);
  });

  it('repetir la misma combinación tema×género baja la innovación', () => {
    const primera = runUntilRelease(withProject());
    let segunda = startProject(primera, { ...CONCEPT, name: 'Mazmorras del Alba II' });
    segunda = runUntilRelease(segunda, 2);
    const [g1, g2] = segunda.releasedGames;
    expect(g2.breakdown.innovationMod).toBeLessThan(g1.breakdown.innovationMod);
  });

  it('es determinista: mismas acciones y semilla → mismo estado final', () => {
    const run = () => {
      let s = startProject(createInitialState(SEED), CONCEPT);
      s = toggleFeature(s, 'finalRamificado');
      s = setFocus(s, 1, { motor: 1, jugabilidad: 2, historia: 1 });
      for (let i = 0; i < 20; i++) s = tick(s);
      return s;
    };
    expect(run()).toEqual(run());
  });
});
