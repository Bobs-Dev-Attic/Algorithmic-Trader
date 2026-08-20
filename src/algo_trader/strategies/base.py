"""Strategy base class and the signal contract.

A :class:`Strategy` turns a price history into a series of *target positions*.
We use a vectorized contract: given the full OHLCV frame, ``generate_signals``
returns a Series aligned to the frame's index whose values are the desired
position for the *next* bar, expressed as a fraction of equity in
``[-1.0, 1.0]`` (``1.0`` = fully long, ``-1.0`` = fully short, ``0.0`` = flat).

The backtester is responsible for shifting signals by one bar so that a signal
computed from a bar's close is only acted on at the following bar's open. This
keeps individual strategies free of look-ahead bookkeeping.
"""

from __future__ import annotations

import enum
from abc import ABC, abstractmethod

import pandas as pd


class Signal(enum.IntEnum):
    """Convenience discrete signal values for long/flat/short strategies."""

    SHORT = -1
    FLAT = 0
    LONG = 1


class Strategy(ABC):
    """Abstract base class for all strategies.

    Subclasses implement :meth:`generate_signals`. The ``name`` attribute is
    used for reporting; it defaults to the class name.
    """

    name: str = "Strategy"

    def __init__(self, name: str | None = None) -> None:
        if name is not None:
            self.name = name

    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        """Return target positions in ``[-1, 1]`` aligned to ``data.index``.

        Parameters
        ----------
        data:
            OHLCV frame indexed by datetime.

        Returns
        -------
        pandas.Series
            Target position per bar. The backtester lags this by one bar.
        """
        raise NotImplementedError

    def __repr__(self) -> str:  # pragma: no cover - trivial
        return f"{type(self).__name__}(name={self.name!r})"
