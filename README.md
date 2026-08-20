# Algorithmic-Trader

A small, modular algorithmic-trading framework in Python. It gives you the core
pieces of a systematic trading workflow — **data ingestion**, a pluggable
**strategy engine**, a **simulated broker** with realistic frictions, and a
**backtester** — wired together behind a simple CLI. It runs end-to-end out of
the box on reproducible synthetic data, so there are no API keys or network
calls required to try it.

> ⚠️ This is a research/education scaffold, not investment advice. Backtested
> results are not indicative of live performance.

## Quickstart

```bash
# Install (editable, with dev + plotting extras)
pip install -e ".[dev]"

# Run the built-in demo on synthetic data
algo-trader --demo

# Backtest your own OHLCV CSV with a 10/30 crossover, shorting enabled
algo-trader --csv data/prices.csv --fast 10 --slow 30 --allow-short
```

Example output:

```
Data source : synthetic GBM series (504 bars)
Period      : 2022-01-03 → 2023-12-07
----------------------------------------
Strategy            : SMA(20/50)
Total return        :    -10.46%
Annualized return   :     -5.37%
Annualized vol      :     12.68%
Sharpe ratio        :      -0.37
Max drawdown        :    -15.53%
Trades              :          9
Total commission    :     414.74
```

## Architecture

```
src/algo_trader/
├── data/         # Load CSVs or generate synthetic OHLCV (normalized schema)
├── strategies/   # Strategy base class + moving-average crossover example
├── broker/       # SimulatedBroker: cash/position accounting, commission, slippage
├── backtest/     # BacktestEngine (the loop) + BacktestResult (metrics/report)
├── utils/        # Performance metrics (Sharpe, drawdown, annualized return/vol)
└── cli.py        # `algo-trader` command-line entry point
```

**Data flow:** `data` → `Strategy.generate_signals()` → `BacktestEngine` lags
signals one bar (to avoid look-ahead bias) → `SimulatedBroker` rebalances toward
each target weight → `BacktestResult` reports the equity curve and metrics.

### Design conventions

- **One normalized schema.** Every data source returns a `DatetimeIndex` frame
  with `open, high, low, close, volume`, so strategies never care about origin.
- **No look-ahead.** Signals are lagged one bar by the engine: a signal computed
  from bar *t*'s close is only actionable at bar *t+1*.
- **Costs are explicit.** Commission and slippage are modeled and reported, so
  the drag from trading is always visible.

## Writing your own strategy

Subclass `Strategy` and return a target-position Series in `[-1, 1]` aligned to
the data index:

```python
import pandas as pd
from algo_trader import Strategy, BacktestEngine
from algo_trader.data.loaders import generate_synthetic_ohlcv


class BuyTheDip(Strategy):
    name = "BuyTheDip"

    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        ret = data["close"].pct_change()
        # Go long after a down day, flat otherwise.
        return (ret < 0).astype(float)


data = generate_synthetic_ohlcv()
result = BacktestEngine().run(data, BuyTheDip())
print(result.report())
```

## Development

```bash
pip install -e ".[dev]"
pytest          # run the test suite
ruff check .    # lint
```

See `examples/run_backtest.py` for a scriptable end-to-end example.

### Versioning & changelog

This project follows [Semantic Versioning](https://semver.org/). Every change
is recorded in [`CHANGELOG.md`](CHANGELOG.md) and the version in
`pyproject.toml` is bumped accordingly.

## Roadmap

Natural next steps once the scaffold is in place:

- Live/historical data adapters (e.g. a `data/` provider that pulls real bars)
- Multi-asset portfolios and position sizing / risk limits
- More strategies (mean-reversion, momentum, breakout) and a strategy registry
- Walk-forward / out-of-sample validation and parameter sweeps
- Optional plotting of equity curves (the `plot` extra installs matplotlib)

## License

MIT
