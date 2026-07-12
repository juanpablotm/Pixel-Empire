import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, generateCandidates } from '../core';
import { balance } from '../data/balance';
import { useGameStore } from '../state/store';
import { App } from './App';

const SEED = 7;

function resetStore() {
  useGameStore.getState().setSpeed(0);
  useGameStore.setState({
    game: createInitialState(SEED),
    speed: 0,
    screen: 'estudio',
    reviewGameId: null,
    colorTheme: 'dark',
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

  it('el medidor de Fit reacciona en vivo al concepto, sin exponer el número (docs/03)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Nuevo juego/ }));

    // Por defecto: Fantasía × RPG en PC Casero para público Amplio → verde.
    expect(screen.getByRole('status', { name: 'Fit: Encaje prometedor' })).toBeInTheDocument();

    // Deportes × RPG para Infantil → rojo. (El nombre incluye la flecha de tendencia.)
    fireEvent.click(screen.getByRole('button', { name: /Deportes/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Infantil' }));
    expect(screen.getByRole('status', { name: 'Fit: Mal encaje' })).toBeInTheDocument();
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
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByRole('button', { name: '+1 semana' }));
    }

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
    fireEvent.click(screen.getByRole('button', { name: '+1 semana' }));
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
    expect(arrows.length).toBeGreaterThanOrEqual(10); // 4 géneros + 6 temas
    // Plataformas con su etapa de ciclo de vida y base instalada.
    expect(screen.getByText('Commo 64')).toBeInTheDocument();
    expect(screen.getAllByText(/uds\/sem/).length).toBeGreaterThanOrEqual(2);
    // Sin lanzamientos similares todavía: nada saturado.
    expect(screen.getByText(/mercado tiene hambre/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver al estudio' }));
    expect(screen.getByRole('button', { name: /Nuevo juego/ })).toBeInTheDocument();
  });

  it('la pantalla de desarrollo muestra el Manómetro de Hype (docs/10 §7.5)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Nuevo juego/ }));
    fireEvent.change(screen.getByLabelText('Nombre del juego'), {
      target: { value: 'Hype Machine' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Empezar desarrollo' }));

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

  it('la pantalla de desarrollo muestra el factor de equipo y permite activar el crunch', () => {
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
    for (let i = 0; i < balance.economy.bankruptcyGraceWeeks; i++) {
      fireEvent.click(screen.getByRole('button', { name: '+1 semana' }));
    }
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

  it('guardar y cargar funcionan desde la pantalla del estudio', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '+1 semana' }));
    fireEvent.click(screen.getByRole('button', { name: '💾 Guardar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Partida guardada.');

    fireEvent.click(screen.getByRole('button', { name: '✨ Nueva partida' }));
    fireEvent.click(screen.getByRole('button', { name: '📂 Cargar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Partida cargada.');
    expect(screen.getByText('Semana 2 · 1980')).toBeInTheDocument();
  });
});
