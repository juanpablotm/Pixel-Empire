import { useState } from 'react';
import {
  computeFit,
  estimateProject,
  fitBand,
  lootBoxesBanned,
  platformAvailable,
  type Audience,
  type MonetizationModel,
  type ProjectSize,
} from '../../core';
import { genres } from '../../data/genres';
import { themes } from '../../data/themes';
import { platforms } from '../../data/platforms';
import { defaultMonetization, monetizationModels, getMonetizationModel } from '../../data/monetization';
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
 * vivo y tendencias a la vista. Precio y monetización son las palancas
 * morales de docs/06 §2; la UI solo muestra, el núcleo valida y calcula.
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
          ? 'bg-emerald-500 text-slate-950'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function ConceptionScreen() {
  const start = useGameStore((s) => s.startProject);
  const goTo = useGameStore((s) => s.goTo);
  const market = useGameStore((s) => s.game.market);
  const week = useGameStore((s) => s.game.week);
  const regulation = useGameStore((s) => s.game.regulation);

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
      ? { text: 'abusivo: más margen, público enfadado', color: 'text-red-400' }
      : priceMult <= pricing.generousMultiplier
        ? { text: 'generoso: menos margen, más cariño', color: 'text-emerald-400' }
        : { text: 'justo', color: 'text-slate-400' };

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
        hasLootBoxes: modelDef.supportsMtx && !banned ? hasLootBoxes : false,
        hasBattlePass: modelDef.supportsMtx ? hasBattlePass : false,
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
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
        >
          Cancelar
        </button>
      </div>

      <section className="flex flex-col gap-5 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <Field label="Tema">
          {themes.map((t) => (
            <OptionButton key={t.id} selected={themeId === t.id} onClick={() => setThemeId(t.id)}>
              {t.name}{' '}
              {market.themes[t.id] && <TrendArrow direction={market.themes[t.id].direction} />}
            </OptionButton>
          ))}
        </Field>

        <Field label="Género">
          {genres.map((g) => (
            <OptionButton key={g.id} selected={genreId === g.id} onClick={() => setGenreId(g.id)}>
              {g.name}{' '}
              {market.genres[g.id] && <TrendArrow direction={market.genres[g.id].direction} />}
            </OptionButton>
          ))}
        </Field>

        <Field label="Plataforma">
          {platforms.map((p) => {
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
          {SIZES.map((s) => (
            <OptionButton key={s} selected={size === s} onClick={() => setSize(s)}>
              {sizeLabels[s]}
            </OptionButton>
          ))}
        </Field>

        {/* Precio: palanca moral (docs/06 §2) */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">
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
              className="flex-1 accent-emerald-500 disabled:opacity-40"
            />
            <span className="w-32 text-right text-sm tabular-nums">
              {isF2p ? 'Gratis' : `${formatMoney(price)}`}
              <span className="ml-1 text-xs text-slate-500">(rec. {formatMoney(recommended)})</span>
            </span>
          </div>
          {!isF2p && <p className={`text-xs ${priceTone.color}`}>Precio {priceTone.text}.</p>}
        </div>

        {/* Monetización: la gran palanca de codicia (docs/06 §2, docs/09 §9) */}
        <Field label="Modelo de negocio">
          {monetizationModels.map((m) => (
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
          <div className="flex flex-col gap-3 rounded-md border border-amber-900/50 bg-amber-950/20 p-3">
            <div className="flex items-center gap-4">
              <span className="w-48 shrink-0 text-sm">Agresividad de la tienda</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(aggressiveness * 100)}
                onChange={(e) => setAggressiveness(Number(e.target.value) / 100)}
                aria-label="Agresividad de monetización"
                className="flex-1 accent-amber-500"
              />
              <span className="w-12 text-right text-sm tabular-nums text-slate-400">
                {Math.round(aggressiveness * 100)} %
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <label className={`flex items-center gap-2 ${banned ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={hasLootBoxes && !banned}
                  disabled={banned}
                  onChange={(e) => setHasLootBoxes(e.target.checked)}
                  className="accent-amber-500"
                />
                Loot boxes {banned && '(prohibidas por ley)'}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasBattlePass}
                  onChange={(e) => setHasBattlePass(e.target.checked)}
                  className="accent-amber-500"
                />
                Pase de batalla
              </label>
            </div>
            <p className="text-xs text-amber-300/80">
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
              className="accent-amber-500"
            />
            DLC day-one <span className="text-xs text-slate-500">(ingreso extra; huele a juego recortado)</span>
          </label>
        )}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="game-name"
            className="text-sm font-semibold uppercase tracking-wide text-slate-400"
          >
            Nombre del juego
          </label>
          <input
            id="game-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="El próximo bombazo…"
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <FitMeter band={fitBand(fit)} />
        <div className="text-sm text-slate-400">
          ~{estimate.weeks} semanas · ~{formatMoney(estimate.cost)} + features ·{' '}
          {isF2p ? 'gratis (MTX)' : `precio ${formatMoney(price)}`}
        </div>
        <button
          type="button"
          disabled={!canStart}
          onClick={onStart}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          Empezar desarrollo
        </button>
      </section>
    </main>
  );
}
