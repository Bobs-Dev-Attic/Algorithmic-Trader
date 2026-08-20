/** Small formatting helpers shared across the dashboard UI. */

export function pct(x: number, digits = 2): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function signedPct(x: number, digits = 2): string {
  const s = `${(x * 100).toFixed(digits)}%`;
  return x > 0 ? `+${s}` : s;
}

export function money(x: number): string {
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function num(x: number, digits = 2): string {
  return x.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
