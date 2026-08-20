import { NextResponse } from "next/server";

import { runBacktest, runBacktestOnBars } from "@/lib/backtest/engine";
import type { BacktestRequest, DataSource } from "@/lib/backtest/types";
import { fetchStooqDaily, normalizeSymbol } from "@/lib/data/history";

/** Clamp helper for validating numeric inputs within safe bounds. */
function num(v: unknown, fallback: number, lo: number, hi: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

export async function POST(request: Request) {
  let body: Partial<BacktestRequest>;
  try {
    body = (await request.json()) as Partial<BacktestRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const source: DataSource = body.source === "ticker" ? "ticker" : "synthetic";
  const maxBars = Math.round(num(body.data?.nPeriods, 504, 60, 5000));

  const req: BacktestRequest = {
    source,
    symbol: typeof body.symbol === "string" ? body.symbol : undefined,
    data: {
      nPeriods: maxBars,
      startPrice: num(body.data?.startPrice, 100, 1, 100000),
      annualDrift: num(body.data?.annualDrift, 0.08, -1, 1),
      annualVol: num(body.data?.annualVol, 0.2, 0.01, 2),
      seed: Math.round(num(body.data?.seed, 42, 0, 2 ** 31 - 1)),
    },
    strategy: {
      fast: Math.round(num(body.strategy?.fast, 20, 1, 1000)),
      slow: Math.round(num(body.strategy?.slow, 50, 2, 2000)),
      allowShort: Boolean(body.strategy?.allowShort),
    },
    costs: {
      initialCash: num(body.costs?.initialCash, 100000, 1, 1e12),
      commission: num(body.costs?.commission, 0.0005, 0, 0.1),
      slippage: num(body.costs?.slippage, 0.0005, 0, 0.1),
    },
  };

  if (req.strategy.fast >= req.strategy.slow) {
    return NextResponse.json(
      { error: "Fast window must be strictly smaller than the slow window." },
      { status: 400 },
    );
  }

  try {
    if (req.source === "ticker") {
      const sym = normalizeSymbol(req.symbol ?? "");
      if (!sym) {
        return NextResponse.json({ error: "Enter a ticker symbol (e.g. aapl.us)." }, { status: 400 });
      }
      const bars = await fetchStooqDaily(sym, { maxBars });
      if (bars.length <= req.strategy.slow) {
        return NextResponse.json(
          {
            error: `Only ${bars.length} bars available for "${sym}" — need more than the slow window (${req.strategy.slow}).`,
          },
          { status: 400 },
        );
      }
      const label = `${sym.toUpperCase()} (Stooq)`;
      const result = runBacktestOnBars(bars, req.strategy, req.costs, label);
      return NextResponse.json(result);
    }

    const result = runBacktest(req);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backtest failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
