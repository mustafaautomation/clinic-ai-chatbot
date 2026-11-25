"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChatPanel } from "@/components/chat-panel";
import { DISCLAIMER } from "@/lib/brand";

const ASKS = [
  "Do you accept Blue Cross?",
  "Who speaks Spanish in family medicine?",
  "What should I bring?",
];

const DOES = [
  "Checks a plan name against the synthetic list",
  "Matches clinicians, specialty, and language",
  "Books only openings the scheduler returned",
  "Cites the patient guide",
];

const WONT = [
  "Invent a copay or a price",
  "Diagnose, dose, or read labs",
  "Pretend to be a person",
  "Promise a time that is not on the schedule",
];

export function LandingHero() {
  const [preview, setPreview] = useState<"desktop" | "phone">("desktop");
  const [toast, setToast] = useState<{ kind: string; text: string } | null>(null);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: string; text: string }>).detail;
      if (!detail) return;
      setToast(detail);
      window.setTimeout(() => setToast(null), 6000);
    };
    window.addEventListener("cg-desk-toast", onToast);
    return () => window.removeEventListener("cg-desk-toast", onToast);
  }, []);

  return (
    <section className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-16">
      <div className="pb-24 lg:pb-4">
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Cedar City · fictional clinic</p>
        <h1 className="font-display mt-3 max-w-xl text-[48px] leading-[1.05] font-medium tracking-[-0.03em] sm:text-[60px]">
          The front desk, with the <em className="italic">policy manual</em> open.
        </h1>
        <p className="mt-4 max-w-xl text-[18px] leading-7 text-muted-foreground">
          Cedar Grove&apos;s guide checks insurance, finds a clinician, and books a new-patient visit. It quotes the patient guide. It does not diagnose, dose, or approve a refill.
        </p>
        <div className="mt-5 flex flex-wrap gap-2" data-testid="try-asking">
          <span className="w-full text-[12px] text-muted-foreground">Try asking</span>
          {ASKS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="h-9 rounded-full border border-border bg-surface px-3 text-[13px] font-medium"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("cg-send", { detail: prompt }));
                document.getElementById("desk-chat")?.scrollIntoView({ block: "center" });
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="cg-btn" onClick={() => document.getElementById("desk-chat")?.querySelector("textarea")?.focus()}>
            Chat now
          </button>
          <Link href="/embed-demo" className="cg-btn-ghost">See the embed</Link>
        </div>
        <p className="mt-4 max-w-xl text-[13px] text-muted-foreground">
          Synthetic patients only. A real clinic would need a BAA before any patient information touched a system like this. {DISCLAIMER}
        </p>
        <div data-testid="trust-panel" className="mt-8 grid gap-3 sm:grid-cols-2">
          <article className="rounded-[16px] border border-border bg-surface p-4">
            <h2 className="text-[12px] font-semibold tracking-wide uppercase">What it does</h2>
            <ul className="mt-2 space-y-1 text-[13px]">
              {DOES.map((item) => <li key={item}>✓ {item}</li>)}
            </ul>
          </article>
          <article className="rounded-[16px] border border-border bg-surface p-4">
            <h2 className="text-[12px] font-semibold tracking-wide uppercase">What it won&apos;t do</h2>
            <ul className="mt-2 space-y-1 text-[13px]">
              {WONT.map((item) => <li key={item}>✕ {item}</li>)}
            </ul>
          </article>
        </div>
      </div>
      <div>
        <div className="mb-2 flex gap-2" data-testid="preview-toggle">
          <button type="button" className={`rounded-full px-3 py-1 text-[12px] ${preview === "desktop" ? "bg-accent text-accent-foreground" : "border border-border"}`} onClick={() => setPreview("desktop")}>Desktop</button>
          <button type="button" className={`rounded-full px-3 py-1 text-[12px] ${preview === "phone" ? "bg-accent text-accent-foreground" : "border border-border"}`} onClick={() => setPreview("phone")}>Phone</button>
        </div>
        <div id="desk-chat" className={`chat-widget-shell mx-auto h-[min(640px,70dvh)] ${preview === "phone" ? "w-[320px]" : "w-full max-w-[400px]"}`}>
          <ChatPanel mode="hero" channel="web" />
        </div>
      </div>
      {toast && (
        <p
          data-testid={toast.kind === "urgent" ? "ops-toast" : "handoff-toast"}
          role="status"
          className={`fixed bottom-24 left-4 z-[2147483001] max-w-sm rounded-[16px] border px-4 py-3 text-[13px] shadow-[var(--shadow-card)] ${toast.kind === "urgent" ? "border-danger bg-[#fff4f2] text-danger" : "border-border bg-surface"}`}
        >
          <span className="block text-[11px] font-semibold tracking-wide uppercase">{toast.kind === "urgent" ? "Desk alerted" : "New human support request"}</span>
          {toast.text}
        </p>
      )}
    </section>
  );
}
