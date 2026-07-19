import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import type { RivalGame, RivalAnnouncement } from '../model/rivals';
import { expectedWeeklyUnits } from './market';
import {
  advanceProjects,
  confirmContestedRelease,
  delayContestedRelease,
  startProject,
} from './projects';
import { contestedWindowAt } from './rivals';

/**
 * Ventanas de lanzamiento disputadas (Fase 9.5, docs/19 §9.5). CA: lanzar
 * contra el bombazo de un gigante en la misma ventana hunde las ventas
 * (aplasta el pico day-one); el jugador puede retrasar su lanzamiento para
 * esquivarlo — decisión informada (el anuncio es público) y determinista.
 */

const SEED = 4242;

/** Un bombazo de gigante ya lanzado (cirugía de estado para tests). */
function giantGame(week: number, genreId: string): RivalGame {
  return {
    name: 'Bombazo',
    genreId,
    themeId: 'espacio',
    size: 'grande',
    review: 88,
    releaseWeek: week,
    hyped: true,
  };
}

/** Inyecta juegos/anuncio en el runtime de Mango (el gigante de E1). */
function withMango(
  state: GameState,
  patch: { games?: RivalGame[]; nextRelease?: RivalAnnouncement | null },
): GameState {
  return {
    ...state,
    rivals: {
      ...(state.rivals ?? { studios: [], poachOffer: null }),
      studios: (state.rivals?.studios ?? []).map((r) =>
        r.id === 'mango' ? { ...r, ...patch } : r,
      ),
    },
  };
}

/** Un proyecto de puzzle TERMINADO esta semana, listo para salir. */
function finishedPuzzleProject(state: GameState): GameState {
  const started = startProject(state, {
    name: 'Contendiente',
    themeId: 'fantasia',
    genreId: 'puzzle',
    platformId: 'pcCasero',
    audience: 'amplio',
    size: 'pequeno',
  });
  return {
    ...started,
    projects: started.projects.map((p) => ({ ...p, phase: 3 as const, weeksSpent: 18 })),
  };
}

describe('contestedWindowAt: la ventana del gigante, previsible y por género', () => {
  it('detecta el bombazo reciente del mismo género dentro del radio', () => {
    const s = withMango(createInitialState(SEED), { games: [giantGame(1, 'puzzle')] });
    const radius = balance.rivals.window.radiusWeeks;
    expect(contestedWindowAt(s, 'puzzle', 1)?.rivalName).toBe('Mango Interactive');
    expect(contestedWindowAt(s, 'puzzle', 1 + radius)).not.toBeNull();
    expect(contestedWindowAt(s, 'puzzle', 1 + radius + 1)).toBeNull(); // fuera del radio
    expect(contestedWindowAt(s, 'rpg', 1)).toBeNull(); // otro género no compite
  });

  it('detecta el bombazo ANUNCIADO que cae cerca (la ventana se ve venir)', () => {
    const announcement: RivalAnnouncement = {
      gameName: 'Bombazo',
      genreId: 'puzzle',
      themeId: 'espacio',
      size: 'grande',
      announcedWeek: 1,
      releaseWeek: 3,
      hyped: true,
    };
    const s = withMango(createInitialState(SEED), { nextRelease: announcement });
    expect(contestedWindowAt(s, 'puzzle', 1)).not.toBeNull(); // a 2 semanas del bombazo
    expect(contestedWindowAt(s, 'puzzle', 3 + balance.rivals.window.radiusWeeks)).not.toBeNull();
  });

  it('los lanzamientos sin campaña (no hyped) no disputan ventanas', () => {
    const modest = { ...giantGame(1, 'puzzle'), hyped: false };
    const s = withMango(createInitialState(SEED), { games: [modest] });
    expect(contestedWindowAt(s, 'puzzle', 1)).toBeNull();
  });
});

describe('CA 9.5: lanzar contra el gigante en su ventana hunde ventas', () => {
  const base = createInitialState(SEED);
  // Mismo proyecto terminado, con y sin bombazo rival en la ventana.
  const contested = advanceProjects(
    finishedPuzzleProject(withMango(base, { games: [giantGame(base.week, 'puzzle')] })),
  );
  const clean = advanceProjects(finishedPuzzleProject(base));

  it('sin ventana, el juego sale directo; con ella, queda retenido pidiendo decisión', () => {
    expect(clean.releasedGames.length).toBe(1);
    expect(clean.releasedGames[0].rivalCrush).toBeUndefined();
    expect(contested.releasedGames.length).toBe(0);
    expect(contested.projects[0].pendingRelease?.rivalName).toBe('Mango Interactive');
    expect(contested.log.some((e) => e.text.includes('¿Lanzar igual o esquivar?'))).toBe(true);
  });

  it('lanzar igual congela el aplastamiento y hunde el pico frente al control', () => {
    const launched = confirmContestedRelease(contested);
    const crushed = launched.releasedGames[0];
    const control = clean.releasedGames[0];
    expect(crushed.rivalCrush).toEqual({
      rivalName: 'Mango Interactive',
      gameName: 'Bombazo',
      penalty: balance.rivals.window.crushPenalty,
    });
    // Misma reseña (el crush castiga ventas, no crítica) y mismo mercado…
    expect(crushed.review).toBe(control.review);
    // …pero el pico day-one queda aplastado: bastante menos de 3/4 del control.
    const crushedUnits = expectedWeeklyUnits(crushed, 0, launched.market);
    const controlUnits = expectedWeeklyUnits(control, 0, clean.market);
    expect(crushedUnits).toBeLessThan(controlUnits * 0.75);
    // El aplastamiento queda nombrado (Pilar 2).
    expect(launched.log.some((e) => e.text.includes('aplasta tu pico'))).toBe(true);
  });

  it('retrasar esquiva la ventana: el juego espera y sale limpio', () => {
    // El bombazo del gigante está ANUNCIADO para dentro de 2 semanas.
    const announcement: RivalAnnouncement = {
      gameName: 'Bombazo',
      genreId: 'puzzle',
      themeId: 'espacio',
      size: 'grande',
      announcedWeek: base.week,
      releaseWeek: base.week + 2,
      hyped: true,
    };
    const held = advanceProjects(
      finishedPuzzleProject(withMango(base, { nextRelease: announcement })),
    );
    expect(held.projects[0].pendingRelease).toBeDefined();

    let s = delayContestedRelease(held);
    const until = announcement.releaseWeek + balance.rivals.window.radiusWeeks + 1;
    expect(s.projects[0].delayedUntilWeek).toBe(until);
    expect(s.projects[0].pendingRelease).toBeUndefined();

    // El mundo sigue girando: el juego espera en el cajón y sale solo.
    for (let i = 0; i < 10 && s.releasedGames.length === 0; i++) s = tick(s);
    expect(s.releasedGames.length).toBe(1);
    expect(s.releasedGames[0].releaseWeek).toBeGreaterThanOrEqual(until);
    // Fuera de la ventana: sin aplastamiento.
    expect(s.releasedGames[0].rivalCrush).toBeUndefined();
    // Y la espera se contabiliza como pausa (el P&L no la cobra como desarrollo).
    expect(s.log.some((e) => e.text.includes('retrasa su lanzamiento'))).toBe(true);
  });
});
