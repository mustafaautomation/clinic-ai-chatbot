import { randomUUID } from "crypto";
import { DESK_AGENT } from "@/lib/brand";
import { deskOpen } from "@/lib/desk";
import { getStore } from "@/lib/persist";

export async function POST(request: Request) {
  if (!(await deskOpen())) {
    return Response.json({ error: "locked" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
  const store = getStore();
  const session = store.getSession(body?.sessionId ?? "");
  if (!session) return Response.json({ error: "not_found" }, { status: 404 });
  session.botPaused = false;
  store.addMessage(session, {
    id: randomUUID(),
    role: "assistant",
    text: `${DESK_AGENT} handed this chat back to the guide.`,
    createdAt: new Date().toISOString(),
  });
  store.addAudit({
    actor: "admin",
    action: "resume_bot",
    resource: session.id,
    detail: "The staff desk resumed the guide on this transcript.",
    sessionId: session.id,
  });
  store.commit();
  return Response.json({ ok: true, agent: DESK_AGENT });
}
