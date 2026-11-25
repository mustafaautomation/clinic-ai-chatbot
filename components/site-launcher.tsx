"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { NUDGE_PILLS } from "@/lib/brand";
import { Mark } from "@/components/mark";
import { ChatPanel } from "@/components/chat-panel";

const ease = [0.22, 1, 0.36, 1] as const;

export function SiteLauncher() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [nudges, setNudges] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [teaser, setTeaser] = useState(false);
  const hidden = path === "/chat" || path === "/embed" || path === "/embed-demo";

  useEffect(() => {
    if (hidden) return;
    const immediate = path === "/";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setDismissed(window.sessionStorage.getItem("cg-nudges-dismissed") === "1");
      setNudges(true);
    }, immediate || reduce ? 0 : 1200);
    const teaserTimer = window.setTimeout(() => {
      const teaserOff = window.localStorage.getItem("cg-teaser-dismissed") === "1";
      setTeaser(!teaserOff && path === "/");
    }, 4000);
    const openChat = () => setOpen(true);
    window.addEventListener("cg-open-chat", openChat);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(teaserTimer);
      window.removeEventListener("cg-open-chat", openChat);
    };
  }, [hidden, path]);

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[2147483000] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      <AnimatePresence>
        {open && (
          <motion.div
            id="cg-chat-widget"
            role="dialog"
            aria-label="Grove guide"
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease }}
            className="pointer-events-auto h-[min(680px,calc(100dvh-24px-60px-16px-24px))] w-[min(400px,calc(100dvw-32px))] origin-bottom-right max-sm:fixed max-sm:inset-0 max-sm:h-dvh max-sm:w-dvw max-sm:rounded-none"
          >
            <ChatPanel mode="overlay" channel="widget" onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      {!open && teaser && (
        <div data-testid="launcher-teaser" className="chat-widget-shell pointer-events-auto mb-1 max-w-[240px] px-3 py-2 text-[13px] leading-5">
          <button
            type="button"
            aria-label="Dismiss teaser"
            className="float-right text-muted-foreground"
            onClick={() => {
              window.localStorage.setItem("cg-teaser-dismissed", "1");
              setTeaser(false);
            }}
          >
            <X className="size-3.5" />
          </button>
          Need a visit or a plan check? I can book it today.
        </div>
      )}
      {!open && nudges && !dismissed && (
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <button
            type="button"
            aria-label="Dismiss suggestions"
            className="grid size-6 place-items-center rounded-full border border-border bg-surface text-foreground"
            onClick={() => {
              window.sessionStorage.setItem("cg-nudges-dismissed", "1");
              setDismissed(true);
            }}
          >
            <X className="size-3.5" />
          </button>
          {NUDGE_PILLS.map((pill, index) => (
            <motion.button
              key={pill.label}
              type="button"
              data-testid="launcher-nudge"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: index * 0.07, ease }}
              className="chat-widget-shell pointer-events-auto h-9 rounded-full px-3.5 text-[13px] font-medium"
              style={{ background: "color-mix(in srgb, var(--surface) 92%, transparent)" }}
              onClick={() => {
                setOpen(true);
                window.setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("cg-send", { detail: pill.prompt }));
                }, 350);
              }}
            >
              {pill.label}
            </motion.button>
          ))}
        </div>
      )}
      <button
        type="button"
        data-testid="chat-launcher"
        aria-label={open ? "Close chat" : "Open chat with Grove guide"}
        aria-expanded={open}
        aria-controls="cg-chat-widget"
        className="pointer-events-auto grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-launcher)] ring-1 ring-white/25 transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent sm:size-[60px]"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="size-[22px]" strokeWidth={2} /> : <Mark className="size-[22px]" />}
      </button>
    </div>
  );
}
