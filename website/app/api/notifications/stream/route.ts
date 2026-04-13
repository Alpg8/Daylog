import { getCurrentUser } from "@/lib/auth/session";
import { subscribeSSE } from "@/lib/services/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Confirm connection
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Push notifications to this stream
      unsubscribe = subscribeSSE(session.sub, (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream already closed
        }
      });

      // Heartbeat every 25s to prevent proxy timeouts
      heartbeatId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          if (heartbeatId) clearInterval(heartbeatId);
        }
      }, 25_000);
    },
    cancel() {
      if (heartbeatId) clearInterval(heartbeatId);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
