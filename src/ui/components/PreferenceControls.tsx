import { useGameStore, type FontScale } from '../../state/store';

/**
 * Controles de preferencias de la Fase 7G, compartidos entre el pie de la
 * partida (App) y el panel de Opciones del título (docs/10 §12–§13): sonido
 * con volumen y escalado de fuente. Una sola fuente de verdad: el store.
 */

export function SoundControls({ compact = false }: { compact?: boolean }) {
  const soundOn = useGameStore((s) => s.soundOn);
  const setSoundOn = useGameStore((s) => s.setSoundOn);
  const volume = useGameStore((s) => s.soundVolume);
  const setVolume = useGameStore((s) => s.setSoundVolume);

  return (
    <div className="flex items-center gap-2">
      <label
        className="flex items-center gap-1.5"
        title="Blips, chime de reseña y el runrún de la oficina (Web Audio, sin archivos). El juego funciona perfecto en silencio"
      >
        <input
          type="checkbox"
          checked={soundOn}
          onChange={(e) => setSoundOn(e.target.checked)}
          className="accent-action-hi"
        />
        🔊 Sonido
      </label>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(volume * 100)}
        disabled={!soundOn}
        aria-label="Volumen del sonido"
        title={`Volumen: ${Math.round(volume * 100)} %`}
        onChange={(e) => setVolume(Number(e.target.value) / 100)}
        className={`accent-action-hi ${compact ? 'w-20' : 'w-28'}`}
      />
    </div>
  );
}

const FONT_SCALE_LABELS: Record<FontScale, string> = {
  base: 'Normal',
  grande: 'Grande',
  enorme: 'Enorme',
};

export function FontScaleSelect() {
  const fontScale = useGameStore((s) => s.fontScale);
  const setFontScale = useGameStore((s) => s.setFontScale);

  return (
    <label
      className="flex items-center gap-1.5"
      title="Escala todo el texto de la interfaz (docs/10 §13)"
    >
      Letra
      <select
        value={fontScale}
        onChange={(e) => setFontScale(e.target.value as FontScale)}
        className="rounded-md border border-line bg-control px-1.5 py-0.5 text-ink"
      >
        {(Object.keys(FONT_SCALE_LABELS) as FontScale[]).map((scale) => (
          <option key={scale} value={scale}>
            {FONT_SCALE_LABELS[scale]}
          </option>
        ))}
      </select>
    </label>
  );
}
