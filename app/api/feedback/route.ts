import { getStore } from "@/lib/persist";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    messageId?: string;
    rating?: "up" | "down";
  } | null;
  if (!body?.sessionId || !body.messageId || (body.rating !== "up" && body.rating !== "down")) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const store = getStore();
  const session = store.getSession(body.sessionId);
  if (!session) return Response.json({ error: "not_found" }, { status: 404 });
  store.addFeedback({
    sessionId: body.sessionId,
    messageId: body.messageId,
    rating: body.rating,
  });
  store.addAudit({
    actor: "patient",
    action: "feedback",
    resource: body.messageId,
    detail: `Recorded ${body.rating} feedback. Message text was not copied.`,
    sessionId: body.sessionId,
  });
  store.commit();
  return Response.json({ ok: true });
}
