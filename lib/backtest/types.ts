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

export interface BacktestRequest {
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
  dates: string[];
  close: number[];
  fastMa: (number | null)[];
  slowMa: (number | null)[];
  equityCurve: number[];
  positions: number[];
  metrics: Metrics;
}
