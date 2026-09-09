import { createFileRoute } from "@tanstack/react-router";
import { mergeAndList } from "@/server/edge-sync.server";

export const Route = createFileRoute("/api/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const length = Number(request.headers.get("content-length") ?? "0");
          if (length > 256_000) {
            return Response.json({ error: "payload too large" }, { status: 413 });
          }
          const body = (await request.json()) as { localReports?: unknown };
          const incoming = Array.isArray(body?.localReports) ? body.localReports : [];
          const list = await mergeAndList(incoming);
          return Response.json(list);
        } catch (err) {
          console.warn("[api/sync]", err);
          return Response.json({ error: "sync failed" }, { status: 503 });
        }
      },
    },
  },
});
