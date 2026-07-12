import type { TrendDirection } from '../../core';
import { trendDirectionArrows } from '../../data/marketTexts';

/** Flecha de dirección del panel de tendencias: ↑ verde · → gris · ↓ rojo (docs/04 §2). */

const DIRECTION_COLOR: Record<TrendDirection, string> = {
  sube: 'text-ok',
  estable: 'text-ink-mute',
  baja: 'text-danger',
};

const DIRECTION_LABEL: Record<TrendDirection, string> = {
  sube: 'subiendo',
  estable: 'estable',
  baja: 'bajando',
};

export function TrendArrow({ direction }: { direction: TrendDirection }) {
  return (
    <span
      role="img"
      aria-label={DIRECTION_LABEL[direction]}
      title={DIRECTION_LABEL[direction]}
      className={`font-bold ${DIRECTION_COLOR[direction]}`}
    >
      {trendDirectionArrows[direction]}
    </span>
  );
}
