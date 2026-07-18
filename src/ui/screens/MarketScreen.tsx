import {
  activeFevers,
  activeFeverFor,
  availableGenres,
  availablePlatforms,
  availableThemes,
  effectiveSaturation,
  feverWeeksLeft,
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
 * Panel de mercado y tendencias (docs/10 §10.7, reescrito en 9.4): la base de
 * cada género/tema es plana y estable (banda estrecha ~42–58 %), así que ya no
 * hay una tendencia de años que leer. La variación fuerte la dan las FIEBRES
 * (docs/19 §9.4): el jugador ve las ACTIVAS —nunca las futuras— arriba del todo
 * y marcadas en su fila. La UI solo muestra: todo se calcula en core/.
 */

const STAGE_COLOR: Record<TrendStage, string> = {
  estable: 'bg-control text-ink',
  fiebre: 'bg-peak/20 text-peak',
};

function TrendRow({
  name,
  trend,
  weeksLeft,
  locked = false,
}: {
  name: string;
  trend: TrendState;
  /** Semanas restantes si el género/tema está en fiebre; undefined si no. */
  weeksLeft?: number;
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
          className={`meter-fill h-full rounded-full ${trend.stage === 'fiebre' ? 'bg-peak' : 'bg-action-hi'}`}
          style={{ transform: `scaleX(${trend.pop})` }}
        />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-ink-mute">
        {Math.round(trend.pop * 100)} %
      </span>
      <span className={`w-28 shrink-0 rounded-full px-2 py-0.5 text-center text-xs ${STAGE_COLOR[trend.stage]}`}>
        {trend.stage === 'fiebre' && weeksLeft !== undefined
          ? `🔥 Fiebre · ${weeksLeft} sem`
          : trendStageLabels[trend.stage]}
      </span>
    </StaggerItem>
  );
}

/**
 * Fiebres ACTIVAS (docs/19 §9.4): el aviso legible de qué está de moda AHORA,
 * con su cuenta atrás. Nunca se listan fiebres futuras — se acabó el panel
 * predictivo de toda la línea temporal.
 */
function FeverCard({ market, week }: { market: MarketState; week: number }) {
  const fevers = activeFevers(market.fevers, week);
  if (fevers.length === 0) {
    return (
      <p className="text-ink-faint">
        Mercado tranquilo: ningún género o tema en fiebre. Haz un buen juego de lo que quieras.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {fevers.map((f) => {
        const name = f.target === 'genre' ? getGenre(f.targetId).name : getTheme(f.targetId).name;
        const kind = f.target === 'genre' ? 'Género' : 'Tema';
        return (
          <li
            key={f.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-peak/10 px-3 py-2"
          >
            <span className="text-lg">🔥</span>
            <span className="font-medium text-peak">{name}</span>
            <span className="text-xs text-ink-mute">
              {kind} en fiebre · quedan {feverWeeksLeft(f, week)} sem
              {f.source === 'hit' ? ' · encendida por un exitazo' : ''}
            </span>
          </li>
        );
      })}
    </ul>
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
        <h3 className="card-title">Fiebres activas</h3>
        <FeverCard market={market} week={week} />
      </section>

      <section className="card">
        <h3 className="card-title">
          Géneros
        </h3>
        <StaggerGroup tag="ul" className="flex flex-col gap-2 text-sm">
          {genresShown.map((g) => {
            const trend = market.genres[g.id];
            const fever = activeFeverFor(market.fevers, 'genre', g.id, week);
            return trend ? (
              <TrendRow
                key={g.id}
                name={g.name}
                trend={trend}
                weeksLeft={fever ? feverWeeksLeft(fever, week) : undefined}
              />
            ) : null;
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
            const fever = activeFeverFor(market.fevers, 'theme', t.id, week);
            return trend ? (
              <TrendRow
                key={t.id}
                name={t.name}
                trend={trend}
                weeksLeft={fever ? feverWeeksLeft(fever, week) : undefined}
                locked={lockedThemeIds.has(t.id)}
              />
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
