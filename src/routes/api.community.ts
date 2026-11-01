import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/community")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        (await import("@/server/community.server")).handleCommunity(request),
      POST: async ({ request }) =>
        (await import("@/server/community.server")).handleCommunity(request),
    },
  },
});
