export const periods = {
  "1d": { label: "1D", interval: "5m" },
  "5d": { label: "5D", interval: "30m" },
  "1mo": { label: "1M", interval: "1d" },
  "6mo": { label: "6M", interval: "1d" },
  "1y": { label: "1A", interval: "1d" },
  max: { label: "Máx.", interval: "1d" },
} as const;
export type Period = keyof typeof periods;
export type MarketQuote = {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  change: number | null;
  changePct: number | null;
  previousClose: number | null;
  quotedAt: string | null;
  fetchedAt: string;
  source: string;
  period: Period;
  interval: string;
  historyNotice?: string;
  marketOpen?: boolean;
  history: { time: number; price: number }[];
};

export function periodReturn(quote: MarketQuote) {
  const baseline =
    quote.period === "1d"
      ? quote.previousClose
      : quote.history.length > 1
        ? quote.history[0]!.price
        : null;
  if (baseline === null || baseline <= 0) return null;
  const change = quote.price - baseline;
  return { change, changePct: (change / baseline) * 100, baseline };
}
