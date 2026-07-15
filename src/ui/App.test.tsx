import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createInitialState,
  generateCandidates,
  startProject,
  type Employee,
  type ReleasedGame,
} from '../core';
import { balance } from '../data/balance';
import { defaultMonetization } from '../data/monetization';
import { platforms } from '../data/platforms';
import { useGameStore } from '../state/store';
import { App } from './App';

const SEED = 7;

/**
 * Avanza N semanas. Desde la Fase 8.5 la UI no tiene "+1 semana": el reloj se
 * gobierna con la velocidad, así que los tests despachan la acción del store.
 */
function advanceWeeks(n: number) {
  act(() => {
    for (let i = 0; i < n; i++) useGameStore.getState().advanceWeek();
  });
}

/** Abre una entrada del menú de la barra superior (docs/17 U2). */
function openMenu(entry: string) {
  fireEvent.click(screen.getByRole('button', { name: '☰ Menú' }));
  fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(entry) }));
}

function resetStore() {
  useGameStore.getState().setSpeed(0);
  useGameStore.setState({
    game: createInitialState(SEED),
    speed: 0,
    // Los tests de partida entran directos al juego; el título tiene los suyos.
    appMode: 'game',
    sessionActive: true,
    tutorialStep: null,
    screen: 'estudio',
    conceptionOpen: false,
    menuModal: null,
    reviewGameId: null,
    eraTransition: null,
    awardsWeek: null,
    modernUi: false,
    colorTheme: 'dark',
    reduceMotion: false,
  });
}

