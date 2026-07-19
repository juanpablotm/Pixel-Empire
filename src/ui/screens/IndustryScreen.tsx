import {
  aggregateReputation,
  announcedReleases,
  projectTotalWeeks,
  recentRivalGames,
  type RivalRuntime,
} from '../../core';
import { balance } from '../../data/balance';
import { getGenre } from '../../data/genres';
import { getRivalDef, rivalTierLabels } from '../../data/rivals';
import { sizeLabels } from '../../data/reviewTexts';
import { playerStudioLabel } from '../../data/awards';
import { useGameStore } from '../../state/store';
import { StaggerGroup, StaggerItem } from '../components/Motion';

/**
 * Panel de Industria y competencia (Fase 9.5, docs/19 §9.5): el mundo es
 * legible, no azar opaco — quién es quién (ranking con tier y momento), qué
 * viene (calendario de lanzamientos ANUNCIADOS, con aviso si choca con un
 * proyecto tuyo) y qué acaba de pasar (lanzamientos recientes, con sus
 * fiebres). Presentación pura: lee state.rivals vía selectores del núcleo.
 */

/** Momento del estudio: ▲ creciendo / ▼ decayendo respecto a su baseline. */
function momentum(r: RivalRuntime): { icon: string; label: string } {
  const base = balance.rivals.baseStrengthByTier[r.tier];
  if (r.strength >= base + 6) return { icon: '▲', label: 'en racha' };
  if (r.strength <= base - 6) return { icon: '▼', label: 'de capa caída' };
  return { icon: '·', label: 'estable' };
}

function RankingCard() {
  const rivals = useGameStore((s) => s.game.rivals?.studios ?? []);
  const reputation = useGameStore((s) => s.game.studio.reputation);
  const scaleStage = useGameStore((s) => s.game.studio.scaleStage);

  // Ranking presentacional: los rivales por su fuerza; tú entras con tu
  // reputación media como peso comparable (es fama, no simulación — y se dice).
  const playerWeight = aggregateReputation(reputation);
  const rows = [
    ...rivals
      .filter((r) => !r.closed)
      .map((r) => ({
        key: r.id,
        name: getRivalDef(r.id).name,
        tier: rivalTierLabels[r.tier],
        weight: r.strength,
        momentum: momentum(r),
        isPlayer: false,
        lastReviews: r.games.slice(-3).map((g) => g.review),
      })),
    {
      key: 'player',
      name: playerStudioLabel,
      tier: ['', 'Garaje', 'Estudio pequeño', 'Estudio', 'Estudio grande', 'Corporación'][scaleStage],
      weight: playerWeight,
      momentum: { icon: '·', label: 'tu reputación' },
      isPlayer: true,
      lastReviews: [] as number[],
    },
  ].sort((a, b) => b.weight - a.weight);

  const closed = rivals.filter((r) => r.closed);

  return (
    <section className="card">
      <h3 className="card-title">Ranking de la industria</h3>
      <StaggerGroup tag="ul" className="flex flex-col gap-1.5 text-sm">
        {rows.map((row, i) => (
          <StaggerItem
            tag="li"
            key={row.key}
            className={`flex items-center gap-3 rounded-md px-2 py-1.5 ${
              row.isPlayer ? 'bg-action/10 font-semibold text-ink-hi' : ''
            }`}
          >
            <span className="w-6 shrink-0 text-right font-mono text-ink-faint">{i + 1}.</span>
            <span className="min-w-0 flex-1 truncate">
              {row.name}
              <span className="ml-2 text-xs font-normal text-ink-faint">{row.tier}</span>
            </span>
            {row.lastReviews.length > 0 && (
              <span
                className="hidden font-mono text-xs text-ink-faint sm:inline"
                title="Reseñas de sus últimos lanzamientos"
              >
                {row.lastReviews.join(' · ')}
              </span>
            )}
            <span
              className="w-28 shrink-0 whitespace-nowrap text-right text-xs text-ink-mute"
              title={row.isPlayer ? 'Tu peso se estima por tu reputación media' : `Fuerza ${Math.round(row.weight)}`}
            >
              {row.momentum.icon} {row.momentum.label}
            </span>
          </StaggerItem>
        ))}
      </StaggerGroup>
      {closed.length > 0 && (
        <p className="mt-3 border-t border-line pt-2 text-xs text-ink-faint">
          Cerraron: {closed.map((r) => getRivalDef(r.id).name).join(' · ')}
        </p>
      )}
    </section>
  );
}

