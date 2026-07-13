import { useGameStore } from '../state/store';
import { AwardsModal } from './components/AwardsModal';
import { CrisisModal } from './components/CrisisModal';
import { DilemmaModal } from './components/DilemmaModal';
import { EraTransition } from './components/EraTransition';
import { GameOverOverlay } from './components/GameOverOverlay';
import { Hud } from './components/Hud';
import { MoralTint } from './components/MoralScale';
import { ConceptionScreen } from './screens/ConceptionScreen';
import { CreatorsScreen } from './screens/CreatorsScreen';
import { DevelopmentScreen } from './screens/DevelopmentScreen';
import { FinancesScreen } from './screens/FinancesScreen';
import { LegacyScreen } from './screens/LegacyScreen';
import { MarketScreen } from './screens/MarketScreen';
import { ResearchScreen } from './screens/ResearchScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { StudioScreen } from './screens/StudioScreen';
import { TeamScreen } from './screens/TeamScreen';
import { EraSkinProvider } from './theme/EraSkinProvider';

/**
 * Raíz de la UI de las Fases 1–6: HUD persistente + la pantalla activa
 * (docs/10 §10.1–10.10) + los overlays (crisis, dilemas, transición de era,
 * gala de premios, game over), todo envuelto en la piel de la era actual
 * (docs/10 §8). Solo lee estado con selectores finos y despacha acciones
 * (docs/08 §6).
 */
export function App() {
  const screen = useGameStore((s) => s.screen);
  const seed = useGameStore((s) => s.game.seed);
  const modernUi = useGameStore((s) => s.modernUi);
  const setModernUi = useGameStore((s) => s.setModernUi);
  const colorTheme = useGameStore((s) => s.colorTheme);
  const setColorTheme = useGameStore((s) => s.setColorTheme);

  return (
    <EraSkinProvider>
      <div className="flex min-h-screen flex-col bg-app text-ink">
        <Hud />

        {screen === 'estudio' && <StudioScreen />}
        {screen === 'concepcion' && <ConceptionScreen />}
        {screen === 'desarrollo' && <DevelopmentScreen />}
        {screen === 'resena' && <ReviewScreen />}
        {screen === 'equipo' && <TeamScreen />}
        {screen === 'mercado' && <MarketScreen />}
        {screen === 'creadores' && <CreatorsScreen />}
        {screen === 'investigacion' && <ResearchScreen />}
        {screen === 'finanzas' && <FinancesScreen />}
        {screen === 'legado' && <LegacyScreen />}

        {/* La conciencia tiñe la interfaz (docs/10 §7.4): bajo los modales. */}
        <MoralTint />

        {/* La capa social interrumpe cuando toca decidir (docs/07 §4–§5). */}
        <DilemmaModal />
        <CrisisModal />
        {/* Los beats de la Fase 6: el mundo cambia y la gala anual (docs/10 §7.6). */}
        <EraTransition />
        <AwardsModal />
        <GameOverOverlay />

        <footer className="flex flex-wrap items-center gap-x-4 border-t border-line px-6 py-3 text-xs text-ink-faint">
          <span>Fase 7B+7C — oficina viva y momentos señal · semilla {seed}</span>
          <label
            className="ml-auto flex items-center gap-1.5"
            title="Tema claro de la interfaz (con las pieles de era manda la piel)"
          >
            <input
              type="checkbox"
              checked={colorTheme === 'light'}
              onChange={(e) => setColorTheme(e.target.checked ? 'light' : 'dark')}
              className="accent-action-hi"
            />
            Modo claro
          </label>
          <label className="flex items-center gap-1.5" title="Desactiva las pieles de era (docs/10 §8)">
            <input
              type="checkbox"
              checked={modernUi}
              onChange={(e) => setModernUi(e.target.checked)}
              className="accent-action-hi"
            />
            UI moderna siempre
          </label>
        </footer>
      </div>
    </EraSkinProvider>
  );
}
