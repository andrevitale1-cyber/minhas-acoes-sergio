import { useState } from "react";
import { attachmentError, maxAttachments, type CommentAttachment } from "@/lib/attachments";

export type DraftAttachment = { id: string; file: File; uploaded?: CommentAttachment };
export function useAttachmentDraft() {
  const [items, setItems] = useState<DraftAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  function add(files: FileList | File[]) {
    const selected = Array.from(files);
    if (items.length + selected.length > maxAttachments) {
      setError("Você pode anexar até 3 arquivos.");
      return;
    }
    for (const file of selected) {
      const problem = attachmentError(file);
      if (problem) {
        setError(problem);
        return;
      }
    }
    setItems((current) => [
      ...current,
      ...selected.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
    setError(null);
  }
  function remove(id: string) {
    const item = items.find((file) => file.id === id);
    if (item?.uploaded)
      void fetch(`/api/attachments?id=${item.uploaded.id}`, { method: "DELETE" }).catch(() => {});
    setItems((current) => current.filter((file) => file.id !== id));
    setError(null);
  }
  function clear() {
    setItems([]);
    setError(null);
  }
  function discard() {
    items.forEach((item) => {
      if (item.uploaded)
        void fetch(`/api/attachments?id=${item.uploaded.id}`, { method: "DELETE" }).catch(() => {});
    });
    clear();
  }
  async function upload() {
    const ids: string[] = [];
    for (const item of items) {
      if (item.uploaded) {
        ids.push(item.uploaded.id);
        continue;
      }
      const form = new FormData();
      form.set("file", item.file);
      const response = await fetch("/api/attachments", { method: "POST", body: form });
      let body;
      try {
        body = await response.json();
      } catch {
        throw new Error("Não foi possível enviar o arquivo. Confira o limite de 3 MB.");
      }
      if (!response.ok) throw new Error(body.error || "Não foi possível enviar o anexo.");
      const uploaded = body as CommentAttachment;
      setItems((current) =>
        current.map((file) => (file.id === item.id ? { ...file, uploaded } : file)),
      );
      ids.push(uploaded.id);
    }
    return ids;
  }
  return { items, add, remove, clear, discard, upload, error };
}
export type AttachmentDraft = ReturnType<typeof useAttachmentDraft>;
