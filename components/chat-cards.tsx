"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Copy, Phone } from "lucide-react";
import type { Citation } from "@/lib/types";
import type {
  ConfirmCardModel,
  FormCardModel,
  HandoffCardModel,
  PlanCardModel,
  ProviderCardModel,
  SafetyCardModel,
  SlotCardModel,
  TimelineCardModel,
} from "@/lib/cards";

const cardClass =
  "w-full rounded-[16px] border border-border bg-surface p-3 text-foreground shadow-[var(--shadow-card)]";

export function PlanCard({ card, onBook }: { card: PlanCardModel; onBook: () => void }) {
  const inNetwork = card.network === "In network";
  return (
    <article className={cardClass} data-testid="card-quote">
      <p className="text-[11.5px] text-muted-foreground">Plan check</p>
      <h3 className="mt-1 text-[14px] font-semibold leading-5">{card.plan}</h3>
      <p className="mt-2 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent">
        {card.network}
      </p>
      <div className="mt-3 space-y-1.5 text-[13px]">
        <Row label="New-patient visit" value="$180" />
        <Row label="Follow-up" value="$120" />
        <Row label="Video visit" value="$90" />
        <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2">
          <span className="font-semibold">Self-pay range</span>
          <span className="font-mono text-[18px] font-semibold tabular-nums">$90–$180</span>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] leading-4 text-muted-foreground">
        Sample range for this demo, not a bill. {inNetwork ? "The guide cannot see a copay." : card.note}
      </p>
      <button type="button" className="cg-btn mt-3" onClick={onBook}>
        Book this visit
      </button>
    </article>
  );
}

export function ProviderCarousel({
  card,
  onOpenings,
}: {
  card: ProviderCardModel;
  onOpenings: (name: string) => void;
}) {
  const scrollerId = "provider-carousel";
  return (
    <div className="relative" data-testid="card-carousel">
      <div
        id={scrollerId}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pr-4 [scrollbar-width:thin]"
      >
        {card.providers.map((provider) => (
          <article
            key={provider.id}
            className={`${cardClass} w-[230px] shrink-0 snap-start`}
          >
            <p className="text-[14px] font-semibold leading-5">{provider.name}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{provider.specialty}</p>
            <p className="mt-2 text-[12px] leading-4">{provider.languages.join(", ")}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">{provider.campus}</p>
            <button type="button" className="cg-btn mt-3" onClick={() => onOpenings(provider.name.split(",")[0] ?? provider.name)}>
              See openings
            </button>
          </article>
        ))}
      </div>
      <CarouselButtons scrollerId={scrollerId} />
    </div>
  );
}

export function SlotPicker({
  card,
  locked,
  onBook,
}: {
  card: SlotCardModel;
  locked: boolean;
  onBook: (label: string) => void;
}) {
  const days = useMemo(() => groupDays(card.slots), [card.slots]);
  return (
    <article className={cardClass} data-testid="card-booking">
      <h3 className="text-[14px] font-semibold leading-5">Open times · {days[0]?.key ?? card.provider}</h3>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {card.provider} · {card.visit} · America/Denver
      </p>
      <div className="mt-3 flex flex-wrap gap-2" data-testid="slot-chips">
        {card.slots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            disabled={locked}
            onClick={() => onBook(slot.label)}
            className="h-9 rounded-[12px] border border-foreground/70 bg-surface px-3 text-[13px] font-medium hover:bg-accent-soft disabled:opacity-50"
          >
            {shortTime(slot.label)}
          </button>
        ))}
      </div>
      <p data-testid="slot-note" className="mt-2 text-[11.5px] text-muted-foreground">
        Only times the booking system returned
      </p>
    </article>
  );
}

