// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { handleMarketRequest } from "@/server/market.server";

afterEach(() => vi.unstubAllGlobals());

it("blocks both providers before making any external request while paused", async () => {
  const externalRequest = vi.fn();
  vi.stubGlobal("fetch", externalRequest);
  for (const symbol of ["PETR4", "AAPL"]) {
    const response = await handleMarketRequest(
      new Request(`https://site/api/market?symbol=${symbol}`),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect((await response.json()).error).toContain("pausadas");
  }
  expect(externalRequest).not.toHaveBeenCalled();
});
