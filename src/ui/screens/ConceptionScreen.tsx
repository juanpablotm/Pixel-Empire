import { useState } from 'react';
import {
  availableGenres,
  availableMonetizationModels,
  availablePlatforms,
  availableThemes,
  computeFit,
  estimateProject,
  fitBand,
  lootBoxesBanned,
  monetizationFlagAvailable,
  platformAvailable,
  sizeBlockReason,
  type Audience,
  type MonetizationModel,
  type ProjectSize,
} from '../../core';
import { genres } from '../../data/genres';
import { themes } from '../../data/themes';
import { platforms } from '../../data/platforms';
import { defaultMonetization, getMonetizationModel } from '../../data/monetization';
import { audienceLabels, sizeLabels } from '../../data/reviewTexts';
import { platformStageLabels } from '../../data/marketTexts';
import { balance } from '../../data/balance';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
import { FitMeter } from '../components/FitMeter';
import { TrendArrow } from '../components/TrendArrow';

/**
 * Asistente de concepción (docs/10 §10.2): Tema → Género → Plataforma →
 * Público → Tamaño → Precio → Monetización → Nombre, con medidor de Fit en
 * vivo y tendencias a la vista. Solo muestra el contenido desbloqueado por
 * era/investigación (docs/09 §7 y docs/10 §14). Precio y monetización son
 * las palancas morales de docs/06 §2; el núcleo valida y calcula.
 */

const AUDIENCES: Audience[] = ['hardcore', 'amplio', 'casual', 'infantil'];
const SIZES: ProjectSize[] = ['pequeno', 'mediano', 'grande', 'aaa'];

