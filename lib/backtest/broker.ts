/**
 * Simulated single-asset broker — TypeScript port of
 * `algo_trader.broker.portfolio.SimulatedBroker`.
 *
 * Tracks cash and a position (units of the asset) and rebalances toward a
 * target weight each bar, charging proportional commission and applying
 * slippage that worsens the fill.
 */

import type { CostParams } from "./types";

export class SimulatedBroker {
  cash: number;
  position: number;
  private commission: number;
  private slippage: number;

  constructor({ initialCash, commission, slippage }: CostParams) {
    if (initialCash <= 0) throw new Error("initialCash must be positive.");
    this.cash = initialCash;
    this.position = 0;
    this.commission = commission;
    this.slippage = slippage;
  }

  equity(price: number): number {
    return this.cash + this.position * price;
  }

  /** Rebalance to `targetWeight` of equity at `price`; returns commission paid. */
  rebalanceTo(targetWeight: number, price: number): number {
    if (price <= 0) throw new Error("price must be positive.");
    const equity = this.equity(price);
    const targetUnits = (targetWeight * equity) / price;
    const deltaUnits = targetUnits - this.position;
    if (deltaUnits === 0) return 0;

    const direction = deltaUnits > 0 ? 1 : -1;
    const fillPrice = price * (1 + direction * this.slippage);
    const notional = Math.abs(deltaUnits) * fillPrice;
    const commissionPaid = notional * this.commission;

    this.cash -= deltaUnits * fillPrice;
    this.cash -= commissionPaid;
    this.position = targetUnits;
    return commissionPaid;
  }
}
