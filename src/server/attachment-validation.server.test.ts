// @vitest-environment node
import { expect, it } from "vitest";
import { readAttachment, validAttachmentBytes } from "./attachment-validation.server";
import { attachmentError, maxAttachmentSize } from "@/lib/attachments";
import { formatPostDate } from "@/lib/post-date";
it("shows a fixed posting date and time in Brasília", () => {
  expect(formatPostDate("2026-11-02T02:30:00Z")).toBe("01/11/2026, 23:30");
});
it("rejects executable files, empty files and files larger than 3 MB", () => {
  expect(attachmentError({ name: "app.exe", size: 10 })).not.toBeNull();
  expect(attachmentError({ name: "doc.pdf", size: 0 })).not.toBeNull();
  expect(attachmentError({ name: "doc.pdf", size: maxAttachmentSize + 1 })).not.toBeNull();
  expect(attachmentError({ name: "doc.pdf", size: maxAttachmentSize })).toBeNull();
});
it("checks image and document signatures instead of trusting the extension", () => {
  expect(
    validAttachmentBytes("foto.png", new TextEncoder().encode("<script>alert(1)</script>")),
  ).toBe(false);
  expect(validAttachmentBytes("foto.png", new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(
    true,
  );
  expect(validAttachmentBytes("doc.pdf", new TextEncoder().encode("%PDF-1.4"))).toBe(true);
  expect(validAttachmentBytes("dados.csv", new Uint8Array([0, 1, 2]))).toBe(false);
});
it("reads an upload and removes path components from the displayed filename", async () => {
  const form = new FormData();
  form.set("file", new File(["%PDF-1.4\nexample"], "relatorio.pdf", { type: "application/pdf" }));
  const file = await readAttachment(
    new Request("https://site/api/attachments", { method: "POST", body: form }),
  );
  expect(file.name).toBe("relatorio.pdf");
  expect(file.type).toBe("application/pdf");
});
it("rejects an oversized chunked body without reading the rest", async () => {
  const request = new Request("https://site/api/attachments", {
    method: "POST",
    headers: { "Content-Type": "multipart/form-data; boundary=test" },
    body: new Uint8Array(maxAttachmentSize + 65537),
  });
  await expect(readAttachment(request)).rejects.toThrow("INVALID_UPLOAD");
});
