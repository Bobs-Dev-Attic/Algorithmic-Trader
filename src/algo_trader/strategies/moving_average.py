"""Moving-average crossover strategy — the canonical worked example.

Go long when a fast moving average of the close is above a slow moving average,
and (optionally) go short when it is below. Otherwise stay flat until both
averages have enough history.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from algo_trader.strategies.base import Strategy


class MovingAverageCrossStrategy(Strategy):
    """Fast/slow simple-moving-average crossover.

    Parameters
    ----------
    fast:
        Window (in bars) of the fast moving average.
    slow:
        Window of the slow moving average. Must be greater than ``fast``.
    allow_short:
        If ``True``, take a short position when fast < slow; otherwise go flat.
    """

    def __init__(self, fast: int = 20, slow: int = 50, allow_short: bool = False) -> None:
        if fast <= 0 or slow <= 0:
            raise ValueError("Moving-average windows must be positive.")
        if fast >= slow:
            raise ValueError("fast window must be strictly smaller than slow window.")
        super().__init__(name=f"SMA({fast}/{slow})")
        self.fast = fast
        self.slow = slow
        self.allow_short = allow_short

    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        close = data["close"]
        fast_ma = close.rolling(self.fast, min_periods=self.fast).mean()
        slow_ma = close.rolling(self.slow, min_periods=self.slow).mean()

        long_value = 1.0
        short_value = -1.0 if self.allow_short else 0.0

        signal = np.where(fast_ma > slow_ma, long_value, short_value)
        signal = pd.Series(signal, index=data.index, name="signal")
        # No position until the slow MA has enough data to be defined.
        signal[slow_ma.isna()] = 0.0
        return signal
