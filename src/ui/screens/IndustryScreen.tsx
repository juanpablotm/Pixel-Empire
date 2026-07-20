import {
  acquisitionBlockReason,
  acquisitionPriceFor,
  aggregateReputation,
  announcedReleases,
  projectTotalWeeks,
  recentRivalGames,
  subsidiaryList,
  subsidiarySellPrice,
  subsidiaryUpkeep,
  type RivalRuntime,
  type Subsidiary,
  type SubsidiaryDirective,
} from '../../core';
import { balance } from '../../data/balance';
import { getGenre } from '../../data/genres';
import { getRivalDef, rivalTierLabels } from '../../data/rivals';
import { sizeLabels } from '../../data/reviewTexts';
import { playerStudioLabel } from '../../data/awards';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
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
  const game = useGameStore((s) => s.game);
  const acquire = useGameStore((s) => s.acquireStudio);
  const rivals = game.rivals?.studios ?? [];

  // Ranking presentacional: los rivales por su fuerza; tú entras con tu
  // reputación media como peso comparable (es fama, no simulación — y se dice).
  // Los adquiridos (9.7) no compiten: viven abajo, en "Tus filiales".
  const playerWeight = aggregateReputation(game.studio.reputation);
  const rows = [
    ...rivals
      .filter((r) => !r.closed && r.acquiredWeek === undefined)
      .map((r) => ({
        key: r.id,
        name: getRivalDef(r.id).name,
        tier: rivalTierLabels[r.tier],
        weight: r.strength,
        momentum: momentum(r),
        isPlayer: false,
        lastReviews: r.games.slice(-3).map((g) => g.review),
        buyable: balance.acquisitions.buyableTiers.includes(r.tier),
        blocked: acquisitionBlockReason(game, r.id),
        price: acquisitionPriceFor(game, r.id),
      })),
    {
      key: 'player',
      name: playerStudioLabel,
      tier: ['', 'Garaje', 'Estudio pequeño', 'Estudio', 'Estudio grande', 'Corporación'][game.studio.scaleStage],
      weight: playerWeight,
      momentum: { icon: '·', label: 'tu reputación' },
      isPlayer: true,
      lastReviews: [] as number[],
      buyable: false,
      blocked: null as string | null,
      price: null as number | null,
    },
  ].sort((a, b) => b.weight - a.weight);

  const closed = rivals.filter((r) => r.closed);
  const acquired = rivals.filter((r) => r.acquiredWeek !== undefined);
  // El botón de compra solo asoma cuando las adquisiciones existen para ti
  // (etapa mínima): antes, la industria no está en venta — menos ruido.
  const shopping = game.studio.scaleStage >= balance.acquisitions.minStage;

  return (
    <section className="card" data-tour="adquisiciones">
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
            {shopping && !row.isPlayer && row.buyable && (
              <button
                type="button"
                disabled={row.blocked !== null}
                title={row.blocked ?? `Adquirir ${row.name}: sale de la competencia y pasa a ser tu filial`}
                onClick={() => acquire(row.key)}
                className="btn btn-quiet shrink-0 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-45"
              >
                🏢 {row.price !== null ? formatMoney(row.price) : 'Adquirir'}
              </button>
            )}
          </StaggerItem>
        ))}
      </StaggerGroup>
      {(closed.length > 0 || acquired.length > 0) && (
        <p className="mt-3 border-t border-line pt-2 text-xs text-ink-faint">
          {acquired.length > 0 &&
            `Adquiridos por ti: ${acquired.map((r) => getRivalDef(r.id).name).join(' · ')}. `}
          {closed.length > 0 && `Cerraron: ${closed.map((r) => getRivalDef(r.id).name).join(' · ')}`}
        </p>
      )}
    </section>
  );
}