describe('App — la UI solo muestra estado y despacha acciones (docs/08 §6)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  afterEach(() => {
    useGameStore.getState().setSpeed(0);
    cleanup();
  });

  it('muestra el HUD con fecha, era y capital iniciales', () => {
    render(<App />);
    expect(screen.getByText('Semana 1 · 1980')).toBeInTheDocument();
    // Desde Fase 6 la era se muestra con su nombre (docs/02 §5).
    expect(screen.getByText(/La chispa/)).toBeInTheDocument();
    expect(
      screen.getByText(`${balance.economy.initialCapital.toLocaleString('es-ES')} 💰`),
    ).toBeInTheDocument();
  });

  it('los controles de velocidad marcan la opción activa', () => {
    render(<App />);
    const pause = screen.getByRole('button', { name: '⏸ Pausa' });
    const x2 = screen.getByRole('button', { name: '▶▶ x2' });

    expect(pause).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(x2);
    expect(x2).toHaveAttribute('aria-pressed', 'true');
    expect(pause).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(pause); // dejarlo pausado para no filtrar timers
  });

  it('el Fit empieza oculto y, tras investigarlo, reacciona en vivo sin exponer el número (docs/03, docs/17 P2)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Nuevo juego/ }));

    // TODO empieza oculto (docs/17 P2): el pronóstico se gana, no se regala.
    expect(screen.getByRole('status', { name: 'Fit: Encaje por descubrir' })).toBeInTheDocument();

    // Al investigar la Red de afinidades el medidor se enciende: la UI solo lee
    // el estado del núcleo (docs/08 §6). Fantasía × RPG en PC Casero para
    // público Amplio → verde.
    act(() => {
      useGameStore.setState((s) => ({
        game: { ...s.game, research: { ...s.game.research, unlocked: ['redAfinidades'] } },
      }));
    });
    expect(screen.getByRole('status', { name: 'Fit: Encaje prometedor' })).toBeInTheDocument();

    // Y reacciona al concepto, sin exponer el número: Fantasía × Puzzle para
    // Infantil baja el encaje. El género se elige con selector desde la 8.5.
    fireEvent.change(screen.getByLabelText('Género'), { target: { value: 'puzzle' } });
    fireEvent.click(screen.getByRole('button', { name: 'Infantil' }));
    expect(screen.getByRole('status', { name: 'Fit: Encaje dudoso' })).toBeInTheDocument();
  });

  it('criterio de cierre de Fase 1: fundar → concebir → desarrollar → reseña descompuesta → vender → repetir', () => {
    render(<App />);

    // 1. Concepción: el botón no se activa sin nombre.
    fireEvent.click(screen.getByRole('button', { name: /Nuevo juego/ }));
    const startButton = screen.getByRole('button', { name: 'Empezar desarrollo' });
    expect(startButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Nombre del juego'), {
      target: { value: 'Mazmorras del Alba' },
    });
    expect(startButton).toBeEnabled();
    fireEvent.click(startButton);

    // 2. Desarrollo: fase de Concepto con sliders; mover uno re-normaliza el reparto.
    expect(screen.getByText(/Reparto de esfuerzo — fase de Concepto/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Esfuerzo en Historia'), { target: { value: '100' } });
    expect(screen.getByText('60 %')).toBeInTheDocument(); // 1/3, 1/3, 1 → 20/20/60
    fireEvent.change(screen.getByLabelText('Esfuerzo en Historia'), {
      target: { value: '33' },
    });

    // 3. Seis semanas después (proyecto pequeño), el juego se lanza solo.
    advanceWeeks(6);

    // 4. Pantalla de reseña: nota media + segmentos + desglose de 6 factores (docs/03 §5, docs/04 §5).
    expect(screen.getByText('Reseña media')).toBeInTheDocument();
    expect(screen.getByText('Crítica')).toBeInTheDocument();
    expect(screen.getByText('Hardcore')).toBeInTheDocument();
    const breakdown = screen.getByText('Por qué esta nota').closest('section');
    expect(breakdown).not.toBeNull();
    expect(within(breakdown as HTMLElement).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText('Contenido escaso')).toBeInTheDocument(); // sin features → ✘
    const game = useGameStore.getState().game.releasedGames[0];
    expect(game.lines.map((l) => l.factor)).toEqual([
      'fit',
      'balance',
      'features',
      'polish',
      'team',
      'innovation',
    ]);

    // 5. De vuelta al estudio: el juego vende y se puede repetir el bucle.
    fireEvent.click(screen.getByRole('button', { name: 'Volver al estudio' }));
    expect(screen.getByText(`Reseña ${game.review}/100`)).toBeInTheDocument();
    advanceWeeks(1);
    const updated = useGameStore.getState().game.releasedGames[0];
    expect(updated.totalUnits).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Nuevo juego/ })).toBeInTheDocument();
  });

  it('el panel de tendencias muestra dirección por género/tema y plataformas (docs/10 §10.7)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Ver tendencias/ }));

    expect(screen.getByText('Mercado y tendencias')).toBeInTheDocument();
    // Cada género y tema lleva su flecha ↑→↓ (docs/04 §2).
    const arrows = screen.getAllByRole('img', { name: /subiendo|estable|bajando/ });
    // 4 géneros + los 7 temas de E1 (usables + por investigar, docs/17 P1).
    expect(arrows.length).toBeGreaterThanOrEqual(10);
    // Plataformas con su etapa de ciclo de vida y base instalada.
    expect(screen.getByText('Commo 64')).toBeInTheDocument();
    expect(screen.getAllByText(/uds\/sem/).length).toBeGreaterThanOrEqual(2);
    // Sin lanzamientos similares todavía: nada saturado.
    expect(screen.getByText(/mercado tiene hambre/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver al estudio' }));
    expect(screen.getByRole('button', { name: /Nuevo juego/ })).toBeInTheDocument();
  });

  it('el Manómetro de Hype aparece al llegar a Producción, no antes (docs/10 §7.5)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Nuevo juego/ }));
    fireEvent.change(screen.getByLabelText('Nombre del juego'), {
      target: { value: 'Hype Machine' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Empezar desarrollo' }));

    // En Concepto todavía no hay nada que anunciar (Fase 8.5).
    expect(screen.queryByRole('meter', { name: 'Hype' })).not.toBeInTheDocument();
    expect(screen.getByText(/las campañas abren en la fase de Producción/i)).toBeInTheDocument();

    // Dos semanas después el proyecto entra en Producción: el hito reabre la
    // ventana y ya sí hay manómetro.
    advanceWeeks(2);
    expect(useGameStore.getState().game.projects[0].phase).toBe(2);
    const gauge = screen.getByRole('meter', { name: 'Hype' });
    expect(gauge).toHaveAttribute('aria-valuenow', '0');
  });

  it('la pantalla de equipo muestra al fundador y el pool bloqueado en el garaje (docs/10 §10.6)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Ver equipo/ }));

    expect(screen.getByLabelText('Empleado Fundador')).toBeInTheDocument();
    expect(screen.getByText(/para mudarte a una oficina pequeña/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver al estudio' }));
    expect(screen.getByRole('button', { name: /Nuevo juego/ })).toBeInTheDocument();
  });

  it('en el estudio pequeño se puede contratar desde el pool de candidatos', () => {
    const base = createInitialState(SEED);
    useGameStore.setState({
      game: {
        ...base,
        studio: { ...base.studio, capital: 30_000, scaleStage: 2 },
        candidates: generateCandidates(SEED, 1),
      },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Ver equipo/ }));

    const hireButtons = screen.getAllByRole('button', { name: 'Contratar' });
    expect(hireButtons).toHaveLength(balance.staff.candidates.poolSize);
    fireEvent.click(hireButtons[0]);

    const { game } = useGameStore.getState();
    expect(game.staff).toHaveLength(2);
    expect(game.candidates).toHaveLength(balance.staff.candidates.poolSize - 1);
    expect(screen.getByLabelText(`Empleado ${game.staff[1].name}`)).toBeInTheDocument();
  });

  it('con la oficina llena, el botón de contratar se deshabilita con motivo visible (docs/17 B1)', () => {
    const base = createInitialState(SEED);
    const cap = balance.staff.scale.staffCapByStage[2]; // aforo del estudio pequeño
    const fillers: Employee[] = Array.from({ length: cap - 1 }, (_, i) => ({
      id: `relleno-${i}`,
      name: `Relleno ${i}`,
      avatarSeed: `relleno-${i}`,
      specialty: 'tecnica',
      skills: { diseno: 30, tecnica: 50, arte: 30, audio: 30, marketing: 20 },
      traits: [],
      morale: 70,
      energy: 90,
      loyalty: 60,
      salary: 500,
      level: 2,
      xp: 0,
      founder: false,
      burnedOut: false,
      weeksLowEnergy: 0,
    }));
    useGameStore.setState({
      game: {
        ...base,
        studio: { ...base.studio, capital: 100_000, scaleStage: 2 },
        staff: [...base.staff, ...fillers],
        candidates: generateCandidates(SEED, 1),
      },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Ver equipo/ }));

    // El motivo es visible (texto en pantalla, no solo un tooltip).
    expect(screen.getAllByText(/Oficina llena — mejórala/).length).toBeGreaterThan(0);
    // Y ningún botón de contratar queda activo.
    for (const btn of screen.getAllByRole('button', { name: 'Contratar' })) {
      expect(btn).toBeDisabled();
    }
  });

  it('la ventana de desarrollo muestra el factor de equipo y permite activar el crunch', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Nuevo juego/ }));
    fireEvent.change(screen.getByLabelText('Nombre del juego'), {
      target: { value: 'Crunch Simulator' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Empezar desarrollo' }));

    expect(screen.getByText('Equipo asignado')).toBeInTheDocument();
    expect(screen.getByText('Factor de equipo')).toBeInTheDocument();

    const crunchButton = screen.getByRole('button', { name: 'Activar crunch' });
    fireEvent.click(crunchButton);
    expect(useGameStore.getState().game.projects[0].crunch).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Crunch activo — desactivar' }),
    ).toBeInTheDocument();
  });

  it('la bancarrota muestra el fin de partida y permite empezar de nuevo', () => {
    const base = createInitialState(SEED);
    useGameStore.setState({
      game: { ...base, studio: { ...base.studio, capital: 0 } },
    });
    render(<App />);
    advanceWeeks(balance.economy.bankruptcyGraceWeeks);
    const dialog = screen.getByRole('alertdialog', { name: 'Fin de la partida' });
    expect(within(dialog).getByText('Bancarrota')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: '✨ Nueva partida' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('el toggle claro/oscuro estampa data-theme en la raíz (Fase 7A)', () => {
    const { container } = render(<App />);
    const root = container.querySelector('.era-skin');
    expect(root).toHaveAttribute('data-theme', 'dark');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Modo claro' }));
    expect(root).toHaveAttribute('data-theme', 'light');
  });

  it('la piel de la UI sigue a la era y "UI moderna siempre" fuerza la flat E5 (Fase 7E, docs/10 §8)', () => {
    const base = createInitialState(SEED);
    useGameStore.setState({ game: { ...base, era: 'E6' } });
    const { container } = render(<App />);
    const root = container.querySelector('.era-skin');
    expect(root).toHaveClass('era-E6');

    fireEvent.click(screen.getByRole('checkbox', { name: 'UI moderna siempre' }));
    expect(root).toHaveClass('era-E5');
    expect(localStorage.getItem('pixel-empire:modern-ui')).toBe('true');

    fireEvent.click(screen.getByRole('checkbox', { name: 'UI moderna siempre' }));
    expect(root).toHaveClass('era-E6');
  });

  it('el beat de era anuncia sobre la piel vieja y la transforma al entrar (Fase 7E, docs/10 §7.6)', () => {
    const base = createInitialState(SEED);
    // El tick ya cambió de era (E1→E2) y dejó el beat pendiente (store).
    useGameStore.setState({ game: { ...base, era: 'E2' }, eraTransition: 'E2' });
    const { container } = render(<App />);

    // Acto 1: el overlay anuncia la nueva era, pero la piel sigue siendo E1.
    const root = container.querySelector('.era-skin');
    expect(root).toHaveClass('era-E1');
    const dialog = screen.getByRole('dialog', { name: 'Nueva era: Las consolas' });
    expect(within(dialog).getByText(/Nueva era ·/)).toBeInTheDocument();
    expect(within(dialog).getByText(/empieza la era de los cartuchos/)).toBeInTheDocument();

    // Acto 2: al entrar, el overlay se cierra y la piel se transforma a E2.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Entrar en la nueva era' }));
    expect(screen.queryByRole('dialog', { name: /Nueva era/ })).not.toBeInTheDocument();
    expect(root).toHaveClass('era-E2');
  });

  it('el toggle "Reducir animaciones" estampa data-motion y persiste (Fase 7D, docs/10 §4.3)', () => {
    const { container } = render(<App />);
    const root = container.querySelector('.era-skin');
    expect(root).toHaveAttribute('data-motion', 'full');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Reducir animaciones' }));
    expect(root).toHaveAttribute('data-motion', 'reduced');
    expect(localStorage.getItem('pixel-empire:reduce-motion')).toBe('true');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Reducir animaciones' }));
    expect(root).toHaveAttribute('data-motion', 'full');
    expect(localStorage.getItem('pixel-empire:reduce-motion')).toBe('false');
  });

  it('los eventos nuevos del historial aparecen como toast descartable (Fase 7D, docs/10 §6)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Nuevo juego/ }));
    fireEvent.change(screen.getByLabelText('Nombre del juego'), {
      target: { value: 'Toast Quest' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Empezar desarrollo' }));

    // El evento 'proyecto' del historial se notifica sin interrumpir.
    const toast = screen.getByText(/Empieza el desarrollo de «Toast Quest»/);
    expect(toast).toBeInTheDocument();

    // Clic para descartar.
    fireEvent.click(toast.closest('button') as HTMLElement);
    expect(screen.queryByText(/Empieza el desarrollo de «Toast Quest»/)).not.toBeInTheDocument();
  });

  it('la app arranca en el título; Nueva partida entra al juego con el tutorial (Fase 7F)', () => {
    useGameStore.setState({ appMode: 'title', sessionActive: false });
    render(<App />);

    // La marca de brand/ y el menú con identidad (docs/13 7F).
    expect(screen.getByRole('heading', { name: /pixel empire/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Emblema Pixel Empire' })).toBeInTheDocument();
    // Sin guardado en este navegador, Cargar se ofrece pero deshabilitado.
    expect(screen.getByRole('button', { name: '📂 Cargar partida' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '✨ Nueva partida' }));
    expect(screen.getByText('Semana 1 · 1980')).toBeInTheDocument();

    // Primera partida del navegador: el tutorial autoarranca (docs/10 §13)...
    expect(useGameStore.getState().tutorialStep).toBe(0);
    expect(screen.getByText('Bienvenido al garaje')).toBeInTheDocument();

    // ...y es saltable; una vez saltado no vuelve a autoarrancar.
    fireEvent.click(screen.getByRole('button', { name: 'Saltar tutorial' }));
    expect(useGameStore.getState().tutorialStep).toBeNull();
    expect(localStorage.getItem('pixel-empire:onboarding-done')).toBe('true');
  });

  it('el tutorial avanza al hacer la acción real sobre la UI, no al leer (Fase 7F)', () => {
    useGameStore.setState({ tutorialStep: 1 }); // paso "nuevo-juego"
    render(<App />);
    expect(screen.getByText('Todo empieza con una idea')).toBeInTheDocument();

    // La guía no bloquea: el clic cae en el botón REAL del estudio y el paso
    // avanza porque el estado cambió, no por un "siguiente".
    fireEvent.click(screen.getByRole('button', { name: /Nuevo juego/ }));
    expect(useGameStore.getState().tutorialStep).toBe(2);
    expect(screen.getByText('El Fit está por descubrir')).toBeInTheDocument();
  });

  it('Volver al título pausa la partida y Continuar la retoma (Fase 7F)', () => {
    render(<App />);
    advanceWeeks(1);
    // Las opciones de partida viven en el menú de la barra (docs/17 U2).
    openMenu('💾 Partida');
    fireEvent.click(screen.getByRole('button', { name: '🏠 Volver al título' }));

    expect(useGameStore.getState().speed).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '▶ Continuar' }));
    expect(screen.getByText('Semana 2 · 1980')).toBeInTheDocument();
  });

  it('guardar y cargar funcionan desde el modal de Partida (docs/17 U2)', () => {
    render(<App />);
    advanceWeeks(1);
    openMenu('💾 Partida');
    fireEvent.click(screen.getByRole('button', { name: '💾 Guardar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Partida guardada.');

    // Empezar de cero cierra el modal: se aterriza en el estudio nuevo.
    fireEvent.click(screen.getByRole('button', { name: '✨ Nueva partida' }));
    expect(screen.queryByRole('dialog', { name: 'Partida' })).not.toBeInTheDocument();
    expect(screen.getByText('Semana 1 · 1980')).toBeInTheDocument();

    // Cargar también cierra: la confirmación es ver la partida de vuelta.
    openMenu('💾 Partida');
    fireEvent.click(screen.getByRole('button', { name: '📂 Cargar' }));
    expect(screen.queryByRole('dialog', { name: 'Partida' })).not.toBeInTheDocument();
    expect(screen.getByText('Semana 2 · 1980')).toBeInTheDocument();
  });

  describe('Fase 8.5 — pantalla principal limpia y creación en modal (docs/17 U2–U3)', () => {
    /** Un juego lanzado listo para la estantería, con su cola de ventas. */
    function releasedGame(patch: Partial<ReleasedGame>): ReleasedGame {
      const base = createInitialState(SEED);
      const game = startProject(base, {
        name: 'Retro Quest',
        themeId: 'fantasia',
        genreId: 'rpg',
        platformId: platforms[0].id,
        audience: 'amplio',
        size: 'pequeno',
        price: 30,
        monetization: defaultMonetization(),
      });
      const project = game.projects[0];
      return {
        ...project,
        quality: 70,
        review: 70,
        reviewsBySegment: { critica: 70 },
        reviewMarket: { saturation: 0, trendFit: 0, eraCap: 100, expectation: 0 },
        hypeAtRelease: 0,
        saturationAtRelease: 0,
        verdict: 'Un buen juego.',
        breakdown: {} as ReleasedGame['breakdown'],
        lines: [],
        releaseWeek: 1,
        weeklySales: [100, 80, 60],
        totalUnits: 240,
        totalRevenue: 7_200,
        mtxRevenue: 0,
        salesActive: true,
        ...patch,
      } as ReleasedGame;
    }

    it('la principal solo lista lo que aún se vende; el retirado vive en el menú', () => {
      const base = createInitialState(SEED);
      useGameStore.setState({
        game: {
          ...base,
          projects: [],
          releasedGames: [
            releasedGame({ id: 'vivo', name: 'Sigue Vendiendo', salesActive: true }),
            releasedGame({ id: 'muerto', name: 'Ya Retirado', salesActive: false }),
          ],
        },
      });
      render(<App />);

      // La pantalla principal enseña solo lo vivo, con su mini-gráfico.
      expect(screen.getByText('A la venta')).toBeInTheDocument();
      expect(screen.getByText('Sigue Vendiendo')).toBeInTheDocument();
      expect(screen.queryByText('Ya Retirado')).not.toBeInTheDocument();
      expect(
        screen.getByRole('img', { name: 'Copias por semana de Sigue Vendiendo' }),
      ).toBeInTheDocument();

      // La estantería completa está a un clic, en el modal del menú.
      openMenu('🕹️ Juegos lanzados');
      const dialog = screen.getByRole('dialog', { name: 'Juegos lanzados' });
      expect(within(dialog).getByText('Ya Retirado')).toBeInTheDocument();
      expect(within(dialog).getByText('fuera de tiendas')).toBeInTheDocument();
    });

    it('el historial sale de la pantalla y se abre desde el menú', () => {
      render(<App />);
      expect(screen.queryByText('Historial')).not.toBeInTheDocument();

      openMenu('📜 Historial');
      expect(screen.getByRole('dialog', { name: 'Historial' })).toBeInTheDocument();
    });

    it('la concepción es un modal que pausa el tiempo y se cancela sin crear nada', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: '▶ x1' }));

      fireEvent.click(screen.getByRole('button', { name: /Nuevo juego/ }));
      expect(screen.getByRole('dialog', { name: 'Nuevo juego' })).toBeInTheDocument();
      // Abrir la concepción pausa: ninguna decisión con el reloj corriendo.
      expect(useGameStore.getState().speed).toBe(0);

      fireEvent.click(screen.getByRole('button', { name: '✕ Cancelar' }));
      expect(screen.queryByRole('dialog', { name: 'Nuevo juego' })).not.toBeInTheDocument();
      expect(useGameStore.getState().game.projects).toHaveLength(0);
    });

    /** Concebir un juego deja abierta su ventana de desarrollo, en pausa. */
    function conceive(name: string) {
      fireEvent.click(screen.getByRole('button', { name: /Nuevo juego/ }));
      fireEvent.change(screen.getByLabelText('Nombre del juego'), { target: { value: name } });
      fireEvent.click(screen.getByRole('button', { name: 'Empezar desarrollo' }));
    }

    it('el desarrollo se juega por fases: continuar cierra y el fin de fase reabre', () => {
      render(<App />);
      conceive('Pausa y Arranca');

      // 1. Concepción cerrada; la ventana de desarrollo abre en Concepto, en pausa.
      expect(screen.queryByRole('dialog', { name: 'Nuevo juego' })).not.toBeInTheDocument();
      const dev = screen.getByRole('dialog', { name: 'Desarrollo de Pausa y Arranca' });
      expect(within(dev).getByText(/Reparto de esfuerzo — fase de Concepto/)).toBeInTheDocument();
      expect(useGameStore.getState().speed).toBe(0);

      // 2. "Continuar desarrollo" cierra la ventana y pone el mundo a x1: se ve
      //    trabajar a la oficina.
      fireEvent.click(screen.getByRole('button', { name: '▶ Continuar desarrollo' }));
      expect(
        screen.queryByRole('dialog', { name: 'Desarrollo de Pausa y Arranca' }),
      ).not.toBeInTheDocument();
      expect(useGameStore.getState().speed).toBe(1);

      // 3. Al terminar la fase, el reloj para y la ventana vuelve con la fase nueva.
      advanceWeeks(2);
      expect(useGameStore.getState().speed).toBe(0);
      const reopened = screen.getByRole('dialog', { name: 'Desarrollo de Pausa y Arranca' });
      expect(
        within(reopened).getByText(/Reparto de esfuerzo — fase de Producción/),
      ).toBeInTheDocument();

      useGameStore.getState().setSpeed(0); // no filtrar timers al siguiente test
    });

    it('la ventana de desarrollo se cierra sola cuando el juego sale a la calle', () => {
      render(<App />);
      conceive('Se Lanza Solo');

      advanceWeeks(6);
      expect(useGameStore.getState().game.releasedGames).toHaveLength(1);
      expect(useGameStore.getState().devProjectId).toBeNull();
      expect(screen.getByText('Reseña media')).toBeInTheDocument();
    });
  });
});
