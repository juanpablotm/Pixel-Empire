import { useEffect } from 'react';
import { useGameStore, type Screen } from '../state/store';
import { TutorialGuide } from './onboarding/TutorialGuide';
import { AwardsModal } from './components/AwardsModal';
import { CrisisModal } from './components/CrisisModal';
import { DilemmaModal } from './components/DilemmaModal';
import { EraTransition } from './components/EraTransition';
import { GameOverOverlay } from './components/GameOverOverlay';
import { Hud } from './components/Hud';
import { ImportantNoticeModal } from './components/ImportantNoticeModal';
import { MoralTint } from './components/MoralScale';
import { ScreenFade } from './components/Motion';
import { FontScaleSelect, SoundControls } from './components/PreferenceControls';
import { Toasts } from './components/Toasts';
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
import { TitleScreen } from './screens/TitleScreen';
import { EraSkinProvider } from './theme/EraSkinProvider';

/**
 * Raíz de la UI: pantalla de título (Fase 7F) o la partida — HUD persistente
 * + la pantalla activa (docs/10 §10.1–10.10) + los overlays (crisis, dilemas,
 * transición de era, gala de premios, game over), todo envuelto en la piel de
 * la era actual (docs/10 §8). Desde la 7D la navegación transiciona con
 * ScreenFade y los eventos notifican con toasts; desde la 7F la capa de guía
 * del tutorial acompaña la primera partida. El cambio título ↔ partida es un
 * remontaje por rama (entrada animada, sin AnimatePresence). Solo lee estado
 * con selectores finos y despacha acciones (docs/08 §6).
 */
/** Pantallas navegables con las teclas 1–9 (docs/10 §13, Fase 7G). */
const SCREEN_BY_KEY: Record<string, Screen> = {
  '1': 'estudio',
  '2': 'concepcion',
  '3': 'desarrollo',
  '4': 'equipo',
  '5': 'mercado',
  '6': 'creadores',
  '7': 'investigacion',
  '8': 'finanzas',
  '9': 'legado',
};

/**
 * Navegación por teclado (docs/10 §13): Espacio pausa/reanuda, 1–9 cambian
 * de pantalla y Esc cierra los avisos que no exigen decisión (transición de
 * era, gala). Nunca interfiere con formularios, botones enfocados, modales
 * de decisión (crisis/dilemas) ni con el tutorial.
 */
function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target !== null &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const s = useGameStore.getState();
      if (s.appMode !== 'game' || s.tutorialStep !== null) return;

      if (e.key === 'Escape') {
        if (s.eraTransition !== null) {
          e.preventDefault();
          s.dismissEraTransition();
        } else if (s.awardsWeek !== null) {
          e.preventDefault();
          s.dismissAwards();
        }
        return;
      }

      // Con una decisión o un aviso importante en pantalla, el teclado no salta
      // por encima (no reanuda el tiempo bajo el modal, docs/17 U4).
      const decisionOpen =
        s.game.gameOver !== null ||
        s.eraTransition !== null ||
        s.awardsWeek !== null ||
        s.pendingNotices.length > 0 ||
        s.game.community.crises.some((c) => c.status === 'abierta') ||
        s.game.community.dilemmas.length > 0;
      if (decisionOpen) return;

      if (e.key === ' ') {
        // Sobre un control, Espacio es "activar", no "pausar".
        if (target?.closest('button, a, [role="button"]')) return;
        e.preventDefault();
        s.setSpeed(s.speed === 0 ? 1 : 0);
        return;
      }
      const screen = SCREEN_BY_KEY[e.key];
      if (screen !== undefined) s.goTo(screen);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

export function App() {
  const appMode = useGameStore((s) => s.appMode);
  const screen = useGameStore((s) => s.screen);
  const seed = useGameStore((s) => s.game.seed);
  const modernUi = useGameStore((s) => s.modernUi);
  const setModernUi = useGameStore((s) => s.setModernUi);
  const colorTheme = useGameStore((s) => s.colorTheme);
  const setColorTheme = useGameStore((s) => s.setColorTheme);
  const reduceMotion = useGameStore((s) => s.reduceMotion);
  const setReduceMotion = useGameStore((s) => s.setReduceMotion);

  useKeyboardShortcuts();

  if (appMode === 'title') {
    return (
      <EraSkinProvider>
        <TitleScreen />
      </EraSkinProvider>
    );
  }

  return (
    <EraSkinProvider>
      <div className="flex min-h-screen flex-col bg-app text-ink">
        <Hud />

        <ScreenFade id={screen}>
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
        </ScreenFade>

        {/* La conciencia tiñe la interfaz (docs/10 §7.4): bajo los modales. */}
        <MoralTint />

        {/* Los eventos avisan sin interrumpir (docs/10 §6). */}
        <Toasts />

        {/* La capa social interrumpe cuando toca decidir (docs/07 §4–§5). */}
        <DilemmaModal />
        <CrisisModal />
        {/* Los beats de la Fase 6: el mundo cambia y la gala anual (docs/10 §7.6). */}
        <EraTransition />
        <AwardsModal />
        {/* Avisos importantes que pausan el tiempo (docs/17 U4): P&L de salida
            del mercado, renuncias, bancarrota inminente, subida de etapa. */}
        <ImportantNoticeModal />
        <GameOverOverlay />

        {/* La guía del tutorial (Fase 7F): resalta controles reales, nunca bloquea. */}
        <TutorialGuide />

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-6 py-3 text-xs text-ink-faint">
          <span
            className="tip cursor-help"
            tabIndex={0}
            data-tip="Atajos: Espacio pausa/reanuda · 1–9 cambian de pantalla · Esc cierra avisos"
          >
            Pixel Empire · semilla {seed} · ⌨ atajos
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
            <SoundControls compact />
            <FontScaleSelect />
          </div>
          <label
            className="flex items-center gap-1.5"
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
          <label
            className="flex items-center gap-1.5"
            title="Apaga partículas, desplazamientos y bucles; conserva los cambios de estado esenciales (docs/10 §4.3)"
          >
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              className="accent-action-hi"
            />
            Reducir animaciones
          </label>
        </footer>
      </div>
    </EraSkinProvider>
  );
}
