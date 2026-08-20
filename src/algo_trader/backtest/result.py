"""The output of a backtest: equity curve, returns, and summary statistics."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from algo_trader.utils.metrics import (
    annualized_return,
    annualized_volatility,
    max_drawdown,
    sharpe_ratio,
)


@dataclass
class BacktestResult:
    """Container for backtest output with lazily-computed summary metrics.

    Attributes
    ----------
    equity_curve:
        Mark-to-market account equity per bar.
    returns:
        Per-bar simple returns of the strategy (net of costs).
    positions:
        Target position weight actually held each bar.
    trades:
        Number of bars on which the position changed.
    total_commission:
        Sum of commissions paid over the backtest.
    strategy_name:
        Human-readable strategy label for reporting.
    periods_per_year:
        Bars per year, used to annualize metrics.
    """

    equity_curve: pd.Series
    returns: pd.Series
    positions: pd.Series
    trades: int
    total_commission: float
    strategy_name: str
    periods_per_year: int = 252

    @property
    def total_return(self) -> float:
        if self.equity_curve.empty:
            return 0.0
        return float(self.equity_curve.iloc[-1] / self.equity_curve.iloc[0] - 1.0)

    @property
    def annualized_return(self) -> float:
        return annualized_return(self.returns, self.periods_per_year)

    @property
    def annualized_volatility(self) -> float:
        return annualized_volatility(self.returns, self.periods_per_year)

    @property
    def sharpe_ratio(self) -> float:
        return sharpe_ratio(self.returns, periods_per_year=self.periods_per_year)

    @property
    def max_drawdown(self) -> float:
        return max_drawdown(self.equity_curve)

    def summary(self) -> dict[str, float | int | str]:
        """Return a dictionary of headline metrics."""
        return {
            "strategy": self.strategy_name,
            "total_return": self.total_return,
            "annualized_return": self.annualized_return,
            "annualized_volatility": self.annualized_volatility,
            "sharpe_ratio": self.sharpe_ratio,
            "max_drawdown": self.max_drawdown,
            "trades": self.trades,
            "total_commission": self.total_commission,
        }

    def report(self) -> str:
        """Render a human-readable performance report."""
        s = self.summary()
        lines = [
            f"Strategy            : {s['strategy']}",
            f"Total return        : {s['total_return']:>10.2%}",
            f"Annualized return   : {s['annualized_return']:>10.2%}",
            f"Annualized vol      : {s['annualized_volatility']:>10.2%}",
            f"Sharpe ratio        : {s['sharpe_ratio']:>10.2f}",
            f"Max drawdown        : {s['max_drawdown']:>10.2%}",
            f"Trades              : {s['trades']:>10d}",
            f"Total commission    : {s['total_commission']:>10.2f}",
        ]
        return "\n".join(lines)
