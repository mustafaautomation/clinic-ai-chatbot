import { deskOpen } from "@/lib/desk";
import { runEvals } from "@/lib/evals";
import { getStore } from "@/lib/persist";

export async function POST() {
  if (!(await deskOpen())) {
    return Response.json({ error: "locked" }, { status: 401 });
  }
  const results = runEvals();
  const passed = results.filter((result) => result.pass).length;
  const store = getStore();
  store.addAudit({
    actor: "admin",
    action: "eval_run",
    resource: "guide",
    detail: `Ran ${results.length} evals. ${passed} passed.`,
  });
  store.commit();
  return Response.json({ results, passed, total: results.length });
}
