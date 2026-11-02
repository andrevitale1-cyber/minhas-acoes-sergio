// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  sql: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));
vi.mock("@clerk/tanstack-react-start/server", () => ({ auth: mocks.auth }));
vi.mock("./db.server", () => ({ getDatabase: () => mocks.sql }));
vi.mock("@vercel/blob", () => ({ get: mocks.get, put: mocks.put, del: mocks.del }));
import { handleAttachments } from "./attachments.server";
const url = "https://site/api/attachments?id=e8214cd4-18b1-4e83-a42a-0f401c76bfa5";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ userId: "owner" });
});
it("blocks cross-site uploads before authentication", async () => {
  expect(
    (
      await handleAttachments(
        new Request(url, { method: "POST", headers: { Origin: "https://evil.test" } }),
      )
    ).status,
  ).toBe(403);
  expect(mocks.auth).not.toHaveBeenCalled();
});
it("requires login to upload or delete", async () => {
  mocks.auth.mockResolvedValue({ userId: null });
  for (const method of ["POST", "DELETE"])
    expect(
      (await handleAttachments(new Request(url, { method, headers: { Origin: "https://site" } })))
        .status,
    ).toBe(401);
  expect(mocks.put).not.toHaveBeenCalled();
});
it("does not read a hidden or someone else's unpublished attachment", async () => {
  mocks.sql.mockResolvedValue([]);
  expect((await handleAttachments(new Request(url))).status).toBe(404);
  expect(mocks.get).not.toHaveBeenCalled();
});
it("serves documents as downloads with safe headers", async () => {
  mocks.auth.mockResolvedValue({ userId: null });
  mocks.sql.mockResolvedValue([
    { pathname: "comments/file.pdf", file_name: "resultado.pdf", content_type: "application/pdf" },
  ]);
  mocks.get.mockResolvedValue({ statusCode: 200, stream: new Response("%PDF-1.4").body });
  const response = await handleAttachments(new Request(url));
  expect(response.status).toBe(200);
  expect(mocks.get).toHaveBeenCalledWith("comments/file.pdf", { access: "private" });
  expect(response.headers.get("Content-Disposition")).toContain("attachment;");
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it("does not delete an attachment already bound to a comment or owned by someone else", async () => {
  mocks.sql.mockResolvedValue([]);
  expect(
    (
      await handleAttachments(
        new Request(url, { method: "DELETE", headers: { Origin: "https://site" } }),
      )
    ).status,
  ).toBe(404);
  expect(mocks.del).not.toHaveBeenCalled();
});
