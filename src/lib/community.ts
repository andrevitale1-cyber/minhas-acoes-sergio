import type { CommentAttachment } from "./attachments";
export type CommunityPost = {
  id: string;
  author_name: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  image_url: null;
  is_sergio: boolean;
  can_delete: boolean;
  can_pin: boolean;
  is_pinned: boolean;
  attachments: CommentAttachment[];
};
export type CommunityData = {
  posts: CommunityPost[];
  average: number;
  count: number;
  mine: number | null;
  hasMore: boolean;
};
export async function communityRequest(
  symbol: string,
  method = "GET",
  data?: unknown,
  page = 0,
): Promise<CommunityData> {
  const response = await fetch(`/api/community?symbol=${encodeURIComponent(symbol)}&page=${page}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Não foi possível acessar a comunidade.");
  return body;
}
