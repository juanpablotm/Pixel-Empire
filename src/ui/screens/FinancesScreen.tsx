import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  availableCredit,
  creditLimit,
  estimateRunwayWeeks,
  weeklyFixedCosts,
} from '../../core';
import { balance } from '../../data/balance';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../format';
import { ReputationRadar } from '../components/ReputationRadar';

/**
 * Pantalla de Finanzas (docs/10 §10.9): flujo de caja (Recharts), costes,
 * alertas de runway, línea de crédito (docs/06 §4) e ingresos por juego.
 * Solo lectura + despacho de acciones; los cálculos viven en core/.
 */
export function FinancesScreen() {
  const game = useGameStore((s) => s.game);
  const takeLoan = useGameStore((s) => s.takeLoan);
  const repayLoan = useGameStore((s) => s.repayLoan);
  const goTo = useGameStore((s) => s.goTo);
  const [loanAmount, setLoanAmount] = useState(5000);

  const runway = estimateRunwayWeeks(game);
  const limit = creditLimit(game);
  const available = availableCredit(game);
  const fixed = weeklyFixedCosts(game);
  const interest = Math.round(game.loanPrincipal * balance.economy.loans.weeklyInterest);

  const chartData = game.cashflow.map((entry) => ({
    week: entry.week,
    ingresos: entry.income,
    gastos: entry.expenses,
    neto: entry.income - entry.expenses,
  }));

  const clampLoan = (value: number) => Math.max(0, Math.round(value / 500) * 500);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Finanzas</h2>
        <button
          type="button"
          onClick={() => goTo('estudio')}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
        >
          Volver al estudio
        </button>
      </div>

      {/* Estado de caja y runway */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Caja</p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums ${
              game.studio.capital < 0 ? 'text-red-400' : 'text-amber-300'
            }`}
          >
            {formatMoney(game.studio.capital)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Costes recurrentes: {formatMoney(fixed)}/sem
            {interest > 0 && ` + ${formatMoney(interest)} de intereses`}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Runway</p>
          {runway === null ? (
            <p className="mt-1 text-2xl font-bold text-emerald-400">Estable</p>
          ) : (
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                runway <= 8 ? 'animate-pulse text-red-400' : 'text-amber-300'
              }`}
            >
              ~{runway} semanas
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {runway === null
              ? 'El flujo de caja reciente es positivo.'
              : 'Al ritmo de gasto actual, la caja se agota.'}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <ReputationRadar reputation={game.studio.reputation} size={56} />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Reputación</p>
            <p className="mt-1 text-xs text-slate-400">
              El banco presta según tu reputación; la comunidad compra según su cariño.
            </p>
          </div>
        </div>
      </section>

      {/* Flujo de caja semanal (docs/10 §10.9) */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Flujo de caja ({chartData.length} semanas)
        </h3>
        {chartData.length < 2 ? (
          <p className="text-sm text-slate-500">Aún no hay historial suficiente.</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} width={70} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
                  labelFormatter={(w) => `Semana ${String(w)}`}
                  formatter={(value, key) => [
                    typeof value === 'number' ? formatMoney(value) : String(value ?? ''),
                    String(key ?? ''),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  stroke="#34d399"
                  fill="#34d39933"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="gastos"
                  stroke="#f87171"
                  fill="#f8717122"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Línea de crédito (docs/06 §4) */}
      <section className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Línea de crédito
        </h3>
        <p className="text-sm text-slate-400">
          Deuda viva: <span className="font-semibold text-slate-200">{formatMoney(game.loanPrincipal)}</span>{' '}
          · límite {formatMoney(limit)} · disponible {formatMoney(available)} · interés ~
          {Math.round(balance.economy.loans.weeklyInterest * 100)} %/semana
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={0}
            step={500}
            value={loanAmount}
            onChange={(e) => setLoanAmount(clampLoan(Number(e.target.value)))}
            aria-label="Importe del préstamo"
            className="w-32 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm tabular-nums"
          />
          <button
            type="button"
            disabled={loanAmount <= 0 || loanAmount > available}
            onClick={() => takeLoan(loanAmount)}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
          >
            🏦 Pedir préstamo
          </button>
          <button
            type="button"
            disabled={
              game.loanPrincipal <= 0 ||
              loanAmount <= 0 ||
              Math.min(loanAmount, game.loanPrincipal) > game.studio.capital
            }
            onClick={() => repayLoan(loanAmount)}
            className="rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            Amortizar
          </button>
          <p className="text-xs text-slate-500">
            La deuda presiona hacia la codicia. El impago sostenido acelera la bancarrota.
          </p>
        </div>
      </section>

      {/* Ingresos por juego */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Ingresos por juego
        </h3>
        {game.releasedGames.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay juegos lanzados.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {[...game.releasedGames].reverse().map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-slate-800/60 px-3 py-2"
              >
                <span className="font-medium">{g.name}</span>
                <span className="text-slate-400">{formatMoney(g.totalRevenue)}</span>
                {g.mtxRevenue > 0 && (
                  <span className="text-xs text-amber-400">
                    MTX: {formatMoney(g.mtxRevenue)}
                  </span>
                )}
                <span className="ml-auto text-xs text-slate-500">
                  {g.salesActive ? 'a la venta' : 'fuera de tiendas'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
