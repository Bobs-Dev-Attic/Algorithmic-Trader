"""The event-driven-ish backtest engine.

The engine walks the price series bar by bar. On each bar it:

1. Reads the *target* position produced by the strategy from the **previous**
   bar's information (signals are lagged one bar to avoid look-ahead bias).
2. Asks the broker to rebalance toward that target at the current bar's price.
3. Records mark-to-market equity.

Trading at the current bar's close using a signal derived from the prior bar's
close is a conservative, widely-used convention that keeps the backtest honest.
"""

from __future__ import annotations

import pandas as pd

from algo_trader.backtest.result import BacktestResult
from algo_trader.broker.portfolio import SimulatedBroker
from algo_trader.strategies.base import Strategy


class BacktestEngine:
    """Run a single-asset backtest of a strategy over an OHLCV frame.

    Parameters
    ----------
    initial_cash:
        Starting equity.
    commission:
        Proportional commission per trade.
    slippage:
        Proportional slippage on fills.
    price_column:
        Which column to execute against (default ``"close"``).
    periods_per_year:
        Bars per year, used to annualize the result's metrics.
    """

    def __init__(
        self,
        initial_cash: float = 100_000.0,
        commission: float = 0.0005,
        slippage: float = 0.0005,
        price_column: str = "close",
        periods_per_year: int = 252,
    ) -> None:
        self.initial_cash = initial_cash
        self.commission = commission
        self.slippage = slippage
        self.price_column = price_column
        self.periods_per_year = periods_per_year

    def run(self, data: pd.DataFrame, strategy: Strategy) -> BacktestResult:
        """Execute ``strategy`` over ``data`` and return a :class:`BacktestResult`."""
        if data.empty:
            raise ValueError("Cannot backtest on empty data.")
        if self.price_column not in data.columns:
            raise ValueError(f"price_column {self.price_column!r} not found in data.")

        # Lag signals by one bar: a signal computed from bar t's close is only
        # actionable at bar t+1. This is the single most important guard against
        # look-ahead bias in a vectorized backtest.
        raw_signals = strategy.generate_signals(data)
        target = raw_signals.shift(1).fillna(0.0).clip(-1.0, 1.0)

        broker = SimulatedBroker(
            initial_cash=self.initial_cash,
            commission=self.commission,
            slippage=self.slippage,
        )

        prices = data[self.price_column]
        equity = pd.Series(index=data.index, dtype=float)
        held_weight = pd.Series(index=data.index, dtype=float)

        trades = 0
        total_commission = 0.0
        prev_target = 0.0

        for ts, price in prices.items():
            desired = float(target.loc[ts])
            if desired != prev_target:
                total_commission += broker.rebalance_to(desired, float(price))
                trades += 1
                prev_target = desired
            equity.loc[ts] = broker.equity(float(price))
            # Record the realized weight actually held after any rebalance.
            eq = equity.loc[ts]
            held_weight.loc[ts] = (broker.position * float(price) / eq) if eq else 0.0

        returns = equity.pct_change().fillna(0.0)

        return BacktestResult(
            equity_curve=equity,
            returns=returns,
            positions=held_weight,
            trades=trades,
            total_commission=total_commission,
            strategy_name=strategy.name,
            periods_per_year=self.periods_per_year,
        )
