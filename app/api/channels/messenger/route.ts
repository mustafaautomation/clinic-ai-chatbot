import {
  deliverMessenger,
  ingestChannelMessage,
  messengerMessages,
  verifySubscription,
} from "@/lib/channels";
import { getStore } from "@/lib/persist";

export async function GET(request: Request) {
  const challenge = verifySubscription(new URL(request.url).searchParams);
  if (!challenge) return new Response("Forbidden", { status: 403 });
  return new Response(challenge, { status: 200 });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const inbound = messengerMessages(payload);
  const store = getStore();
  const replies = [];
  for (const message of inbound) {
    const result = await ingestChannelMessage(store, "messenger", message);
    replies.push({ to: message.from, text: result.text, handoff: result.handoff });
    await deliverMessenger(message.from, result.text);
  }
  return Response.json({ ok: true, replies });
}
