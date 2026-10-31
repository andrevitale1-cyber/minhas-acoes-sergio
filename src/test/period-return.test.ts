import { expect, it } from "vitest";
import { periodReturn, type MarketQuote } from "@/lib/market";

const quote: MarketQuote = {
  symbol: "PETR4",
  name: "Petrobras",
  currency: "BRL",
  price: 120,
  previousClose: 125,
  change: -5,
  changePct: -4,
  quotedAt: null,
  fetchedAt: "2026-10-31T12:00:00Z",
  source: "fixture",
  period: "1mo",
  interval: "1d",
  history: [
    { time: 1, price: 100 },
    { time: 2, price: 110 },
  ],
};

it("shows the monthly gain instead of the daily fall", () => {
  expect(periodReturn(quote)).toEqual({ baseline: 100, change: 20, changePct: 20 });
});

it("keeps the previous-close comparison for 1D", () => {
  expect(periodReturn({ ...quote, period: "1d" })).toEqual({
    baseline: 125,
    change: -5,
    changePct: -4,
  });
});

it("calculates all-time price change from the first available historical point", () => {
  expect(
    periodReturn({
      ...quote,
      period: "max",
      history: [
        { time: 1, price: 20 },
        { time: 2, price: 120 },
      ],
    }),
  ).toEqual({ baseline: 20, change: 100, changePct: 500 });
});

it("does not substitute a daily variation when period history is missing", () => {
  expect(periodReturn({ ...quote, history: [] })).toBeNull();
  expect(periodReturn({ ...quote, history: [{ time: 1, price: 100 }] })).toBeNull();
  expect(
    periodReturn({
      ...quote,
      history: [
        { time: 1, price: 0 },
        { time: 2, price: 120 },
      ],
    }),
  ).toBeNull();
});
