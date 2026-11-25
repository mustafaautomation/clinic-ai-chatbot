import { describe, expect, it } from "vitest";
import {
  messengerMessages,
  verifySubscription,
  whatsappMessages,
  ingestChannelMessage,
} from "@/lib/channels";
import { ClinicStore } from "@/lib/store";

const whatsappPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            messages: [
              {
                from: "15550148",
                id: "wamid.demo.1",
                type: "text",
                text: { body: "What are your hours?" },
              },
            ],
          },
        },
      ],
    },
  ],
};

const messengerPayload = {
  object: "page",
  entry: [
    {
      messaging: [
        {
          sender: { id: "messenger-user-1" },
          message: { mid: "m_1", text: "I want to talk to a human" },
        },
      ],
    },
  ],
};

describe("channel adapters", () => {
  it("verifies the hub challenge", () => {
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "cedar-verify",
      "hub.challenge": "challenge-123",
    });
    expect(verifySubscription(params, "cedar-verify")).toBe("challenge-123");
    expect(verifySubscription(params, "wrong")).toBeNull();
  });

  it("reads a WhatsApp text message and answers from the guide", async () => {
    const messages = whatsappMessages(whatsappPayload);
    expect(messages).toEqual([
      { from: "15550148", text: "What are your hours?", id: "wamid.demo.1" },
    ]);
    const store = new ClinicStore();
    const result = await ingestChannelMessage(store, "whatsapp", messages[0]);
    expect(result.text).toContain("8:00 a.m. to 5:00 p.m.");
    expect(result.citations.some((citation) => citation.slug === "hours-locations")).toBe(true);
    expect(store.findByExternal("whatsapp", "15550148")).toBeTruthy();
  });

  it("reads a Messenger message and opens a handoff", async () => {
    const messages = messengerMessages(messengerPayload);
    expect(messages[0]?.from).toBe("messenger-user-1");
    const store = new ClinicStore();
    const result = await ingestChannelMessage(store, "messenger", messages[0]);
    expect(result.handoff).toBe(true);
    expect(result.tools.some((tool) => tool.name === "flag_staff_handoff")).toBe(true);
    expect(store.handoffs[0]?.summary.length).toBeGreaterThan(0);
  });
});
