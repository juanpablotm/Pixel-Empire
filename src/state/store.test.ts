import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFounder, createInitialState, startProject, tick, type GameState } from '../core';
import { balance } from '../data/balance';
import { useGameStore } from './store';

const SEED = 2024;

const CONCEPT = {
  name: 'Mazmorras del Alba',
  themeId: 'fantasia',
  genreId: 'rpg',
  platformId: 'pcCasero',
  audience: 'hardcore',
  size: 'pequeno',
} as const;

describe('useGameStore — estado + acciones que delegan en core (docs/08 §6)', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().setSpeed(0);
    useGameStore.setState({
      game: createInitialState(SEED),
      speed: 0,
      screen: 'estudio',
      conceptionOpen: false,
      devProjectId: null,
      menuModal: null,
      reviewGameId: null,
    });
  });

  afterEach(() => {
    useGameStore.getState().setSpeed(0);
    vi.useRealTimers();
  });

  it('advanceWeek avanza la semana vía tick()', () => {
    const before = useGameStore.getState().game.week;
    useGameStore.getState().advanceWeek();
    useGameStore.getState().advanceWeek();
    expect(useGameStore.getState().game.week).toBe(before + 2);
  });

  it('newGame reinicia con la semilla dada y en pausa', () => {
    useGameStore.getState().advanceWeek();
    useGameStore.getState().newGame(99);
    const { game, speed } = useGameStore.getState();
    expect(game).toEqual(createInitialState(99));
    expect(speed).toBe(0);
  });

  it('saveGame + loadGame hacen round-trip por localStorage', () => {
    useGameStore.getState().advanceWeek();
    const saved = useGameStore.getState().game;
    useGameStore.getState().saveGame();

    useGameStore.getState().newGame(1);
    expect(useGameStore.getState().game).not.toEqual(saved);

    expect(useGameStore.getState().loadGame()).toBe(true);
    expect(useGameStore.getState().game).toEqual(saved);
  });

  it('loadGame devuelve false si no hay guardado', () => {
    expect(useGameStore.getState().loadGame()).toBe(false);
  });

  it('setSpeed(1) hace avanzar el tiempo; pausar lo detiene', () => {
    vi.useFakeTimers();
    const start = useGameStore.getState().game.week;

    useGameStore.getState().setSpeed(1);
    vi.advanceTimersByTime(balance.time.baseTickMs * 3);
    expect(useGameStore.getState().game.week).toBe(start + 3);

    useGameStore.getState().setSpeed(0);
    vi.advanceTimersByTime(balance.time.baseTickMs * 10);
    expect(useGameStore.getState().game.week).toBe(start + 3);
  });

  it('setSpeed(4) avanza 4 semanas por intervalo base', () => {
    vi.useFakeTimers();
    const start = useGameStore.getState().game.week;

    useGameStore.getState().setSpeed(4);
    vi.advanceTimersByTime(balance.time.baseTickMs * 2);
    expect(useGameStore.getState().game.week).toBe(start + 8);

    useGameStore.getState().setSpeed(0);
  });

  it('startProject crea el proyecto y abre su ventana de desarrollo (Fase 8.5)', () => {
    useGameStore.getState().startProject(CONCEPT);
    const { game, screen, devProjectId } = useGameStore.getState();
    expect(game.projects).toHaveLength(1);
    // El desarrollo ya no es una pantalla: es el modal sobre el estudio.
    expect(screen).toBe('estudio');
    expect(devProjectId).toBe(game.projects[0].id);
  });

  it('un cambio de fase pausa el juego y reabre la ventana de desarrollo (Fase 8.5)', () => {
    useGameStore.getState().startProject(CONCEPT);
    // "Continuar desarrollo": la ventana cierra y el mundo echa a andar.
    useGameStore.getState().continueDev();
    expect(useGameStore.getState().devProjectId).toBeNull();
    expect(useGameStore.getState().speed).toBe(1);

    useGameStore.getState().advanceWeek();
    useGameStore.getState().advanceWeek(); // el proyecto pequeño entra en Producción

    const { game, speed, devProjectId } = useGameStore.getState();
    expect(game.projects[0].phase).toBe(2);
    // El hito para el reloj y devuelve la ventana con la fase nueva cargada.
    expect(speed).toBe(0);
    expect(devProjectId).toBe(game.projects[0].id);
  });

  it('al lanzarse un juego pausa y navega a la reseña', () => {
    useGameStore.getState().startProject(CONCEPT);
    for (let i = 0; i < 6; i++) useGameStore.getState().advanceWeek();

    const { game, screen, reviewGameId, speed, devProjectId } = useGameStore.getState();
    expect(game.releasedGames).toHaveLength(1);
    expect(screen).toBe('resena');
    expect(reviewGameId).toBe(game.releasedGames[0].id);
    expect(speed).toBe(0);
    // El juego ya está en la calle: su ventana de desarrollo no queda colgando.
    expect(devProjectId).toBeNull();
  });

  it('la bancarrota pausa el juego', () => {
    const base = createInitialState(SEED);
    useGameStore.setState({
      game: { ...base, studio: { ...base.studio, capital: 0 } },
    });
    useGameStore.getState().setSpeed(1);
    for (let i = 0; i < balance.economy.bankruptcyGraceWeeks; i++) {
      useGameStore.getState().advanceWeek();
    }
    const { game, speed } = useGameStore.getState();
    expect(game.gameOver).not.toBeNull();
    expect(speed).toBe(0);
  });
});

