import { SUBDOMAIN } from "@/lib/brand";

export async function GET() {
  return Response.json({
    ok: true,
    product: "clinic-ai-chatbot",
    subdomain: SUBDOMAIN,
    clinic: "Cedar Grove Family Clinic",
  });
}
