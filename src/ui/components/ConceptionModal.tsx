import { useState } from 'react';
import {
  availableGenres,
  availableMonetizationModels,
  availablePlatforms,
  availableThemes,
  computeFit,
  estimateProject,
  fitBand,
  fitRevealed,
  lootBoxesBanned,
  monetizationFlagAvailable,
  platformAvailable,
  priceRevealed,
  sizeBlockReason,
  type Audience,
  type MonetizationModel,
  type ProjectSize,
} from '../../core';
import { defaultMonetization, getMonetizationModel } from '../../data/monetization';
import { audienceLabels, sizeLabels } from '../../data/reviewTexts';
import { platformStageLabels } from '../../data/marketTexts';
import { balance } from '../../data/balance';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
import { FitMeter } from './FitMeter';
import { PopIn } from './Motion';
import { TrendArrow } from './TrendArrow';

/**
 * Asistente de concepción (docs/10 §10.2), en MODAL desde la Fase 8.5
 * (docs/17 U3): Tema → Género → Plataforma → Público → Tamaño → Precio →
 * Monetización → Nombre, con medidor de Fit en vivo. Tema, género y plataforma
 * usan SELECTORES: el catálogo crece con las eras y listarlo entero abruma.
 * Público y tamaño siguen como botones (4 opciones fijas, y el tamaño enseña su
 * requisito 🔒 de docs/17 E1).
 *
 * Solo muestra el contenido desbloqueado por era/investigación (docs/09 §7 y
 * docs/10 §14). Precio y monetización son las palancas morales de docs/06 §2;
 * el núcleo valida y calcula. Abrirlo pausa el tiempo (docs/02 §1), así que
 * leer el estado entero no cuesta ticks.
 */

const AUDIENCES: Audience[] = ['hardcore', 'amplio', 'casual', 'infantil'];
const SIZES: ProjectSize[] = ['pequeno', 'mediano', 'grande', 'aaa'];

/** Flecha de tendencia en texto: dentro de un <option> no caben componentes. */
const TREND_MARK: Record<string, string> = { sube: '↑', baja: '↓', estable: '→' };

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
        selected ? 'bg-action-hi text-onbright' : 'bg-raised text-ink hover:bg-control'
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

/** Selector con etiqueta y una línea de detalle debajo (docs/17 U3). */
function SelectField({
  id,
  label,
  value,
  onChange,
  detail,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  detail?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-semibold uppercase tracking-wide text-ink-mute"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line-hi bg-raised px-3 py-2 text-sm text-ink-hi focus:border-action-hi focus:outline-none"
      >
        {children}
      </select>
      {detail && <p className="flex items-center gap-1.5 text-xs text-ink-faint">{detail}</p>}
    </div>
  );
}

export function ConceptionModal() {
  const open = useGameStore((s) => s.conceptionOpen);
  // Cede el paso a lo que exige decisión: nunca dos modales compitiendo.
  const blocked = useGameStore(
    (s) =>
      s.game.gameOver !== null ||
      s.eraTransition !== null ||
      s.awardsWeek !== null ||
      s.pendingNotices.length > 0 ||
      s.game.community.crises.some((c) => c.status === 'abierta') ||
      s.game.community.dilemmas.length > 0,
  );
  if (!open || blocked) return null;
  return <ConceptionForm />;
}

/**
 * El formulario vive aparte para que su estado local (la idea a medio pensar)
 * nazca y muera con el modal: cerrar y volver a abrir empieza de cero.
 */
