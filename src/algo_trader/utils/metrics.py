"""Performance metrics computed from an equity curve or return series.

All functions take a pandas Series of *periodic* (per-bar) simple returns unless
noted otherwise, and annualize using ``periods_per_year`` (252 for daily bars).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

TRADING_DAYS = 252


def _clean(returns: pd.Series) -> pd.Series:
    return returns.dropna().astype(float)


def annualized_return(returns: pd.Series, periods_per_year: int = TRADING_DAYS) -> float:
    """Geometric annualized return of a per-bar simple-return series."""
    r = _clean(returns)
    if r.empty:
        return 0.0
    total_growth = float((1.0 + r).prod())
    if total_growth <= 0:
        return -1.0
    years = len(r) / periods_per_year
    if years == 0:
        return 0.0
    return total_growth ** (1.0 / years) - 1.0


def annualized_volatility(returns: pd.Series, periods_per_year: int = TRADING_DAYS) -> float:
    """Annualized standard deviation of per-bar returns."""
    r = _clean(returns)
    if len(r) < 2:
        return 0.0
    return float(r.std(ddof=1) * np.sqrt(periods_per_year))


def sharpe_ratio(
    returns: pd.Series,
    risk_free_rate: float = 0.0,
    periods_per_year: int = TRADING_DAYS,
) -> float:
    """Annualized Sharpe ratio.

    ``risk_free_rate`` is an *annual* rate; it is converted to a per-bar hurdle.
    """
    r = _clean(returns)
    if len(r) < 2:
        return 0.0
    per_bar_rf = risk_free_rate / periods_per_year
    excess = r - per_bar_rf
    std = excess.std(ddof=1)
    if std == 0:
        return 0.0
    return float(excess.mean() / std * np.sqrt(periods_per_year))


def max_drawdown(equity_curve: pd.Series) -> float:
    """Maximum peak-to-trough drawdown of an equity curve, as a negative fraction.

    A return of ``-0.25`` means the worst decline was 25% below a prior peak.
    """
    eq = equity_curve.dropna().astype(float)
    if eq.empty:
        return 0.0
    running_max = eq.cummax()
    drawdown = eq / running_max - 1.0
    return float(drawdown.min())
