import type { CSSProperties } from 'react';
import { getEra } from '../../data/eras';
import { creators } from '../../data/creators';
import { features } from '../../data/features';
import { genres } from '../../data/genres';
import { monetizationModels } from '../../data/monetization';
import { platforms } from '../../data/platforms';
import { themes } from '../../data/themes';
import { useGameStore } from '../../state/store';
import { eraSkins } from '../theme/eraSkins';

/**
 * La Transición de Era (docs/10 §7.6, innovación I7): beat a pantalla
 * completa que resume qué cambia con la nueva era. Las novedades se derivan
 * del contenido (`appearsInEra`), no de listas duplicadas (docs/09 §7).
 * Mientras el beat está abierto la UI conserva la piel de la era vieja;
 * al pulsar "Entrar en la nueva era" la piel se transforma (Fase 7E,
 * EraSkinProvider + data-skin-morph).
 */

function newInEra<T extends { appearsInEra: string }>(items: readonly T[], era: string): T[] {
  return items.filter((item) => item.appearsInEra === era);
}

export function EraTransition() {
  const eraId = useGameStore((s) => s.eraTransition);
  const dismiss = useGameStore((s) => s.dismissEraTransition);
  if (eraId === null) return null;

  const era = getEra(eraId);
  const unlocks: { label: string; names: string[] }[] = [
    { label: 'Plataformas', names: newInEra(platforms, eraId).map((p) => p.name) },
    { label: 'Géneros', names: newInEra(genres, eraId).map((g) => g.name) },
    { label: 'Temas', names: newInEra(themes, eraId).map((t) => t.name) },
    { label: 'Features', names: newInEra(features, eraId).map((f) => f.name) },
    { label: 'Modelos de negocio', names: newInEra(monetizationModels, eraId).map((m) => m.name) },
    { label: 'Creadores', names: newInEra(creators, eraId).map((c) => c.name) },
  ].filter((u) => u.names.length > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Nueva era: ${era.name}`}
      className="era-overlay fixed inset-0 z-40 flex items-center justify-center px-6"
      // El acento de la era ENTRANTE (la piel aún es la vieja durante el beat).
      style={{ '--skin-accent': eraSkins[eraId].beatAccent } as CSSProperties}
    >
      <div className="flex w-full max-w-2xl flex-col gap-5 text-center">
        <p
          className="era-overlay-line text-sm font-semibold uppercase tracking-[0.3em]"
          style={{ color: 'var(--skin-accent)', animationDelay: '100ms' }}
        >
          Nueva era · {era.period}
        </p>
        <h2
          className="era-overlay-line text-4xl font-black text-ink-hi"
          style={{ animationDelay: '300ms' }}
        >
          {era.name}
        </h2>
        <p
          className="era-overlay-line text-lg text-ink"
          style={{ animationDelay: '500ms' }}
        >
          {era.transitionHeadline}
        </p>
        <p
          className="era-overlay-line text-sm text-ink-mute"
          style={{ animationDelay: '700ms' }}
        >
          {era.transitionSummary}
        </p>
        <p
          className="era-overlay-line text-xs italic text-ink-faint"
          style={{ animationDelay: '800ms' }}
        >
          La interfaz de tu estudio también cambia — {eraSkins[eraId].flavor}
        </p>

        {unlocks.length > 0 && (
          <div
            className="era-overlay-line mx-auto flex w-full max-w-xl flex-col gap-2 rounded-lg border border-line bg-panel p-4 text-left"
            style={{ animationDelay: '900ms' }}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-mute">
              Novedades de la era
            </span>
            {unlocks.map((u) => (
              <p key={u.label} className="text-sm text-ink">
                <span className="text-ink-faint">{u.label}:</span> {u.names.join(', ')}
              </p>
            ))}
            <p className="text-xs text-ink-faint">
              El listón de calidad del público sube: lo que ayer era un hit, hoy es del montón.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={dismiss}
          className="era-overlay-line mx-auto rounded-md px-6 py-2.5 text-sm font-semibold text-onbright"
          style={{ backgroundColor: 'var(--skin-accent)', animationDelay: '1100ms' }}
        >
          Entrar en la nueva era
        </button>
      </div>
    </div>
  );
}
