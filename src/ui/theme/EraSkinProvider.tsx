import type { ReactNode } from 'react';
import { useGameStore } from '../../state/store';
import { skinFor } from './eraSkins';

/**
 * Envuelve la app con la piel de la era actual (docs/10 §8): solo aplica una
 * clase CSS; las variables y overrides viven en ui/index.css. La transición
 * entre pieles ocurre en el beat de era (docs/10 §7.6).
 */
export function EraSkinProvider({ children }: { children: ReactNode }) {
  const era = useGameStore((s) => s.game.era);
  const modernUi = useGameStore((s) => s.modernUi);
  const skin = skinFor(era, modernUi);

  return <div className={`era-skin ${skin.className}`}>{children}</div>;
}
