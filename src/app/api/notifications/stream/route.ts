import { auth } from "@/lib/auth";
import { subscribeNotifications } from "@/lib/realtime/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-Sent Events — foydalanuvchiga yangi bildirishnoma kelganda darhol
// signal yuboradi. Klient (qo'ng'iroq) buni olib hisobni yangilaydi.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("unauthorized", { status: 401 });
  const userId = session.user.id;

  const encoder = new TextEncoder();
  let unsub: () => void = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(chunk)); } catch { /* ulanish yopilgan */ }
      };
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsub();
        try { controller.close(); } catch { /* allaqachon yopiq */ }
      };

      send(": connected\n\n");
      send("event: ready\ndata: 1\n\n");
      unsub = subscribeNotifications(userId, () => send("event: notify\ndata: 1\n\n"));
      // nginx/proxy idle timeout'idan oshmaslik uchun heartbeat.
      heartbeat = setInterval(() => send(": ping\n\n"), 25_000);
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsub();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // nginx bufferlashini o'chiradi — SSE darhol yetib borishi uchun.
      "X-Accel-Buffering": "no",
    },
  });
}
