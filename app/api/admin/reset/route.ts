import { deskOpen } from "@/lib/desk";
import { resetDemoStore } from "@/lib/persist";

export async function POST() {
  if (!(await deskOpen())) return Response.json({ error: "locked" }, { status: 401 });
  resetDemoStore();
  return Response.json({ ok: true });
}
