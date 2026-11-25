import Link from "next/link";
import { ChatPanel } from "@/components/chat-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CAMPUSES } from "@/lib/directory";

const STEPS = [
  {
    title: "Name the plan",
    copy: "Ask whether Blue Cross, Aetna, Kaiser, or another plan is in network. A plan name is enough. Member IDs stay out of the chat.",
  },
  {
    title: "Pick the specialty",
    copy: "Family medicine, pediatrics, and the rest of the directory can be filtered by language. Dr. Alvarez is the Spanish-speaking family physician.",
  },
  {
    title: "Leave with a code",
    copy: "Choose an opening, give a name and a 555 callback number, and the guide returns a CG confirmation. The desk still verifies benefits.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)] lg:py-14">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-moss uppercase">Cedar City · fictional clinic</p>
            <h1 className="mt-3 max-w-xl font-heading text-5xl leading-[1.05] text-bark sm:text-6xl">
              The front desk, with the policy manual open.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-foreground/80">
              Cedar Grove&apos;s guide checks insurance, finds a clinician, and books a new-patient visit.
              It quotes the patient guide and the scheduler. It does not diagnose, dose, or approve a refill.
            </p>
            <dl className="mt-8 grid gap-4 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <div key={step.title} className="rounded-2xl bg-card/80 p-4 ring-1 ring-foreground/10">
                  <dt className="font-heading text-2xl text-bark">
                    <span className="mr-2 text-clay">0{index + 1}</span>
                    {step.title}
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-muted-foreground">{step.copy}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <Link href="/chat" className="rounded-full bg-primary px-4 py-2 text-primary-foreground">
                Open the full chat
              </Link>
              <Link href="/docs" className="rounded-full bg-secondary px-4 py-2">
                How the safety rules work
              </Link>
              <Link href="/embed-demo" className="rounded-full bg-secondary px-4 py-2">
                Embed the widget
              </Link>
            </div>
          </div>
          <ChatPanel />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="rounded-3xl bg-card p-6 ring-1 ring-foreground/10">
            <p className="text-xs font-medium tracking-[0.18em] text-moss uppercase">Under the hood</p>
            <h2 className="mt-2 font-heading text-4xl text-bark">One agent, four doors in.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              The website, the embeddable widget, WhatsApp, and Messenger all call the same agent. Hard
              guardrails run first. If Groq or Gemini is configured, that model calls the clinic tools and
              writes from retrieved passages. With no key, a deterministic demo engine does the same jobs so
              the live demo and CI never depend on a secret.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-5 md:items-stretch">
              {[
                ["Doors", "Web chat, widget iframe, WhatsApp, Messenger"],
                ["Guardrails", "Emergencies, refusals, off-topic, injection"],
                ["Retrieval", "BM25 plus local embeddings over /kb"],
                ["Tools", "Insurance, schedule, refills, handoff"],
                ["Desk", "Redacted inbox, tickets, audit, evals"],
              ].map(([title, copy]) => (
                <article key={title} className="rounded-2xl bg-foam p-4">
                  <h3 className="font-heading text-2xl text-bark">{title}</h3>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 md:grid-cols-2">
          <div className="rounded-3xl bg-primary p-6 text-primary-foreground">
            <h2 className="font-heading text-3xl">What it will not do</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-primary-foreground/90">
              <li>Tell you whether a sore throat is strep, or what dose to give a child.</li>
              <li>Keep talking through chest pain, stroke signs, or suicidal thoughts. Those go to 911, and 988 when the crisis is about suicide.</li>
              <li>Mark a prescription approved. A refill becomes a ticket a person has to open.</li>
              <li>Ask for a Social Security number, date of birth, or member ID.</li>
            </ul>
          </div>
          <div className="grid gap-4">
            {Object.values(CAMPUSES).map((campus) => (
              <article key={campus.label} className="rounded-3xl bg-card p-6 ring-1 ring-foreground/10">
                <h2 className="font-heading text-3xl text-bark">{campus.label}</h2>
                <p className="mt-2 text-sm">{campus.address}</p>
                <p className="text-sm text-muted-foreground">{campus.phone}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Monday through Friday, 8:00 a.m. to 5:00 p.m.
                  {campus.label.startsWith("Grove") ? " Saturday morning visits are Grove only." : " Closed Saturday and Sunday."}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
