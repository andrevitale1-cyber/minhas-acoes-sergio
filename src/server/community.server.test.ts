// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), sql: vi.fn(), profile: vi.fn() }));
vi.mock("@clerk/tanstack-react-start/server", () => ({
  auth: mocks.auth,
  clerkClient: () => ({ users: { getUser: mocks.profile } }),
}));
vi.mock("./db.server", () => ({ getDatabase: () => mocks.sql }));
import { handleCommunity } from "./community.server";
const request = (body: unknown, origin = "https://example.com") =>
  new Request("https://example.com/api/community?symbol=ITUB4", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("DATABASE_URL", "configured");
  vi.stubEnv("CLERK_SECRET_KEY", "configured");
  vi.stubEnv("SERGIO_CLERK_USER_ID", "user_sergio");
  vi.stubEnv("SERGIO_ADDITIONAL_CLERK_USER_IDS", " user_second_sergio ");
  mocks.auth.mockResolvedValue({ userId: "user_real" });
});
it("rejects pinning by other users, including forged moderator fields", async () => {
  const response = await handleCommunity(
    request({
      action: "pin",
      id: "e8214cd4-18b1-4e83-a42a-0f401c76bfa5",
      pinned: true,
      is_sergio: true,
    }),
  );
  expect(response.status).toBe(403);
  expect(mocks.sql).not.toHaveBeenCalled();
});
it.each([true, false])("allows Sérgio to set pinned=%s", async (pinned) => {
  mocks.auth.mockResolvedValue({ userId: "user_sergio" });
  mocks.sql
    .mockResolvedValueOnce([{ requests: 1 }])
    .mockResolvedValueOnce([{ id: "post" }])
    .mockResolvedValueOnce([{ average: 0, count: 0 }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
  expect(
    (
      await handleCommunity(
        request({ action: "pin", id: "e8214cd4-18b1-4e83-a42a-0f401c76bfa5", pinned }),
      )
    ).status,
  ).toBe(200);
  expect(mocks.sql.mock.calls[1]?.[1]).toEqual(pinned ? expect.any(Date) : null);
});
it("allows Sérgio to moderate another author's comment", async () => {
  mocks.auth.mockResolvedValue({ userId: "user_sergio" });
  mocks.sql
    .mockResolvedValueOnce([{ requests: 1 }])
    .mockResolvedValueOnce([{ id: "post" }])
    .mockResolvedValueOnce([{ average: 0, count: 0 }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
  expect(
    (
      await handleCommunity(
        request({ action: "delete", id: "e8214cd4-18b1-4e83-a42a-0f401c76bfa5" }),
      )
    ).status,
  ).toBe(200);
  expect(mocks.sql.mock.calls[1]?.slice(1)).toEqual([
    "e8214cd4-18b1-4e83-a42a-0f401c76bfa5",
    "BR",
    "ITUB4",
    "user_sergio",
    true,
  ]);
});
it("rejects cross-site writes before consulting authentication or the database", async () => {
  expect(
    (await handleCommunity(request({ action: "rate", stars: 5 }, "https://evil.test"))).status,
  ).toBe(403);
  expect(mocks.auth).not.toHaveBeenCalled();
  expect(mocks.sql).not.toHaveBeenCalled();
});
it("requires a session for writes", async () => {
  mocks.auth.mockResolvedValue({ userId: null });
  expect((await handleCommunity(request({ action: "rate", stars: 5 }))).status).toBe(401);
  expect(mocks.sql).not.toHaveBeenCalled();
});
it.each([0, 6, 2.5, "5"])("rejects invalid rating %s", async (stars) => {
  expect((await handleCommunity(request({ action: "rate", stars }))).status).toBe(400);
  expect(mocks.sql).not.toHaveBeenCalled();
});
it("binds the rating to the authenticated user and ignores a forged user id", async () => {
  mocks.sql
    .mockResolvedValueOnce([{ requests: 1 }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ average: 4, count: 1 }])
    .mockResolvedValueOnce([{ stars: 4 }])
    .mockResolvedValueOnce([]);
  const response = await handleCommunity(request({ action: "rate", stars: 4, user_id: "victim" }));
  expect(response.status).toBe(200);
  expect(mocks.sql.mock.calls[1]?.slice(1)).toEqual(["BR", "ITUB4", "user_real", 4]);
  expect(await response.json()).toMatchObject({ average: 4, count: 1, mine: 4 });
});
it("rejects replies to missing or other-company publications", async () => {
  mocks.sql.mockResolvedValueOnce([{ requests: 1 }]).mockResolvedValueOnce([]);
  expect(
    (
      await handleCommunity(
        request({
          action: "post",
          content: "Resposta",
          parent_id: "e8214cd4-18b1-4e83-a42a-0f401c76bfa5",
        }),
      )
    ).status,
  ).toBe(400);
  expect(mocks.profile).not.toHaveBeenCalled();
});
it("enforces the persistent write limit", async () => {
  mocks.sql.mockResolvedValueOnce([]);
  expect((await handleCommunity(request({ action: "rate", stars: 5 }))).status).toBe(429);
  expect(mocks.sql).toHaveBeenCalledTimes(1);
});
it("rejects deletion when the ownership check returns no authorized row", async () => {
  mocks.sql.mockResolvedValueOnce([{ requests: 1 }]).mockResolvedValueOnce([]);
  expect(
    (
      await handleCommunity(
        request({ action: "delete", id: "e8214cd4-18b1-4e83-a42a-0f401c76bfa5" }),
      )
    ).status,
  ).toBe(403);
  expect(mocks.sql.mock.calls[1]?.slice(1)).toEqual([
    "e8214cd4-18b1-4e83-a42a-0f401c76bfa5",
    "BR",
    "ITUB4",
    "user_real",
    false,
  ]);
});

it.each(["pin", "delete"])(
  "grants %s to the explicitly configured second account",
  async (action) => {
    mocks.auth.mockResolvedValue({ userId: "user_second_sergio" });
    mocks.sql
      .mockResolvedValueOnce([{ requests: 1 }])
      .mockResolvedValueOnce([{ id: "post" }])
      .mockResolvedValueOnce([{ average: 0, count: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const response = await handleCommunity(
      request({
        action,
        id: "e8214cd4-18b1-4e83-a42a-0f401c76bfa5",
        ...(action === "pin" ? { pinned: true } : {}),
      }),
    );
    expect(response.status).toBe(200);
    if (action === "delete") expect(mocks.sql.mock.calls[1]?.at(-1)).toBe(true);
    expect(mocks.sql.mock.calls[4]?.slice(1)).toContainEqual(["user_sergio", "user_second_sergio"]);
  },
);
