import { describe, expect, it } from 'vitest';
import { balance } from '../../data/balance';
import { getEra } from '../../data/eras';
import { getFeature } from '../../data/features';
import { researchNodeUnlocks } from '../../data/research';
import { getTheme } from '../../data/themes';
import { createInitialState } from '../engine/initialState';
import { tick } from '../engine/tick';
import type { GameState } from '../model/gameState';
import { createMarketState } from './market';
import { startProject, toggleFeature } from './projects';
import {
  advanceResearch,
  balanceRevealed,
  buyResearch,
  capabilityBonus,
  fitRevealed,
  insightKnown,
  priceRevealed,
  researchInsight,
  researchNodeStatus,
  researchTheme,
  themeResearchCost,
  themeResearchStatus,
  toggleResearchAssignment,
} from './research';
import { toggleAssignment } from './staff';
import { availableThemes, featureAvailable, genreAvailable, themeAvailable } from './unlocks';
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
      // Tema starter (docs/17 P1): el test es sobre la feature online, no sobre
      // el gateo de temas — evitamos investigar un tema para no ensuciarlo.
      themeId: 'cienciaFiccion',
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

describe('P1: temas gateados por investigación (docs/17)', () => {
  const withPoints = (points: number): GameState => {
    const base = createInitialState(SEED);
    return { ...base, research: { ...base.research, points } };
  };

  it('empiezas solo con los temas starter usables', () => {
    const usable = availableThemes(createInitialState(SEED))
      .map((t) => t.id)
      .sort();
    expect(usable).toEqual([...balance.research.knowledge.starterThemes].sort());
  });

  it('no puedes usar un tema no investigado (docs/17 P1)', () => {
    const state = withPoints(0); // E1: deportes existe en la era pero no es starter
    expect(themeAvailable(state, getTheme('deportes'))).toBe(false);
    expect(() =>
      startProject(state, {
        name: 'Fútbol 80',
        themeId: 'deportes',
        genreId: 'rpg',
        platformId: 'pcCasero',
        audience: 'amplio',
        size: 'pequeno',
      }),
    ).toThrow(/no está investigado/);
  });

  it('investigar un tema lo hace usable y descuenta 💡 (docs/17 P1)', () => {
    let state = withPoints(10);
    expect(themeResearchStatus(state, 'deportes')).toBe('disponible');
    state = researchTheme(state, 'deportes');
    expect(state.research.themes).toContain('deportes');
    expect(state.research.points).toBe(10 - themeResearchCost('deportes'));
    expect(themeAvailable(state, getTheme('deportes'))).toBe(true);
    // Y ahora sí se puede concebir con él.
    expect(() =>
      startProject(state, {
        name: 'Fútbol 80',
        themeId: 'deportes',
        genreId: 'rpg',
        platformId: 'pcCasero',
        audience: 'amplio',
        size: 'pequeno',
      }),
    ).not.toThrow();
  });

  it('no se investiga un starter, ni se repite, ni antes de su era', () => {
    const state = withPoints(50);
    expect(() => researchTheme(state, 'fantasia')).toThrow(/ya es un tema libre/);
    // zombis es de E3: en E1 aún no se puede investigar (la era habilita).
    expect(themeResearchStatus(state, 'zombis')).toBe('bloqueado');
    expect(() => researchTheme(state, 'zombis')).toThrow(/aún no se puede investigar/);
    const done = researchTheme(state, 'deportes');
    expect(() => researchTheme(done, 'deportes')).toThrow(/ya está investigado/);
  });

  it('pasar de era NO regala temas: los habilita para investigarlos (docs/17 P1)', () => {
    // En E3 (zombis existe) sigue sin ser usable hasta gastarse los 💡.
    const e3 = atEra('E5', 20); // E5 ≥ E3: zombis en su era, con puntos
    expect(themeAvailable(e3, getTheme('zombis'))).toBe(false);
    expect(themeResearchStatus(e3, 'zombis')).toBe('disponible');
    const learned = researchTheme(e3, 'zombis');
    expect(themeAvailable(learned, getTheme('zombis'))).toBe(true);
  });
});

