"""Command-line entry point for running backtests.

Examples
--------
Run the built-in demo on synthetic data::

    algo-trader --demo

Backtest a CSV against a 10/30 SMA crossover with shorting enabled::

    algo-trader --csv data/prices.csv --fast 10 --slow 30 --allow-short
"""

from __future__ import annotations

import argparse
import sys

from algo_trader.backtest.engine import BacktestEngine
from algo_trader.data.loaders import generate_synthetic_ohlcv, load_csv
from algo_trader.strategies.moving_average import MovingAverageCrossStrategy


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="algo-trader",
        description="Backtest a moving-average crossover strategy.",
    )
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--csv", help="Path to an OHLCV CSV file.")
    source.add_argument(
        "--demo",
        action="store_true",
        help="Use built-in synthetic data (default if no --csv given).",
    )

    parser.add_argument("--fast", type=int, default=20, help="Fast SMA window (default: 20).")
    parser.add_argument("--slow", type=int, default=50, help="Slow SMA window (default: 50).")
    parser.add_argument(
        "--allow-short",
        action="store_true",
        help="Take short positions when fast MA is below slow MA.",
    )
    parser.add_argument(
        "--cash", type=float, default=100_000.0, help="Initial cash (default: 100000)."
    )
    parser.add_argument(
        "--commission",
        type=float,
        default=0.0005,
        help="Proportional commission per trade (default: 0.0005).",
    )
    parser.add_argument(
        "--slippage",
        type=float,
        default=0.0005,
        help="Proportional slippage on fills (default: 0.0005).",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.csv:
        data = load_csv(args.csv)
        source_desc = args.csv
    else:
        data = generate_synthetic_ohlcv()
        source_desc = "synthetic GBM series"

    strategy = MovingAverageCrossStrategy(
        fast=args.fast, slow=args.slow, allow_short=args.allow_short
    )
    engine = BacktestEngine(
        initial_cash=args.cash,
        commission=args.commission,
        slippage=args.slippage,
    )
    result = engine.run(data, strategy)

    print(f"Data source : {source_desc} ({len(data)} bars)")
    print(f"Period      : {data.index[0].date()} → {data.index[-1].date()}")
    print("-" * 40)
    print(result.report())
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