export function LeadCard({
  locked,
  onSubmit,
}: {
  locked: boolean;
  onSubmit: (name: string, phone: string, email: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className={cardClass}
      data-testid="lead-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (locked) return;
        if (name.trim().length < 2 || !/555/.test(phone) || !email.includes("@")) {
          setError("Use a name, a 555 number, and an email like maya.chen@example.com.");
          return;
        }
        if (!consent) {
          setError("Check the box so the desk can keep these demo details.");
          return;
        }
        setError(null);
        onSubmit(name.trim(), phone.trim(), email.trim());
      }}
    >
      <h3 className="text-[14px] font-semibold leading-5">Leave contact details for the team</h3>
      <label className="mt-3 block text-[12px] font-medium" htmlFor="lead-name">Name</label>
      <input id="lead-name" value={name} disabled={locked} onChange={(event) => setName(event.target.value)} placeholder="Jordan Lee" className="mt-1 h-10 w-full rounded-[12px] border border-border bg-surface-2 px-3 text-[14px]" />
      <label className="mt-3 block text-[12px] font-medium" htmlFor="lead-phone">Phone</label>
      <input id="lead-phone" value={phone} disabled={locked} onChange={(event) => setPhone(event.target.value)} placeholder="555-010-0140" className="mt-1 h-10 w-full rounded-[12px] border border-border bg-surface-2 px-3 text-[14px]" />
      <label className="mt-3 block text-[12px] font-medium" htmlFor="lead-email">Email</label>
      <input id="lead-email" value={email} disabled={locked} onChange={(event) => setEmail(event.target.value)} placeholder="maya.chen@example.com" className="mt-1 h-10 w-full rounded-[12px] border border-border bg-surface-2 px-3 text-[14px]" />
      <label className="mt-3 flex items-start gap-2 text-[12px]">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        The desk may use this synthetic contact for the demo callback.
      </label>
      {error && <p role="alert" className="mt-2 text-[12px] text-clay">{error}</p>}
      <button type="submit" className="cg-btn mt-3" disabled={locked}>Send details</button>
    </form>
  );
}

export function SlotSkeleton() {
  return (
    <div className={cardClass} aria-hidden>
      <div className="cg-shimmer h-4 w-28 rounded" />
      <div className="mt-3 flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="cg-shimmer size-14 rounded-full" />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <div className="cg-shimmer h-9 w-24 rounded-full" />
        <div className="cg-shimmer h-9 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function VisitForm({
  card,
  locked,
  onSubmit,
}: {
  card: FormCardModel;
  locked: boolean;
  onSubmit: (name: string, phone: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className={cardClass}
      data-testid="card-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (locked) return;
        if (name.trim().length < 2) {
          setError("Enter a name. A synthetic name is enough.");
          return;
        }
        if (!/555/.test(phone)) {
          setError("Use a 555 callback number, such as 555-0148.");
          return;
        }
        setError(null);
        onSubmit(name.trim(), phone.trim());
      }}
    >
      <h3 className="text-[14px] font-semibold leading-5">
        {card.purpose === "visit" ? "New-patient callback" : "Callback for the desk"}
      </h3>
      <p className="mt-1 text-[12px] text-muted-foreground">Name and a 555 number only. No date of birth or member ID.</p>
      <label className="mt-3 block text-[12px] font-medium" htmlFor={`cg-name-${card.purpose}`}>
        Name
      </label>
      <input
        id={`cg-name-${card.purpose}`}
        value={name}
        disabled={locked}
        onChange={(event) => setName(event.target.value)}
        placeholder="Jordan Lee"
        className="mt-1 h-10 w-full rounded-[12px] border border-border bg-surface-2 px-3 text-[14px] outline-none focus-visible:ring-[3px] focus-visible:ring-accent"
      />
      <label className="mt-3 block text-[12px] font-medium" htmlFor={`cg-phone-${card.purpose}`}>
        Callback number
      </label>
      <input
        id={`cg-phone-${card.purpose}`}
        value={phone}
        disabled={locked}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="555-0148"
        inputMode="tel"
        className="mt-1 h-10 w-full rounded-[12px] border border-border bg-surface-2 px-3 text-[14px] outline-none focus-visible:ring-[3px] focus-visible:ring-accent"
      />
      {error && (
        <p className="mt-2 flex items-center gap-1 text-[12px] text-clay" role="alert">
          <Phone className="size-3.5" aria-hidden />
          {error}
        </p>
      )}
      <button type="submit" className="cg-btn mt-3" disabled={locked}>
        Send to the desk
      </button>
    </form>
  );
}

