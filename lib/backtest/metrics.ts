/**
 * Performance metrics — TypeScript port of `algo_trader.utils.metrics`.
 * Inputs are per-bar simple returns unless noted; annualization uses 252 bars.
 */

const TRADING_DAYS = 252;

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

export function annualizedReturn(returns: number[], periodsPerYear = TRADING_DAYS): number {
  if (returns.length === 0) return 0;
  const totalGrowth = returns.reduce((acc, r) => acc * (1 + r), 1);
  if (totalGrowth <= 0) return -1;
  const years = returns.length / periodsPerYear;
  if (years === 0) return 0;
  return totalGrowth ** (1 / years) - 1;
}

export function annualizedVolatility(returns: number[], periodsPerYear = TRADING_DAYS): number {
  if (returns.length < 2) return 0;
  return stddev(returns) * Math.sqrt(periodsPerYear);
}

export function sharpeRatio(
  returns: number[],
  riskFreeRate = 0,
  periodsPerYear = TRADING_DAYS,
): number {
  if (returns.length < 2) return 0;
  const perBarRf = riskFreeRate / periodsPerYear;
  const excess = returns.map((r) => r - perBarRf);
  const sd = stddev(excess);
  if (sd === 0) return 0;
  return (mean(excess) / sd) * Math.sqrt(periodsPerYear);
}

export function maxDrawdown(equityCurve: number[]): number {
  if (equityCurve.length === 0) return 0;
  let peak = equityCurve[0];
  let worst = 0;
  for (const eq of equityCurve) {
    if (eq > peak) peak = eq;
    const dd = eq / peak - 1;
    if (dd < worst) worst = dd;
  }
  return worst;
}
