import { z } from "zod";
import {
  CAMPUSES,
  buildSlots,
  checkInsurance,
  extractMedication,
  findProviders,
  getProvider,
  isControlled,
  languageLabel,
  matchLanguage,
  matchProviderName,
  matchSpecialty,
  specialtyLabel,
  visitLabel,
  type Provider,
} from "@/lib/directory";
import { last4 } from "@/lib/redact";
import type { ClinicStore } from "@/lib/store";
import { conversationSummary } from "@/lib/summary";
import type { HandoffCategory, Session, ToolName, VisitType } from "@/lib/types";

const visitTypeSchema = z.enum([
  "new_patient",
  "follow_up",
  "annual_physical",
  "telehealth",
  "vaccine",
]);

export const toolSchemas = {
  find_provider: z.object({
    specialty: z.string().min(2).optional(),
    language: z.string().min(2).optional(),
  }),
  get_available_slots: z.object({
    provider: z.string().min(2),
    visit_type: visitTypeSchema.optional(),
    date_range: z.string().min(2).optional(),
  }),
  book_appointment: z.object({
    provider: z.string().min(2),
    visit_type: visitTypeSchema.optional(),
    slot: z.string().min(2).optional(),
    patient_name: z.string().min(1),
    phone: z.string().min(7),
  }),
  reschedule_appointment: z.object({
    confirmation_code: z.string().regex(/^CG-\d{4}$/i),
    slot: z.string().min(2).optional(),
  }),
  cancel_appointment: z.object({
    confirmation_code: z.string().regex(/^CG-\d{4}$/i),
  }),
  check_insurance: z.object({
    plan_name: z.string().min(2),
  }),
  request_refill: z.object({
    medication: z.string().min(2),
    patient_name: z.string().min(1),
    phone: z.string().min(7),
    pharmacy: z.string().min(2).optional(),
  }),
  create_callback_request: z.object({
    patient_name: z.string().min(1),
    phone: z.string().min(7),
    topic: z.string().min(2),
  }),
  flag_staff_handoff: z.object({
    category: z.enum(["human_request", "frustration", "low_confidence", "sensitive"]),
    summary: z.string().min(2),
  }),
} satisfies Record<ToolName, z.ZodType>;

const jsonSchemas: Record<ToolName, Record<string, unknown>> = {
  find_provider: {
    type: "object",
    properties: {
      specialty: { type: "string", description: "family medicine, pediatrics, internal medicine, women's health, behavioral health, or cardiology" },
      language: { type: "string", description: "spanish, hindi, french, vietnamese, arabic, gujarati, or english" },
    },
  },
  get_available_slots: {
    type: "object",
    properties: {
      provider: { type: "string" },
      visit_type: { type: "string", enum: visitTypeSchema.options },
      date_range: { type: "string" },
    },
    required: ["provider"],
  },
  book_appointment: {
    type: "object",
    properties: {
      provider: { type: "string" },
      visit_type: { type: "string", enum: visitTypeSchema.options },
      slot: { type: "string", description: "A slot label from get_available_slots, or earliest" },
      patient_name: { type: "string" },
      phone: { type: "string" },
    },
    required: ["provider", "patient_name", "phone"],
  },
  reschedule_appointment: {
    type: "object",
    properties: {
      confirmation_code: { type: "string" },
      slot: { type: "string" },
    },
    required: ["confirmation_code"],
  },
  cancel_appointment: {
    type: "object",
    properties: { confirmation_code: { type: "string" } },
    required: ["confirmation_code"],
  },
  check_insurance: {
    type: "object",
    properties: { plan_name: { type: "string" } },
    required: ["plan_name"],
  },
  request_refill: {
    type: "object",
    properties: {
      medication: { type: "string" },
      patient_name: { type: "string" },
      phone: { type: "string" },
      pharmacy: { type: "string" },
    },
    required: ["medication", "patient_name", "phone"],
  },
  create_callback_request: {
    type: "object",
    properties: {
      patient_name: { type: "string" },
      phone: { type: "string" },
      topic: { type: "string" },
    },
    required: ["patient_name", "phone", "topic"],
  },
  flag_staff_handoff: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["human_request", "frustration", "low_confidence", "sensitive"] },
      summary: { type: "string" },
    },
    required: ["category", "summary"],
  },
};

export const toolDefinitions = (Object.keys(toolSchemas) as ToolName[]).map((name) => ({
  type: "function" as const,
  function: {
    name,
    description: descriptionFor(name),
    parameters: jsonSchemas[name],
  },
}));

function descriptionFor(name: ToolName): string {
  switch (name) {
    case "find_provider":
      return "Search the Cedar Grove clinician directory by specialty and language.";
    case "get_available_slots":
      return "List open appointment times for one clinician. Does not book.";
    case "book_appointment":
      return "Book a synthetic visit. Requires a name and callback number. Never ask for a member ID or date of birth.";
    case "reschedule_appointment":
      return "Move an existing CG- confirmation to another open time.";
    case "cancel_appointment":
      return "Cancel a visit by confirmation code.";
    case "check_insurance":
      return "Check whether a plan name is in network, out of network, or unknown. This is not a benefit quote.";
    case "request_refill":
      return "Open a refill ticket for staff review. This never approves a refill or contacts a pharmacy.";
    case "create_callback_request":
      return "Ask the front desk to call. Not for emergencies.";
    case "flag_staff_handoff":
      return "Hand the conversation to a person when you cannot answer from the guide or the patient asked for a human.";
  }
}

