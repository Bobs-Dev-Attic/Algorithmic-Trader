"""A minimal single-asset simulated broker with cash accounting.

The broker tracks cash and a position (in units of the asset) and rebalances
toward a target position weight each bar. It models two frictions:

- **commission**: proportional cost charged on the traded notional.
- **slippage**: the fill price is moved against you by a fixed fraction.

This is deliberately simple — one asset, fractional units, fills at the bar's
price — but it is enough to produce a realistic equity curve and to make the
cost of trading visible in the results.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class SimulatedBroker:
    """Track cash + position and rebalance toward a target weight each bar.

    Parameters
    ----------
    initial_cash:
        Starting account equity, all in cash.
    commission:
        Proportional commission per trade (e.g. ``0.0005`` = 5 bps).
    slippage:
        Proportional slippage applied to the fill price, worsening the fill.
    """

    initial_cash: float = 100_000.0
    commission: float = 0.0005
    slippage: float = 0.0005

    cash: float = field(init=False)
    position: float = field(init=False)  # units of the asset held
    _last_price: float = field(init=False, default=0.0)

    def __post_init__(self) -> None:
        if self.initial_cash <= 0:
            raise ValueError("initial_cash must be positive.")
        self.cash = float(self.initial_cash)
        self.position = 0.0

    def equity(self, price: float) -> float:
        """Mark-to-market account value at ``price``."""
        return self.cash + self.position * price

    def rebalance_to(self, target_weight: float, price: float) -> float:
        """Trade so the position weight equals ``target_weight`` at ``price``.

        ``target_weight`` is the fraction of current equity to hold in the
        asset, in ``[-1, 1]``. Returns the total commission paid on this bar.
        """
        if price <= 0:
            raise ValueError("price must be positive.")
        self._last_price = price

        equity = self.equity(price)
        target_units = target_weight * equity / price
        delta_units = target_units - self.position
        if delta_units == 0.0:
            return 0.0

        # Slippage worsens the fill: pay more when buying, receive less selling.
        direction = 1.0 if delta_units > 0 else -1.0
        fill_price = price * (1.0 + direction * self.slippage)

        notional = abs(delta_units) * fill_price
        commission_paid = notional * self.commission

        self.cash -= delta_units * fill_price
        self.cash -= commission_paid
        self.position = target_units
        return commission_paid
