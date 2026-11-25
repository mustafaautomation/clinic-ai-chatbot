import type { Metadata } from "next";
import Script from "next/script";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Widget demo",
  description: "A sample host page embedding the Cedar Grove chat widget.",
};

const SNIPPET = `<script
  src="https://clinic-chat.quvantic.com/widget.js"
  data-label="Open Cedar Grove chat"
  data-position="right"
></script>`;

export default function EmbedDemoPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-12">
        <p className="text-xs font-medium tracking-[0.18em] text-moss uppercase">Sample host site</p>
        <h1 className="mt-2 font-heading text-5xl text-bark">North Elm neighborhood bulletin</h1>
        <p className="mt-4 text-lg text-foreground/80">
          This page is a stand-in for someone else&apos;s website. The cedar button in the corner is not
          part of the page layout. It is injected by one script tag, which opens the clinic chat in an
          iframe.
        </p>
        <article className="mt-8 space-y-3 text-sm leading-7">
          <p>
            The Saturday market moves to the river path this week. Bring a bag. The clinic booth will
            hand out the same new-patient checklist the chat already quotes.
          </p>
          <p>
            Nothing here is a real neighborhood association. It exists so you can see the widget on a
            page that did not build the chat into its own React tree.
          </p>
        </article>
        <pre className="mt-8 overflow-x-auto rounded-2xl bg-card p-4 text-xs leading-5 ring-1 ring-foreground/10">
          {SNIPPET}
        </pre>
        <p className="mt-3 text-sm text-muted-foreground">
          On this demo the script is loaded from <code>/widget.js</code> so the button works locally.
          Keyboard users can open it with Enter and close it with Escape.
        </p>
      </main>
      <SiteFooter />
      <Script src="/widget.js" data-label="Open Cedar Grove chat" data-position="right" strategy="afterInteractive" />
    </>
  );
}
