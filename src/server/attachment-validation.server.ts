import { attachmentError, attachmentTypes, maxAttachmentSize } from "@/lib/attachments";

export function validAttachmentBytes(name: string, bytes: Uint8Array) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const starts = (...prefix: number[]) => prefix.every((byte, i) => bytes[i] === byte);
  const text = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  switch (ext) {
    case "png":
      return starts(137, 80, 78, 71, 13, 10, 26, 10);
    case "jpg":
    case "jpeg":
      return starts(255, 216, 255);
    case "gif":
      return ["GIF87a", "GIF89a"].includes(text(0, 6));
    case "webp":
      return text(0, 4) === "RIFF" && text(8, 4) === "WEBP";
    case "pdf":
      return text(0, 5) === "%PDF-";
    case "docx":
    case "xlsx":
    case "pptx":
    case "zip":
      return starts(80, 75, 3, 4) || starts(80, 75, 5, 6);
    case "txt":
    case "csv":
      try {
        return !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(
          new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        );
      } catch {
        return false;
      }
    default:
      return false;
  }
}
export async function readAttachment(request: Request) {
  const limit = maxAttachmentSize + 65536;
  if (
    !request.headers.get("Content-Type")?.startsWith("multipart/form-data") ||
    Number(request.headers.get("Content-Length") ?? 0) > limit
  )
    throw new Error("INVALID_UPLOAD");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_UPLOAD");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new Error("INVALID_UPLOAD");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  const form = await new Response(body, {
    headers: { "Content-Type": request.headers.get("Content-Type")! },
  }).formData();
  const file = form.get("file");
  if (!(file instanceof File) || attachmentError(file)) throw new Error("INVALID_UPLOAD");
  const name = (file.name.split(/[\\/]/).pop() ?? "arquivo")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, 180);
  if (!name || attachmentError({ name, size: file.size })) throw new Error("INVALID_UPLOAD");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validAttachmentBytes(name, bytes)) throw new Error("INVALID_UPLOAD");
  const ext = name.split(".").pop()!.toLowerCase();
  return { name, bytes, type: attachmentTypes[ext]!, ext };
}
