"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Backpack,
  Copy,
  Check,
  FileText,
  Headphones,
  Languages,
  Mic,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  Square,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { BOT_NAME, DESK_AGENT, DISCLAIMER, STARTER_PROMPTS } from "@/lib/brand";
import { cardsFromTurn, phaseForTools } from "@/lib/cards";
import type { Citation, ToolTrace } from "@/lib/types";
import { Mark } from "@/components/mark";
import {
  CitationRow,
  ChecklistCard,
  ConfirmCard,
  HandoffCard,
  LeadCard,
  PlanCard,
  ProviderCarousel,
  SafetyCard,
  SlotPicker,
  SlotSkeleton,
  TicketTimeline,
  ToolRow,
  VisitForm,
} from "@/components/chat-cards";

type Attachment = { id: string; name: string; type: string; url: string };

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
  citations?: Citation[];
  tools?: ToolTrace[];
  emergency?: boolean;
  refusal?: boolean;
  feedback?: "up" | "down";
  pending?: boolean;
  stopped?: boolean;
  suggestions?: string[];
  handoff?: boolean;
  handoffId?: string | null;
  attachments?: { name: string; url: string; type: string }[];
};

type Meta = {
  sessionId: string;
  messageId: string;
  citations: Citation[];
  tools: ToolTrace[];
  suggestions: string[];
  emergency: boolean;
  refusal: boolean;
  handoff: boolean;
  handoffId?: string | null;
  phase?: string;
  engine?: "live" | "demo";
};

const TOOL_LABELS: Record<string, string> = {
  check_insurance: "Checked a plan name",
  find_provider: "Searched the directory",
  get_available_slots: "Checked openings",
  book_appointment: "Booked a visit",
  reschedule_appointment: "Moved a visit",
  cancel_appointment: "Cancelled a visit",
  request_refill: "Opened a refill ticket",
  create_callback_request: "Asked the desk to call",
  flag_staff_handoff: "Flagged a staff handoff",
};

const ICONS = {
  shield: ShieldCheck,
  languages: Languages,
  backpack: Backpack,
  headphones: Headphones,
} as const;

const consentListeners = new Set<() => void>();

function readConsent() {
  return window.localStorage.getItem("cg-consent") === "1";
}

function subscribeConsent(onStoreChange: () => void) {
  consentListeners.add(onStoreChange);
  return () => consentListeners.delete(onStoreChange);
}

function grantConsent() {
  window.localStorage.setItem("cg-consent", "1");
  consentListeners.forEach((listener) => listener());
}

let localSeq = 0;
function nextLocalId(prefix: string) {
  localSeq += 1;
  return `${prefix}-${localSeq}`;
}

function stamp() {
  if (typeof document !== "undefined" && document.documentElement.dataset.visual === "1") {
    return "2026-11-25T19:00:00.000Z";
  }
  return new Date().toISOString();
}

function formatTime(iso?: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  }).format(new Date(iso));
}

async function readStream(
  response: Response,
  signal: AbortSignal,
  handlers: { onMeta: (data: Meta) => void; onText: (text: string) => void },
) {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const event = chunk.match(/^event: (.+)$/m)?.[1];
      const dataLine = chunk.match(/^data: (.+)$/m)?.[1];
      if (!event || !dataLine) continue;
      const data = JSON.parse(dataLine) as Meta & { text?: string };
      if (event === "meta") handlers.onMeta(data);
      if (event === "token" && data.text) {
        text += data.text;
        handlers.onText(text);
      }
      if (event === "done") {
        text = data.text || text;
        handlers.onText(text);
      }
    }
  }
}

