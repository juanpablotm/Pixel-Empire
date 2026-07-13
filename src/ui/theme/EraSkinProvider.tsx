import type { ReactNode } from 'react';
import { useGameStore } from '../../state/store';
import { useReducedMotionPref } from '../motion';
import { skinFor } from './eraSkins';

/**
 * Envuelve la app con la piel de la era actual (docs/10 §8): solo aplica una
 * clase CSS, el tema base claro/oscuro como `data-theme` (Fase 7A) y la
 * preferencia de movimiento como `data-motion` (Fase 7D: toggle "Reducir
 * animaciones" ∨ prefers-reduced-motion); los tokens y overrides viven en
 * ui/theme/tokens.css y ui/index.css, y las reglas que apagan animaciones
 * cuelgan de `[data-motion='reduced']`. La piel de era gana al tema base; la
 * transición entre pieles ocurre en el beat de era (docs/10 §7.6).
 */
export function EraSkinProvider({ children }: { children: ReactNode }) {
  const era = useGameStore((s) => s.game.era);
  const modernUi = useGameStore((s) => s.modernUi);
  const colorTheme = useGameStore((s) => s.colorTheme);
  const reducedMotion = useReducedMotionPref();
  const skin = skinFor(era, modernUi);

  return (
    <div
      className={`era-skin ${skin.className}`}
      data-theme={colorTheme}
      data-motion={reducedMotion ? 'reduced' : 'full'}
    >
      {children}
    </div>
  );
}
