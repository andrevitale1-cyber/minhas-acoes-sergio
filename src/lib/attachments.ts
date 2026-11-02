export const maxAttachmentSize = 3 * 1024 * 1024;
export const maxAttachments = 3;
export const attachmentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
};
export const attachmentAccept = Object.keys(attachmentTypes)
  .map((ext) => `.${ext}`)
  .join(",");
export type CommentAttachment = { id: string; name: string; type: string; size: number };
export function attachmentError(file: { name: string; size: number }) {
  if (!file.size) return "O arquivo está vazio.";
  if (file.size > maxAttachmentSize) return "Cada arquivo deve ter no máximo 3 MB.";
  if (!attachmentTypes[file.name.split(".").pop()?.toLowerCase() ?? ""])
    return "Formato não permitido. Use imagens, PDF, TXT, CSV, Word, Excel, PowerPoint ou ZIP.";
  return null;
}
export const attachmentUrl = (id: string, download = false) =>
  `/api/attachments?id=${encodeURIComponent(id)}${download ? "&download=1" : ""}`;
export const attachmentSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
