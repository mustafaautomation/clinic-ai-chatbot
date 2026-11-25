import { handleTurn, startSession } from "@/lib/engine";
import { maybeRewrite } from "@/lib/rewrite";
import { getStore } from "@/lib/persist";
import { redact } from "@/lib/redact";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    message?: string;
    consent?: boolean;
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
  if (!message) {
    return Response.json({ error: "empty" }, { status: 400 });
  }

  const store = getStore();
  const existing = body.sessionId ? store.getSession(body.sessionId) : undefined;
  const session = existing ?? startSession(store, true);
  const result = handleTurn(store, session.id, message);
  const locked = result.emergency || result.refusal;
  const text = redact(await maybeRewrite(result.text, locked));
  const saved = session.messages.find((item) => item.id === result.messageId);
  if (saved && saved.text !== text) {
    saved.text = text;
    store.commit();
  }

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
      });
      const parts = text.split(/(\s+)/);
      for (const part of parts) {
        if (part) send("token", { text: part });
      }
      send("done", { messageId: result.messageId, sessionId: session.id, text });
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
