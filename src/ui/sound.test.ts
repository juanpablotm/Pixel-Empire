import { describe, expect, it } from 'vitest';
import { createInitialState } from '../core/engine/initialState';
import type { GameState } from '../core/model/gameState';
import type { ReleasedGame } from '../core/model/release';
import { soundEventsFrom } from './sound';

/**
 * La parte PURA de la capa de sonido (Fase 7G, docs/10 §12): qué debe sonar
 * ante cada cambio de estado. El motor Web Audio no se toca aquí (en jsdom
 * no existe y todo es no-op); esto fija el mapeo evento→sonido.
 */

const base = createInitialState(1);

function withRelease(state: GameState, review: number): GameState {
  const game = { review, size: 'pequeno', releaseWeek: state.week } as ReleasedGame;
  return { ...state, releasedGames: [...state.releasedGames, game] };
}

describe('soundEventsFrom (diff puro de estado → eventos sonoros)', () => {
  it('semana avanzada sin novedades → solo el blip del tick', () => {
    expect(soundEventsFrom(base, { ...base, week: base.week + 1 })).toEqual(['tick']);
  });

  it('sin cambios → silencio', () => {
    expect(soundEventsFrom(base, base)).toEqual([]);
  });

  it('la reseña decide el tono: chime, neutro o desinfle (docs/10 §12)', () => {
    expect(soundEventsFrom(base, withRelease(base, 82))).toEqual(['reviewGood']);
    expect(soundEventsFrom(base, withRelease(base, 60))).toEqual(['reviewOk']);
    expect(soundEventsFrom(base, withRelease(base, 30))).toEqual(['reviewBad']);
  });

  it('crisis, escándalo, bombing o quiebra → thud grave', () => {
    const bombed: GameState = {
      ...base,
      community: {
        ...base.community,
        bombs: [
          {
            gameId: 'x',
            cause: 'lootboxes',
            startWeek: base.week,
            weeksLeft: 3,
            reviewPenalty: 10,
            salesPenalty: 0.7,
          },
        ],
      },
    };
    expect(soundEventsFrom(base, bombed)).toEqual(['threat']);
    const ended: GameState = {
      ...base,
      gameOver: { week: base.week, reason: 'bancarrota' },
    };
    expect(soundEventsFrom(base, ended)).toEqual(['threat']);
  });

  it('premios y cambio de era tienen su fanfarria propia', () => {
    const premiado: GameState = {
      ...base,
      studio: {
        ...base.studio,
        awards: [
          { categoryId: 'goty', gameId: 'x', gameName: 'X', week: 52, year: 1980 },
        ],
      },
    };
    expect(soundEventsFrom(base, premiado)).toEqual(['award']);
    expect(soundEventsFrom(base, { ...base, era: 'E2' })).toEqual(['era']);
  });

  it('el tick calla cuando hay algo más importante que sonar', () => {
    const next = withRelease({ ...base, week: base.week + 1 }, 82);
    expect(soundEventsFrom(base, next)).toEqual(['reviewGood']);
  });
});
