/** Shared types for the backtest engine (TypeScript port). */

export interface Bar {
  date: string; // ISO date (YYYY-MM-DD)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type OHLCV = Bar[];

export interface SyntheticParams {
  nPeriods: number;
  startPrice: number;
  annualDrift: number;
  annualVol: number;
  seed: number;
}

export interface StrategyParams {
  fast: number;
  slow: number;
  allowShort: boolean;
}

export interface CostParams {
  initialCash: number;
  commission: number;
  slippage: number;
}

export type DataSource = "synthetic" | "ticker";

export interface BacktestRequest {
  source: DataSource;
  /** Ticker symbol for the "ticker" source (e.g. "aapl.us"). */
  symbol?: string;
  data: SyntheticParams;
  strategy: StrategyParams;
  costs: CostParams;
}

export interface Metrics {
  totalReturn: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  trades: number;
  totalCommission: number;
}

export interface BacktestResult {
  strategyName: string;
  /** Human-readable data source, e.g. "Synthetic GBM" or "AAPL.US (Stooq)". */
  sourceLabel: string;
  dates: string[];
  close: number[];
  fastMa: (number | null)[];
  slowMa: (number | null)[];
  equityCurve: number[];
  positions: number[];
  metrics: Metrics;
}
