import { useGameStore } from '../../state/store';

/**
 * La Balanza "El Precio" (docs/10 §7.4, innovación I2): medidor ⭐⚖️💰
 * persistente en el HUD. Se inclina hacia el 💰 (dorado frío) con las
 * palancas de codicia y hacia la ⭐ (calidez) con las de integridad. Solo
 * lee studio.moralDrift (−1 codicia … +1 integridad); el cálculo vive en
 * core/systems/morale.ts.
 */
export function MoralScale() {
  const drift = useGameStore((s) => s.game.studio.moralDrift);

  // Posición del fiel: 0 % = codicia pura (💰), 100 % = integridad pura (⭐).
  const percent = Math.round(((drift + 1) / 2) * 100);
  const leaning =
    drift <= -0.15 ? 'hacia la codicia' : drift >= 0.15 ? 'hacia la integridad' : 'en equilibrio';

  return (
    <div
      className="flex items-center gap-1.5"
      title={`La Balanza "El Precio": la conciencia del estudio está ${leaning}.`}
      role="meter"
      aria-label="Balanza El Precio: codicia frente a integridad"
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={drift}
    >
      <span aria-hidden className={drift < -0.15 ? 'drop-shadow-[0_0_4px_rgba(251,191,36,0.9)]' : ''}>
        💰
      </span>
      <div className="relative h-2 w-24 overflow-hidden rounded-full bg-gradient-to-r from-amber-500/70 via-slate-600 to-emerald-500/70">
        <div
          className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-500"
          style={{ left: `calc(${percent}% - 2px)` }}
        />
      </div>
      <span aria-hidden className={drift > 0.15 ? 'drop-shadow-[0_0_4px_rgba(52,211,153,0.9)]' : ''}>
        ⭐
      </span>
    </div>
  );
}
