import numpy as np
import pandas as pd
import pytest

from algo_trader.data.loaders import generate_synthetic_ohlcv
from algo_trader.strategies.moving_average import MovingAverageCrossStrategy


def test_windows_validation():
    with pytest.raises(ValueError):
        MovingAverageCrossStrategy(fast=50, slow=20)
    with pytest.raises(ValueError):
        MovingAverageCrossStrategy(fast=0, slow=20)


def test_signals_aligned_and_bounded():
    df = generate_synthetic_ohlcv(n_periods=120, seed=2)
    strat = MovingAverageCrossStrategy(fast=10, slow=30)
    sig = strat.generate_signals(df)
    assert sig.index.equals(df.index)
    assert sig.isin([0.0, 1.0]).all()


def test_no_position_before_slow_window():
    df = generate_synthetic_ohlcv(n_periods=120, seed=2)
    strat = MovingAverageCrossStrategy(fast=10, slow=30)
    sig = strat.generate_signals(df)
    # First slow-1 bars have an undefined slow MA -> must be flat.
    assert (sig.iloc[: 30 - 1] == 0.0).all()


def test_short_enabled_produces_negative_signals():
    # Construct a strictly declining series so fast < slow after warmup.
    idx = pd.date_range("2022-01-03", periods=60, freq="B")
    close = pd.Series(np.linspace(100, 50, 60), index=idx)
    df = pd.DataFrame(
        {
            "open": close,
            "high": close,
            "low": close,
            "close": close,
            "volume": 1.0,
        }
    )
    strat = MovingAverageCrossStrategy(fast=5, slow=20, allow_short=True)
    sig = strat.generate_signals(df)
    assert (sig.iloc[25:] == -1.0).all()
