"use client";

import { useCallback, useEffect, useState } from "react";

import LineChart from "@/components/LineChart";
import { money, num, pct, signedPct } from "@/lib/format";
import type { BacktestRequest, BacktestResult } from "@/lib/backtest/types";

const DEFAULTS: BacktestRequest = {
  source: "synthetic",
  symbol: "aapl.us",
  data: { nPeriods: 504, startPrice: 100, annualDrift: 0.08, annualVol: 0.2, seed: 42 },
  strategy: { fast: 20, slow: 50, allowShort: false },
  costs: { initialCash: 100000, commission: 0.0005, slippage: 0.0005 },
};

export default function Page() {
  const [req, setReq] = useState<BacktestRequest>(DEFAULTS);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (payload: BacktestRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Backtest failed.");
      setResult(json as BacktestResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backtest failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Run once on load so the dashboard is never empty.
  useEffect(() => {
    run(DEFAULTS);
  }, [run]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    run(req);
  }

  const m = result?.metrics;

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>Algorithmic Trader</h1>
          <div className="subtitle">
            Backtest a moving-average crossover on synthetic or real price data.
          </div>
        </div>
        <div className="badge">
          {result
            ? `${result.sourceLabel} · ${result.strategyName} · ${result.dates.length} bars`
            : "—"}
        </div>
      </header>

      <div className="grid">
        {/* ---- Controls ---- */}
        <form className="panel panel-pad controls" onSubmit={onSubmit}>
          <h2>Parameters</h2>

          <div className="control-group">
            <div className="field">
              <label>
                <span>Data source</span>
              </label>
              <select
                value={req.source}
                onChange={(e) =>
                  setReq((r) => ({ ...r, source: e.target.value as BacktestRequest["source"] }))
                }
              >
                <option value="synthetic">Synthetic (GBM)</option>
                <option value="ticker">Real ticker (Stooq)</option>
              </select>
            </div>
            {req.source === "ticker" && (
              <div className="field">
                <label>
                  <span>Symbol</span>
                  <span className="hint">Stooq</span>
                </label>
                <input
                  type="text"
                  value={req.symbol ?? ""}
                  placeholder="aapl.us"
                  spellCheck={false}
                  autoCapitalize="off"
                  onChange={(e) => setReq((r) => ({ ...r, symbol: e.target.value }))}
                />
                <span className="hint" style={{ fontSize: 11 }}>
                  e.g. aapl.us · msft.us · spy.us · ^spx · btcusd · eurusd
                </span>
              </div>
            )}
          </div>

          <div className="control-group">
            <NumField
              label="Fast MA"
              value={req.strategy.fast}
              onChange={(v) => setReq((r) => ({ ...r, strategy: { ...r.strategy, fast: v } }))}
            />
            <NumField
              label="Slow MA"
              value={req.strategy.slow}
              onChange={(v) => setReq((r) => ({ ...r, strategy: { ...r.strategy, slow: v } }))}
            />
            <label className="switch">
              <input
                type="checkbox"
                checked={req.strategy.allowShort}
                onChange={(e) =>
                  setReq((r) => ({ ...r, strategy: { ...r.strategy, allowShort: e.target.checked } }))
                }
              />
              Allow short positions
            </label>
          </div>

          <div className="control-group">
            <NumField
              label="Initial cash"
              hint="$"
              step={1000}
              value={req.costs.initialCash}
              onChange={(v) => setReq((r) => ({ ...r, costs: { ...r.costs, initialCash: v } }))}
            />
            <NumField
              label="Commission"
              hint="frac"
              step={0.0001}
              value={req.costs.commission}
              onChange={(v) => setReq((r) => ({ ...r, costs: { ...r.costs, commission: v } }))}
            />
            <NumField
              label="Slippage"
              hint="frac"
              step={0.0001}
              value={req.costs.slippage}
              onChange={(v) => setReq((r) => ({ ...r, costs: { ...r.costs, slippage: v } }))}
            />
          </div>

          <div className="control-group">
            <NumField
              label={req.source === "ticker" ? "Max bars" : "Bars"}
              hint={req.source === "ticker" ? "recent" : undefined}
              value={req.data.nPeriods}
              step={21}
              onChange={(v) => setReq((r) => ({ ...r, data: { ...r.data, nPeriods: v } }))}
            />
            {req.source === "synthetic" && (
              <>
                <NumField
                  label="Annual drift"
                  hint="μ"
                  step={0.01}
                  value={req.data.annualDrift}
                  onChange={(v) => setReq((r) => ({ ...r, data: { ...r.data, annualDrift: v } }))}
                />
                <NumField
                  label="Annual volatility"
                  hint="σ"
                  step={0.01}
                  value={req.data.annualVol}
                  onChange={(v) => setReq((r) => ({ ...r, data: { ...r.data, annualVol: v } }))}
                />
                <NumField
                  label="Seed"
                  value={req.data.seed}
                  onChange={(v) => setReq((r) => ({ ...r, data: { ...r.data, seed: v } }))}
                />
              </>
            )}
          </div>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Running…" : "Run backtest"}
          </button>
          {error && <div className="error">{error}</div>}
        </form>

        {/* ---- Results ---- */}
        <div>
          <section className="tiles">
            <Tile label="Total return" value={m ? signedPct(m.totalReturn) : "—"} sign={m?.totalReturn} />
            <Tile
              label="Annualized"
              value={m ? signedPct(m.annualizedReturn) : "—"}
              sign={m?.annualizedReturn}
            />
            <Tile label="Sharpe" value={m ? num(m.sharpeRatio) : "—"} sign={m?.sharpeRatio} />
            <Tile label="Max drawdown" value={m ? pct(m.maxDrawdown) : "—"} sign={m ? -1 : undefined} />
            <Tile label="Annualized vol" value={m ? pct(m.annualizedVolatility) : "—"} />
            <Tile label="Trades" value={m ? String(m.trades) : "—"} />
            <Tile label="Commission" value={m ? money(m.totalCommission) : "—"} />
            <Tile
              label="Final equity"
              value={result ? money(result.equityCurve[result.equityCurve.length - 1]) : "—"}
            />
          </section>

          {result ? (
            <>
              <ChartCard title="Equity curve" meta={money(req.costs.initialCash) + " start"}>
                <LineChart
                  dates={result.dates}
                  format={money}
                  series={[
                    { name: "Equity", color: "var(--series-1)", values: result.equityCurve, fill: true },
                  ]}
                />
              </ChartCard>

              <ChartCard
                title="Price & moving averages"
                legend={[
                  { name: "Close", color: "var(--text-muted)" },
                  { name: `Fast (${req.strategy.fast})`, color: "var(--series-1)" },
                  { name: `Slow (${req.strategy.slow})`, color: "var(--series-2)" },
                ]}
              >
                <LineChart
                  dates={result.dates}
                  format={(v) => `$${num(v)}`}
                  series={[
                    { name: "Close", color: "var(--text-muted)", values: result.close, width: 1 },
                    { name: "Fast MA", color: "var(--series-1)", values: result.fastMa },
                    { name: "Slow MA", color: "var(--series-2)", values: result.slowMa },
                  ]}
                />
              </ChartCard>

              <ChartCard
                title="Exposure"
                meta="fraction of equity held"
                legend={[{ name: "Position weight", color: "var(--series-3)" }]}
              >
                <LineChart
                  dates={result.dates}
                  format={(v) => pct(v, 0)}
                  yFloor={0}
                  series={[
                    { name: "Weight", color: "var(--series-3)", values: result.positions, fill: true },
                  ]}
                />
              </ChartCard>
            </>
          ) : (
            <div className="panel empty">
              {loading ? "Running backtest…" : "Set parameters and run a backtest to see results."}
            </div>
          )}

          <footer className="footer">
            <span>
              {result ? result.sourceLabel : "Synthetic"} data · signals lagged one bar (no
              look-ahead) · costs modeled.
            </span>
            <span>Research/education only — not investment advice.</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, sign }: { label: string; value: string; sign?: number }) {
  const cls = sign === undefined ? "" : sign > 0 ? "pos" : sign < 0 ? "neg" : "";
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className={`value ${cls}`}>{value}</div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  hint,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  step?: number;
}) {
  return (
    <div className="field">
      <label>
        <span>{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function ChartCard({
  title,
  meta,
  legend,
  children,
}: {
  title: string;
  meta?: string;
  legend?: { name: string; color: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="panel card">
      <div className="card-head">
        <h3>{title}</h3>
        {meta && <span className="meta">{meta}</span>}
      </div>
      {legend && (
        <div className="legend">
          {legend.map((l) => (
            <span className="item" key={l.name}>
              <span className="swatch" style={{ background: l.color }} />
              {l.name}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
