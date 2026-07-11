import {
  effectiveSaturation,
  saturationModifier,
  type MarketState,
  type TrendStage,
  type TrendState,
} from '../../core';
import { genres, getGenre } from '../../data/genres';
import { themes, getTheme } from '../../data/themes';
import { platforms } from '../../data/platforms';
import { platformStageLabels, trendStageLabels } from '../../data/marketTexts';
import { useGameStore } from '../../state/store';
import { TrendArrow } from '../components/TrendArrow';

/**
 * Panel de mercado y tendencias (docs/10 §10.7): dirección ↑→↓ y etapa por
 * género/tema, ciclo de vida de plataformas con su base instalada, y las
 * zonas saturadas. La UI solo muestra: todo se calcula en core/systems/market.ts.
 */

const STAGE_COLOR: Record<TrendStage, string> = {
  naciendo: 'bg-sky-500/15 text-sky-300',
  creciendo: 'bg-emerald-500/15 text-emerald-300',
  pico: 'bg-fuchsia-500/15 text-fuchsia-300',
  estable: 'bg-slate-700 text-slate-300',
  declive: 'bg-amber-500/15 text-amber-300',
  muerto: 'bg-red-500/15 text-red-300',
};

function TrendRow({ name, trend }: { name: string; trend: TrendState }) {
  return (
    <li className="flex items-center gap-3 rounded-md bg-slate-800/60 px-3 py-2">
      <TrendArrow direction={trend.direction} />
      <span className="w-36 shrink-0 font-medium">{name}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${Math.round(trend.pop * 100)}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-slate-400">
        {Math.round(trend.pop * 100)} %
      </span>
      <span className={`w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-xs ${STAGE_COLOR[trend.stage]}`}>
        {trendStageLabels[trend.stage]}
      </span>
    </li>
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
    return <p className="text-slate-500">Ningún nicho saturado: el mercado tiene hambre.</p>;
  }

  return (
    <ul className="flex flex-col gap-2 text-sm">
      {entries.map((e) => (
        <li key={e.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-slate-800/60 px-3 py-2">
          <span className="font-medium">
            {getGenre(e.genreId).name} de {getTheme(e.themeId).name}
          </span>
          <span className={e.modifier < 1 ? 'text-amber-400' : 'text-slate-400'}>
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
  const market = useGameStore((s) => s.game.market);
  const week = useGameStore((s) => s.game.week);
  const goTo = useGameStore((s) => s.goTo);

  const maxBase = Math.max(1, ...Object.values(market.platforms).map((p) => p.installedBase));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Mercado y tendencias</h2>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
        >
          Volver al estudio
        </button>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Géneros
        </h3>
        <ul className="flex flex-col gap-2 text-sm">
          {genres.map((g) => {
            const trend = market.genres[g.id];
            return trend ? <TrendRow key={g.id} name={g.name} trend={trend} /> : null;
          })}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Temas
        </h3>
        <ul className="flex flex-col gap-2 text-sm">
          {themes.map((t) => {
            const trend = market.themes[t.id];
            return trend ? <TrendRow key={t.id} name={t.name} trend={trend} /> : null;
          })}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Plataformas
        </h3>
        <ul className="flex flex-col gap-2 text-sm">
          {platforms.map((p) => {
            const state = market.platforms[p.id];
            if (!state) return null;
            const dead = state.stage === 'descatalogada' || state.stage === 'anunciada';
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-md bg-slate-800/60 px-3 py-2">
                <span className="w-36 shrink-0 font-medium">{p.name}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${dead ? 'bg-slate-500' : 'bg-sky-500'}`}
                    style={{ width: `${Math.round((state.installedBase / maxBase) * 100)}%` }}
                  />
                </div>
                <span className="w-24 text-right text-xs tabular-nums text-slate-400">
                  {state.installedBase.toLocaleString('es-ES')} uds/sem
                </span>
                <span className={`w-28 shrink-0 rounded-full px-2 py-0.5 text-center text-xs ${dead ? 'bg-red-500/15 text-red-300' : 'bg-slate-700 text-slate-300'}`}>
                  {platformStageLabels[state.stage]}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          La base instalada marca el techo de ventas semanales de cada plataforma (semana {week}).
        </p>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Saturación
        </h3>
        <SaturationList market={market} />
      </section>
    </main>
  );
}
