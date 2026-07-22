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
  outstandingDebt,
  weeklyFixedCosts,
  weeklyLoanInterest,
  weeklyMinimumPayment,
} from '../../core';
import { balance } from '../../data/balance';
import { useGameStore } from '../../state/store';
import { formatMoney, formatRate } from '../format';
import { EmptyState } from '../components/EmptyState';
import { RollingNumber } from '../components/Motion';
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
  // Deuda viva = principal + interés acumulado; el interés de la semana que
  // viene compone sobre el total (docs/20 W1). El núcleo hace las cuentas.
  const debt = outstandingDebt(game);
  const interest = weeklyLoanInterest(game);
  // La cuota obligatoria de 10.2-B (docs/20 §Préstamos) SÍ sale de caja: es lo
  // que convierte endeudarse en una decisión con consecuencia, así que se
  // muestra al lado del interés y no escondida en los gastos.
  const minPayment = weeklyMinimumPayment(game);

  const chartData = game.cashflow.map((entry) => ({
    week: entry.week,
    ingresos: entry.income,
    gastos: entry.expenses,
    interes: entry.interest ?? 0,
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
          className="rounded-md bg-raised px-3 py-1.5 text-sm text-ink hover:bg-control"
        >
          Volver al estudio
        </button>
      </div>

      {/* Estado de caja y runway */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-xs uppercase tracking-wide text-ink-faint">Caja</p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums ${
              game.studio.capital < 0 ? 'text-danger' : 'text-capital'
            }`}
          >
            <RollingNumber value={game.studio.capital} format={formatMoney} />
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            Costes recurrentes: {formatMoney(fixed)}/sem
            {debt > 0 && ` · deuda viva ${formatMoney(debt)}`}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-xs uppercase tracking-wide text-ink-faint">Runway</p>
          {runway === null ? (
            <p className="mt-1 text-2xl font-bold text-ok">Estable</p>
          ) : (
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                runway <= 8 ? 'animate-pulse text-danger' : 'text-capital'
              }`}
            >
              ~{runway} semanas
            </p>
          )}
          <p className="mt-1 text-xs text-ink-faint">
            {runway === null
              ? 'El flujo de caja reciente es positivo.'
              : 'Al ritmo de gasto actual, la caja se agota.'}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-line bg-panel p-4">
          <ReputationRadar reputation={game.studio.reputation} size={56} />
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-faint">Reputación</p>
            <p className="mt-1 text-xs text-ink-mute">
              El banco presta según tu reputación; la comunidad compra según su cariño.
            </p>
          </div>
        </div>
      </section>

      {/* Flujo de caja semanal (docs/10 §10.9) */}
      <section className="card">
        <h3 className="card-title">
          Flujo de caja ({chartData.length} semanas)
        </h3>
        {chartData.length < 2 ? (
          <EmptyState icon="📈" compact>
            A la caja le falta historia: deja correr un par de semanas y este gráfico
            cobrará vida con tus ingresos y gastos.
          </EmptyState>
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
                {debt > 0 && (
                  <Area
                    type="monotone"
                    dataKey="interes"
                    stroke="#fbbf24"
                    fill="#fbbf2422"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Línea de crédito (docs/06 §4; interés que compone desde 10.1, docs/20 W1) */}
      <section className="flex flex-col gap-3 card">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-mute">
          Línea de crédito
        </h3>
        <p className="text-sm text-ink-mute">
          Deuda viva:{' '}
          <span className={`font-semibold ${game.debtSpiral ? 'text-danger' : 'text-ink'}`}>
            {formatMoney(debt)}
          </span>
          {game.loanInterest > 0 && (
            <span className="text-ink-faint">
              {' '}
              ({formatMoney(game.loanPrincipal)} principal + {formatMoney(game.loanInterest)} interés)
            </span>
          )}{' '}
          · límite {formatMoney(limit)} · disponible {formatMoney(available)}
        </p>
        {debt > 0 && (
          <p className={`text-sm ${game.debtSpiral ? 'text-danger' : 'text-warn'}`}>
            {game.debtSpiral ? '🌀 ' : ''}
            Interés de esta semana:{' '}
            <span className="font-semibold tabular-nums">+{formatMoney(interest)}</span>{' '}
            (~{formatRate(balance.economy.loans.weeklyInterest)}/sem, capitaliza en la
            deuda) · cuota obligatoria:{' '}
            <span className="font-semibold tabular-nums">−{formatMoney(minPayment)}</span>{' '}
            (~{formatRate(balance.economy.loans.minPaymentRate)}/sem, sale de caja)
            {game.debtSpiral && ' — la cuota ya supera lo que ingresas.'}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={0}
            step={500}
            value={loanAmount}
            onChange={(e) => setLoanAmount(clampLoan(Number(e.target.value)))}
            aria-label="Importe del préstamo"
            className="w-32 rounded-md border border-line-hi bg-raised px-3 py-1.5 text-sm tabular-nums"
          />
          <button
            type="button"
            disabled={loanAmount <= 0 || loanAmount > available}
            onClick={() => takeLoan(loanAmount)}
            className="btn btn-warn disabled:cursor-not-allowed disabled:bg-control disabled:text-ink-faint"
          >
            🏦 Pedir préstamo
          </button>
          <button
            type="button"
            disabled={
              debt <= 0 ||
              loanAmount <= 0 ||
              Math.min(loanAmount, debt) > game.studio.capital
            }
            onClick={() => repayLoan(loanAmount)}
            className="btn btn-quiet disabled:cursor-not-allowed disabled:bg-raised disabled:text-ink-faint"
          >
            Amortizar
          </button>
          <p className="text-xs text-ink-faint">
            La deuda presiona hacia la codicia: el banco cobra su cuota cada semana, tengas caja o
            no, y la línea disponible se estrecha con lo que debes.
          </p>
        </div>
      </section>

      {/* Ingresos por juego */}
      <section className="card">
        <h3 className="card-title">
          Ingresos por juego
        </h3>
        {game.releasedGames.length === 0 ? (
          <EmptyState icon="💿">
            Cada lanzamiento listará aquí sus unidades y sus ingresos. El primer
            superventas está por hacerse.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {[...game.releasedGames].reverse().map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-raised/60 px-3 py-2"
              >
                <span className="font-medium">{g.name}</span>
                <span className="text-ink-mute">{formatMoney(g.totalRevenue)}</span>
                {g.mtxRevenue > 0 && (
                  <span className="text-xs text-warn">
                    MTX: {formatMoney(g.mtxRevenue)}
                  </span>
                )}
                <span className="ml-auto text-xs text-ink-faint">
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
