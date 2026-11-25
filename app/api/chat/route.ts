import { runAgent } from "@/lib/agent";
import { phaseForTools } from "@/lib/cards";
import { startSession } from "@/lib/engine";
import { getStore } from "@/lib/persist";
import type { Channel } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    message?: string;
    consent?: boolean;
    channel?: Channel;
  } | null;
  if (!body?.consent) {
    return Response.json(
      {
        error: "consent_required",
        message: "Agree to the demo consent note before a transcript is stored.",
      },
      { status: 400 },
    );
  }
  const message = String(body.message ?? "").trim().slice(0, 2000);
  if (!message) return Response.json({ error: "empty" }, { status: 400 });

  const store = getStore();
  const existing = body.sessionId ? store.getSession(body.sessionId) : undefined;
  const channel = body.channel === "widget" ? "widget" : "web";
  const session = existing ?? startSession(store, true, { channel });
  if (session.botPaused) {
    const encoder = new TextEncoder();
    const text = "Sam Okonkwo has this chat. The staff desk can hand it back to the guide.";
    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        send("meta", {
          sessionId: session.id,
          messageId: "paused",
          citations: [],
          tools: [],
          suggestions: [],
          emergency: false,
          refusal: false,
          handoff: true,
          handoffId: null,
          phase: "Connecting you with the desk…",
          engine: "demo",
        });
        send("token", { text });
        send("done", { messageId: "paused", sessionId: session.id, text });
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }
  const result = await runAgent(store, session.id, message);
  if (result.handoff) {
    session.botPaused = true;
    store.commit();
  }
  const handoffId = result.handoff
    ? (store.handoffs.find((item) => item.sessionId === session.id)?.id ?? null)
    : null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      send("meta", {
        sessionId: session.id,
        messageId: result.messageId,
        citations: result.citations,
        tools: result.tools,
        suggestions: result.suggestions,
        emergency: result.emergency,
        refusal: result.refusal,
        handoff: result.handoff,
        handoffId,
        phase: phaseForTools(result.tools, result.emergency),
        engine: result.engine ?? "demo",
      });
      for (const part of result.text.split(/(\s+)/)) {
        if (part) send("token", { text: part });
      }
      send("done", { messageId: result.messageId, sessionId: session.id, text: result.text });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
