"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Citation, ToolTrace } from "@/lib/types";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  tools?: ToolTrace[];
  emergency?: boolean;
  refusal?: boolean;
  feedback?: "up" | "down";
  pending?: boolean;
  suggestions?: string[];
};

const STARTERS = [
  "I'm a new patient. Do you accept Blue Cross?",
  "Who speaks Spanish in family medicine?",
  "What should I bring to my first visit?",
  "How do prescription refills work?",
  "Can I get lab results in this chat?",
  "Which vaccines do you offer?",
];

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

type Meta = {
  sessionId: string;
  messageId: string;
  citations: Citation[];
  tools: ToolTrace[];
  suggestions: string[];
  emergency: boolean;
  refusal: boolean;
  handoff: boolean;
};

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

async function readStream(
  response: Response,
  handlers: {
    onMeta: (data: Meta) => void;
    onText: (text: string) => void;
  },
) {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const bucket = { buffer: "", text: "" };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bucket.buffer += decoder.decode(value, { stream: true });
    const chunks = bucket.buffer.split("\n\n");
    bucket.buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const event = chunk.match(/^event: (.+)$/m)?.[1];
      const dataLine = chunk.match(/^data: (.+)$/m)?.[1];
      if (!event || !dataLine) continue;
      const data = JSON.parse(dataLine) as Meta & { text?: string };
      if (event === "meta") handlers.onMeta(data);
      if (event === "token" && data.text) {
        bucket.text += data.text;
        handlers.onText(bucket.text);
      }
      if (event === "done") {
        bucket.text = data.text || bucket.text;
        handlers.onText(bucket.text);
      }
    }
  }
}