/** Estado con un juego ya lanzado (vía el flujo real del núcleo). */
function stateWithReleasedGame(): GameState {
  let s = startProject(createInitialState(SEED), CONCEPT);
  for (let i = 0; i < 12 && s.releasedGames.length === 0; i++) s = tick(s);
  return s;
}

describe('avisos importantes de dos niveles (docs/17 U4)', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().setSpeed(0);
    useGameStore.setState({
      game: createInitialState(SEED),
      speed: 0,
      pendingNotices: [],
      screen: 'estudio',
    });
  });

  afterEach(() => {
    useGameStore.getState().setSpeed(0);
    vi.useRealTimers();
  });

  it('un juego que sale del mercado encola un aviso con su P&L y pausa', () => {
    const base = stateWithReleasedGame();
    const game = base.releasedGames[0];
    // Envejecemos el juego para que sus ventas caigan bajo el umbral este tick.
    const old = { ...game, releaseWeek: base.week - 400, salesActive: true };
    useGameStore.setState({
      game: { ...base, projects: [], releasedGames: [old] },
      speed: 1,
      pendingNotices: [],
    });

    useGameStore.getState().advanceWeek();

    const { game: after, pendingNotices, speed } = useGameStore.getState();
    expect(after.releasedGames[0].salesActive).toBe(false);
    const notice = pendingNotices.find((n) => n.kind === 'marketExit');
    expect(notice).toMatchObject({
      kind: 'marketExit',
      gameId: old.id,
      revenue: old.totalRevenue,
      cost: old.cost,
    });
    expect(speed).toBe(0);
  });

  it('la primera semana en números rojos encola un aviso de bancarrota', () => {
    const base = createInitialState(SEED);
    // Caja mínima: los costes fijos la dejan en negativo este tick.
    useGameStore.setState({
      game: { ...base, studio: { ...base.studio, capital: 50 } },
      pendingNotices: [],
    });

    useGameStore.getState().advanceWeek();

    const { game, pendingNotices } = useGameStore.getState();
    expect(game.negativeWeeks).toBe(1);
    expect(game.gameOver).toBeNull();
    expect(pendingNotices.some((n) => n.kind === 'bankruptcyWarning')).toBe(true);
  });

  it('subir de etapa de escala encola un aviso', () => {
    const base = createInitialState(SEED);
    useGameStore.setState({
      game: {
        ...base,
        studio: {
          ...base.studio,
          capital: balance.staff.scale.stage2CapitalThreshold + 10_000,
        },
      },
      pendingNotices: [],
    });

    useGameStore.getState().advanceWeek();

    const { game, pendingNotices } = useGameStore.getState();
    expect(game.studio.scaleStage).toBe(2);
    const notice = pendingNotices.find((n) => n.kind === 'scaleUp');
    expect(notice).toMatchObject({ kind: 'scaleUp', stage: 2 });
  });

  it('una renuncia encola un aviso importante', () => {
    const base = createInitialState(SEED);
    const founder = base.staff[0];
    // Un empleado hundido (no fundador) acaba renunciando; caja de sobra para
    // que no se cuele un aviso de bancarrota.
    const miserable = {
      ...createFounder(SEED),
      id: 'triste',
      name: 'Triste',
      founder: false,
      salary: 500,
      morale: 0,
      loyalty: 0,
      energy: 0,
    };
    useGameStore.setState({
      game: {
        ...base,
        studio: { ...base.studio, capital: 1_000_000, scaleStage: 2 },
        staff: [founder, miserable],
      },
      pendingNotices: [],
    });

    let guard = 0;
    while (useGameStore.getState().game.staff.length > 1 && guard < 80) {
      useGameStore.getState().advanceWeek();
      guard += 1;
    }

    expect(useGameStore.getState().game.staff).toHaveLength(1);
    expect(useGameStore.getState().pendingNotices.some((n) => n.kind === 'staffLeft')).toBe(true);
  });

  it('un despido no encola aviso (es acción del jugador, no sorpresa)', () => {
    const base = createInitialState(SEED);
    const founder = base.staff[0];
    const hire = {
      ...createFounder(SEED),
      id: 'contratado',
      name: 'Contratado',
      founder: false,
      salary: 500,
    };
    useGameStore.setState({
      game: {
        ...base,
        studio: { ...base.studio, capital: 1_000_000, scaleStage: 2 },
        staff: [founder, hire],
      },
      pendingNotices: [],
    });

    useGameStore.getState().fire('contratado');

    expect(useGameStore.getState().game.staff).toHaveLength(1);
    expect(useGameStore.getState().pendingNotices).toHaveLength(0);
  });

  it('dismissNotice drena la cola de uno en uno', () => {
    useGameStore.setState({
      pendingNotices: [
        { id: 1, kind: 'bankruptcyWarning', graceWeeks: 8 },
        { id: 2, kind: 'scaleUp', stage: 2, stageName: 'Estudio pequeño' },
      ],
    });

    useGameStore.getState().dismissNotice();
    expect(useGameStore.getState().pendingNotices.map((n) => n.id)).toEqual([2]);

    useGameStore.getState().dismissNotice();
    expect(useGameStore.getState().pendingNotices).toHaveLength(0);
  });

  describe('Fase 8.5 — modales de concepción y menú (docs/17 U2–U3)', () => {
    it('openConception pausa el tiempo (docs/02 §1: ninguna decisión con el reloj corriendo)', () => {
      useGameStore.getState().setSpeed(4);
      useGameStore.getState().openConception();

      expect(useGameStore.getState().conceptionOpen).toBe(true);
      expect(useGameStore.getState().speed).toBe(0);
    });

    it('startProject cierra la concepción y abre el desarrollo, en pausa', () => {
      useGameStore.getState().openConception();
      useGameStore.getState().startProject({ ...CONCEPT, price: 30 });

      const s = useGameStore.getState();
      expect(s.conceptionOpen).toBe(false);
      expect(s.devProjectId).toBe(s.game.projects[0].id);
      expect(s.speed).toBe(0);
      expect(s.game.projects).toHaveLength(1);
    });

    it('closeConception cierra sin crear nada', () => {
      useGameStore.getState().openConception();
      useGameStore.getState().closeConception();

      expect(useGameStore.getState().conceptionOpen).toBe(false);
      expect(useGameStore.getState().game.projects).toHaveLength(0);
    });

    it('los modales del menú se abren y cierran sin tocar el tiempo', () => {
      useGameStore.getState().setSpeed(2);
      useGameStore.getState().openMenuModal('juegos');

      expect(useGameStore.getState().menuModal).toBe('juegos');
      // A diferencia de los avisos importantes (U4), estos no interrumpen.
      expect(useGameStore.getState().speed).toBe(2);

      useGameStore.getState().closeMenuModal();
      expect(useGameStore.getState().menuModal).toBeNull();
      useGameStore.getState().setSpeed(0);
    });

    it('empezar o cargar partida no deja modales abiertos de la anterior', () => {
      useGameStore.getState().openConception();
      useGameStore.getState().openMenuModal('partida');
      useGameStore.setState({ devProjectId: 'lo-que-sea' });
      useGameStore.getState().newGame(SEED);

      expect(useGameStore.getState().conceptionOpen).toBe(false);
      expect(useGameStore.getState().menuModal).toBeNull();
      expect(useGameStore.getState().devProjectId).toBeNull();

      useGameStore.getState().saveGame();
      useGameStore.getState().openMenuModal('historial');
      expect(useGameStore.getState().loadGame()).toBe(true);
      expect(useGameStore.getState().menuModal).toBeNull();
    });
  });
});
