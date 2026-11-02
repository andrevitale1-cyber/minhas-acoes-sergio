import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/attachments")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        (await import("@/server/attachments.server")).handleAttachments(request),
      POST: async ({ request }) =>
        (await import("@/server/attachments.server")).handleAttachments(request),
      DELETE: async ({ request }) =>
        (await import("@/server/attachments.server")).handleAttachments(request),
    },
  },
});
