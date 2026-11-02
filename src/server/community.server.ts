import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { z } from "zod";
import { getDatabase } from "./db.server";

export const communityActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rate"), stars: z.number().int().min(1).max(5) }),
  z.object({
    action: z.literal("post"),
    content: z.string().trim().max(2000),
    attachment_ids: z.array(z.string().uuid()).max(3).default([]),
    parent_id: z.string().uuid().nullable(),
  }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
  z.object({ action: z.literal("pin"), id: z.string().uuid(), pinned: z.boolean() }),
]);
export function validWriteOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return (
    origin !== null &&
    origin === new URL(request.url).origin &&
    request.headers.get("Content-Type")?.startsWith("application/json")
  );
}
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function handleCommunity(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") ?? "").trim().toUpperCase();
  const page = Number(url.searchParams.get("page") ?? 0);
  if (!/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol) || !Number.isInteger(page) || page < 0 || page > 1000)
    return json({ error: "Consulta inválida." }, 400);
  const market = /^[A-Z]{4}\d{1,2}$/.test(symbol) ? "BR" : "US";
  if (request.method !== "GET" && !validWriteOrigin(request))
    return json({ error: "Origem da requisição inválida." }, 403);
  if (!process.env["DATABASE_URL"] || !process.env["CLERK_SECRET_KEY"])
    return json({ error: "A comunidade ainda está sendo configurada." }, 503);
  try {
    const { userId } = await auth();
    const sergioIds = [
      process.env["SERGIO_CLERK_USER_ID"],
      ...(process.env["SERGIO_ADDITIONAL_CLERK_USER_IDS"] ?? "").split(","),
    ]
      .map((id) => id?.trim())
      .filter((id): id is string => Boolean(id));
    const isSergio = Boolean(userId && sergioIds.includes(userId));
    const db = getDatabase();
    if (request.method === "POST") {
      if (!userId) return json({ error: "Entre para participar." }, 401);
      if (Number(request.headers.get("Content-Length") ?? 0) > 12000)
        return json({ error: "Mensagem muito grande." }, 413);
      const text = await request.text();
      if (text.length > 12000) return json({ error: "Mensagem muito grande." }, 413);
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        return json({ error: "Dados inválidos." }, 400);
      }
      const parsed = communityActionSchema.safeParse(payload);
      if (!parsed.success)
        return json(
          { error: "Verifique os dados: notas de 1 a 5 e textos de até 2.000 caracteres." },
          400,
        );
      if (
        parsed.data.action === "post" &&
        ((!parsed.data.content && !parsed.data.attachment_ids.length) ||
          new Set(parsed.data.attachment_ids).size !== parsed.data.attachment_ids.length)
      )
        return json({ error: "Escreva um comentário ou selecione um anexo." }, 400);
      if (parsed.data.action === "pin" && !isSergio)
        return json({ error: "Somente o Sérgio pode fixar comentários." }, 403);
      const [rateLimit] =
        await db`INSERT INTO community_rate_limits (user_id, window_start, requests) VALUES (${userId}, date_trunc('hour', now()), 1) ON CONFLICT (user_id, window_start) DO UPDATE SET requests = community_rate_limits.requests + 1 WHERE community_rate_limits.requests < 60 RETURNING requests`;
      if (!rateLimit)
        return json(
          { error: "Limite de participações atingido. Tente novamente mais tarde." },
          429,
        );
      const action = parsed.data;
      if (action.action === "rate") {
        await db`INSERT INTO ratings (market, symbol, user_id, stars) VALUES (${market}, ${symbol}, ${userId}, ${action.stars}) ON CONFLICT (market, symbol, user_id) DO UPDATE SET stars = EXCLUDED.stars, updated_at = now()`;
      } else if (action.action === "post") {
        if (action.parent_id) {
          const [parent] =
            await db`SELECT id FROM posts WHERE id = ${action.parent_id} AND market = ${market} AND symbol = ${symbol} AND parent_id IS NULL AND hidden_at IS NULL`;
          if (!parent)
            return json({ error: "A publicação para responder não está disponível." }, 400);
        }
        const profile = await clerkClient().users.getUser(userId);
        const author =
          [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
          profile.username ||
          "Investidor";
        await db.begin(async (tx) => {
          if (action.attachment_ids.length) {
            const files =
              await tx`SELECT id FROM comment_attachments WHERE id IN ${tx(action.attachment_ids)} AND owner_id = ${userId} AND post_id IS NULL AND created_at > now() - interval '1 day' FOR UPDATE`;
            if (files.length !== action.attachment_ids.length)
              throw new Error("INVALID_ATTACHMENTS");
          }
          const [post] =
            await tx`INSERT INTO posts (market, symbol, user_id, author_name, content, parent_id) VALUES (${market}, ${symbol}, ${userId}, ${author.slice(0, 100)}, ${action.content}, ${action.parent_id}) RETURNING id`;
          if (action.attachment_ids.length)
            await tx`UPDATE comment_attachments SET post_id = ${post!["id"]} WHERE id IN ${tx(action.attachment_ids)}`;
        });
      } else if (action.action === "pin") {
        const [pinned] =
          await db`UPDATE posts SET pinned_at = ${action.pinned ? new Date() : null} WHERE id = ${action.id} AND market = ${market} AND symbol = ${symbol} AND hidden_at IS NULL RETURNING id`;
        if (!pinned) return json({ error: "Publicação não encontrada." }, 404);
      } else {
        const [deleted] =
          await db`UPDATE posts SET hidden_at = now() WHERE id = ${action.id} AND market = ${market} AND symbol = ${symbol} AND hidden_at IS NULL AND (user_id = ${userId} OR ${isSergio}) RETURNING id`;
        if (!deleted) return json({ error: "Você não pode excluir esta publicação." }, 403);
      }
    }
    const [summary, mine, roots] = await Promise.all([
      db`SELECT coalesce(avg(stars), 0)::float AS average, count(*)::int AS count FROM ratings WHERE market = ${market} AND symbol = ${symbol}`,
      userId
        ? db`SELECT stars FROM ratings WHERE market = ${market} AND symbol = ${symbol} AND user_id = ${userId}`
        : [],
      db`SELECT id FROM posts p WHERE market = ${market} AND symbol = ${symbol} AND parent_id IS NULL AND hidden_at IS NULL ORDER BY (pinned_at IS NOT NULL OR EXISTS (SELECT 1 FROM posts r WHERE r.parent_id = p.id AND r.pinned_at IS NOT NULL AND r.hidden_at IS NULL)) DESC, (user_id = ANY(${sergioIds}::text[])) DESC, created_at DESC, id DESC LIMIT 21 OFFSET ${page * 20}`,
    ]);
    const ids = roots.slice(0, 20).map((root) => root["id"]);
    const posts = ids.length
      ? await db`SELECT id, author_name, content, parent_id, created_at, (user_id = ANY(${sergioIds}::text[])) AS is_sergio, (${userId !== null} AND (user_id = ${userId ?? ""} OR ${isSergio})) AS can_delete, ${isSergio}::boolean AS can_pin, (pinned_at IS NOT NULL) AS is_pinned, NULL AS image_url, coalesce((SELECT json_agg(json_build_object('id', a.id, 'name', a.file_name, 'type', a.content_type, 'size', a.size) ORDER BY a.created_at) FROM comment_attachments a WHERE a.post_id = posts.id), '[]'::json) AS attachments FROM posts WHERE hidden_at IS NULL AND (id IN ${db(ids)} OR parent_id IN ${db(ids)}) ORDER BY array_position(${ids}::uuid[], coalesce(parent_id, id)), (pinned_at IS NOT NULL) DESC, created_at DESC, id DESC LIMIT 500`
      : [];
    return json({
      posts,
      average: summary[0]?.["average"] ?? 0,
      count: summary[0]?.["count"] ?? 0,
      mine: mine[0]?.["stars"] ?? null,
      hasMore: roots.length > 20,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_ATTACHMENTS")
      return json({ error: "Um anexo não está mais disponível. Remova-o e anexe novamente." }, 400);
    return json(
      {
        error:
          "A comunidade está indisponível no momento. Seu texto não foi apagado; tente novamente.",
      },
      503,
    );
  }
}