export function ChatPanel({
  tall = false,
  fill = false,
  channel = "web",
  mode = "page",
  onClose,
}: {
  tall?: boolean;
  fill?: boolean;
  channel?: "web" | "widget";
  mode?: "page" | "hero" | "overlay" | "embed";
  onClose?: () => void;
}) {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => false);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [human, setHuman] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [listening, setListening] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [engine, setEngine] = useState<"live" | "demo">("demo");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const sessionRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sendRef = useRef<(text: string) => Promise<string[] | null>>(async () => null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const listId = useId();

  useEffect(() => {
    if (!consent) return;
    const storedSession = window.localStorage.getItem("cg-session");
    if (!storedSession) return;
    sessionRef.current = storedSession;
    let cancelled = false;
    void fetch(`/api/session?id=${encodeURIComponent(storedSession)}`)
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          window.localStorage.removeItem("cg-session");
          sessionRef.current = null;
          setSessionId(null);
          return;
        }
        const data = (await response.json()) as { messages: UiMessage[] };
        setSessionId(storedSession);
        setMessages(data.messages ?? []);
        const last = [...(data.messages ?? [])].reverse().find((item) => item.role === "assistant");
        setSuggestions(last?.suggestions ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("The saved chat could not be restored.");
      });
    return () => {
      cancelled = true;
    };
  }, [consent]);

  useEffect(() => {
    if (!stick.current) return;
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, phase, suggestions]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (mode === "overlay" && window.matchMedia("(pointer: fine)").matches) {
      inputRef.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "overlay" && mode !== "embed" && mode !== "hero") return;
    const onSend = (event: Event) => {
      const text = (event as CustomEvent<string>).detail;
      if (!text) return;
      grantConsent();
      void sendRef.current(text);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "cg-prompt" && typeof event.data.text === "string") {
        grantConsent();
        void sendRef.current(event.data.text);
      }
      if (event.data?.type === "cg-theme" && (event.data.theme === "light" || event.data.theme === "dark")) {
        setTheme(event.data.theme);
      }
    };
    window.addEventListener("cg-send", onSend);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("cg-send", onSend);
      window.removeEventListener("message", onMessage);
    };
  }, [mode, setTheme]);

  function onScroll() {
    const node = scroller.current;
    if (!node) return;
    const near = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    stick.current = near;
    setShowJump(!near);
  }

  function resetChat() {
    if (human && !window.confirm("A handoff is open. Start a new conversation?")) return;
    abortRef.current?.abort();
    window.localStorage.removeItem("cg-session");
    sessionRef.current = null;
    setSessionId(null);
    setMessages([]);
    setSuggestions([]);
    setError(null);
    setHuman(false);
    setBanner(null);
    setPhase(null);
    setBusy(false);
  }

  function addFiles(list: FileList | File[]) {
    const next: Attachment[] = [];
    for (const file of Array.from(list)) {
      if (files.length + next.length >= 3) break;
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowed.includes(file.type)) {
        setToast("Attach a JPG, PNG, WEBP, or PDF.");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setToast("That file is over 5 MB.");
        continue;
      }
      next.push({ id: nextLocalId("file"), name: file.name, type: file.type, url: URL.createObjectURL(file) });
    }
    if (next.length) setFiles((current) => [...current, ...next].slice(0, 3));
  }

  function stop() {
    abortRef.current?.abort();
    setBusy(false);
    setPhase(null);
    setMessages((current) => current.map((item) => (item.pending ? { ...item, pending: false, stopped: true } : item)));
  }

  async function send(text: string): Promise<string[] | null> {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || busy || !readConsent()) return null;
    setError(null);
    setBusy(true);
    setPhase("Looking in the patient guide…");
    setDraft("");
    setSuggestions([]);
    const sentFiles = files;
    setFiles([]);
    const attachmentNote = sentFiles.length ? `\n\nAttached: ${sentFiles.map((file) => file.name).join(", ")}` : "";
    const payload = `${trimmed || "I attached a file for the desk."}${attachmentNote}`.trim();
    const userId = nextLocalId("local");
    const pendingId = nextLocalId("pending");
    stick.current = true;
    setMessages((current) => [
      ...current,
      {
        id: userId,
        role: "user",
        text: trimmed || `Attached ${sentFiles.map((file) => file.name).join(", ")}`,
        createdAt: stamp(),
        attachments: sentFiles.map((file) => ({ name: file.name, url: file.url, type: file.type })),
      },
      { id: pendingId, role: "assistant", text: "", pending: true, createdAt: stamp() },
    ]);
    const controller = new AbortController();
    abortRef.current = controller;
    let nextSuggestions: string[] = [];
    let target = "";
    let shown = "";
    let streamDone = false;
    const visual = document.documentElement.dataset.visual === "1";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    const drip = window.setInterval(() => {
      if (controller.signal.aborted) {
        window.clearInterval(drip);
        return;
      }
      const wait = visual || reduce ? 0 : 280;
      if (performance.now() - started < wait) return;
      if (shown.length < target.length) {
        const step = target.length > 700 ? 48 : 16;
        shown = target.slice(0, shown.length + step);
        setPhase(null);
        setMessages((current) => current.map((item) => (item.pending ? { ...item, text: shown } : item)));
      } else if (streamDone) {
        window.clearInterval(drip);
      }
    }, 20);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sessionId: sessionRef.current,
          message: payload,
          consent: true,
          channel,
        }),
      });
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || "The guide could not answer just now.");
      }
      await readStream(response, controller.signal, {
        onMeta: (data) => {
          sessionRef.current = data.sessionId;
          window.localStorage.setItem("cg-session", data.sessionId);
          setSessionId(data.sessionId);
          nextSuggestions = data.suggestions ?? [];
          setPhase(data.phase || phaseForTools(data.tools ?? [], data.emergency));
          if (data.engine === "live" || data.engine === "demo") setEngine(data.engine);
          if (data.emergency) {
            window.dispatchEvent(new CustomEvent("cg-desk-toast", { detail: { kind: "urgent", text: "Desk alerted" } }));
          }
          if (data.handoff) {
            setBanner("Connecting you to a team member…");
            window.dispatchEvent(
              new CustomEvent("cg-desk-toast", {
                detail: { kind: "handoff", text: trimmed || "New human support request" },
              }),
            );
            window.setTimeout(() => {
              setBanner(`${DESK_AGENT} joined`);
              setHuman(true);
            }, visual ? 0 : 700);
          }
          setMessages((current) =>
            current.map((item) =>
              item.id === pendingId
                ? {
                    ...item,
                    id: data.messageId,
                    citations: data.citations,
                    tools: data.tools,
                    emergency: data.emergency,
                    refusal: data.refusal,
                    suggestions: data.suggestions,
                    handoff: data.handoff,
                    handoffId: data.handoffId,
                  }
                : item,
            ),
          );
        },
        onText: (value) => {
          target = value;
          if (visual || reduce) {
            shown = value;
            setPhase(null);
            setMessages((current) => current.map((item) => (item.pending ? { ...item, text: value } : item)));
          }
        },
      });
      streamDone = true;
      if (!controller.signal.aborted) {
        const finish = () => {
          setMessages((current) => current.map((item) => (item.pending ? { ...item, text: target, pending: false } : item)));
          setSuggestions(nextSuggestions.length ? nextSuggestions.slice(0, 3) : ["What are your hours?", "Do you accept Blue Cross?", "Book a new-patient visit"]);
          setPhase(null);
          setBusy(false);
          const status = document.getElementById("cg-live-status");
          if (status) status.textContent = "Assistant replied";
        };
        if (visual || reduce || shown.length >= target.length) finish();
        else {
          const watch = window.setInterval(() => {
            if (shown.length >= target.length || controller.signal.aborted) {
              window.clearInterval(watch);
              if (!controller.signal.aborted) finish();
            }
          }, 30);
        }
      }
      if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
    } catch (cause) {
      window.clearInterval(drip);
      if (controller.signal.aborted) {
        setBusy(false);
        setPhase(null);
        return null;
      }
      const message = cause instanceof Error ? cause.message : "Something went wrong.";
      setError(message);
      setDraft(trimmed);
      setFiles(sentFiles);
      setMessages((current) => current.filter((item) => !item.pending));
      setBusy(false);
      setPhase(null);
      return null;
    }
    return nextSuggestions;
  }

  function listen() {
    const w = window as Window & {
      SpeechRecognition?: new () => SpeechEngine;
      webkitSpeechRecognition?: new () => SpeechEngine;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setToast("Voice input isn't available in this browser. Type instead.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.onresult = (event) => {
      const said = event.results?.[0]?.[0]?.transcript;
      if (said) setDraft((current) => `${current} ${said}`.trim());
    };
    rec.onerror = () => setToast("Voice input isn't available in this browser. Type instead.");
    rec.onend = () => setListening(false);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setToast("Voice input isn't available in this browser. Type instead.");
    }
  }

  useEffect(() => {
    sendRef.current = send;
  });
  const dark = mounted && resolvedTheme === "dark";

  return (
    <section
      data-testid={mode === "hero" ? "landing-hero-chat" : "chat-widget"}
      className={`relative flex min-h-0 flex-col bg-surface text-foreground ${
        fill ? "h-full" : mode === "hero" ? "h-full" : "chat-widget-shell"
      } ${tall ? "min-h-[640px]" : ""} ${mode === "overlay" ? "h-full" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
      }}
    >
      <div className="h-0.5 bg-accent" />
      <header data-testid="chat-header" className="flex h-16 items-center gap-2 border-b border-border px-3">
        <span className="relative grid size-7 place-items-center rounded-full bg-accent-soft text-accent">
          {human ? <span className="text-[11px] font-semibold">SO</span> : <Mark className="size-4" />}
          <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-success ring-2 ring-surface" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-5 font-semibold tracking-[-0.01em]">
            {human ? DESK_AGENT : `${BOT_NAME} · Cedar Grove`}
          </span>
          <span className="flex items-center gap-1 truncate text-[12px] leading-4 text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            {human ? "human specialist" : "Usually replies instantly"}
          </span>
        </span>
        <span data-testid="engine-pill" className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium">
          {engine === "live" ? "Live AI" : "Demo mode"}
        </span>
        <div className="relative">
          <button type="button" className="cg-icon-btn" aria-label="Chat menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
            <MoreHorizontal className="size-4" strokeWidth={1.75} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-[12px] border border-border bg-surface p-1 text-[13px] shadow-[var(--shadow-card)]">
              <button type="button" className="block w-full rounded-md px-2 py-2 text-left hover:bg-muted" onClick={() => { setMenuOpen(false); resetChat(); }}>New chat</button>
              <button type="button" data-testid="theme-toggle" className="block w-full rounded-md px-2 py-2 text-left hover:bg-muted" onClick={() => { setMenuOpen(false); setTheme(dark ? "light" : "dark"); }}>{dark ? "Light" : "Dark"}</button>
              <button type="button" className="block w-full rounded-md px-2 py-2 text-left hover:bg-muted" onClick={() => { setMenuOpen(false); void send("I want to talk to a human"); }}>Talk to a human</button>
            </div>
          )}
        </div>
        {(mode === "overlay" || mode === "embed" || onClose) && (
          <button
            type="button"
            className="cg-icon-btn"
            aria-label="Close chat"
            onClick={() => {
              if (mode === "embed") window.parent.postMessage({ type: "cg-close" }, "*");
              onClose?.();
            }}
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </header>
      {banner && (
        <p data-testid="handoff-banner" className="border-b border-info/30 bg-accent-soft px-3 py-2 text-[12px] text-foreground">
          {banner}
        </p>
      )}
      {!consent && (
        <div className="border-b border-border bg-surface-2 px-3 py-3 text-[13px] leading-5">
          <p>
            This demo stores a redacted transcript so the conversation can continue. Do not enter real health
            information. Synthetic names and 555 numbers are enough.
          </p>
          <button type="button" className="cg-btn mt-3" data-testid="consent" onClick={() => grantConsent()}>
            Continue with demo consent
          </button>
        </div>
      )}
      <div
        ref={scroller}
        id={listId}
        data-testid="chat-messages"
        role="log"
        aria-relevant="additions"
        onScroll={onScroll}
        className={`chat-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 ${fill || mode === "overlay" ? "" : tall ? "min-h-[28rem]" : "min-h-[22rem]"}`}
      >
        <p id="cg-live-status" className="sr-only" role="status" aria-live="polite" />
        {messages.length === 0 && (
          <div>
            <p className="text-[14.5px] leading-[22px]">
              I can check whether a plan is in network, find a clinician, and book a new-patient visit. I quote the patient guide. I do not diagnose.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {STARTER_PROMPTS.map((starter) => {
                const Icon = ICONS[starter.icon];
                return (
                  <button
                    key={starter.label}
                    type="button"
                    disabled={!consent || busy}
                    onClick={() => void send(starter.prompt)}
                    className="flex min-h-16 items-start gap-2 rounded-[16px] border border-border bg-surface p-3 text-left text-[13px] leading-4 font-medium hover:bg-accent-soft disabled:opacity-50"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    {starter.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {messages.map((message, index) => {
          const handoffAt = messages.findIndex((item) => item.handoff);
          const asHuman = human && message.role === "assistant" && handoffAt >= 0 && index > handoffAt;
          const time = formatTime(message.createdAt);
          return (
            <article
              key={message.id}
              data-testid={message.role === "user" ? "message-user" : "message-assistant"}
              aria-label={`${message.role === "user" ? "You" : asHuman ? DESK_AGENT : BOT_NAME}${time ? `, ${time}` : ""}`}
              aria-busy={message.pending ? true : undefined}
              className={message.role === "user" ? "ml-auto flex max-w-[82%] justify-end" : "max-w-full"}
            >
              <div
                data-testid={message.role === "assistant" ? "assistant-message" : "user-message"}
                className={
                  message.role === "user"
                    ? "rounded-[18px] rounded-br-[4px] bg-accent px-3 py-2 text-[14.5px] leading-[22px] text-accent-foreground"
                    : asHuman
                      ? "rounded-[18px] rounded-bl-[4px] bg-surface-2 px-3 py-2 text-[14.5px] leading-[22px]"
                      : "text-[14.5px] leading-[22px]"
                }
              >
                {message.pending && !message.text ? (
                  <p className="text-[13px] text-muted-foreground">{phase || "Looking in the patient guide…"}</p>
                ) : (
                  <>
                    {message.attachments && message.attachments.length > 0 && (
                      <span className="mb-1 flex flex-wrap gap-1">
                        {message.attachments.map((file) =>
                          file.type === "application/pdf" ? (
                            <span key={file.name} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px]">
                              <FileText className="size-3.5" /> {file.name}
                            </span>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={file.url} src={file.url} alt="" className="size-12 rounded-md object-cover" />
                          ),
                        )}
                      </span>
                    )}
                    {message.role === "assistant" && message.pending && !message.text ? null : (
                      <RichText text={message.text} streaming={Boolean(message.pending && message.text)} />
                    )}
                    {message.stopped && <p className="mt-1 text-[11.5px] text-muted-foreground">Stopped</p>}
                    {message.tools && message.tools.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {message.tools.map((tool, toolIndex) => (
                          <ToolRow key={`${tool.name}-${toolIndex}`} label={TOOL_LABELS[tool.name] ?? tool.name} />
                        ))}
                      </div>
                    )}
                    {message.pending && message.tools?.some((tool) => tool.name === "get_available_slots") && !message.text ? (
                      <SlotSkeleton />
                    ) : null}
                    {!message.pending &&
                      cardsFromTurn({
                        tools: message.tools,
                        text: message.text,
                        emergency: message.emergency,
                        handoff: message.handoff,
                        handoffId: message.handoffId,
                      }).map((card, cardIndex) => {
                        const locked = index !== messages.length - 1;
                        if (card.kind === "plan") return <div key={cardIndex} className="mt-2"><PlanCard card={card} onBook={() => void send("Book a new-patient visit")} /></div>;
                        if (card.kind === "providers") {
                          return (
                            <div key={cardIndex} className="mt-2">
                              <ProviderCarousel card={card} onOpenings={(name) => void send(`Show openings for ${name}`)} />
                            </div>
                          );
                        }
                        if (card.kind === "slots") {
                          return (
                            <div key={cardIndex} className="mt-2">
                              <SlotPicker card={card} locked={locked} onBook={(label) => void send(label)} />
                            </div>
                          );
                        }
                        if (card.kind === "form") {
                          return (
                            <div key={cardIndex} className="mt-2">
                              <VisitForm card={card} locked={locked} onSubmit={(name, phone) => void send(`${name}, ${phone}`)} />
                            </div>
                          );
                        }
                        if (card.kind === "confirm") return <div key={cardIndex} className="mt-2"><ConfirmCard card={card} /></div>;
                        if (card.kind === "timeline") return <div key={cardIndex} className="mt-2"><TicketTimeline card={card} /></div>;
                        if (card.kind === "safety") return <div key={cardIndex} className="mt-2"><SafetyCard card={card} /></div>;
                        if (card.kind === "checklist") return <div key={cardIndex} className="mt-2"><ChecklistCard items={card.items} /></div>;
                        return <div key={cardIndex} className="mt-2"><HandoffCard card={card} /></div>;
                      })}
                    {message.citations && message.citations.length > 0 && <CitationRow citations={message.citations} />}
                    {message.role === "assistant" && !message.pending && message.text && (
                      <div className="mt-2 flex flex-wrap gap-1" data-testid="message-actions">
                        <IconAction label="Copy" onClick={() => {
                          void navigator.clipboard.writeText(message.text);
                          setCopiedId(message.id);
                          window.setTimeout(() => setCopiedId(null), 2000);
                        }}>
                          {copiedId === message.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        </IconAction>
                        <IconAction label="Regenerate" onClick={() => {
                          const previous = [...messages].slice(0, index).reverse().find((item) => item.role === "user");
                          if (previous) void send(previous.text);
                        }}>
                          <RefreshCw className="size-3.5" />
                        </IconAction>
                        <IconAction label="Helpful" pressed={message.feedback === "up"} onClick={() => void rate(message.id, "up")}>
                          <ThumbsUp className="size-3.5" />
                        </IconAction>
                        <IconAction label="Not helpful" pressed={message.feedback === "down"} onClick={() => void rate(message.id, "down")}>
                          <ThumbsDown className="size-3.5" />
                        </IconAction>
                      </div>
                    )}
                  </>
                )}
                {time && (
                  <time dateTime={message.createdAt} className="mt-1 block text-[11.5px] text-muted-foreground">
                    {time}
                  </time>
                )}
              </div>
            </article>
          );
        })}
        {busy && (
          <p data-testid="phase-indicator" className="text-[13px] text-muted-foreground">
            {phase || "Looking in the patient guide…"}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-[12px] border border-clay px-3 py-2 text-[13px] text-clay">
            {error}
          </p>
        )}
      </div>
      {showJump && (
        <button
          type="button"
          data-testid="jump-to-latest"
          className="absolute bottom-28 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-border bg-surface shadow-[var(--shadow-card)]"
          onClick={() => {
            stick.current = true;
            setShowJump(false);
            if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
          }}
        >
          <ArrowDown className="size-4" />
          <span className="sr-only">Jump to latest</span>
        </button>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {suggestions.map((suggestion) => (
            <span key={suggestion} data-testid="quick-reply">
              <button
                type="button"
                data-testid="suggestion"
                disabled={busy || !consent}
                onClick={() => void send(suggestion)}
                className="h-8 rounded-full border border-border bg-surface px-3 text-[13px] font-medium hover:bg-accent-soft"
              >
                {suggestion.length > 32 ? suggestion.replace(/^(\w+),\s+\w+\s+\d+,\s+/, "") : suggestion}
              </button>
            </span>
          ))}
        </div>
      )}
      {leadOpen && (
        <div className="px-3 pb-2">
          <LeadCard
            locked={busy}
            onSubmit={(name, phone, email) => {
              setLeadOpen(false);
              void send(`Please call ${name} at ${phone}. Email ${email}.`);
            }}
          />
        </div>
      )}
      <form
        className="border-t border-border px-3 pt-2 pb-1"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) stop();
          else void send(draft);
        }}
      >
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((file) => (
              <span key={file.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-1 text-[11px]">
                {file.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.url} alt="" className="size-6 rounded object-cover" />
                ) : (
                  <FileText className="size-3.5" />
                )}
                {file.name}
                <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-1 rounded-[16px] border border-border bg-surface-2 p-1.5 pl-3">
          <button type="button" data-testid="composer-attach" className="cg-icon-btn" aria-label="Attach a file" onClick={() => fileRef.current?.click()}>
            <Paperclip className="size-5" strokeWidth={1.75} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            className="sr-only"
            aria-label="Attach a file"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <label htmlFor={fieldId} className="sr-only">
            Message the clinic guide
          </label>
          <textarea
            id={fieldId}
            ref={inputRef}
            data-testid="composer"
            data-composer="composer-input"
            rows={1}
            value={draft}
            disabled={!consent}
            placeholder={
              !consent ? "Consent is required before chatting" : listening ? "Listening…" : human ? `Message ${DESK_AGENT}…` : "Ask about hours, a visit, or a plan…"
            }
            className="max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-[14.5px] leading-[22px] outline-none placeholder:text-muted-foreground"
            onChange={(event) => {
              setDraft(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!busy) void send(draft);
              }
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                if (!busy) void send(draft);
              }
            }}
          />
          <button
            type="button"
            data-testid="composer-mic"
            className={`cg-icon-btn ${listening ? "ring-2 ring-accent" : ""}`}
            aria-label={listening ? "Listening" : "Start voice input"}
            aria-pressed={listening}
            onClick={listen}
          >
            <Mic className="size-5" strokeWidth={1.75} />
          </button>
          <span data-testid={busy ? "composer-stop" : "composer-send"}>
            <button
              type="submit"
              data-testid={busy ? "composer-stop-button" : "send"}
              aria-label={busy ? "Stop generating" : "Send"}
              disabled={!busy && !draft.trim() && files.length === 0}
              className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
            >
              {busy ? <Square className="size-2.5 fill-current" /> : <ArrowUp className="size-4" strokeWidth={2} />}
            </button>
          </span>
        </div>
        <button type="button" data-testid="lead-link" className="px-1 pt-1 text-left text-[12px] text-accent underline" onClick={() => setLeadOpen(true)}>
          Leave contact details for the team
        </button>
        <p data-testid="widget-footer" className="px-1 pt-1 pb-1 text-[11.5px] leading-4 text-muted-foreground">
          AI assistant · Portfolio demo · <a className="underline" href="/docs">Privacy</a>
          <button type="button" data-testid="handoff-button" className="ml-2 underline" disabled={!consent || busy} onClick={() => void send("I want to talk to a human")}>
            Talk to a person
          </button>
          <span className="mt-0.5 block text-[11px]">{DISCLAIMER}</span>
        </p>
      </form>
      {dragOver && (
        <div className="absolute inset-0 grid place-items-center border-2 border-dashed border-accent bg-surface/80 text-[14px]">
          Drop to attach
        </div>
      )}
      {toast && (
        <p role="alert" className="absolute right-3 bottom-24 left-3 rounded-[12px] border border-border bg-surface px-3 py-2 text-[13px] shadow-[var(--shadow-card)]">
          {toast}
        </p>
      )}
    </section>
  );

  async function rate(messageId: string, rating: "up" | "down") {
    if (!sessionRef.current) return;
    setMessages((current) => current.map((item) => (item.id === messageId ? { ...item, feedback: rating } : item)));
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionRef.current, messageId, rating }),
    });
  }
}

function IconAction({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function RichText({ text, streaming }: { text: string; streaming?: boolean }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className={streaming ? "whitespace-pre-wrap" : "space-y-2 whitespace-pre-wrap"} data-streaming={streaming ? "true" : undefined}>
      {blocks.map((block) => {
        if (block.split("\n").every((line) => line.trim().startsWith("- "))) {
          return (
            <ul key={block} className="list-disc space-y-1 pl-4">
              {block.split("\n").map((line) => (
                <li key={line}>{inline(line.replace(/^- /, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={block}>{inline(block)}</p>;
      })}
      {streaming && <span className="stream-caret" aria-hidden />}
    </div>
  );
}

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

type SpeechEngine = {
  lang: string;
  start: () => void;
  onresult: ((event: { results?: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
