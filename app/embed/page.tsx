import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat-panel";
import { EmbedBridge } from "@/components/embed-bridge";

export const metadata: Metadata = {
  title: "Chat widget",
  description: "Embeddable Cedar Grove chat frame.",
};

export default function EmbedPage() {
  return (
    <main className="h-dvh bg-surface">
      <h1 className="sr-only">Cedar Grove Family Clinic chat</h1>
      <EmbedBridge />
      <ChatPanel fill mode="embed" channel="widget" />
    </main>
  );
}
