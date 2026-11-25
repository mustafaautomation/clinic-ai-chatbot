import { deskOpen } from "@/lib/desk";
import { getStore } from "@/lib/persist";
import { maskTicket } from "@/lib/store";

export async function POST(request: Request) {
  if (!(await deskOpen())) {
    return Response.json({ error: "locked" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const store = getStore();
  const ticket = store.markTicketInReview(body?.id ?? "");
  if (!ticket) return Response.json({ error: "not_found" }, { status: 404 });
  store.addAudit({
    actor: "admin",
    action: "refill_in_review",
    resource: ticket.ticketNumber,
    detail: "A person marked the ticket in review. Status was not set to approved.",
  });
  store.commit();
  return Response.json({ ticket: maskTicket(ticket) });
}
