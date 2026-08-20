/**
 * Backtest engine — TypeScript port of `algo_trader.backtest.engine`.
 *
 * Walks the price series bar by bar. Signals are lagged one bar (a signal from
 * bar t's close is only actionable at t+1) to avoid look-ahead bias. The broker
 * rebalances toward each target weight; equity is marked to market each bar.
 */

import { SimulatedBroker } from "./broker";
import { generateSyntheticOHLCV } from "./data";
import {
  annualizedReturn,
  annualizedVolatility,
  maxDrawdown,
  sharpeRatio,
} from "./metrics";
import { generateSignals } from "./strategy";
import type { BacktestRequest, BacktestResult } from "./types";

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function runBacktest(req: BacktestRequest): BacktestResult {
  const data = generateSyntheticOHLCV(req.data);
  if (data.length === 0) throw new Error("Cannot backtest on empty data.");

  const { name, signals, fastMa, slowMa } = generateSignals(data, req.strategy);

  // Lag signals by one bar and clamp to [-1, 1].
  const target = signals.map((_, i) => (i === 0 ? 0 : clamp(signals[i - 1], -1, 1)));

  const broker = new SimulatedBroker(req.costs);

  const dates: string[] = [];
  const close: number[] = [];
  const equityCurve: number[] = [];
  const positions: number[] = [];

  let trades = 0;
  let totalCommission = 0;
  let prevTarget = 0;

  for (let i = 0; i < data.length; i++) {
    const price = data[i].close;
    const desired = target[i];
    if (desired !== prevTarget) {
      totalCommission += broker.rebalanceTo(desired, price);
      trades += 1;
      prevTarget = desired;
    }
    const eq = broker.equity(price);
    dates.push(data[i].date);
    close.push(price);
    equityCurve.push(eq);
    positions.push(eq ? (broker.position * price) / eq : 0);
  }

  // Per-bar simple returns of the equity curve.
  const returns = equityCurve.map((eq, i) =>
    i === 0 ? 0 : equityCurve[i - 1] ? eq / equityCurve[i - 1] - 1 : 0,
  );

  return {
    strategyName: name,
    dates,
    close,
    fastMa,
    slowMa,
    equityCurve,
    positions,
    metrics: {
      totalReturn: equityCurve.length ? equityCurve[equityCurve.length - 1] / equityCurve[0] - 1 : 0,
      annualizedReturn: annualizedReturn(returns),
      annualizedVolatility: annualizedVolatility(returns),
      sharpeRatio: sharpeRatio(returns),
      maxDrawdown: maxDrawdown(equityCurve),
      trades,
      totalCommission,
    },
  };
}
