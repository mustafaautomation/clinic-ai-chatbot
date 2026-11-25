import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat-panel";

export const metadata: Metadata = {
  title: "Chat widget",
  description: "Embeddable Cedar Grove chat frame.",
};

export default function EmbedPage() {
  return (
    <main className="h-dvh bg-background p-2">
      <h1 className="sr-only">Cedar Grove Family Clinic chat</h1>
      <ChatPanel fill channel="widget" />
    </main>
  );
}
