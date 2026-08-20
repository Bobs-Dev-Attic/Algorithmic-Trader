import numpy as np
import pandas as pd
import pytest

from algo_trader.backtest.engine import BacktestEngine
from algo_trader.broker.portfolio import SimulatedBroker
from algo_trader.data.loaders import generate_synthetic_ohlcv
from algo_trader.strategies.base import Strategy
from algo_trader.strategies.moving_average import MovingAverageCrossStrategy


class AlwaysLong(Strategy):
    name = "AlwaysLong"

    def generate_signals(self, data):
        return pd.Series(1.0, index=data.index)


class AlwaysFlat(Strategy):
    name = "AlwaysFlat"

    def generate_signals(self, data):
        return pd.Series(0.0, index=data.index)


def test_flat_strategy_preserves_cash():
    df = generate_synthetic_ohlcv(n_periods=100, seed=1)
    result = BacktestEngine(initial_cash=50_000).run(df, AlwaysFlat())
    assert result.trades == 0
    assert result.total_commission == 0.0
    assert result.equity_curve.iloc[-1] == pytest.approx(50_000)


def test_always_long_tracks_price_direction():
    # Rising market -> a long-only strategy should make money (before frictions).
    idx = pd.date_range("2022-01-03", periods=100, freq="B")
    close = pd.Series(np.linspace(100, 200, 100), index=idx)
    df = pd.DataFrame(
        {"open": close, "high": close, "low": close, "close": close, "volume": 1.0}
    )
    result = BacktestEngine(commission=0.0, slippage=0.0).run(df, AlwaysLong())
    assert result.total_return > 0.5


def test_no_lookahead_first_bar_is_flat():
    df = generate_synthetic_ohlcv(n_periods=100, seed=1)
    result = BacktestEngine().run(df, AlwaysLong())
    # Signal is lagged one bar, so the first bar cannot be invested.
    assert result.positions.iloc[0] == pytest.approx(0.0)


def test_empty_data_raises():
    with pytest.raises(ValueError):
        BacktestEngine().run(pd.DataFrame(), AlwaysLong())


def test_end_to_end_runs_and_reports():
    df = generate_synthetic_ohlcv(n_periods=252, seed=42)
    strat = MovingAverageCrossStrategy(fast=20, slow=50)
    result = BacktestEngine().run(df, strat)
    summary = result.summary()
    assert summary["strategy"] == "SMA(20/50)"
    assert isinstance(result.report(), str)
    assert result.equity_curve.notna().all()


def test_broker_commission_reduces_cash():
    broker = SimulatedBroker(initial_cash=10_000, commission=0.01, slippage=0.0)
    paid = broker.rebalance_to(1.0, price=100.0)
    assert paid > 0
    assert broker.equity(100.0) < 10_000  # commission is a real cost
