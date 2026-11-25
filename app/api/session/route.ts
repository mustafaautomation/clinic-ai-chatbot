import { getStore } from "@/lib/persist";
import { publicSession } from "@/lib/store";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "missing" }, { status: 400 });
  const session = getStore().getSession(id);
  if (!session) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(publicSession(session));
}