export function ChatPanel({
  tall = false,
  fill = false,
  channel = "web",
}: {
  tall?: boolean;
  fill?: boolean;
  channel?: "web" | "widget";
}) {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<string | null>(null);

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
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function acceptConsent() {
    grantConsent();
  }

  function resetChat() {
    window.localStorage.removeItem("cg-session");
    sessionRef.current = null;
    setSessionId(null);
    setMessages([]);
    setSuggestions([]);
    setError(null);
  }

  async function send(text: string): Promise<string[] | null> {
    const trimmed = text.trim();
    if (!trimmed || busy || !consent) return null;
    setError(null);
    setBusy(true);
    setDraft("");
    setSuggestions([]);
    const userId = nextLocalId("local");
    const pendingId = nextLocalId("pending");
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", text: trimmed },
      { id: pendingId, role: "assistant", text: "", pending: true },
    ]);
    let nextSuggestions: string[] = [];
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionRef.current,
          message: trimmed,
          consent: true,
          channel,
        }),
      });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "The guide could not answer just now.");
      }
      await readStream(response, {
        onMeta: (data) => {
          sessionRef.current = data.sessionId;
          window.localStorage.setItem("cg-session", data.sessionId);
          setSessionId(data.sessionId);
          nextSuggestions = data.suggestions ?? [];
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
                  }
                : item,
            ),
          );
        },
        onText: (text) => {
          setMessages((current) =>
            current.map((item) => (item.pending ? { ...item, text } : item)),
          );
        },
      });
      setMessages((current) =>
        current.map((item) => (item.pending ? { ...item, pending: false } : item)),
      );
      setSuggestions(nextSuggestions);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Something went wrong.";
      setError(message);
      setMessages((current) => current.filter((item) => !item.pending));
      return null;
    } finally {
      setBusy(false);
    }
    return nextSuggestions;
  }

  async function walkthrough() {
    const first = await send("I'm a new patient. Do you accept Blue Cross Blue Shield?");
    if (!first) return;
    await send("Family medicine, Spanish speaking please.");
    const slots = await send("Show openings for Dr. Alvarez");
    if (slots?.[0]) {
      await send(slots[0]);
      await send("Jordan Lee, 555-0148");
    }
  }

  async function rate(messageId: string, rating: "up" | "down") {
    if (!sessionRef.current) return;
    setMessages((current) =>
      current.map((item) => (item.id === messageId ? { ...item, feedback: rating } : item)),
    );
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionRef.current, messageId, rating }),
    });
  }

  return (
    <section className={`flex flex-col overflow-hidden rounded-3xl bg-card shadow-[0_20px_60px_-36px_rgba(42,33,24,0.7)] ring-1 ring-foreground/10 ${fill ? "h-full min-h-0" : "h-full min-h-[32rem]"}`}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="font-heading text-xl text-bark">Grove guide</p>
          <p className="text-xs text-muted-foreground">
            Answers from the patient guide and scheduling tools. No diagnosis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="handoff-button"
            disabled={!consent || busy}
            onClick={() => void send("I want to talk to a human")}
          >
            Talk to a person
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={resetChat}>
            New chat
          </Button>
        </div>
      </div>

      {!consent && (
            <div className="border-b border-clay/30 bg-accent px-4 py-3 text-sm text-accent-foreground">
              <p>
                This demo stores a redacted transcript on this server so the conversation can continue.
                Do not enter real health information, identification numbers, or anyone else&apos;s data.
                Synthetic names and 555 numbers are enough.
              </p>
              <Button type="button" className="mt-3" data-testid="consent" onClick={acceptConsent}>
                Continue with demo consent
              </Button>
            </div>
          )}

          <div ref={scroller} data-testid="messages" className={`flex-1 space-y-4 overflow-y-auto px-4 py-4 ${fill ? "min-h-0" : tall ? "min-h-[60vh]" : "min-h-[22rem]"}`}>
            {messages.length === 0 && (
              <div className="rounded-2xl bg-foam/80 p-4">
                <p className="font-heading text-2xl text-bark">Ask the way you would ask the front desk.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  A new patient can check Blue Cross, ask for Spanish-speaking family medicine, and leave
                  with a confirmation number. Emergencies go to 911, not to a hold queue.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {STARTERS.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      className="h-auto whitespace-normal text-left"
                      disabled={!consent || busy}
                      onClick={() => void send(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
                <Button type="button" className="mt-4" disabled={!consent || busy} onClick={() => void walkthrough()}>
                  Play the new-patient booking
                </Button>
              </div>
            )}

            {messages.map((message) => (
              <article
                key={message.id}
                className={message.role === "user" ? "ml-8 flex justify-end" : "mr-6"}
              >
                <div
                  data-testid={message.role === "assistant" ? "assistant-message" : "user-message"}
                  className={
                    message.role === "user"
                      ? "max-w-[34rem] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : `max-w-[38rem] rounded-2xl rounded-bl-md px-3 py-2 text-sm ring-1 ring-foreground/10 ${
                          message.emergency ? "bg-red-50 text-red-950 ring-red-200" : "bg-background"
                        }`
                  }
                >
                  {message.emergency && (
                    <p className="mb-1 text-xs font-semibold tracking-wide uppercase">Emergency handoff</p>
                  )}
                  {message.pending && !message.text ? (
                    <p className="flex items-center gap-1 py-1" data-testid="typing" aria-live="polite">
                      <span className="sr-only">The guide is typing</span>
                      <span className="size-1.5 animate-bounce rounded-full bg-moss [animation-delay:0ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-moss [animation-delay:120ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-moss [animation-delay:240ms]" />
                    </p>
                  ) : (
                    <RichText text={message.text} />
                  )}
                  {message.tools && message.tools.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.tools.map((tool, index) => (
                        <details key={`${tool.name}-${index}`} className="rounded-xl bg-foam/70 px-3 py-2">
                          <summary className="cursor-pointer text-xs font-medium text-moss">
                            {TOOL_LABELS[tool.name] ?? tool.name}
                          </summary>
                          <pre className="mt-2 overflow-x-auto text-[11px] leading-relaxed text-foreground/80">
                            {JSON.stringify({ args: tool.args, result: tool.result }, null, 2)}
                          </pre>
                        </details>
                      ))}
                    </div>
                  )}
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.citations.map((citation) => (
                        <Link
                          key={citation.id}
                          href={`/knowledge#${citation.slug}`}
                          data-testid="citation"
                          className="rounded-full bg-secondary px-2 py-1 text-[11px] text-secondary-foreground"
                        >
                          {citation.title}
                        </Link>
                      ))}
                    </div>
                  )}
                  {message.role === "assistant" && !message.pending && message.text && (
                    <div className="mt-2 flex gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant={message.feedback === "up" ? "secondary" : "ghost"}
                        onClick={() => void rate(message.id, "up")}
                      >
                        Helpful
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant={message.feedback === "down" ? "secondary" : "ghost"}
                        onClick={() => void rate(message.id, "down")}
                      >
                        Not quite
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-900">
                {error}
              </p>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  data-testid="suggestion"
                  disabled={busy || !consent}
                  onClick={() => void send(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}

          <form
            className="border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <label htmlFor="guide-message" className="sr-only">
              Message the clinic guide
            </label>
            <Textarea
              id="guide-message"
              data-testid="composer"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={consent ? "Ask about a plan, a clinician, or a visit" : "Consent is required before chatting"}
              disabled={!consent || busy}
              rows={2}
              className="min-h-16 resize-none bg-background"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(draft);
                }
              }}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                {sessionId ? "Transcript masked for phone numbers and IDs." : "No transcript stored yet."}{" "}
                <Link href="/docs" className="underline underline-offset-2">
                  Limits
                </Link>
              </p>
              <Button type="submit" data-testid="send" disabled={!consent || busy || !draft.trim()}>
                {busy ? "Sending" : "Send"}
              </Button>
            </div>
          </form>
    </section>
  );
}

function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2 whitespace-pre-wrap">
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
