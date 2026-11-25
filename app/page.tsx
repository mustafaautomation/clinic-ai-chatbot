import { CapabilityGallery } from "@/components/capability-gallery";
import { LandingHero } from "@/components/landing-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const METRICS = [
  { label: "Patient-guide articles", value: "26" },
  { label: "Evals in CI", value: "27" },
  { label: "Clinic tools", value: "9" },
  { label: "Reply path", value: "Seconds" },
];

const STEPS = [
  ["Channel", "Web chat, the widget, WhatsApp, and Messenger share one agent."],
  ["Retrieve", "BM25 plus local embeddings over the 26 patient-guide articles."],
  ["Tools", "Insurance, directory, openings, booking, refills, and callbacks."],
  ["Desk", "Handoffs, redacted transcripts, and tickets land in the staff desk."],
];

const SNIPPET = `<script
  src="https://clinic-chat.quvantic.com/widget.js"
  data-label="Open Cedar Grove chat"
  data-position="right"
  data-theme="system"
></script>`;

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <LandingHero />

        <section data-testid="metrics-strip" className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 pb-12 sm:grid-cols-4">
          {METRICS.map((item) => (
            <div key={item.label}>
              <p className="text-[28px] leading-none font-semibold">{item.value}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 pb-14">
          <h2 className="font-display text-[36px] leading-none tracking-[-0.03em]">How it works</h2>
          <ol className="mt-6 grid gap-3 md:grid-cols-4">
            {STEPS.map(([title, copy], index) => (
              <li key={title} className="rounded-[16px] border border-border bg-surface p-4">
                <p className="text-[12px] text-clay">0{index + 1}</p>
                <h3 className="mt-1 text-[14px] font-semibold">{title}</h3>
                <p className="mt-2 text-[13px] leading-5 text-muted-foreground">{copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14">
          <h2 className="font-display text-[36px] leading-none tracking-[-0.03em]">What the guide can show</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-muted-foreground">
            Plan checks, clinician matches, openings, confirmations, refill tickets, and a safety handoff. The same cards appear inside the chat.
          </p>
          <div className="mt-6">
            <CapabilityGallery />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="font-display text-[32px] tracking-[-0.03em]">Embed the desk</h2>
          <pre className="mt-4 overflow-x-auto rounded-[16px] border border-border bg-surface p-4 font-mono text-[13px] leading-6">
            {SNIPPET}
          </pre>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
