import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Algorithmic Trader — Backtest Dashboard",
  description:
    "Interactive dashboard for backtesting moving-average strategies with the Algorithmic-Trader engine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
