import { deskOpen } from "@/lib/desk";
import { getStore } from "@/lib/persist";

export async function POST(request: Request) {
  if (!(await deskOpen())) {
    return Response.json({ error: "locked" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    kind?: "appointment" | "ticket" | "callback";
    id?: string;
  } | null;
  const store = getStore();
  const id = body?.id ?? "";
  let phone: string | undefined;
  let resource = id;
  if (body?.kind === "appointment") {
    const row = store.appointments.find((item) => item.id === id);
    phone = row?.phone;
    resource = row?.confirmationCode ?? id;
  } else if (body?.kind === "ticket") {
    const row = store.tickets.find((item) => item.id === id);
    phone = row?.phone;
    resource = row?.ticketNumber ?? id;
  } else if (body?.kind === "callback") {
    const row = store.callbacks.find((item) => item.id === id);
    phone = row?.phone;
    resource = row?.ticketNumber ?? id;
  }
  if (!phone) return Response.json({ error: "not_found" }, { status: 404 });
  store.addAudit({
    actor: "admin",
    action: "phi_reveal",
    resource,
    detail: "Revealed a callback number on the staff desk. The number was not copied into this audit entry.",
  });
  store.commit();
  return Response.json({ phone });
}
