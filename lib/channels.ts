import { runAgent } from "@/lib/agent";
import type { ClinicStore } from "@/lib/store";
import { startSession } from "@/lib/engine";
import type { Channel, TurnResult } from "@/lib/types";

export function verifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN || process.env.MESSENGER_VERIFY_TOKEN || "cedar-verify";
}

export function verifySubscription(params: URLSearchParams, token = verifyToken()): string | null {
  if (params.get("hub.mode") !== "subscribe") return null;
  if (params.get("hub.verify_token") !== token) return null;
  return params.get("hub.challenge");
}

export type InboundMessage = { from: string; text: string; id?: string };

export function whatsappMessages(payload: unknown): InboundMessage[] {
  const body = payload as {
    entry?: { changes?: { value?: { messages?: { from?: string; id?: string; type?: string; text?: { body?: string } }[] } }[] }[];
  };
  const messages: InboundMessage[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (message.type && message.type !== "text") continue;
        const text = message.text?.body?.trim();
        if (!message.from || !text) continue;
        messages.push({ from: message.from, text, id: message.id });
      }
    }
  }
  return messages;
}

export function messengerMessages(payload: unknown): InboundMessage[] {
  const body = payload as {
    entry?: { messaging?: { sender?: { id?: string }; message?: { mid?: string; text?: string } }[] }[];
  };
  const messages: InboundMessage[] = [];
  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const text = event.message?.text?.trim();
      const from = event.sender?.id;
      if (!from || !text) continue;
      messages.push({ from, text, id: event.message?.mid });
    }
  }
  return messages;
}

export async function ingestChannelMessage(
  store: ClinicStore,
  channel: Channel,
  inbound: InboundMessage,
): Promise<TurnResult> {
  const existing = store.findByExternal(channel, inbound.from);
  const session =
    existing ??
    startSession(store, true, {
      channel,
      externalKey: inbound.from,
    });
  return runAgent(store, session.id, inbound.text);
}

export async function deliverWhatsApp(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return;
  await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text.slice(0, 4000) },
    }),
  }).catch(() => undefined);
}

export async function deliverMessenger(to: string, text: string): Promise<void> {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!token) return;
  await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: to }, message: { text: text.slice(0, 2000) } }),
  }).catch(() => undefined);
}