function OptionButton({
  selected,
  onClick,
  children,
  disabled = false,
  title,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        selected
          ? 'bg-action-hi text-onbright'
          : 'bg-raised text-ink hover:bg-control'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold uppercase tracking-wide text-ink-mute">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function ConceptionScreen() {
  const start = useGameStore((s) => s.startProject);
  const goTo = useGameStore((s) => s.goTo);
  // La pantalla filtra contenido con los helpers de core (era + investigación),
  // que reciben el estado entero; se abre en pausa, así que no hay coste real.
  const game = useGameStore((s) => s.game);
  const market = game.market;
  const week = game.week;
  const regulation = game.regulation;

  const themesShown = availableThemes(game);
  const genresShown = availableGenres(game);
  const platformsShown = availablePlatforms(game);
  const modelsShown = availableMonetizationModels(game);
  const lootBoxesInvented = monetizationFlagAvailable(game, 'lootBoxes');
  const battlePassInvented = monetizationFlagAvailable(game, 'battlePass');

  const [name, setName] = useState('');
  const [themeId, setThemeId] = useState(themes[0].id);
  const [genreId, setGenreId] = useState(genres[0].id);
  const [platformId, setPlatformId] = useState(platforms[0].id);
  const [audience, setAudience] = useState<Audience>('amplio');
  const [size, setSize] = useState<ProjectSize>('pequeno');
  // El precio se guarda como multiplicador del recomendado (así sobrevive a
  // los cambios de tamaño); el núcleo recibe el precio final en 💰.
  const [priceMult, setPriceMult] = useState(1);
  const [model, setModel] = useState<MonetizationModel>('premium');
  const [aggressiveness, setAggressiveness] = useState(0);
  const [hasLootBoxes, setHasLootBoxes] = useState(false);
  const [hasBattlePass, setHasBattlePass] = useState(false);
  const [dayOneDLC, setDayOneDLC] = useState(false);

  const { fit } = computeFit({ themeId, genreId, platformId, audience });
  const estimate = estimateProject(size, platformId);
  const canStart = name.trim() !== '';

  const pricing = balance.economy.pricing;
  const recommended = balance.economy.priceBySize[size];
  const isF2p = model === 'f2p';
  const price = isF2p ? recommended : Math.round(recommended * priceMult);
  const modelDef = getMonetizationModel(model);
  const banned = lootBoxesBanned({ regulation });

  const priceTone =
    priceMult >= pricing.abusiveMultiplier
      ? { text: 'abusivo: más margen, público enfadado', color: 'text-danger' }
      : priceMult <= pricing.generousMultiplier
        ? { text: 'generoso: menos margen, más cariño', color: 'text-ok' }
        : { text: 'justo', color: 'text-ink-mute' };

  const onStart = () => {
    start({
      name,
      themeId,
      genreId,
      platformId,
      audience,
      size,
      price,
      monetization: {
        ...defaultMonetization(),
        model,
        aggressiveness: modelDef.supportsMtx ? aggressiveness : 0,
        hasLootBoxes: modelDef.supportsMtx && lootBoxesInvented && !banned ? hasLootBoxes : false,
        hasBattlePass: modelDef.supportsMtx && battlePassInvented ? hasBattlePass : false,
        dayOneDLC: modelDef.supportsDayOneDlc ? dayOneDLC : false,
      },
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Nuevo juego</h2>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-raised px-3 py-1.5 text-sm text-ink hover:bg-control"
        >
          Cancelar
        </button>
      </div>

      <section className="flex flex-col gap-5 card">
        <Field label="Tema">
          {themesShown.map((t) => (
            <OptionButton key={t.id} selected={themeId === t.id} onClick={() => setThemeId(t.id)}>
              {t.name}{' '}
              {market.themes[t.id] && <TrendArrow direction={market.themes[t.id].direction} />}
            </OptionButton>
          ))}
        </Field>

        <Field label="Género">
          {genresShown.map((g) => (
            <OptionButton key={g.id} selected={genreId === g.id} onClick={() => setGenreId(g.id)}>
              {g.name}{' '}
              {market.genres[g.id] && <TrendArrow direction={market.genres[g.id].direction} />}
            </OptionButton>
          ))}
        </Field>

        <Field label="Plataforma">
          {platformsShown.map((p) => {
            const available = platformAvailable(p, week);
            const stage = market.platforms[p.id]?.stage;
            return (
              <OptionButton
                key={p.id}
                selected={platformId === p.id}
                disabled={!available}
                onClick={() => setPlatformId(p.id)}
                title={stage ? platformStageLabels[stage] : undefined}
              >
                {p.name}
                {stage && (
                  <span className="ml-1.5 text-xs opacity-75">({platformStageLabels[stage]})</span>
                )}
              </OptionButton>
            );
          })}
        </Field>

        <Field label="Público objetivo">
          {AUDIENCES.map((a) => (
            <OptionButton key={a} selected={audience === a} onClick={() => setAudience(a)}>
              {audienceLabels[a]}
            </OptionButton>
          ))}
        </Field>

        <Field label="Tamaño del proyecto">
          {SIZES.map((s) => {
            // Cada tamaño exige etapa de escala y plantilla mínimas (docs/17 E1):
            // los bloqueados salen atenuados con su requisito (el AAA, hasta ser
            // Corporación). El núcleo decide el motivo; la UI solo lo muestra.
            const blocked = sizeBlockReason(game, s);
            return (
              <OptionButton
                key={s}
                selected={size === s}
                disabled={blocked !== null}
                title={blocked ?? undefined}
                onClick={() => setSize(s)}
              >
                {sizeLabels[s]}
                {blocked && <span className="ml-1.5 text-xs opacity-75">🔒 {blocked}</span>}
              </OptionButton>
            );
          })}
        </Field>

        {/* Precio: palanca moral (docs/06 §2) */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-ink-mute">
            Precio {isF2p && '(gratis: los ingresos salen de las MTX)'}
          </span>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={Math.round(pricing.minMultiplier * 100)}
              max={Math.round(pricing.maxMultiplier * 100)}
              value={Math.round(priceMult * 100)}
              disabled={isF2p}
              onChange={(e) => setPriceMult(Number(e.target.value) / 100)}
              aria-label="Precio de venta"
              className="flex-1 accent-action-hi disabled:opacity-40"
            />
            <span className="w-32 text-right text-sm tabular-nums">
              {isF2p ? 'Gratis' : `${formatMoney(price)}`}
              <span className="ml-1 text-xs text-ink-faint">(rec. {formatMoney(recommended)})</span>
            </span>
          </div>
          {!isF2p && <p className={`text-xs ${priceTone.color}`}>Precio {priceTone.text}.</p>}
        </div>

        {/* Monetización: la gran palanca de codicia (docs/06 §2, docs/09 §9) */}
        <Field label="Modelo de negocio">
          {modelsShown.map((m) => (
            <OptionButton
              key={m.id}
              selected={model === m.id}
              onClick={() => setModel(m.id)}
              title={m.description}
            >
              {m.name}
            </OptionButton>
          ))}
        </Field>

        {modelDef.supportsMtx && (
          <div className="flex flex-col gap-3 rounded-md border border-warn/30 bg-warn/10 p-3">
            <div className="flex items-center gap-4">
              <span className="w-48 shrink-0 text-sm">Agresividad de la tienda</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(aggressiveness * 100)}
                onChange={(e) => setAggressiveness(Number(e.target.value) / 100)}
                aria-label="Agresividad de monetización"
                className="flex-1 accent-warn"
              />
              <span className="w-12 text-right text-sm tabular-nums text-ink-mute">
                {Math.round(aggressiveness * 100)} %
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {lootBoxesInvented && (
                <label className={`flex items-center gap-2 ${banned ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={hasLootBoxes && !banned}
                    disabled={banned}
                    onChange={(e) => setHasLootBoxes(e.target.checked)}
                    className="accent-warn"
                  />
                  Loot boxes {banned && '(prohibidas por ley)'}
                </label>
              )}
              {battlePassInvented && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasBattlePass}
                    onChange={(e) => setHasBattlePass(e.target.checked)}
                    className="accent-warn"
                  />
                  Pase de batalla
                </label>
              )}
            </div>
            <p className="text-xs text-capital/80">
              Más ingresos por jugador… y los hardcore afilan las antorchas. La codicia se paga.
            </p>
          </div>
        )}

        {modelDef.supportsDayOneDlc && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dayOneDLC}
              onChange={(e) => setDayOneDLC(e.target.checked)}
              className="accent-warn"
            />
            DLC day-one <span className="text-xs text-ink-faint">(ingreso extra; huele a juego recortado)</span>
          </label>
        )}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="game-name"
            className="text-sm font-semibold uppercase tracking-wide text-ink-mute"
          >
            Nombre del juego
          </label>
          <input
            id="game-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="El próximo bombazo…"
            className="w-full rounded-md border border-line-hi bg-raised px-3 py-2 text-ink-hi placeholder:text-ink-faint focus:border-action-hi focus:outline-none"
          />
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 card">
        <div data-tour="fit-meter">
          <FitMeter band={fitBand(fit)} />
        </div>
        <div className="text-sm text-ink-mute">
          ~{estimate.weeks} semanas · ~{formatMoney(estimate.cost)} + features ·{' '}
          {isF2p ? 'gratis (MTX)' : `precio ${formatMoney(price)}`}
        </div>
        <button
          type="button"
          data-tour="start-dev"
          disabled={!canStart}
          onClick={onStart}
          className="btn btn-primary px-4 py-2 disabled:cursor-not-allowed disabled:bg-control disabled:text-ink-faint"
        >
          Empezar desarrollo
        </button>
      </section>
    </main>
  );
}
