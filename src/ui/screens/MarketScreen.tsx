import {
  availableGenres,
  availablePlatforms,
  availableThemes,
  effectiveSaturation,
  researchableThemes,
  saturationModifier,
  type MarketState,
  type TrendStage,
  type TrendState,
} from '../../core';
import { getGenre } from '../../data/genres';
import { getTheme } from '../../data/themes';
import { platformStageLabels, trendStageLabels } from '../../data/marketTexts';
import { useGameStore } from '../../state/store';
import { StaggerGroup, StaggerItem } from '../components/Motion';
import { TrendArrow } from '../components/TrendArrow';

/**
 * Panel de mercado y tendencias (docs/10 §10.7): dirección ↑→↓ y etapa por
 * género/tema (solo contenido ya desbloqueado por era/investigación), ciclo
 * de vida de plataformas con su base instalada, y las zonas saturadas. La UI
 * solo muestra: todo se calcula en core/systems/market.ts.
 */

const STAGE_COLOR: Record<TrendStage, string> = {
  naciendo: 'bg-info/15 text-info',
  creciendo: 'bg-ok/15 text-ok',
  pico: 'bg-fuchsia-500/15 text-fuchsia-300',
  estable: 'bg-control text-ink',
  declive: 'bg-warn/15 text-capital',
  muerto: 'bg-danger/15 text-danger-hi',
};

function TrendRow({
  name,
  trend,
  locked = false,
}: {
  name: string;
  trend: TrendState;
  locked?: boolean;
}) {
  return (
    <StaggerItem tag="li" className="flex items-center gap-3 rounded-md bg-raised/60 px-3 py-2">
      <TrendArrow direction={trend.direction} />
      <span className={`w-36 shrink-0 font-medium ${locked ? 'text-ink-mute' : ''}`}>
        {name}
        {locked && <span className="ml-1 text-xs text-ink-faint" title="Investígalo para poder usarlo">🔒</span>}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-control">
        <div
          className="meter-fill h-full rounded-full bg-action-hi"
          style={{ transform: `scaleX(${trend.pop})` }}
        />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-ink-mute">
        {Math.round(trend.pop * 100)} %
      </span>
      <span className={`w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-xs ${STAGE_COLOR[trend.stage]}`}>
        {trendStageLabels[trend.stage]}
      </span>
    </StaggerItem>
  );
}

/** Combos con saturación apreciable, con su efecto en ventas (docs/04 §3). */
function SaturationList({ market }: { market: MarketState }) {
  const entries = Object.keys(market.saturation)
    .map((key) => {
      const [genreId, themeId] = key.split('|');
      const sat = effectiveSaturation(market, genreId, themeId);
      return { key, genreId, themeId, sat, modifier: saturationModifier(sat) };
    })
    .filter((e) => e.sat >= 0.25)
    .sort((a, b) => b.sat - a.sat);

  if (entries.length === 0) {
    return <p className="text-ink-faint">Ningún nicho saturado: el mercado tiene hambre.</p>;
  }

  return (
    <ul className="flex flex-col gap-2 text-sm">
      {entries.map((e) => (
        <li key={e.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-raised/60 px-3 py-2">
          <span className="font-medium">
            {getGenre(e.genreId).name} de {getTheme(e.themeId).name}
          </span>
          <span className={e.modifier < 1 ? 'text-warn' : 'text-ink-mute'}>
            {e.modifier < 1
              ? `ventas ×${e.modifier.toFixed(2)} por saturación`
              : 'saturándose; de momento sin efecto'}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MarketScreen() {
  const game = useGameStore((s) => s.game);
  const market = game.market;
  const week = game.week;
  const goTo = useGameStore((s) => s.goTo);

  const genresShown = availableGenres(game);
  // El mercado es observable: se ven las tendencias de todos los temas que la
  // era ha traído, estén investigados o no (docs/17 P1). Los no-usables llevan
  // 🔒: sirve para decidir en qué especializarse.
  const usableThemes = availableThemes(game);
  const lockedThemeIds = new Set(researchableThemes(game).map((t) => t.id));
  const themesShown = [...usableThemes, ...researchableThemes(game)];
  const platformsShown = availablePlatforms(game);

  const maxBase = Math.max(1, ...Object.values(market.platforms).map((p) => p.installedBase));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Mercado y tendencias</h2>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-raised px-3 py-1.5 text-sm text-ink hover:bg-control"
        >
          Volver al estudio
        </button>
      </div>

      <section className="card">
        <h3 className="card-title">
          Géneros
        </h3>
        <StaggerGroup tag="ul" className="flex flex-col gap-2 text-sm">
          {genresShown.map((g) => {
            const trend = market.genres[g.id];
            return trend ? <TrendRow key={g.id} name={g.name} trend={trend} /> : null;
          })}
        </StaggerGroup>
      </section>

      <section className="card">
        <h3 className="card-title">
          Temas
        </h3>
        <StaggerGroup tag="ul" className="flex flex-col gap-2 text-sm">
          {themesShown.map((t) => {
            const trend = market.themes[t.id];
            return trend ? (
              <TrendRow key={t.id} name={t.name} trend={trend} locked={lockedThemeIds.has(t.id)} />
            ) : null;
          })}
        </StaggerGroup>
      </section>

      <section className="card">
        <h3 className="card-title">
          Plataformas
        </h3>
        <StaggerGroup tag="ul" className="flex flex-col gap-2 text-sm">
          {platformsShown.map((p) => {
            const state = market.platforms[p.id];
            if (!state) return null;
            const dead = state.stage === 'descatalogada' || state.stage === 'anunciada';
            return (
              <StaggerItem
                tag="li"
                key={p.id}
                className="flex items-center gap-3 rounded-md bg-raised/60 px-3 py-2"
              >
                <span className="w-36 shrink-0 font-medium">{p.name}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-control">
                  <div
                    className={`meter-fill h-full rounded-full ${dead ? 'bg-control-hi' : 'bg-info'}`}
                    style={{ transform: `scaleX(${state.installedBase / maxBase})` }}
                  />
                </div>
                <span className="w-24 text-right text-xs tabular-nums text-ink-mute">
                  {state.installedBase.toLocaleString('es-ES')} uds/sem
                </span>
                <span className={`w-28 shrink-0 rounded-full px-2 py-0.5 text-center text-xs ${dead ? 'bg-danger/15 text-danger-hi' : 'bg-control text-ink'}`}>
                  {platformStageLabels[state.stage]}
                </span>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
        <p className="mt-2 text-xs text-ink-faint">
          La base instalada marca el techo de ventas semanales de cada plataforma (semana {week}).
        </p>
      </section>

      <section className="card">
        <h3 className="card-title">
          Saturación
        </h3>
        <SaturationList market={market} />
      </section>
    </main>
  );
}
