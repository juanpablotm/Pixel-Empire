import { useGameStore } from '../state/store';
import { CrisisModal } from './components/CrisisModal';
import { DilemmaModal } from './components/DilemmaModal';
import { GameOverOverlay } from './components/GameOverOverlay';
import { Hud } from './components/Hud';
import { ConceptionScreen } from './screens/ConceptionScreen';
import { CreatorsScreen } from './screens/CreatorsScreen';
import { DevelopmentScreen } from './screens/DevelopmentScreen';
import { FinancesScreen } from './screens/FinancesScreen';
import { LegacyScreen } from './screens/LegacyScreen';
import { MarketScreen } from './screens/MarketScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { StudioScreen } from './screens/StudioScreen';
import { TeamScreen } from './screens/TeamScreen';

/**
 * Raíz de la UI de las Fases 1–5: HUD persistente + la pantalla activa
 * (estudio / concepción / desarrollo / reseña / equipo / mercado / creadores /
 * finanzas / legado; docs/10 §10.1–10.10) + los overlays sociales (crisis con
 * reloj y dilemas). Solo lee estado con selectores finos y despacha acciones
 * (docs/08 §6).
 */
export function App() {
  const screen = useGameStore((s) => s.screen);
  const seed = useGameStore((s) => s.game.seed);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Hud />

      {screen === 'estudio' && <StudioScreen />}
      {screen === 'concepcion' && <ConceptionScreen />}
      {screen === 'desarrollo' && <DevelopmentScreen />}
      {screen === 'resena' && <ReviewScreen />}
      {screen === 'equipo' && <TeamScreen />}
      {screen === 'mercado' && <MarketScreen />}
      {screen === 'creadores' && <CreatorsScreen />}
      {screen === 'finanzas' && <FinancesScreen />}
      {screen === 'legado' && <LegacyScreen />}

      {/* La capa social interrumpe cuando toca decidir (docs/07 §4–§5). */}
      <DilemmaModal />
      <CrisisModal />
      <GameOverOverlay />

      <footer className="border-t border-slate-800 px-6 py-3 text-xs text-slate-500">
        Fase 5 — Comunidad y streamers · semilla {seed}
      </footer>
    </div>
  );
}
