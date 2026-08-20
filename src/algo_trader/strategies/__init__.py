"""Strategy definitions."""

from algo_trader.strategies.base import Signal, Strategy
from algo_trader.strategies.moving_average import MovingAverageCrossStrategy

__all__ = ["Signal", "Strategy", "MovingAverageCrossStrategy"]
