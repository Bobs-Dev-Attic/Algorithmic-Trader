# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-08-20

### Added
- `vercel.json` pinning the Next.js framework, build/install/dev commands, and
  serverless region, plus baseline security headers (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`). Makes Vercel deploys deterministic even
  if project-level settings drift.

## [0.2.0] - 2026-08-20

### Added
- **Web dashboard** (Next.js 14 + React) for running and visualizing backtests,
  deployable on Vercel:
  - Interactive controls for strategy (fast/slow windows, allow-short), costs
    (initial cash, commission, slippage), and synthetic-data parameters
    (bars, drift, volatility, seed).
  - Headline metric tiles, an equity-curve chart, a price + moving-averages
    chart, and an exposure chart — all theme-aware (light/dark) with hover
    crosshairs and tooltips.
  - `POST /api/backtest` route that validates inputs and runs the backtest.
- TypeScript port of the backtest engine under `lib/backtest/` (seeded RNG,
  synthetic OHLCV generation, SMA strategy, simulated broker, engine, metrics),
  mirroring the Python reference implementation.

### Notes
- The Python engine under `src/algo_trader/` is functionally unchanged; the
  version bump reflects the project-level release adding the dashboard.

## [0.1.0] - 2026-08-20

### Added
- Initial scaffold of the modular algorithmic-trading framework.
- `data`: normalized OHLCV loading from CSV and reproducible synthetic
  (geometric Brownian motion) price-series generation.
- `strategies`: `Strategy` base class and a moving-average crossover example.
- `broker`: `SimulatedBroker` with cash/position accounting, proportional
  commission, and slippage.
- `backtest`: `BacktestEngine` (one-bar-lagged signals to avoid look-ahead)
  and `BacktestResult` (equity curve plus performance metrics and report).
- `utils`: performance metrics — Sharpe ratio, max drawdown, annualized
  return and volatility.
- `algo-trader` CLI entry point (`--demo` / `--csv`).
- Pytest suite (20 tests), ruff configuration, example script, and README.

[Unreleased]: https://github.com/Bobs-Dev-Attic/Algorithmic-Trader/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/Bobs-Dev-Attic/Algorithmic-Trader/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Bobs-Dev-Attic/Algorithmic-Trader/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Bobs-Dev-Attic/Algorithmic-Trader/releases/tag/v0.1.0
