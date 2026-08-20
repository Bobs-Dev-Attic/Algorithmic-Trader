"""End-to-end example: backtest an SMA crossover on synthetic data.

Run from the repo root with::

    python examples/run_backtest.py

This mirrors what the ``algo-trader`` CLI does, but as a script you can edit to
experiment with parameters or plug in your own data.
"""

from __future__ import annotations

from algo_trader import BacktestEngine
from algo_trader.data.loaders import generate_synthetic_ohlcv
from algo_trader.strategies.moving_average import MovingAverageCrossStrategy


def main() -> None:
    # 1. Get data (swap for load_csv("data/prices.csv") to use your own).
    data = generate_synthetic_ohlcv(n_periods=504, seed=42)

    # 2. Pick a strategy.
    strategy = MovingAverageCrossStrategy(fast=20, slow=50, allow_short=False)

    # 3. Backtest it with realistic frictions.
    engine = BacktestEngine(initial_cash=100_000, commission=0.0005, slippage=0.0005)
    result = engine.run(data, strategy)

    # 4. Inspect the results.
    print(result.report())


if __name__ == "__main__":
    main()
