import { deskOpen, deskState } from "@/lib/desk";
import { getStore } from "@/lib/persist";

export async function GET() {
  if (!(await deskOpen())) {
    return Response.json({ error: "locked" }, { status: 401 });
  }
  const store = getStore();
  store.addAudit({
    actor: "admin",
    action: "admin_view_desk",
    resource: "desk",
    detail: "Viewed redacted transcripts, schedule, tickets, and the audit log.",
  });
  store.commit();
  return Response.json(deskState());
}