function ConceptionForm() {
  const start = useGameStore((s) => s.startProject);
  const close = useGameStore((s) => s.closeConception);
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
  // El contenido disponible manda: la primera opción de cada selector es la
  // que el jugador tiene desbloqueada hoy (docs/09 §7), no la del catálogo.
  const [themeId, setThemeId] = useState(themesShown[0].id);
  const [genreId, setGenreId] = useState(genresShown[0].id);
  const [platformId, setPlatformId] = useState(platformsShown[0].id);
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

  // Conocimiento de mercado (docs/17 P2): el atajo PREDICTIVO se paga. Si no lo
  // has investigado, el Fit sale "oculto" y el precio recomendado no se muestra;
  // aun así puedes concebir el juego (el desglose posterior siempre enseña).
  const fitKnown = fitRevealed(game, themeId, genreId);
  const priceKnown = priceRevealed(game, size);

  const pricing = balance.economy.pricing;
  const recommended = balance.economy.priceBySize[size];
  const isF2p = model === 'f2p';
  const price = isF2p ? recommended : Math.round(recommended * priceMult);
  const modelDef = getMonetizationModel(model);
  const banned = lootBoxesBanned({ regulation });

  const themeTrend = market.themes[themeId];
  const genreTrend = market.genres[genreId];
  const platformStage = market.platforms[platformId]?.stage;

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo juego"
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-scrim px-4 py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <PopIn className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-line-hi bg-panel shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink-hi">💡 Nuevo juego</h2>
            <p className="text-sm text-ink-mute">El tiempo está en pausa: piénsalo con calma.</p>
          </div>
          <button type="button" onClick={close} className="btn btn-quiet">
            ✕ Cancelar
          </button>
        </div>

        <div className="scroll-slim flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {/* La idea: selectores porque el catálogo crece con cada era. */}
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              id="concept-theme"
              label="Tema"
              value={themeId}
              onChange={setThemeId}
              detail={
                themeTrend && (
                  <>
                    <TrendArrow direction={themeTrend.direction} /> tendencia del tema
                  </>
                )
              }
            >
              {themesShown.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {market.themes[t.id] ? ` ${TREND_MARK[market.themes[t.id].direction] ?? ''}` : ''}
                </option>
              ))}
            </SelectField>

            <SelectField
              id="concept-genre"
              label="Género"
              value={genreId}
              onChange={setGenreId}
              detail={
                genreTrend && (
                  <>
                    <TrendArrow direction={genreTrend.direction} /> tendencia del género
                  </>
                )
              }
            >
              {genresShown.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {market.genres[g.id] ? ` ${TREND_MARK[market.genres[g.id].direction] ?? ''}` : ''}
                </option>
              ))}
            </SelectField>

            <SelectField
              id="concept-platform"
              label="Plataforma"
              value={platformId}
              onChange={setPlatformId}
              detail={
                platformStage ? `Ciclo de vida: ${platformStageLabels[platformStage]}` : undefined
              }
            >
              {platformsShown.map((p) => {
                const stage = market.platforms[p.id]?.stage;
                return (
                  <option key={p.id} value={p.id} disabled={!platformAvailable(p, week)}>
                    {p.name}
                    {stage ? ` (${platformStageLabels[stage]})` : ''}
                  </option>
                );
              })}
            </SelectField>
          </div>

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
                {!isF2p && priceKnown && (
                  <span className="ml-1 text-xs text-ink-faint">
                    (rec. {formatMoney(recommended)})
                  </span>
                )}
              </span>
            </div>
            {!isF2p &&
              (priceKnown ? (
                <p className={`text-xs ${priceTone.color}`}>Precio {priceTone.text}.</p>
              ) : (
                <p className="text-xs text-ink-faint">
                  ❓ Referencia de mercado por investigar (Análisis de mercado, en I+D).
                </p>
              ))}
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
              DLC day-one{' '}
              <span className="text-xs text-ink-faint">(ingreso extra; huele a juego recortado)</span>
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
        </div>

        {/* El veredicto de la idea, siempre a la vista: no scrollea con el form. */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-4">
          <div data-tour="fit-meter">
            <FitMeter band={fitKnown ? fitBand(fit) : 'oculto'} />
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
        </div>
      </PopIn>
    </div>
  );
}
