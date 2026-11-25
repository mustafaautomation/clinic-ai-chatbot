import { randomUUID } from "crypto";
import { RETENTION_DAYS } from "@/lib/brand";
import { maskPhone, redact } from "@/lib/redact";
import type {
  Appointment,
  AuditEvent,
  CallbackRequest,
  ChatMessage,
  Feedback,
  Handoff,
  RefillTicket,
  Session,
  Slot,
} from "@/lib/types";

export type StoreData = {
  sessions: Session[];
  appointments: Appointment[];
  tickets: RefillTicket[];
  callbacks: CallbackRequest[];
  handoffs: Handoff[];
  audit: AuditEvent[];
  feedback: Feedback[];
  confirmationSeq: number;
  ticketSeq: number;
  callbackSeq: number;
};

export class ClinicStore {
  sessions: Session[] = [];
  appointments: Appointment[] = [];
  tickets: RefillTicket[] = [];
  callbacks: CallbackRequest[] = [];
  handoffs: Handoff[] = [];
  audit: AuditEvent[] = [];
  feedback: Feedback[] = [];
  confirmationSeq = 1000;
  ticketSeq = 200;
  callbackSeq = 300;
  onChange?: () => void;

  createSession(consent = true): Session {
    const session: Session = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      consent,
      messages: [],
      expecting: null,
      isNewPatient: false,
      insurancePlan: null,
      insuranceNetwork: null,
      specialty: null,
      language: null,
      providerId: null,
      visitType: null,
      offeredSlots: [],
      pendingSlotId: null,
      pendingMedication: null,
      pendingPharmacy: null,
      controlledSubstance: false,
      lastConfirmation: null,
      pendingConfirmation: null,
    };
    this.sessions.unshift(session);
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.find((session) => session.id === id);
  }

  takenSlotIds(): Set<string> {
    return new Set(
      this.appointments.filter((item) => item.status === "booked").map((item) => item.slotId),
    );
  }

  nextConfirmation(): string {
    this.confirmationSeq += 1;
    return `CG-${this.confirmationSeq}`;
  }

  nextTicket(prefix: "RF" | "CB"): string {
    if (prefix === "RF") {
      this.ticketSeq += 1;
      return `RF-${this.ticketSeq}`;
    }
    this.callbackSeq += 1;
    return `CB-${this.callbackSeq}`;
  }

  addMessage(session: Session, message: ChatMessage) {
    session.messages.push(message);
  }

  addAudit(event: Omit<AuditEvent, "id" | "at" | "detail"> & { detail: string }) {
    this.audit.unshift({
      id: randomUUID(),
      at: new Date().toISOString(),
      ...event,
      detail: redact(event.detail),
    });
  }

  book(input: Omit<Appointment, "id" | "confirmationCode" | "createdAt" | "synthetic" | "status">) {
    const appointment: Appointment = {
      ...input,
      id: randomUUID(),
      confirmationCode: this.nextConfirmation(),
      status: "booked",
      createdAt: new Date().toISOString(),
      synthetic: true,
    };
    this.appointments.unshift(appointment);
    return appointment;
  }

  findAppointment(code: string): Appointment | undefined {
    return this.appointments.find(
      (item) => item.confirmationCode.toLowerCase() === code.toLowerCase(),
    );
  }

  addTicket(
    input: Omit<RefillTicket, "id" | "ticketNumber" | "createdAt" | "synthetic" | "status">,
  ) {
    const ticket: RefillTicket = {
      ...input,
      id: randomUUID(),
      ticketNumber: this.nextTicket("RF"),
      status: "pending_clinician_review",
      createdAt: new Date().toISOString(),
      synthetic: true,
    };
    this.tickets.unshift(ticket);
    return ticket;
  }

  markTicketInReview(id: string): RefillTicket | undefined {
    const ticket = this.tickets.find((item) => item.id === id);
    if (!ticket) return undefined;
    ticket.status = "in_review";
    return ticket;
  }

  addCallback(input: Omit<CallbackRequest, "id" | "ticketNumber" | "createdAt" | "synthetic" | "status">) {
    const callback: CallbackRequest = {
      ...input,
      id: randomUUID(),
      ticketNumber: this.nextTicket("CB"),
      status: "open",
      createdAt: new Date().toISOString(),
      synthetic: true,
    };
    this.callbacks.unshift(callback);
    return callback;
  }

  addHandoff(input: Omit<Handoff, "id" | "createdAt" | "status">) {
    const handoff: Handoff = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "flagged",
    };
    this.handoffs.unshift(handoff);
    return handoff;
  }

  addFeedback(input: Omit<Feedback, "id" | "at">) {
    const feedback: Feedback = { ...input, id: randomUUID(), at: new Date().toISOString() };
    this.feedback.unshift(feedback);
    const session = this.getSession(input.sessionId);
    const message = session?.messages.find((item) => item.id === input.messageId);
    if (message) message.feedback = input.rating;
    return feedback;
  }

  applyRetention(now = new Date(), days = RETENTION_DAYS): number {
    const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
    const before = this.sessions.length;
    this.sessions = this.sessions.filter(
      (session) => new Date(session.createdAt).getTime() >= cutoff,
    );
    const removed = before - this.sessions.length;
    this.addAudit({
      actor: "system",
      action: "retention_pass",
      resource: "transcripts",
      detail: `Removed ${removed} chat transcripts older than ${days} days. Appointments were kept.`,
    });
    return removed;
  }

  commit() {
    this.onChange?.();
  }

  dump(): StoreData {
    return {
      sessions: this.sessions,
      appointments: this.appointments,
      tickets: this.tickets,
      callbacks: this.callbacks,
      handoffs: this.handoffs,
      audit: this.audit,
      feedback: this.feedback,
      confirmationSeq: this.confirmationSeq,
      ticketSeq: this.ticketSeq,
      callbackSeq: this.callbackSeq,
    };
  }

  load(data: StoreData) {
    this.sessions = data.sessions ?? [];
    this.appointments = data.appointments ?? [];
    this.tickets = data.tickets ?? [];
    this.callbacks = data.callbacks ?? [];
    this.handoffs = data.handoffs ?? [];
    this.audit = data.audit ?? [];
    this.feedback = data.feedback ?? [];
    this.confirmationSeq = data.confirmationSeq ?? 1000;
    this.ticketSeq = data.ticketSeq ?? 200;
    this.callbackSeq = data.callbackSeq ?? 300;
    for (const session of this.sessions) {
      session.pendingConfirmation ??= null;
      session.offeredSlots ??= [];
    }
  }
}

export function maskAppointment(appointment: Appointment) {
  return { ...appointment, phone: maskPhone(appointment.phone) };
}

export function maskTicket(ticket: RefillTicket) {
  return { ...ticket, phone: maskPhone(ticket.phone) };
}

export function maskCallback(callback: CallbackRequest) {
  return { ...callback, phone: maskPhone(callback.phone) };
}

export function publicSession(session: Session) {
  return {
    id: session.id,
    createdAt: session.createdAt,
    messages: session.messages,
    expecting: session.expecting,
  };
}

export function slotStillOpen(store: ClinicStore, slot: Slot): boolean {
  return !store.takenSlotIds().has(slot.id);
}
