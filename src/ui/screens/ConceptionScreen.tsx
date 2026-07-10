import { useState } from 'react';
import { computeFit, estimateProject, fitBand, type Audience, type ProjectSize } from '../../core';
import { genres } from '../../data/genres';
import { themes } from '../../data/themes';
import { platforms } from '../../data/platforms';
import { audienceLabels, sizeLabels } from '../../data/reviewTexts';
import { balance } from '../../data/balance';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
import { FitMeter } from '../components/FitMeter';

/**
 * Asistente de concepción (docs/10 §10.2): Tema → Género → Plataforma →
 * Público → Tamaño → Nombre, con medidor de Fit en vivo. La UI solo muestra:
 * el fit lo calcula core/systems/quality.ts.
 */

const AUDIENCES: Audience[] = ['hardcore', 'amplio', 'casual', 'infantil'];
const SIZES: ProjectSize[] = ['pequeno', 'mediano', 'grande', 'aaa'];

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        selected
          ? 'bg-emerald-500 text-slate-950'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
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

  const [name, setName] = useState('');
  const [themeId, setThemeId] = useState(themes[0].id);
  const [genreId, setGenreId] = useState(genres[0].id);
  const [platformId, setPlatformId] = useState(platforms[0].id);
  const [audience, setAudience] = useState<Audience>('amplio');
  const [size, setSize] = useState<ProjectSize>('pequeno');

  const { fit } = computeFit({ themeId, genreId, platformId, audience });
  const estimate = estimateProject(size, platformId);
  const canStart = name.trim() !== '';

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
              {t.name}
            </OptionButton>
          ))}
        </Field>

        <Field label="Género">
          {genres.map((g) => (
            <OptionButton key={g.id} selected={genreId === g.id} onClick={() => setGenreId(g.id)}>
              {g.name}
            </OptionButton>
          ))}
        </Field>

        <Field label="Plataforma">
          {platforms.map((p) => (
            <OptionButton
              key={p.id}
              selected={platformId === p.id}
              onClick={() => setPlatformId(p.id)}
            >
              {p.name}
            </OptionButton>
          ))}
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
          ~{estimate.weeks} semanas · ~{formatMoney(estimate.cost)} + features · precio{' '}
          {formatMoney(balance.economy.priceBySize[size])}
        </div>
        <button
          type="button"
          disabled={!canStart}
          onClick={() => start({ name, themeId, genreId, platformId, audience, size })}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          Empezar desarrollo
        </button>
      </section>
    </main>
  );
}
