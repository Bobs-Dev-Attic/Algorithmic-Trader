import numpy as np
import pandas as pd
import pytest

from algo_trader.utils.metrics import (
    annualized_return,
    annualized_volatility,
    max_drawdown,
    sharpe_ratio,
)


def test_max_drawdown_known_curve():
    eq = pd.Series([100, 120, 90, 110, 80])
    # Worst peak (120) to trough (80) -> -33.3%.
    assert max_drawdown(eq) == pytest.approx(-1 / 3, abs=1e-9)


def test_zero_returns_have_zero_stats():
    r = pd.Series(np.zeros(100))
    assert annualized_return(r) == 0.0
    assert annualized_volatility(r) == 0.0
    assert sharpe_ratio(r) == 0.0


def test_annualized_return_constant_growth():
    # 252 bars each +0.1% -> compounding over exactly one year.
    r = pd.Series([0.001] * 252)
    expected = (1.001) ** 252 - 1
    assert annualized_return(r) == pytest.approx(expected, rel=1e-6)


def test_sharpe_positive_for_steady_gains():
    rng = np.random.default_rng(0)
    r = pd.Series(rng.normal(0.001, 0.005, 500))
    assert sharpe_ratio(r) > 0
