import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { RETENTION_DAYS, SUBDOMAIN, SYSTEM_PROMPT } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Safety notes",
  description: "How this fictional clinic chat handles safety, minimum data, and what a real deployment would still need.",
};

export default function DocsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="text-xs font-medium tracking-[0.18em] text-moss uppercase">HIPAA-minded design · {SUBDOMAIN}</p>
        <h1 className="mt-2 font-heading text-5xl text-bark">This is a portfolio demo, not a covered clinic.</h1>
        <p className="mt-4 text-lg text-foreground/80">
          Cedar Grove Family Clinic is invented. The people, plans, and appointments are synthetic. The
          product is shaped the way a careful clinic chat would be shaped, and it stops well short of what
          a real deployment would have to sign, encrypt, and staff.
        </p>

        <Section title="What the guide will and will not say">
          <p>
            Answers about hours, campuses, insurance names, new-patient steps, visit prep, video visits,
            billing, refills, vaccines, lab policy, and the privacy note are pulled from the patient guide.
            The sentence you see is the sentence in the document, plus the result of a tool. If the guide
            does not contain the fact, the chat says it could not find it.
          </p>
          <p>
            It refuses diagnosis, symptom interpretation, lab interpretation, and medication dosing. Those
            refusals are part of the eval suite, so a passing build has already been asked things like
            “do I have strep?” and “how much ibuprofen?” and answered without a dose.
          </p>
        </Section>

        <Section title="Emergencies stop the interview">
          <p>
            Chest pain, trouble breathing, a drooping face, slurred speech, arm weakness, and suicidal
            ideation are not turned into scheduling questions. The reply tells the person to call 911.
            Suicidal ideation also names 988, the Suicide & Crisis Lifeline. The chat does not give
            first-aid steps, does not say “you are having a heart attack” or “you are having a stroke,”
            and does not copy the message into the handoff record. The handoff stores a category so the
            desk can see that the chat stopped.
          </p>
        </Section>

        <Section title="Minimum necessary">
          <p>
            Booking, refills, and callbacks ask for a name and a callback number. They do not ask for a
            Social Security number, a date of birth, a member ID, or a medical history. If someone pastes
            those anyway, the reply tells them they were not needed, and the stored transcript masks them.
          </p>
          <p>
            The appointment and ticket files keep the callback number because the desk cannot call without
            it. The transcript, the tool trace, and the audit log store a masked number or no number at
            all. Revealing the full number on the staff desk writes an audit entry that does not itself
            contain the number.
          </p>
        </Section>

        <Section title="Tools, and the refill that is never approved">
          <p>
            The guide can search clinicians, read openings, book, reschedule, cancel, check a plan name,
            open a refill ticket, and create a callback. Insurance results are in network, out of network,
            unknown, or self-pay. Unknown plans are not guessed into coverage.
          </p>
          <p>
            A refill ticket is created as pending clinician review. Controlled medications are flagged and
            still not approved. The staff desk can mark a ticket “in review.” There is no status for
            “approved,” because approval is a clinician action outside this assistant.
          </p>
        </Section>

        <Section title="Retention, consent, and the audit log">
          <p>
            Sending a message requires the demo consent banner. The banner says not to enter real health
            information. Transcripts are designed to be deleted after {RETENTION_DAYS} days. The staff desk
            can run that pass. It deletes chats. It does not delete the synthetic schedule, which would be
            a different record with a different retention rule in a real clinic. Chat is not the medical
            record.
          </p>
          <p>
            Logging in, opening the desk, revealing a number, marking a ticket, running retention, and
            running evals each add an audit row. Patient-facing tool use does too: insurance checks,
            directory reads, schedule reads, bookings, refills, callbacks, emergency handoffs, and blocked
            prompt-injection attempts.
          </p>
        </Section>

        <Section title="What a real deployment would still need">
          <p>
            A production clinic chat that could receive real patient information would need, at least:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>A signed business associate agreement with the host, the model provider, and any logging vendor.</li>
            <li>Encryption in transit and at rest. This demo writes a JSON file on disk in the clear.</li>
            <li>Real authentication and role-based access. The desk key published on the login card is for the portfolio, not a control.</li>
            <li>A notice of privacy practices, access and amendment workflows, and a breach process.</li>
            <li>A decision about whether any model vendor is allowed to retain prompts. Safety replies in this demo stay on the local engine even if a model key is configured for wording.</li>
            <li>Workforce training, minimum-necessary policies, and a designated record set that is not the chatbot transcript.</li>
          </ul>
          <p>
            None of those exist here. Do not point this demo at a real patient, a real plan member ID, or
            a real clinic schedule.
          </p>
        </Section>

        <Section title="How a turn is built">
          <p>
            Safety runs first. Then the local engine decides which tools to call and which guide paragraphs
            to quote. That path does not need an API key, which is what the evals exercise. If{" "}
            <code className="rounded bg-secondary px-1">GROQ_API_KEY</code> is set, Llama 3.3 70B on Groq
            calls the clinic tools and writes from the retrieved passages. If Groq fails and{" "}
            <code className="rounded bg-secondary px-1">GEMINI_API_KEY</code> is set, Gemini 2.0 Flash is
            the fallback. Emergencies, dosing, diagnosis, and prompt-injection attempts never leave the
            local guardrails. With neither key, the deterministic engine runs the same tools.
          </p>
          <pre className="overflow-x-auto rounded-2xl bg-card p-4 text-xs leading-5 ring-1 ring-foreground/10 whitespace-pre-wrap">
            {SYSTEM_PROMPT}
          </pre>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 space-y-3 text-sm leading-7">
      <h2 className="font-heading text-3xl text-bark">{title}</h2>
      {children}
    </section>
  );
}
