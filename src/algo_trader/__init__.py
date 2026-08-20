"""algo_trader: a modular algorithmic trading framework.

Layers
------
- ``data``       : loading and generating OHLCV market data
- ``strategies`` : signal-generating strategy classes
- ``broker``     : simulated order execution and portfolio accounting
- ``backtest``   : the engine that wires data + strategy + broker together
- ``utils``      : shared helpers (metrics, logging)
"""

from algo_trader.backtest.engine import BacktestEngine
from algo_trader.backtest.result import BacktestResult
from algo_trader.strategies.base import Strategy

__version__ = "0.1.0"

__all__ = ["BacktestEngine", "BacktestResult", "Strategy", "__version__"]
