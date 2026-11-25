"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuditEvent, CallbackRequest, ChatMessage, Handoff, RefillTicket } from "@/lib/types";

type AppointmentView = {
  id: string;
  confirmationCode: string;
  patientName: string;
  phone: string;
  label: string;
  status: string;
  insurancePlan: string | null;
  visitType: string;
};

type DeskState = {
  sessions: { id: string; createdAt: string; messages: ChatMessage[] }[];
  appointments: AppointmentView[];
  tickets: RefillTicket[];
  callbacks: CallbackRequest[];
  handoffs: Handoff[];
  audit: AuditEvent[];
  retentionDays: number;
};

export function AdminDesk() {
  const [key, setKey] = useState("");
  const [locked, setLocked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<DeskState | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [evals, setEvals] = useState<{ name: string; pass: boolean; detail: string }[] | null>(null);
  const [evalBusy, setEvalBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setError(null);
    const response = await fetch("/api/admin/state");
    if (response.status === 401) {
      setLocked(true);
      setState(null);
      setLoading(false);
      return;
    }
    if (!response.ok) {
      setError("The desk could not be loaded.");
      setLoading(false);
      return;
    }
    setState((await response.json()) as DeskState);
    setLocked(false);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/admin/state");
      if (cancelled) return;
      if (response.status === 401) {
        setLocked(true);
        setState(null);
        setLoading(false);
        return;
      }
      if (!response.ok) {
        setError("The desk could not be loaded.");
        setLoading(false);
        return;
      }
      setState((await response.json()) as DeskState);
      setLocked(false);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (!response.ok) {
      setError("That key does not open the desk.");
      return;
    }
    setKey("");
    await load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLocked(true);
    setState(null);
    setRevealed({});
  }

  async function reveal(kind: "appointment" | "ticket" | "callback", id: string) {
    const response = await fetch("/api/admin/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id }),
    });
    if (!response.ok) {
      setError("The number could not be revealed.");
      return;
    }
    const data = (await response.json()) as { phone: string };
    setRevealed((current) => ({ ...current, [id]: data.phone }));
    await load();
  }

  async function review(id: string) {
    const response = await fetch("/api/admin/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      setError("The ticket could not be updated.");
      return;
    }
    setNotice("Marked in review. The guide still cannot approve a refill.");
    await load();
  }

  async function retention() {
    const response = await fetch("/api/admin/retention", { method: "POST" });
    if (!response.ok) return;
    const data = (await response.json()) as { removed: number; days: number };
    setNotice(`Retention pass removed ${data.removed} transcripts older than ${data.days} days.`);
    await load();
  }

  async function runEvals() {
    setEvalBusy(true);
    setError(null);
    const response = await fetch("/api/admin/evals", { method: "POST" });
    setEvalBusy(false);
    if (!response.ok) {
      setError("The eval suite did not run.");
      return;
    }
    const data = (await response.json()) as {
      results: { name: string; pass: boolean; detail: string }[];
      passed: number;
      total: number;
    };
    setEvals(data.results);
    setNotice(`${data.passed} of ${data.total} evals passed.`);
    await load();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Checking the desk key…</p>;
  }

  if (locked) {
    return (
      <form onSubmit={login} className="mx-auto max-w-md rounded-3xl bg-card p-6 ring-1 ring-foreground/10">
        <h1 className="font-heading text-4xl text-bark">Staff desk</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Portfolio access only. The demo key is <span className="font-medium text-foreground">cedar-demo</span>.
          Opening the desk writes an audit entry. Phone numbers stay masked until you reveal one.
        </p>
        <label htmlFor="desk-key" className="mt-4 block text-sm font-medium">
          Desk key
        </label>
        <Input
          id="desk-key"
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          className="mt-2 h-10 bg-background"
          autoComplete="current-password"
        />
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="mt-4">
          Open the desk
        </Button>
      </form>
    );
  }

  if (!state) return <p className="text-sm">The desk has no records yet.</p>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl text-bark">Staff desk</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Synthetic records. Transcripts are redacted. Revealing a callback number is audited. Refill
            tickets never flip to approved from the chat guide. Chat retention is {state.retentionDays} days
            and does not delete the schedule.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void retention()}>
            Run retention pass
          </Button>
          <Button type="button" variant="outline" onClick={() => void logout()}>
            Lock desk
          </Button>
        </div>
      </div>
      {notice && <p className="mt-4 rounded-xl bg-foam px-3 py-2 text-sm text-moss">{notice}</p>}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="refills">Refills</TabsTrigger>
          <TabsTrigger value="callbacks">Callbacks</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="evals">Evals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-3 sm:grid-cols-4">
          <Stat label="Chats" value={state.sessions.length} />
          <Stat label="Visits" value={state.appointments.length} />
          <Stat label="Refill tickets" value={state.tickets.length} />
          <Stat label="Handoffs" value={state.handoffs.length} />
        </TabsContent>

        <TabsContent value="chats" className="mt-4 space-y-4">
          {state.sessions.length === 0 && <Empty label="No transcripts yet." />}
          {state.sessions.map((session) => (
            <article key={session.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="text-xs text-muted-foreground">
                {new Date(session.createdAt).toLocaleString()} · {session.messages.length} messages
              </p>
              <div className="mt-3 space-y-2">
                {session.messages.map((message) => (
                  <p key={message.id} className="text-sm">
                    <span className="font-medium">{message.role === "user" ? "Patient" : "Guide"}: </span>
                    {message.text}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <Table
            headers={["Code", "Patient", "When", "Status", "Phone"]}
            rows={state.appointments.map((row) => [
              row.confirmationCode,
              row.patientName,
              row.label,
              row.status,
              <Phone
                key={row.id}
                masked={row.phone}
                revealed={revealed[row.id]}
                onReveal={() => void reveal("appointment", row.id)}
              />,
            ])}
          />
        </TabsContent>

        <TabsContent value="refills" className="mt-4 space-y-3">
          {state.tickets.length === 0 && <Empty label="No refill tickets." />}
          {state.tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {ticket.ticketNumber} · {ticket.medication}
                  {ticket.controlled ? " · controlled" : ""}
                </p>
                <p className="text-xs uppercase tracking-wide text-clay">{ticket.status.replaceAll("_", " ")}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {ticket.patientName} · {ticket.pharmacy ?? "pharmacy not given"} · not approved
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Phone
                  masked={ticket.phone}
                  revealed={revealed[ticket.id]}
                  onReveal={() => void reveal("ticket", ticket.id)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={ticket.status === "in_review"}
                  onClick={() => void review(ticket.id)}
                >
                  Mark in review
                </Button>
              </div>
            </article>
          ))}
        </TabsContent>

        <TabsContent value="callbacks" className="mt-4 space-y-3">
          {state.callbacks.length === 0 && <Empty label="No callback requests." />}
          {state.callbacks.map((callback) => (
            <article key={callback.id} className="rounded-2xl bg-card p-4 text-sm ring-1 ring-foreground/10">
              <p className="font-medium">
                {callback.ticketNumber} · {callback.patientName}
              </p>
              <p className="mt-1 text-muted-foreground">{callback.topic}</p>
              <div className="mt-3">
                <Phone
                  masked={callback.phone}
                  revealed={revealed[callback.id]}
                  onReveal={() => void reveal("callback", callback.id)}
                />
              </div>
            </article>
          ))}
          {state.handoffs.length > 0 && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-950">
              <p className="font-medium">Emergency handoffs</p>
              <ul className="mt-2 space-y-1">
                {state.handoffs.map((handoff) => (
                  <li key={handoff.id}>
                    {handoff.category} · {handoff.note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-foreground/10">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {state.audit.map((event) => (
                  <tr key={event.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(event.at).toLocaleString()}</td>
                    <td className="px-3 py-2">{event.actor}</td>
                    <td className="px-3 py-2">{event.action}</td>
                    <td className="px-3 py-2">{event.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="evals" className="mt-4">
          <Button type="button" onClick={() => void runEvals()} disabled={evalBusy}>
            {evalBusy ? "Running evals…" : "Run the safety and booking evals"}
          </Button>
          {evals && (
            <ul className="mt-4 space-y-2">
              {evals.map((result) => (
                <li key={result.name} className="rounded-xl bg-card px-3 py-2 text-sm ring-1 ring-foreground/10">
                  <span className={result.pass ? "text-moss" : "text-destructive"}>
                    {result.pass ? "Pass" : "Fail"}
                  </span>
                  <span className="ml-2">{result.name}</span>
                  {!result.pass && <p className="mt-1 text-xs text-destructive">{result.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-heading text-4xl text-bark">{value}</p>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">{label}</p>;
}

function Phone({
  masked,
  revealed,
  onReveal,
}: {
  masked: string;
  revealed?: string;
  onReveal: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{revealed ?? masked}</span>
      {!revealed && (
        <Button type="button" size="xs" variant="outline" onClick={onReveal}>
          Reveal
        </Button>
      )}
    </span>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return <Empty label="Nothing on the schedule yet." />;
  return (
    <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-foreground/10">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
