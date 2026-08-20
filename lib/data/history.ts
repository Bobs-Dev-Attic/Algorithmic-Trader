/**
 * Free real historical data via Stooq (https://stooq.com).
 *
 * Stooq serves daily end-of-day OHLCV as a plain CSV with **no API key**:
 *
 *   https://stooq.com/q/d/l/?s=aapl.us&i=d
 *
 * Coverage includes US stocks (`aapl.us`), world indices (`^spx`), FX
 * (`eurusd`), and crypto (`btcusd`). This module is server-only — it is called
 * from the API route so the browser never makes a cross-origin request.
 */

import type { Bar, OHLCV } from "@/lib/backtest/types";

const STOOQ_URL = "https://stooq.com/q/d/l/";

/** Parse a Stooq daily CSV into ascending-by-date OHLCV bars. */
export function parseStooqCsv(csv: string): OHLCV {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Header: Date,Open,High,Low,Close,Volume
  const header = lines[0].toLowerCase();
  if (!header.startsWith("date")) return [];

  const bars: Bar[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 5) continue;
    const [date, open, high, low, close, volume] = cols;
    const o = Number(open);
    const h = Number(high);
    const l = Number(low);
    const c = Number(close);
    // Stooq uses "N/D" for missing fields; skip any row that isn't fully numeric.
    if (![o, h, l, c].every(Number.isFinite)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    bars.push({
      date,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: Number.isFinite(Number(volume)) ? Number(volume) : 0,
    });
  }
  bars.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return bars;
}

/** Normalize a user-entered symbol for Stooq (lowercase, trimmed). */
export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toLowerCase();
}

export interface HistoryOptions {
  /** Keep only the most recent `maxBars` bars (0 or undefined = all). */
  maxBars?: number;
  /** Fetch timeout in milliseconds. */
  timeoutMs?: number;
}

/**
 * Fetch daily OHLCV for `symbol` from Stooq. Throws a descriptive Error on an
 * unknown symbol, empty response, or network failure.
 */
export async function fetchStooqDaily(symbol: string, opts: HistoryOptions = {}): Promise<OHLCV> {
  const sym = normalizeSymbol(symbol);
  if (!sym) throw new Error("Please enter a ticker symbol (e.g. aapl.us).");

  const url = `${STOOQ_URL}?s=${encodeURIComponent(sym)}&i=d`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);

  let text: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "algo-trader-dashboard" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Data provider returned HTTP ${res.status}.`);
    text = await res.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Timed out fetching data from the provider.");
    }
    throw new Error(
      `Could not reach the data provider${err instanceof Error ? `: ${err.message}` : "."}`,
    );
  } finally {
    clearTimeout(timer);
  }

  const bars = parseStooqCsv(text);
  if (bars.length === 0) {
    throw new Error(`No data found for "${sym}". Check the symbol (e.g. aapl.us, msft.us, ^spx).`);
  }

  if (opts.maxBars && opts.maxBars > 0 && bars.length > opts.maxBars) {
    return bars.slice(bars.length - opts.maxBars);
  }
  return bars;
}
