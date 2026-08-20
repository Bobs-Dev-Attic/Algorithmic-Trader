/**
 * Synthetic OHLCV generation via geometric Brownian motion — the TypeScript
 * port of `algo_trader.data.loaders.generate_synthetic_ohlcv`.
 */

import { SeededRng } from "./rng";
import type { OHLCV, SyntheticParams } from "./types";

const TRADING_DAYS = 252;

/** Add `n` business days (skipping weekends) to a start date. */
function businessDates(startISO: string, n: number): string[] {
  const dates: string[] = [];
  const d = new Date(startISO + "T00:00:00Z");
  while (dates.length < n) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(d.toISOString().slice(0, 10));
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

export function generateSyntheticOHLCV(params: SyntheticParams): OHLCV {
  const { nPeriods, startPrice, annualDrift, annualVol, seed } = params;
  if (nPeriods <= 0) throw new Error("nPeriods must be positive.");

  const rng = new SeededRng(seed);
  const dt = 1 / TRADING_DAYS;
  const drift = (annualDrift - 0.5 * annualVol * annualVol) * dt;
  const diffusion = annualVol * Math.sqrt(dt);

  const close: number[] = new Array(nPeriods);
  let logPrice = Math.log(startPrice);
  for (let i = 0; i < nPeriods; i++) {
    logPrice += rng.normal(drift, diffusion);
    close[i] = Math.exp(logPrice);
  }

  const dates = businessDates("2022-01-03", nPeriods);
  const bars: OHLCV = new Array(nPeriods);
  for (let i = 0; i < nPeriods; i++) {
    const open = i === 0 ? startPrice : close[i - 1];
    const intrabar = Math.abs(rng.normal(0, diffusion));
    const c = close[i];
    const high = Math.max(open, c) * (1 + intrabar);
    const low = Math.min(open, c) * (1 - intrabar);
    const volume = rng.int(1_000_000, 5_000_000);
    bars[i] = { date: dates[i], open, high, low, close: c, volume };
  }
  return bars;
}
