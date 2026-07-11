import { useGameStore } from '../state/store';
import { GameOverOverlay } from './components/GameOverOverlay';
import { Hud } from './components/Hud';
import { ConceptionScreen } from './screens/ConceptionScreen';
import { DevelopmentScreen } from './screens/DevelopmentScreen';
import { FinancesScreen } from './screens/FinancesScreen';
import { LegacyScreen } from './screens/LegacyScreen';
import { MarketScreen } from './screens/MarketScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { StudioScreen } from './screens/StudioScreen';
import { TeamScreen } from './screens/TeamScreen';

/**
 * Raíz de la UI de las Fases 1–4: HUD persistente + la pantalla activa
 * (estudio / concepción / desarrollo / reseña / equipo / mercado / finanzas /
 * legado; docs/10 §10.1–10.10). Solo lee estado con selectores finos y
 * despacha acciones (docs/08 §6).
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
      {screen === 'finanzas' && <FinancesScreen />}
      {screen === 'legado' && <LegacyScreen />}

      <GameOverOverlay />

      <footer className="border-t border-slate-800 px-6 py-3 text-xs text-slate-500">
        Fase 4 — El Dilema Moral · semilla {seed}
      </footer>
    </div>
  );
}
