import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeSymbol, parseStooqCsv } from "../lib/data/history.ts";

const SAMPLE = `Date,Open,High,Low,Close,Volume
2020-01-02,74.06,75.15,73.80,75.09,135480400
2020-01-03,74.29,75.14,74.13,74.36,146322800
2020-01-06,73.45,74.99,73.19,74.95,118387200`;

test("parses a well-formed Stooq CSV", () => {
  const bars = parseStooqCsv(SAMPLE);
  assert.equal(bars.length, 3);
  assert.equal(bars[0].date, "2020-01-02");
  assert.equal(bars[0].open, 74.06);
  assert.equal(bars[0].close, 75.09);
  assert.equal(bars[2].volume, 118387200);
});

test("returns ascending-by-date order", () => {
  const shuffled = `Date,Open,High,Low,Close,Volume
2020-01-06,73.45,74.99,73.19,74.95,1
2020-01-02,74.06,75.15,73.80,75.09,1`;
  const bars = parseStooqCsv(shuffled);
  assert.equal(bars[0].date, "2020-01-02");
  assert.equal(bars[1].date, "2020-01-06");
});

test("skips rows with N/D or non-numeric fields", () => {
  const withGaps = `Date,Open,High,Low,Close,Volume
2020-01-02,74.06,75.15,73.80,75.09,1
2020-01-03,N/D,N/D,N/D,N/D,N/D
2020-01-06,73.45,74.99,73.19,74.95,1`;
  const bars = parseStooqCsv(withGaps);
  assert.equal(bars.length, 2);
});

test("returns empty for an unknown symbol response", () => {
  assert.deepEqual(parseStooqCsv("No data"), []);
  assert.deepEqual(parseStooqCsv(""), []);
});

test("normalizeSymbol lowercases and trims", () => {
  assert.equal(normalizeSymbol("  AAPL.US "), "aapl.us");
  assert.equal(normalizeSymbol("^SPX"), "^spx");
});
