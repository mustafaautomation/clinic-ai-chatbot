import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";
import { getStore } from "@/lib/persist";
import { maskAppointment, maskCallback, maskTicket } from "@/lib/store";

export async function deskOpen(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);
}

export function deskState() {
  const store = getStore();
  return {
    sessions: store.sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      messages: session.messages,
      botPaused: Boolean(session.botPaused),
    })),
    appointments: store.appointments.map(maskAppointment),
    tickets: store.tickets.map(maskTicket),
    callbacks: store.callbacks.map(maskCallback),
    handoffs: store.handoffs,
    audit: store.audit.slice(0, 200),
    feedback: store.feedback,
    retentionDays: 30,
  };
}
