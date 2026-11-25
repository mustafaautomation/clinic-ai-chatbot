import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminKeyMatches, signAdminToken } from "@/lib/auth";
import { getStore } from "@/lib/persist";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { key?: string } | null;
  if (!body?.key || !adminKeyMatches(body.key)) {
    return Response.json({ error: "The desk key does not match." }, { status: 401 });
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  const store = getStore();
  store.addAudit({
    actor: "admin",
    action: "admin_login",
    resource: "desk",
    detail: "Staff desk opened with the demo key.",
  });
  store.commit();
  return Response.json({ ok: true });
}