function resolveProvider(name: string): Provider | undefined {
  return (
    matchProviderName(name) ??
    PROVIDERS_BY_HINT(name)
  );
}

function PROVIDERS_BY_HINT(name: string): Provider | undefined {
  const specialty = matchSpecialty(name);
  if (!specialty) return undefined;
  return findProviders(specialty, null).matches[0];
}

function resolveVisit(value: string | undefined, session: Session): VisitType {
  const parsed = visitTypeSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  return session.visitType ?? (session.isNewPatient ? "new_patient" : "follow_up");
}

export type ToolExecution = {
  name: ToolName;
  args: Record<string, unknown>;
  result: unknown;
  ok: boolean;
};

export function executeTool(
  store: ClinicStore,
  session: Session,
  name: string,
  rawArgs: unknown,
  now = new Date(),
): ToolExecution {
  const toolName = name as ToolName;
  const schema = toolSchemas[toolName];
  if (!schema) {
    return { name: "flag_staff_handoff", args: {}, result: { error: "Unknown tool" }, ok: false };
  }
  const parsed = schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    return {
      name: toolName,
      args: (rawArgs ?? {}) as Record<string, unknown>,
      result: { error: "Invalid arguments", issues: parsed.error.issues.map((issue) => issue.message) },
      ok: false,
    };
  }
  const args = parsed.data as Record<string, unknown>;
  const result = runTool(store, session, toolName, args, now);
  return { name: toolName, args, result, ok: !isError(result) };
}

function isError(result: unknown): boolean {
  return Boolean(result && typeof result === "object" && "error" in result);
}

