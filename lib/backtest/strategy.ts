/**
 * Moving-average crossover strategy — TypeScript port of
 * `algo_trader.strategies.moving_average.MovingAverageCrossStrategy`.
 *
 * Returns, for each bar, the target position in [-1, 1] plus the fast/slow
 * moving-average series (exposed so the UI can plot them). A moving average is
 * `null` until its window has enough history.
 */

import type { OHLCV, StrategyParams } from "./types";

export interface StrategyOutput {
  name: string;
  signals: number[];
  fastMa: (number | null)[];
  slowMa: (number | null)[];
}

function rollingMean(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

export function generateSignals(data: OHLCV, params: StrategyParams): StrategyOutput {
  const { fast, slow, allowShort } = params;
  if (fast <= 0 || slow <= 0) throw new Error("Windows must be positive.");
  if (fast >= slow) throw new Error("fast window must be smaller than slow window.");

  const close = data.map((b) => b.close);
  const fastMa = rollingMean(close, fast);
  const slowMa = rollingMean(close, slow);

  const longValue = 1;
  const shortValue = allowShort ? -1 : 0;

  const signals = close.map((_, i) => {
    if (slowMa[i] === null || fastMa[i] === null) return 0;
    return (fastMa[i] as number) > (slowMa[i] as number) ? longValue : shortValue;
  });

  return { name: `SMA(${fast}/${slow})`, signals, fastMa, slowMa };
}