/** Etiquetas y ayuda de las directivas de filial (docs/02 §4, macro-dilema). */
const DIRECTIVES: { id: SubsidiaryDirective; label: string; hint: string }[] = [
  { id: 'exprimir', label: 'Exprimir', hint: 'Más juegos y más caja hoy; moral y talento en caída, tu fama de Empleador sangra' },
  { id: 'autonomo', label: 'Autónomo', hint: 'Su ritmo, su gente: sin extras ni castigos' },
  { id: 'invertir', label: 'Invertir', hint: 'Overhead +50 %: moral y talento crecen, mejores juegos mañana' },
];

function SubsidiaryRow({ sub }: { sub: Subsidiary }) {
  const week = useGameStore((s) => s.game.week);
  const setDirective = useGameStore((s) => s.setSubsidiaryDirective);
  const sell = useGameStore((s) => s.sellSubsidiary);
  const last = sub.games[sub.games.length - 1];
  const flow = Math.round(sub.pendingIncome * balance.acquisitions.payoutRate);
  const upkeep = subsidiaryUpkeep(sub);
  const net = flow - upkeep;

  return (
    <li className="flex flex-col gap-2 rounded-md border border-line bg-raised/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold text-ink-hi">
          {sub.name}
          <span className="ml-2 text-xs font-normal text-ink-faint">
            {rivalTierLabels[sub.tier]} · comprada sem. {sub.acquiredWeek} por {formatMoney(sub.price)}
          </span>
        </span>
        <span className={`text-sm font-semibold tabular-nums ${net >= 0 ? 'text-ok' : 'text-danger'}`}>
          {net >= 0 ? '+' : ''}
          {formatMoney(net)}/sem
        </span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-mute">
        <span>
          Talento <span className="font-semibold tabular-nums text-ink">{Math.round(sub.talent)}</span>
        </span>
        <span>
          Moral <span className="font-semibold tabular-nums text-ink">{Math.round(sub.morale)}</span>
        </span>
        <span>
          Próximo juego en ~{Math.max(0, sub.nextReleaseWeek - week)} sem.
        </span>
        <span>
          P&L {formatMoney(sub.revenue)} − {formatMoney(sub.upkeepPaid)}
        </span>
        {last && (
          <span title={`Su último lanzamiento (semana ${last.releaseWeek})`}>
            Último: «{last.name}» r{last.review}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {DIRECTIVES.map((d) => (
            <button
              key={d.id}
              type="button"
              title={d.hint}
              onClick={() => setDirective(sub.id, d.id)}
              className={`rounded-full px-2.5 py-1 text-xs ${
                sub.directive === d.id
                  ? 'bg-action text-white'
                  : 'bg-raised text-ink-mute hover:bg-control'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => sell(sub.id)}
          className="btn btn-quiet px-2.5 py-1 text-xs"
          title="Vender a un holding sin cara: recuperas parte del valor actual (el talento manda)"
        >
          Vender ({formatMoney(subsidiarySellPrice(sub))})
        </button>
      </div>
    </li>
  );
}

/** Tus filiales (Fase 9.7, docs/19 §9.7): la cartera de estudios comprados. */
function SubsidiariesCard() {
  const subs = useGameStore((s) => subsidiaryList(s.game));
  const scaleStage = useGameStore((s) => s.game.studio.scaleStage);
  if (subs.length === 0 && scaleStage < balance.acquisitions.minStage) return null;

  return (
    <section className="card" data-tour="filiales">
      <h3 className="card-title">Tus filiales</h3>
      {subs.length === 0 ? (
        <p className="text-sm text-ink-faint">
          Ninguna todavía. Compra un estudio del ranking (los gigantes no se venden): sale de la
          competencia y hace juegos para ti — a cambio de un desembolso grande y su overhead
          semanal. Cómo lo gestiones decide si es una mina o un pozo.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {subs.map((sub) => (
            <SubsidiaryRow key={sub.id} sub={sub} />
          ))}
        </ul>
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
      <SubsidiariesCard />
      <CalendarCard />
      <RecentCard />
    </main>
  );
}
