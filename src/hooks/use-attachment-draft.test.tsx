import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useAttachmentDraft } from "./use-attachment-draft";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup() {
  let id = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `draft-${++id}` });
  return renderHook(() => useAttachmentDraft());
}
it("rejects too many files without altering the existing draft", () => {
  const { result } = setup();
  act(() => result.current.add([new File(["one"], "one.txt")]));
  act(() =>
    result.current.add([
      new File(["two"], "two.txt"),
      new File(["three"], "three.txt"),
      new File(["four"], "four.txt"),
    ]),
  );
  expect(result.current.items).toHaveLength(1);
  expect(result.current.error).toContain("3 arquivos");
});
it("preserves partial uploads on failure and retries only the remaining file", async () => {
  const upload = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "saved-one", name: "one.txt", type: "text/plain", size: 3 }),
    })
    .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Falhou" }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "saved-two", name: "two.txt", type: "text/plain", size: 3 }),
    });
  vi.stubGlobal("fetch", upload);
  const { result } = setup();
  act(() => result.current.add([new File(["one"], "one.txt"), new File(["two"], "two.txt")]));
  await act(async () => {
    await expect(result.current.upload()).rejects.toThrow("Falhou");
  });
  expect(result.current.items[0]?.uploaded?.id).toBe("saved-one");
  expect(result.current.items).toHaveLength(2);
  await act(async () => {
    expect(await result.current.upload()).toEqual(["saved-one", "saved-two"]);
  });
  expect(upload).toHaveBeenCalledTimes(3);
});
