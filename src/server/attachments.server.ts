import { auth } from "@clerk/tanstack-react-start/server";
import { put, get, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { getDatabase } from "./db.server";
import { readAttachment } from "./attachment-validation.server";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function handleAttachments(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  if (
    request.method !== "POST" &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return json({ error: "Anexo inválido." }, 400);
  if (request.method !== "GET" && request.headers.get("Origin") !== url.origin)
    return json({ error: "Origem inválida." }, 403);
  try {
    const { userId } = await auth();
    if (request.method !== "GET" && !userId)
      return json({ error: "Entre para anexar arquivos." }, 401);
    const db = getDatabase();
    if (request.method === "GET") {
      const [file] =
        await db`SELECT a.pathname, a.file_name, a.content_type FROM comment_attachments a LEFT JOIN posts p ON p.id = a.post_id WHERE a.id = ${id} AND ((a.post_id IS NULL AND a.owner_id = ${userId ?? ""} AND a.created_at > now() - interval '1 day') OR (p.id IS NOT NULL AND p.hidden_at IS NULL AND (p.parent_id IS NULL OR EXISTS (SELECT 1 FROM posts root WHERE root.id = p.parent_id AND root.hidden_at IS NULL))))`;
      if (!file) return json({ error: "Anexo não encontrado." }, 404);
      const blob = await get(file["pathname"], { access: "private" });
      if (!blob || blob.statusCode !== 200) return json({ error: "Anexo não encontrado." }, 404);
      const image =
        String(file["content_type"]).startsWith("image/") &&
        url.searchParams.get("download") !== "1";
      const filename = encodeURIComponent(String(file["file_name"])).replace(/'/g, "%27");
      return new Response(blob.stream, {
        headers: {
          "Content-Type": String(file["content_type"]),
          "Content-Disposition": `${image ? "inline" : "attachment"}; filename*=UTF-8''${filename}`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox",
        },
      });
    }
    if (request.method === "DELETE") {
      const removed =
        await db`DELETE FROM comment_attachments WHERE id = ${id} AND owner_id = ${userId!} AND post_id IS NULL RETURNING pathname`;
      if (!removed.length) return json({ error: "Anexo não encontrado." }, 404);
      await del(removed.map((file) => String(file["pathname"])));
      return json({ ok: true });
    }
    if (!process.env["BLOB_STORE_ID"] && !process.env["BLOB_READ_WRITE_TOKEN"])
      return json({ error: "O armazenamento de anexos ainda está sendo configurado." }, 503);
    const file = await readAttachment(request);
    // shortcut: expired drafts are cleaned on the owner's next upload; add scheduled cleanup as usage grows.
    const expired =
      await db`DELETE FROM comment_attachments WHERE owner_id = ${userId!} AND post_id IS NULL AND created_at < now() - interval '1 day' RETURNING pathname`;
    if (expired.length) await del(expired.map((row) => String(row["pathname"])));
    const [pending] =
      await db`SELECT count(*)::int AS count FROM comment_attachments WHERE owner_id = ${userId!} AND post_id IS NULL`;
    if ((pending?.["count"] ?? 0) >= 12)
      return json(
        {
          error: "Você tem muitos anexos em rascunho. Remova alguns ou tente novamente mais tarde.",
        },
        429,
      );
    const [allowed] =
      await db`INSERT INTO community_rate_limits (user_id, window_start, requests) VALUES (${userId!}, date_trunc('hour', now()), 1) ON CONFLICT (user_id, window_start) DO UPDATE SET requests = community_rate_limits.requests + 1 WHERE community_rate_limits.requests < 60 RETURNING requests`;
    if (!allowed)
      return json({ error: "Limite de envios atingido. Tente novamente mais tarde." }, 429);
    const fileId = randomUUID();
    const blob = await put(`comments/${fileId}.${file.ext}`, Buffer.from(file.bytes), {
      access: "private",
      contentType: file.type,
      addRandomSuffix: false,
    });
    try {
      await db`INSERT INTO comment_attachments (id, owner_id, pathname, file_name, content_type, size) VALUES (${fileId}, ${userId!}, ${blob.pathname}, ${file.name}, ${file.type}, ${file.bytes.length})`;
    } catch (error) {
      await del(blob.pathname).catch(() => {});
      throw error;
    }
    return json({ id: fileId, name: file.name, type: file.type, size: file.bytes.length });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_UPLOAD")
      return json({ error: "Arquivo inválido. Confira o formato e o limite de 3 MB." }, 400);
    return json({ error: "Não foi possível acessar o anexo. Tente novamente." }, 503);
  }
}
