// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { handleMarketRequest, normalizeQuote, normalizeTwelve } from "@/server/market.server";
vi.mock("@/lib/market-status", () => ({ marketDataPaused: false }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const sample = {
  symbol: "PETR4",
  currency: "BRL",
  regularMarketPrice: 95,
  regularMarketPreviousClose: 100,
  regularMarketTime: "2026-10-30T20:00:00Z",
  historicalDataPrice: [
    { date: 20, close: 95 },
    { date: 10, close: 100 },
    { date: 15, close: null },
    { date: 20, close: 96 },
  ],
};

it("calculates the daily fall against previous close and sorts usable history without fabricating points", () => {
  const quote = normalizeQuote(sample, "PETR4", "1d");
  expect(quote.change).toBe(-5);
  expect(quote.changePct).toBe(-5);
  expect(quote.history).toEqual([
    { time: 10000, price: 100 },
    { time: 20000, price: 96 },
  ]);
  expect(quote.quotedAt).toBe(sample.regularMarketTime);
});

it("rejects a missing price or a response for another ticker", () => {
  expect(() => normalizeQuote({ ...sample, regularMarketPrice: null }, "PETR4", "1d")).toThrow();
  expect(() => normalizeQuote(sample, "VALE3", "1d")).toThrow();
});

it("validates period and ticker before contacting the supplier", async () => {
  const upstream = vi.fn();
  vi.stubGlobal("fetch", upstream);
  expect(
    (await handleMarketRequest(new Request("https://site/api/market?symbol=PETR4&period=invalid")))
      .status,
  ).toBe(400);
  expect(
    (await handleMarketRequest(new Request("https://site/api/market?symbol=../../secret"))).status,
  ).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});

it("returns a controlled error for assets without credentials", async () => {
  vi.stubEnv("BRAPI_TOKEN", "");
  const upstream = vi.fn();
  vi.stubGlobal("fetch", upstream);
  const response = await handleMarketRequest(new Request("https://site/api/market?symbol=WEGE3"));
  expect(response.status).toBe(503);
  expect(upstream).not.toHaveBeenCalled();
});

it("keeps the token in upstream headers and caches successful public quotes", async () => {
  vi.stubEnv("BRAPI_TOKEN", "test-private-token");
  const upstream = vi.fn().mockResolvedValue(Response.json({ results: [sample] }));
  vi.stubGlobal("fetch", upstream);
  const response = await handleMarketRequest(new Request("https://site/api/market?symbol=PETR4"));
  const [url, options] = upstream.mock.calls[0]!;
  expect(String(url)).not.toContain("test-private-token");
  expect(options.headers.Authorization).toBe("Bearer test-private-token");
  expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
  expect(await response.text()).not.toContain("test-private-token");
});

it("does not cache supplier failures or expose upstream error details", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("secret upstream details", { status: 429 })),
  );
  const response = await handleMarketRequest(new Request("https://site/api/market?symbol=PETR4"));
  expect(response.status).toBe(429);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.text()).not.toContain("secret upstream details");
});

it("preserves the latest quote when the brapi plan blocks the requested history", async () => {
  vi.stubEnv("BRAPI_TOKEN", "test-private-token");
  const upstream = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ code: "INVALID_INTERVAL" }, { status: 400 }))
    .mockResolvedValueOnce(Response.json({ results: [{ ...sample, historicalDataPrice: [] }] }));
  vi.stubGlobal("fetch", upstream);
  const response = await handleMarketRequest(new Request("https://site/api/market?symbol=PETR4"));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.price).toBe(95);
  expect(body.history).toEqual([]);
  expect(body.historyNotice).toBeTruthy();
  expect(String(upstream.mock.calls[1]![0])).not.toContain("interval");
});

it("uses the daily previous close and last quote time from Twelve Data, retaining only the latest intraday session", () => {
  const result = normalizeTwelve(
    {
      symbol: "AAPL",
      name: "Apple",
      currency: "USD",
      close: "95",
      previous_close: "100",
      timestamp: 1793376000,
      last_quote_at: 1793390400,
    },
    {
      values: [
        { datetime: "2026-10-29 19:55:00", close: "101" },
        { datetime: "2026-10-30 19:50:00", close: "96" },
        { datetime: "2026-10-30 19:55:00", close: "95" },
      ],
    },
    "AAPL",
    "1d",
  );
  expect(result.changePct).toBe(-5);
  expect(result.history).toHaveLength(2);
  expect(result.quotedAt).toBe(new Date(1793390400000).toISOString());
});