function runTool(
  store: ClinicStore,
  session: Session,
  name: ToolName,
  args: Record<string, unknown>,
  now: Date,
): unknown {
  if (name === "check_insurance") {
    const plan = String(args.plan_name);
    const result = checkInsurance(plan);
    session.insurancePlan = result.matched_plan ?? plan;
    session.insuranceNetwork = result.network;
    store.addAudit({
      actor: "guide",
      action: "insurance_check",
      resource: result.matched_plan ?? "unknown-plan",
      detail: `Network status ${result.network}. Member ID was not collected.`,
      sessionId: session.id,
    });
    return result;
  }

  if (name === "find_provider") {
    const specialty = args.specialty ? matchSpecialty(String(args.specialty)) : session.specialty;
    const language = args.language ? matchLanguage(String(args.language)) ?? String(args.language).toLowerCase() : session.language;
    if (specialty) session.specialty = specialty;
    if (language) session.language = language;
    const found = findProviders(specialty, language);
    if (found.matches.length === 1) session.providerId = found.matches[0].id;
    store.addAudit({
      actor: "guide",
      action: "directory_read",
      resource: specialty ?? "any",
      detail: `Directory search returned ${found.matches.length} clinicians.`,
      sessionId: session.id,
    });
    return {
      relaxed: found.relaxed,
      providers: found.matches.map((provider) => ({
        id: provider.id,
        name: `${provider.shortName}, ${provider.credentials}`,
        specialty: provider.specialtyLabel,
        languages: provider.languages.map(languageLabel),
        campus: CAMPUSES[provider.campus].label,
      })),
    };
  }

  if (name === "get_available_slots") {
    const provider = resolveProvider(String(args.provider));
    if (!provider) return { error: "No clinician matches that name." };
    const visitType = resolveVisit(args.visit_type as string | undefined, session);
    if (!provider.visitTypes.includes(visitType)) {
      return { error: `${provider.shortName} does not offer ${visitLabel(visitType)}.` };
    }
    const slots = buildSlots({
      provider,
      visitType,
      now,
      taken: store.takenSlotIds(),
      limit: 5,
    });
    session.providerId = provider.id;
    session.visitType = visitType;
    session.offeredSlots = slots;
    store.addAudit({
      actor: "guide",
      action: "schedule_read",
      resource: provider.id,
      detail: `Read ${slots.length} open ${visitType} slots.`,
      sessionId: session.id,
    });
    return { provider: provider.shortName, visit_type: visitType, slots: slots.map((slot) => ({ id: slot.id, label: slot.label })) };
  }

  if (name === "book_appointment") {
    const provider = resolveProvider(String(args.provider));
    if (!provider) return { error: "No clinician matches that name." };
    const visitType = resolveVisit(args.visit_type as string | undefined, session);
    const slots = buildSlots({
      provider,
      visitType,
      now,
      taken: store.takenSlotIds(),
      limit: 6,
    });
    const requested = String(args.slot ?? "earliest");
    const slot =
      /earliest|first|soonest/i.test(requested)
        ? slots[0]
        : slots.find((item) => requested.toLowerCase().includes(item.label.toLowerCase()) || item.label.toLowerCase().includes(requested.toLowerCase()));
    if (!slot) return { error: "No open time matched.", openings: slots.map((item) => item.label) };
    const phone = String(args.phone);
    const appointment = store.book({
      providerId: provider.id,
      visitType,
      slotId: slot.id,
      start: slot.start,
      label: slot.label,
      patientName: String(args.patient_name),
      phone,
      isNewPatient: session.isNewPatient || visitType === "new_patient",
      insurancePlan: session.insurancePlan,
    });
    session.lastConfirmation = appointment.confirmationCode;
    session.providerId = provider.id;
    store.addAudit({
      actor: "guide",
      action: "appointment_write",
      resource: appointment.confirmationCode,
      detail: `Booked ${provider.shortName} at ${slot.label}. Phone stored on the appointment only.`,
      sessionId: session.id,
    });
    const campus = CAMPUSES[provider.campus];
    return {
      confirmation_code: appointment.confirmationCode,
      provider: provider.shortName,
      when: slot.label,
      campus: `${campus.label}, ${campus.address}`,
      phone_last4: last4(phone),
      status: "booked",
      approved_clinically: false,
    };
  }

  if (name === "cancel_appointment") {
    const code = String(args.confirmation_code);
    const appointment = store.findAppointment(code);
    if (!appointment || appointment.status !== "booked") return { error: `No active visit for ${code}.` };
    appointment.status = "cancelled";
    store.addAudit({
      actor: "guide",
      action: "appointment_cancel",
      resource: appointment.confirmationCode,
      detail: "Cancelled a synthetic appointment.",
      sessionId: session.id,
    });
    return { confirmation_code: appointment.confirmationCode, status: "cancelled" };
  }

  if (name === "reschedule_appointment") {
    const code = String(args.confirmation_code);
    const appointment = store.findAppointment(code);
    if (!appointment || appointment.status !== "booked") return { error: `No active visit for ${code}.` };
    const provider = getProvider(appointment.providerId);
    if (!provider) return { error: "Clinician missing." };
    const slots = buildSlots({
      provider,
      visitType: appointment.visitType,
      now,
      taken: store.takenSlotIds(),
      limit: 5,
    }).filter((slot) => slot.id !== appointment.slotId);
    const requested = String(args.slot ?? "earliest");
    const slot = /earliest|first|soonest/i.test(requested)
      ? slots[0]
      : slots.find((item) => item.label.toLowerCase().includes(requested.toLowerCase()));
    if (!slot) return { error: "No alternate time matched.", openings: slots.map((item) => item.label) };
    const previous = appointment.label;
    appointment.slotId = slot.id;
    appointment.start = slot.start;
    appointment.label = slot.label;
    store.addAudit({
      actor: "guide",
      action: "appointment_reschedule",
      resource: appointment.confirmationCode,
      detail: `Moved ${previous} to ${slot.label}.`,
      sessionId: session.id,
    });
    return { confirmation_code: appointment.confirmationCode, when: slot.label, status: "booked" };
  }

  if (name === "request_refill") {
    const medication = String(args.medication);
    const extracted = extractMedication(medication);
    const controlled = extracted?.controlled ?? isControlled(medication);
    const ticket = store.addTicket({
      patientName: String(args.patient_name),
      phone: String(args.phone),
      medication: extracted?.name ?? medication,
      pharmacy: args.pharmacy ? String(args.pharmacy) : null,
      controlled,
    });
    store.addAudit({
      actor: "guide",
      action: "refill_ticket_create",
      resource: ticket.ticketNumber,
      detail: `Opened a refill ticket. Approved=false. Controlled=${controlled}.`,
      sessionId: session.id,
    });
    return {
      ticket: ticket.ticketNumber,
      status: ticket.status,
      approved: false,
      sent_to_pharmacy: false,
      controlled,
      phone_last4: last4(String(args.phone)),
    };
  }

  if (name === "create_callback_request") {
    const callback = store.addCallback({
      patientName: String(args.patient_name),
      phone: String(args.phone),
      topic: String(args.topic).slice(0, 160),
    });
    store.addAudit({
      actor: "guide",
      action: "callback_create",
      resource: callback.ticketNumber,
      detail: "Created a front-desk callback. Phone stored on the ticket only.",
      sessionId: session.id,
    });
    return { ticket: callback.ticketNumber, status: "open", phone_last4: last4(String(args.phone)) };
  }

  const category = String(args.category) as HandoffCategory;
  const summary = String(args.summary || conversationSummary(session)).slice(0, 700);
  store.addHandoff({
    sessionId: session.id,
    category,
    note: "Model requested a staff handoff.",
    summary,
  });
  store.addAudit({
    actor: "guide",
    action: "staff_handoff",
    resource: category,
    detail: "Model flagged a staff handoff.",
    sessionId: session.id,
  });
  return { status: "flagged", category };
}

export function specialtyHint(text: string): string | null {
  const specialty = matchSpecialty(text);
  return specialty ? specialtyLabel(specialty) : null;
}
