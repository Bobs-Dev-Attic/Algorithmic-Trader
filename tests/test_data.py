import pandas as pd
import pytest

from algo_trader.data.loaders import OHLCV_COLUMNS, generate_synthetic_ohlcv, load_csv


def test_synthetic_shape_and_schema():
    df = generate_synthetic_ohlcv(n_periods=100, seed=1)
    assert len(df) == 100
    assert list(df.columns) == OHLCV_COLUMNS
    assert isinstance(df.index, pd.DatetimeIndex)


def test_synthetic_is_reproducible():
    a = generate_synthetic_ohlcv(n_periods=50, seed=7)
    b = generate_synthetic_ohlcv(n_periods=50, seed=7)
    pd.testing.assert_frame_equal(a, b)


def test_high_low_bound_open_close():
    df = generate_synthetic_ohlcv(n_periods=200, seed=3)
    assert (df["high"] >= df[["open", "close"]].max(axis=1) - 1e-9).all()
    assert (df["low"] <= df[["open", "close"]].min(axis=1) + 1e-9).all()


def test_invalid_n_periods():
    with pytest.raises(ValueError):
        generate_synthetic_ohlcv(n_periods=0)


def test_load_csv_roundtrip(tmp_path):
    df = generate_synthetic_ohlcv(n_periods=30, seed=5)
    path = tmp_path / "prices.csv"
    df.to_csv(path)
    loaded = load_csv(str(path))
    # check_freq=False: writing to CSV and back loses the index's freq attribute
    # (BusinessDay), which is metadata we don't rely on.
    pd.testing.assert_frame_equal(loaded, df, check_freq=False)


def test_load_csv_missing_columns(tmp_path):
    path = tmp_path / "bad.csv"
    pd.DataFrame({"date": ["2022-01-01"], "close": [100.0]}).to_csv(path, index=False)
    with pytest.raises(ValueError):
        load_csv(str(path))
