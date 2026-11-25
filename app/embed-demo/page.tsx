import type { Metadata } from "next";
import Script from "next/script";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DISCLAIMER } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Widget demo",
  description: "A sample host page embedding the Cedar Grove chat widget.",
};

const SNIPPET = `<script
  src="/widget.js"
  data-label="Open Cedar Grove chat"
  data-position="right"
  data-theme="system"
  data-immediate="true"
></script>`;

export default function EmbedDemoPage() {
  return (
    <>
      <div className="bg-clay px-4 py-2 text-center text-[13px] text-white">
        This is how the embed looks on a real site. The banner is part of the demo, not the host page. {DISCLAIMER}
      </div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-12 pb-28">
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">North Elm bulletin</p>
        <h1 className="font-display mt-2 text-5xl tracking-[-0.03em]">Saturday market moves to the river path</h1>
        <p className="mt-4 text-lg leading-7 text-muted-foreground">
          This page is a stand-in for someone else&apos;s website. The cedar button in the corner is injected by one script tag.
        </p>
        <article className="mt-8 space-y-3 text-sm leading-7">
          <p>Bring a bag. The clinic booth will hand out the same new-patient checklist the chat already quotes.</p>
          <p>Nothing here is a real neighborhood association.</p>
        </article>
        <pre className="mt-8 overflow-x-auto rounded-[16px] border border-border bg-surface p-4 font-mono text-xs leading-5">{SNIPPET}</pre>
      </main>
      <SiteFooter />
      <Script src="/widget.js" data-label="Open Cedar Grove chat" data-position="right" data-theme="system" data-immediate="true" strategy="afterInteractive" />
    </>
  );
}
