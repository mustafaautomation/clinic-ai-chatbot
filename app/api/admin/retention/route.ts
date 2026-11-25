import { RETENTION_DAYS } from "@/lib/brand";
import { deskOpen } from "@/lib/desk";
import { getStore } from "@/lib/persist";

export async function POST() {
  if (!(await deskOpen())) {
    return Response.json({ error: "locked" }, { status: 401 });
  }
  const store = getStore();
  const removed = store.applyRetention(new Date(), RETENTION_DAYS);
  store.commit();
  return Response.json({ removed, days: RETENTION_DAYS });
}
