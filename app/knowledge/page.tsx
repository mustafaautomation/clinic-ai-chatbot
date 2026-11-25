import type { Metadata } from "next";
import { KnowledgeBrowser } from "@/components/knowledge-browser";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ARTICLES } from "@/lib/kb";

export const metadata: Metadata = {
  title: "Patient guide",
  description: "The documents Cedar Grove's chat is allowed to quote.",
};

export default function KnowledgePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <KnowledgeBrowser articles={ARTICLES} />
      </main>
      <SiteFooter />
    </>
  );
}
