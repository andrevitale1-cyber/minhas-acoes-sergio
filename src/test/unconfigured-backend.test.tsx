import { renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: new Proxy({}, { get() { throw new Error("Backend must not be accessed"); } }),
}));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
});

it("renders a signed-out session without accessing an unconfigured backend", async () => {
  const { useUser } = await import("@/hooks/use-session");
  const { result, unmount } = renderHook(() => useUser());
  expect(result.current).toBeNull();
  unmount();
});
