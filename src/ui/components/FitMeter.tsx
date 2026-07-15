import type { FitBand } from '../../core';

/**
 * Medidor de Fit en vivo (docs/03 factor A): verde/ámbar/rojo, sin exponer el
 * número crudo. Orienta, no resuelve. El estado 'oculto' (docs/17 P2) es el
 * atajo predictivo aún sin investigar: el jugador puede lanzar igual y el
 * desglose posterior le enseñará (Pilar 2), pero no ve el pronóstico por
 * adelantado hasta investigarlo (Red de afinidades o "Investigar resultados").
 */

type MeterBand = FitBand | 'oculto';

const BAND_INFO: Record<MeterBand, { label: string; color: string; segments: number }> = {
  verde: { label: 'Encaje prometedor', color: 'bg-action-hi', segments: 3 },
  ambar: { label: 'Encaje dudoso', color: 'bg-warn', segments: 2 },
  rojo: { label: 'Mal encaje', color: 'bg-danger', segments: 1 },
  oculto: { label: 'Encaje por descubrir', color: 'bg-control-hi', segments: 0 },
};

const TIP_KNOWN =
  'El Fit mide qué tal casan tema, género, plataforma y público. Es el cimiento de la calidad: un mal encaje no se arregla con producción.';
const TIP_HIDDEN =
  'Aún no conoces este encaje. Investígalo (Red de afinidades, o "Investigar resultados" de un juego con esta combinación) o láncelo y aprende del desglose. Puedes crear el juego igualmente.';

export function FitMeter({ band }: { band: MeterBand }) {
  const info = BAND_INFO[band];
  const hidden = band === 'oculto';
  return (
    <div
      className="tip flex cursor-help items-center gap-3"
      tabIndex={0}
      data-tip={hidden ? TIP_HIDDEN : TIP_KNOWN}
      role="status"
      aria-label={`Fit: ${info.label}`}
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-3 w-8 rounded-sm transition-colors ${
              hidden ? 'bg-control opacity-60' : i < info.segments ? info.color : 'bg-control'
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-medium">
        {hidden ? '❓ ' : ''}
        {info.label}
      </span>
    </div>
  );
}