export function ConfirmCard({ card }: { card: ConfirmCardModel }) {
  const [copied, setCopied] = useState(false);
  return (
    <article className={cardClass} data-testid="card-confirm">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-success">
          <Check className="size-4" aria-hidden />
        </span>
        <h3 className="text-[14px] font-semibold leading-5">{card.title}</h3>
      </div>
      <div className="mt-3 space-y-1.5 text-[13px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Code</span>
          <span className="flex items-center gap-1 font-mono text-[13px] tabular-nums">
            {card.code}
            <button
              type="button"
              className="grid size-7 place-items-center rounded-md hover:bg-muted"
              aria-label="Copy confirmation code"
              onClick={() => {
                void navigator.clipboard.writeText(card.code);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
          </span>
        </div>
        <Row label="When" value={card.when} />
        <Row label="Where" value={card.where} />
        <Row label="Who" value={card.who} />
      </div>
      {card.title === "You're booked" ? (
        <a className="cg-btn-ghost mt-3" href={icsHref(card)} download={`${card.code}.ics`}>
          Add to calendar
        </a>
      ) : (
        <p className="mt-3 text-[12px] text-muted-foreground">A person at the desk follows up. This chat does not approve care.</p>
      )}
    </article>
  );
}

export function TicketTimeline({ card }: { card: TimelineCardModel }) {
  const steps = [
    { title: "Ticket opened", meta: card.ticket, done: true },
    { title: "Clinician review", meta: card.controlled ? "Controlled medication" : "Not approved in chat", current: true },
    { title: "Pharmacy", meta: "Nothing is sent from this chat", done: false },
  ];
  return (
    <article className={cardClass} data-testid="card-timeline">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold leading-5">{card.title}</h3>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11.5px] font-medium text-accent">{card.status}</span>
      </div>
      <ol className="mt-3 space-y-3 border-l-2 border-muted pl-3">
        {steps.map((step) => (
          <li key={step.title} className="relative">
            <span
              className={`absolute -left-[17px] top-1 size-3 rounded-full border-2 ${
                step.done ? "border-success bg-success" : step.current ? "cg-pulse border-accent bg-accent" : "border-muted-foreground bg-surface"
              }`}
            />
            <p className="text-[13px] font-medium">{step.title}</p>
            <p className="font-mono text-[12px] text-muted-foreground">{step.meta}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function SafetyCard({ card }: { card: SafetyCardModel }) {
  return (
    <article className={`${cardClass} border-clay`} role="alert" data-testid="safety-card">
      <h3 className="text-[14px] font-semibold leading-5 text-clay">This needs a person, not the guide</h3>
      <p className="mt-2 text-[13.5px] leading-[22px]">
        If this may be an emergency, call 911. {card.crisis ? "If you may be in a suicide crisis, call or text 988." : "The guide does not give first-aid steps."}
      </p>
      <p className="mt-2 text-[12px] text-muted-foreground">Cedar Grove cannot take an emergency interview in this chat.</p>
    </article>
  );
}

export function ChecklistCard({ items }: { items: string[] }) {
  return (
    <article className={cardClass} data-testid="card-checklist">
      <h3 className="text-[14px] font-semibold leading-5">Bring to the visit</h3>
      <ul className="mt-2 space-y-1 text-[13px]">
        {items.map((item) => (
          <li key={item}>✓ {item}</li>
        ))}
      </ul>
      <p className="mt-2 text-[11.5px] text-muted-foreground">From the patient guide. The desk confirms anything clinical.</p>
    </article>
  );
}

export function HandoffCard({ card }: { card: HandoffCardModel }) {
  return (
    <article className={cardClass} data-testid="handoff-card">
      <h3 className="text-[14px] font-semibold leading-5">Connecting you with the Cedar Grove desk</h3>
      <p className="mt-2 text-[13.5px] leading-[22px]">
        In this demo, the ticket appears in /admin. A specialist usually replies in a few minutes.
      </p>
      {card.ticketId && (
        <p className="mt-2 font-mono text-[13px] tabular-nums text-muted-foreground">Ticket {card.ticketId.slice(0, 8)}</p>
      )}
    </article>
  );
}

export function CitationRow({ citations }: { citations: Citation[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[11.5px] text-muted-foreground">Sources</span>
      {citations.slice(0, 3).map((citation) => (
        <CitationChip key={citation.id} citation={citation} />
      ))}
    </div>
  );
}

function CitationChip({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        data-testid="citation"
        className="inline-flex h-7 items-center rounded-full border border-border bg-surface px-2 text-[11.5px] focus-visible:ring-[3px] focus-visible:ring-accent"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            event.currentTarget.blur();
          }
        }}
      >
        <span data-testid="citation-chip">{shortTitle(citation.title)}</span>
      </button>
      {open && (
        <span
          data-testid="citation-preview"
          role="dialog"
          className="absolute bottom-9 left-0 z-20 w-64 rounded-[12px] border border-border bg-surface p-3 text-left shadow-[var(--shadow-card)]"
        >
          <span className="block text-[14px] font-semibold leading-5">{citation.title}</span>
          <span className="mt-1 line-clamp-3 block text-[13px] leading-5">{citation.excerpt}</span>
          <Link href={`/knowledge#${citation.slug}`} target="_blank" className="mt-2 inline-block text-[12px] text-accent underline">
            Open source
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
        </span>
      )}
    </span>
  );
}

export function ToolRow({ label }: { label: string }) {
  return (
    <details className="rounded-[12px] border border-border bg-surface px-3 py-2 text-[13px]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <span>{label}</span>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">Done</span>
      </summary>
    </details>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-[13px] tabular-nums">{value}</span>
    </div>
  );
}

function CarouselButtons({ scrollerId }: { scrollerId: string }) {
  function scroll(direction: number) {
    document.getElementById(scrollerId)?.scrollBy({ left: direction * 200, behavior: "smooth" });
  }
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center gap-1 pr-1 [@media(hover:hover)]:flex">
      <button type="button" aria-label="Previous clinicians" className="pointer-events-auto grid size-7 place-items-center rounded-full border border-border bg-surface/90" onClick={() => scroll(-1)}>
        <ChevronLeft className="size-4" />
      </button>
      <button type="button" aria-label="Next clinicians" className="pointer-events-auto grid size-7 place-items-center rounded-full border border-border bg-surface/90" onClick={() => scroll(1)}>
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function groupDays(slots: { id: string; label: string }[]) {
  const groups = new Map<string, { key: string; weekday: string; date: string; slots: { id: string; label: string; time: string }[] }>();
  for (const slot of slots) {
    const match = slot.label.match(/^(\w+),\s+([A-Za-z]+)\s+(\d+),\s+(.+)$/);
    const weekday = match?.[1] ?? "Day";
    const date = match?.[3] ?? "";
    const time = match?.[4] ?? slot.label;
    const key = match ? `${weekday} ${match[2]} ${date}` : slot.label;
    const group = groups.get(key) ?? { key, weekday: weekday.slice(0, 3), date, slots: [] };
    group.slots.push({ id: slot.id, label: slot.label, time });
    groups.set(key, group);
  }
  return [...groups.values()];
}

function shortTime(label: string) {
  const match = label.match(/(\d{1,2}:\d{2}\s*[ap]\.m\.)/i);
  return match?.[1] ?? label;
}

function shortTitle(title: string) {
  return title.length > 28 ? `${title.slice(0, 26)}…` : title;
}

function icsHref(card: ConfirmCardModel) {
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `SUMMARY:Cedar Grove visit ${card.code}`,
    `DESCRIPTION:${card.who} at ${card.where}`,
    `LOCATION:${card.where}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}
