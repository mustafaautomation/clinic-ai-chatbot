import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Chat",
  description: "Talk with the Cedar Grove clinic guide about visits, insurance, and policies.",
};

export default function ChatPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <ChatPanel tall />
      </main>
      <SiteFooter />
    </>
  );
}
