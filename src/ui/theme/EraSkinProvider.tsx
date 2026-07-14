import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FONT_SCALE_FACTOR, useGameStore } from '../../state/store';
import { useMotionDisabled, useReducedMotionPref } from '../motion';
import { motionMs } from './motionTokens';
import { previousEra, skinFor } from './eraSkins';

/**
 * Envuelve la app con la piel de la era actual (docs/10 §8): solo aplica una
 * clase CSS, el tema base claro/oscuro como `data-theme` (Fase 7A) y la
 * preferencia de movimiento como `data-motion` (Fase 7D); los tokens y
 * overrides viven en ui/theme/tokens.css y ui/index.css. La piel de era gana
 * al tema base.
 *
 * El beat de transición de era (docs/10 §7.6, Fase 7E) va en dos actos:
 * mientras `eraTransition` está pendiente, el overlay anuncia la nueva era
 * SOBRE la piel vieja; al entrar (dismiss) la piel se transforma con una
 * metamorfosis de color (`data-skin-morph`, ver index.css). Presentación
 * pura: el estado de juego ya cambió de era en el tick.
 */
export function EraSkinProvider({ children }: { children: ReactNode }) {
  const era = useGameStore((s) => s.game.era);
  const pendingEra = useGameStore((s) => s.eraTransition);
  const modernUi = useGameStore((s) => s.modernUi);
  const colorTheme = useGameStore((s) => s.colorTheme);
  const fontScale = useGameStore((s) => s.fontScale);
  const reducedMotion = useReducedMotionPref();
  const motionOff = useMotionDisabled();

  // Escalado de fuente (docs/10 §13, Fase 7G): toda la UI se mide en rem,
  // así que basta con escalar el font-size raíz del documento.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.fontSize = `${FONT_SCALE_FACTOR[fontScale] * 100}%`;
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [fontScale]);

  // Acto 1: el beat todavía no se cerró → se muestra la piel de la era vieja.
  const shownEra = pendingEra !== null ? previousEra(era) : era;
  const skin = skinFor(shownEra, modernUi);
  const morphing = useSkinMorph(skin.className, motionOff);

  return (
    <div
      className={`era-skin ${skin.className}`}
      data-theme={colorTheme}
      data-motion={reducedMotion ? 'reduced' : 'full'}
      data-skin-morph={morphing ? 'true' : undefined}
    >
      {children}
    </div>
  );
}

/**
 * true mientras dura la metamorfosis de piel: al cambiar la clase de piel
 * (acto 2 del beat, o el toggle "UI moderna siempre") se estampa
 * `data-skin-morph` durante --motion-dramatic para que todos los colores
 * fundan suavemente a la piel nueva. Con movimiento reducido no hay morph.
 */
function useSkinMorph(className: string, disabled: boolean): boolean {
  const previous = useRef(className);
  const [morphing, setMorphing] = useState(false);

  useEffect(() => {
    if (previous.current === className) return;
    previous.current = className;
    if (disabled) return;
    setMorphing(true);
    const timer = window.setTimeout(() => setMorphing(false), motionMs.dramatic);
    return () => window.clearTimeout(timer);
  }, [className, disabled]);

  return morphing;
}
