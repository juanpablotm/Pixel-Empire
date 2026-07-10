import type { FitBand } from '../../core';

/**
 * Medidor de Fit en vivo (docs/03 factor A): verde/ámbar/rojo, sin exponer el
 * número crudo. Orienta, no resuelve.
 */

const BAND_INFO: Record<FitBand, { label: string; color: string; segments: number }> = {
  verde: { label: 'Encaje prometedor', color: 'bg-emerald-500', segments: 3 },
  ambar: { label: 'Encaje dudoso', color: 'bg-amber-500', segments: 2 },
  rojo: { label: 'Mal encaje', color: 'bg-red-500', segments: 1 },
};

export function FitMeter({ band }: { band: FitBand }) {
  const info = BAND_INFO[band];
  return (
    <div className="flex items-center gap-3" role="status" aria-label={`Fit: ${info.label}`}>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-3 w-8 rounded-sm transition-colors duration-300 ${
              i < info.segments ? info.color : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-medium">{info.label}</span>
    </div>
  );
}