function CalendarCard() {
  const game = useGameStore((s) => s.game);
  const announced = announcedReleases(game);
  const radius = balance.rivals.window.radiusWeeks;

  /** ⚠ si un proyecto tuyo del mismo género aterriza en su ventana (estimado). */
  const collision = (genreId: string, releaseWeek: number, hyped: boolean): string | null => {
    if (!hyped) return null;
    for (const p of game.projects) {
      if (p.genreId !== genreId) continue;
      const finish = p.delayedUntilWeek ?? game.week + Math.max(0, projectTotalWeeks(p) - p.weeksSpent);
      if (Math.abs(finish - releaseWeek) <= radius) return p.name;
    }
    return null;
  };

  return (
    <section className="card">
      <h3 className="card-title">Próximos lanzamientos anunciados</h3>
      {announced.length === 0 ? (
        <p className="text-sm text-ink-faint">
          Nadie ha anunciado nada. La calma que precede al siguiente bombazo.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {announced.map(({ rival, announcement: a }) => {
            const clash = collision(a.genreId, a.releaseWeek, a.hyped);
            return (
              <li key={`${rival.id}-${a.gameName}`} className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="w-16 shrink-0 font-mono text-xs text-ink-faint">
                    ~{Math.max(0, a.releaseWeek - game.week)} sem.
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-ink-hi">«{a.gameName}»</span>
                    <span className="text-ink-mute"> · {getRivalDef(rival.id).name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-mute">
                    {getGenre(a.genreId).name} · {sizeLabels[a.size]}
                    {a.hyped ? ' · 📣 campaña masiva' : ''}
                  </span>
                </div>
                {clash && (
                  <p className="pl-16 text-xs text-warn">
                    ⚠ «{clash}» apunta a esa misma ventana: esquiva, adelanta… o pelea.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RecentCard() {
  const game = useGameStore((s) => s.game);
  const recent = recentRivalGames(game, 10);
  return (
    <section className="card">
      <h3 className="card-title">Lanzamientos recientes de la competencia</h3>
      {recent.length === 0 ? (
        <p className="text-sm text-ink-faint">La industria aún no ha estrenado nada.</p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          {recent.map(({ rival, game: g }) => (
            <li key={`${rival.id}-${g.releaseWeek}-${g.name}`} className="flex items-baseline gap-2">
              <span className="w-20 shrink-0 whitespace-nowrap font-mono text-xs text-ink-faint">
                hace {Math.max(0, game.week - g.releaseWeek)} sem.
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-ink-hi">«{g.name}»</span>
                <span className="text-ink-mute"> · {getRivalDef(rival.id).name}</span>
                {g.feverIgnited && <span title="Su éxito encendió una fiebre"> 🔥</span>}
              </span>
              <span className="shrink-0 text-xs text-ink-mute">{getGenre(g.genreId).name}</span>
              <span
                className={`w-10 shrink-0 text-right font-mono text-xs font-semibold ${
                  g.review >= 80 ? 'text-ok' : g.review < 60 ? 'text-warn' : 'text-ink-mute'
                }`}
              >
                {g.review}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function IndustryScreen() {
  const goTo = useGameStore((s) => s.goTo);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6" data-tour="industria">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Industria y competencia</h2>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-raised px-3 py-1.5 text-sm text-ink hover:bg-control"
        >
          Volver al estudio
        </button>
      </div>
      <RankingCard />
      <CalendarCard />
      <RecentCard />
    </main>
  );
}
