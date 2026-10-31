import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/market")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleMarketRequest } = await import("@/server/market.server");
        return handleMarketRequest(request);
      },
    },
  },
});
