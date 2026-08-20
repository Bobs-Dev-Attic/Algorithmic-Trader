"""Load market data from CSV or generate reproducible synthetic OHLCV series.

All loaders return a :class:`pandas.DataFrame` indexed by a timezone-naive
``DatetimeIndex`` with the canonical columns ``open, high, low, close, volume``.
Keeping a single normalized schema means strategies and the backtester never
have to care where the data came from.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

OHLCV_COLUMNS = ["open", "high", "low", "close", "volume"]


def _validate_ohlcv(df: pd.DataFrame) -> pd.DataFrame:
    """Return ``df`` with a normalized OHLCV schema or raise ``ValueError``."""
    df = df.rename(columns={c: c.lower() for c in df.columns})
    missing = [c for c in OHLCV_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Data is missing required columns: {missing}")
    if not isinstance(df.index, pd.DatetimeIndex):
        raise ValueError("Data must be indexed by a DatetimeIndex.")
    return df[OHLCV_COLUMNS].sort_index()


def load_csv(path: str, date_column: str = "date") -> pd.DataFrame:
    """Load an OHLCV CSV file.

    Parameters
    ----------
    path:
        Path to a CSV with a date column plus open/high/low/close/volume.
    date_column:
        Name of the column to parse as the datetime index.
    """
    df = pd.read_csv(path, parse_dates=[date_column])
    df = df.set_index(date_column)
    return _validate_ohlcv(df)


def generate_synthetic_ohlcv(
    n_periods: int = 504,
    start: str = "2022-01-03",
    freq: str = "B",
    start_price: float = 100.0,
    annual_drift: float = 0.08,
    annual_vol: float = 0.20,
    seed: int | None = 42,
) -> pd.DataFrame:
    """Generate a reproducible synthetic OHLCV series via geometric Brownian motion.

    Useful for demos and tests where you want realistic-looking price action
    without hitting an external data provider.

    Parameters
    ----------
    n_periods:
        Number of bars to generate (default ~2 trading years of business days).
    start:
        First date of the series.
    freq:
        Pandas offset alias for the bar frequency (``"B"`` = business day).
    start_price:
        Price of the first close.
    annual_drift, annual_vol:
        Annualized drift and volatility of the log returns.
    seed:
        Seed for the RNG. ``None`` for nondeterministic output.
    """
    if n_periods <= 0:
        raise ValueError("n_periods must be positive.")

    rng = np.random.default_rng(seed)
    dt = 1.0 / 252.0
    shocks = rng.normal(
        loc=(annual_drift - 0.5 * annual_vol**2) * dt,
        scale=annual_vol * np.sqrt(dt),
        size=n_periods,
    )
    log_price = np.log(start_price) + np.cumsum(shocks)
    close = np.exp(log_price)

    # Derive plausible open/high/low around each close using intrabar noise.
    intrabar = np.abs(rng.normal(0.0, annual_vol * np.sqrt(dt), size=n_periods))
    open_ = np.empty(n_periods)
    open_[0] = start_price
    open_[1:] = close[:-1]
    high = np.maximum(open_, close) * (1.0 + intrabar)
    low = np.minimum(open_, close) * (1.0 - intrabar)
    volume = rng.integers(1_000_000, 5_000_000, size=n_periods).astype(float)

    index = pd.date_range(start=start, periods=n_periods, freq=freq)
    df = pd.DataFrame(
        {
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume,
        },
        index=index,
    )
    df.index.name = "date"
    return _validate_ohlcv(df)
