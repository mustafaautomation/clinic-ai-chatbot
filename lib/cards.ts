import { z } from "zod";
import type { ToolTrace } from "@/lib/types";

const insuranceSchema = z.object({
  plan_query: z.string().optional(),
  matched_plan: z.string().nullable().optional(),
  network: z.enum(["in", "out", "unknown", "self_pay"]).optional(),
  note: z.string().optional(),
});

const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialty: z.string(),
  languages: z.array(z.string()),
  campus: z.string(),
});

const providersSchema = z.object({
  providers: z.array(providerSchema),
});

const slotsSchema = z.object({
  provider: z.string().optional(),
  visit_type: z.string().optional(),
  slots: z.array(z.object({ id: z.string(), label: z.string() })),
});

const bookSchema = z.object({
  confirmation_code: z.string(),
  provider: z.string(),
  when: z.string(),
  campus: z.string(),
  status: z.string().optional(),
});

const refillSchema = z.object({
  ticket: z.string(),
  status: z.string(),
  approved: z.boolean().optional(),
  controlled: z.boolean().optional(),
});

const callbackSchema = z.object({
  ticket: z.string(),
  status: z.string(),
});

export type PlanCardModel = {
  kind: "plan";
  plan: string;
  network: string;
  note: string;
};

export type ProviderCardModel = {
  kind: "providers";
  providers: z.infer<typeof providerSchema>[];
};

export type SlotCardModel = {
  kind: "slots";
  provider: string;
  visit: string;
  slots: { id: string; label: string }[];
};

export type ConfirmCardModel = {
  kind: "confirm";
  code: string;
  when: string;
  where: string;
  who: string;
  title: string;
};

export type FormCardModel = {
  kind: "form";
  purpose: "visit" | "callback";
};

export type TimelineCardModel = {
  kind: "timeline";
  ticket: string;
  status: string;
  title: string;
  controlled: boolean;
};

export type SafetyCardModel = {
  kind: "safety";
  crisis: boolean;
};

export type HandoffCardModel = {
  kind: "handoff";
  ticketId: string | null;
};

export type ChecklistCardModel = {
  kind: "checklist";
  items: string[];
};

export type RichCard =
  | PlanCardModel
  | ProviderCardModel
  | SlotCardModel
  | ConfirmCardModel
  | FormCardModel
  | TimelineCardModel
  | SafetyCardModel
  | HandoffCardModel
  | ChecklistCardModel;

function resultOf(tool: ToolTrace | undefined): unknown {
  return tool?.ok ? tool.result : undefined;
}

export function cardsFromTurn(input: {
  tools?: ToolTrace[];
  text: string;
  emergency?: boolean;
  handoff?: boolean;
  handoffId?: string | null;
}): RichCard[] {
  const tools = input.tools ?? [];
  const cards: RichCard[] = [];
  if (input.emergency) {
    cards.push({
      kind: "safety",
      crisis: /988|suicid|crisis/i.test(input.text),
    });
  }

  const insurance = insuranceSchema.safeParse(resultOf(tools.find((tool) => tool.name === "check_insurance")));
  if (insurance.success && insurance.data.network) {
    const network = insurance.data.network;
    cards.push({
      kind: "plan",
      plan: insurance.data.matched_plan || insurance.data.plan_query || "Plan name",
      network:
        network === "in" ? "In network" : network === "out" ? "Out of network" : network === "self_pay" ? "Self-pay" : "Needs a desk check",
      note: insurance.data.note || "The front desk still verifies benefits. This is not a coverage determination.",
    });
  }

  const providers = providersSchema.safeParse(resultOf(tools.find((tool) => tool.name === "find_provider")));
  if (providers.success && providers.data.providers.length) {
    cards.push({ kind: "providers", providers: providers.data.providers });
  }

  const slotTool = tools.find((tool) => tool.name === "get_available_slots");
  const slots = slotsSchema.safeParse(resultOf(slotTool));
  if (slots.success && slots.data.slots.length) {
    cards.push({
      kind: "slots",
      provider: slots.data.provider || String(slotTool?.args.provider ?? "Clinician"),
      visit: (slots.data.visit_type || String(slotTool?.args.visit_type ?? "visit")).replaceAll("_", " "),
      slots: slots.data.slots,
    });
  }

  const booked = bookSchema.safeParse(resultOf(tools.find((tool) => tool.name === "book_appointment")));
  if (booked.success) {
    cards.push({
      kind: "confirm",
      code: booked.data.confirmation_code,
      when: booked.data.when,
      where: booked.data.campus,
      who: booked.data.provider,
      title: "You're booked",
    });
  }

  const refill = refillSchema.safeParse(resultOf(tools.find((tool) => tool.name === "request_refill")));
  if (refill.success) {
    cards.push({
      kind: "timeline",
      ticket: refill.data.ticket,
      status: "Needs review",
      title: "Refill ticket",
      controlled: Boolean(refill.data.controlled),
    });
  }

  const callback = callbackSchema.safeParse(resultOf(tools.find((tool) => tool.name === "create_callback_request")));
  if (callback.success) {
    cards.push({
      kind: "confirm",
      code: callback.data.ticket,
      when: "Front desk callback",
      where: "Grove desk",
      who: "Front desk",
      title: "Ticket opened",
    });
  }

  const needsContact =
    /callback number/i.test(input.text) &&
    !booked.success &&
    !callback.success &&
    !refill.success;
  if (needsContact) {
    cards.push({ kind: "form", purpose: /refill/i.test(input.text) ? "callback" : "visit" });
  }

  if (/bring|medication list|photo id/i.test(input.text)) {
    cards.push({
      kind: "checklist",
      items: ["Photo ID", "Insurance card", "Medication list"],
    });
  }

  if (input.handoff) {
    cards.push({ kind: "handoff", ticketId: input.handoffId ?? null });
  }

  return cards;
}

export function phaseForTools(tools: { name: string }[], emergency: boolean): string {
  if (emergency) return "Checking safety rules…";
  const name = tools.at(-1)?.name;
  switch (name) {
    case "check_insurance":
      return "Checking the plan list…";
    case "find_provider":
      return "Matching clinicians…";
    case "get_available_slots":
      return "Checking the calendar…";
    case "book_appointment":
      return "Reserving that visit…";
    case "request_refill":
      return "Opening a refill ticket…";
    case "create_callback_request":
      return "Writing the callback…";
    case "flag_staff_handoff":
      return "Connecting you with the desk…";
    default:
      return "Looking in the patient guide…";
  }
}
