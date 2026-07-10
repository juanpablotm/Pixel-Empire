import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createInitialState } from '../core';
import { balance } from '../data/balance';
import { useGameStore } from '../state/store';
import { App } from './App';

const SEED = 7;

describe('App — la UI solo muestra estado y despacha acciones (docs/08 §6)', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().setSpeed(0);
    useGameStore.setState({ game: createInitialState(SEED), speed: 0 });
  });

  afterEach(() => {
    useGameStore.getState().setSpeed(0);
    cleanup();
  });

  it('muestra semana, era y capital iniciales', () => {
    render(<App />);
    expect(screen.getByText('Semana')).toBeInTheDocument();
    expect(screen.getByText(String(balance.time.startWeek))).toBeInTheDocument();
    expect(screen.getByText(balance.time.startEra)).toBeInTheDocument();
    expect(
      screen.getByText(`${balance.economy.initialCapital.toLocaleString('es-ES')} 💰`),
    ).toBeInTheDocument();
  });

  it('el botón "+1 semana" avanza la semana en pantalla', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '+1 semana' }));
    fireEvent.click(screen.getByRole('button', { name: '+1 semana' }));
    expect(
      screen.getByText(String(balance.time.startWeek + 2)),
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

  it('guardar y cargar funcionan desde la UI', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '+1 semana' }));
    fireEvent.click(screen.getByRole('button', { name: '💾 Guardar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Partida guardada.');

    fireEvent.click(screen.getByRole('button', { name: '✨ Nueva partida' }));
    fireEvent.click(screen.getByRole('button', { name: '📂 Cargar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Partida cargada.');
    expect(
      screen.getByText(String(balance.time.startWeek + 1)),
    ).toBeInTheDocument();
  });
});