describe('P2: conocimiento de mercado que se gana (docs/17)', () => {
  it('TODO empieza oculto: ni el combo de partida se regala (docs/17 P2)', () => {
    // El estudio novato de 1980 no sabe nada: ni su tema de partida con su
    // género de partida. Descubrir es la mecánica (Pilar 5).
    const s = createInitialState(SEED);
    expect(fitRevealed(s, 'fantasia', 'rpg')).toBe(false);
    expect(balanceRevealed(s, 'rpg')).toBe(false);
    expect(priceRevealed(s)).toBe(false);
    // …pero se puede concebir igual: la pista oculta no bloquea nada.
    expect(() =>
      startProject(s, {
        name: 'A ciegas',
        themeId: 'fantasia',
        genreId: 'rpg',
        platformId: 'pcCasero',
        audience: 'amplio',
        size: 'pequeno',
      }),
    ).not.toThrow();
  });

  it('lo oculto se revela con los nodos globales', () => {
    const s = atEra('E5', 200);
    // Precio recomendado: oculto hasta Análisis de mercado.
    expect(priceRevealed(s)).toBe(false);
    expect(priceRevealed(buyResearch(s, 'analisisMercado'))).toBe(true);
    // Balance ideal del género: oculto hasta Estudio de géneros.
    expect(balanceRevealed(s, 'shooter')).toBe(false);
    expect(balanceRevealed(buyResearch(s, 'estudioGeneros'), 'shooter')).toBe(true);
    // Fit de un combo de contenido desbloqueado: oculto hasta Red de afinidades.
    expect(fitRevealed(s, 'zombis', 'shooter')).toBe(false);
    expect(fitRevealed(buyResearch(s, 'redAfinidades'), 'zombis', 'shooter')).toBe(true);
  });

  it('una pista oculta se revela al "Investigar resultados" de ese combo (docs/17 P2)', () => {
    let s = researchTheme(atEra('E5', 100), 'zombis');
    expect(fitRevealed(s, 'zombis', 'shooter')).toBe(false);
    expect(balanceRevealed(s, 'shooter')).toBe(false);
    // Lanza un zombis × shooter.
    s = startProject(s, {
      name: 'Horda',
      themeId: 'zombis',
      genreId: 'shooter',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
    });
    while (s.releasedGames.length === 0) s = tick(s);
    const gameId = s.releasedGames[0].id;
    // Aún oculto tras lanzar: el atajo predictivo se paga aparte.
    expect(fitRevealed(s, 'zombis', 'shooter')).toBe(false);
    const before = s.research.points;
    const learned = researchInsight(s, gameId);
    expect(learned.research.points).toBe(before - balance.research.knowledge.insightCost);
    expect(insightKnown(learned, 'zombis', 'shooter')).toBe(true);
    // El combo aprendido revela su Fit y el balance ideal de su género.
    expect(fitRevealed(learned, 'zombis', 'shooter')).toBe(true);
    expect(balanceRevealed(learned, 'shooter')).toBe(true);
    // No se puede investigar dos veces el mismo combo.
    expect(() => researchInsight(learned, gameId)).toThrow(/Ya conoces/);
  });

  it('Pilar 2: el desglose de reseña propio nunca se oculta (docs/17 P2)', () => {
    // Un combo cuyo atajo PREDICTIVO está oculto (contenido desbloqueado, sin
    // nodo ni pista): aun así el desglose A POSTERIORI es siempre legible.
    let s = researchTheme(atEra('E5', 100), 'zombis');
    expect(fitRevealed(s, 'zombis', 'shooter')).toBe(false);
    s = startProject(s, {
      name: 'Horda II',
      themeId: 'zombis',
      genreId: 'shooter',
      platformId: 'pcCasero',
      audience: 'hardcore',
      size: 'pequeno',
    });
    while (s.releasedGames.length === 0) s = tick(s);
    const g = s.releasedGames[0];
    // Las 6 líneas del desglose están presentes y explican el resultado…
    expect(g.lines.map((l) => l.factor)).toEqual([
      'fit',
      'balance',
      'features',
      'polish',
      'team',
      'innovation',
    ]);
    // …incluidos el encaje y el balance ideal del género (breakdown), sin
    // depender de la investigación: la explicación posterior no se paga nunca.
    expect(g.breakdown.fit).toBeGreaterThan(0);
    expect(g.breakdown.dIdeal).toBeGreaterThan(0);
  });
});
