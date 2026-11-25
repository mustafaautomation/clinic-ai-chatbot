export type Specialty =
  | "family-medicine"
  | "pediatrics"
  | "internal-medicine"
  | "womens-health"
  | "behavioral-health"
  | "cardiology";

export type VisitType =
  | "new_patient"
  | "follow_up"
  | "annual_physical"
  | "telehealth"
  | "vaccine";

export type NetworkStatus = "in" | "out" | "unknown" | "self_pay";

export type ToolName =
  | "find_provider"
  | "get_available_slots"
  | "book_appointment"
  | "reschedule_appointment"
  | "cancel_appointment"
  | "check_insurance"
  | "request_refill"
  | "create_callback_request"
  | "flag_staff_handoff";

export type Citation = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
};

export type ToolTrace = {
  name: ToolName;
  args: Record<string, unknown>;
  result: unknown;
  ok: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  citations?: Citation[];
  tools?: ToolTrace[];
  suggestions?: string[];
  emergency?: boolean;
  refusal?: boolean;
  feedback?: "up" | "down";
};

export type Expecting =
  | "specialty"
  | "provider"
  | "slots"
  | "slot"
  | "contact"
  | "refill"
  | "callback"
  | null;

export type Channel = "web" | "widget" | "whatsapp" | "messenger";

export type Session = {
  id: string;
  createdAt: string;
  consent: boolean;
  channel: Channel;
  externalKey: string | null;
  messages: ChatMessage[];
  expecting: Expecting;
  isNewPatient: boolean;
  insurancePlan: string | null;
  insuranceNetwork: NetworkStatus | null;
  specialty: Specialty | null;
  language: string | null;
  providerId: string | null;
  visitType: VisitType | null;
  offeredSlots: Slot[];
  pendingSlotId: string | null;
  pendingMedication: string | null;
  pendingPharmacy: string | null;
  controlledSubstance: boolean;
  lastConfirmation: string | null;
  pendingConfirmation: string | null;
};

export type Slot = {
  id: string;
  providerId: string;
  visitType: VisitType;
  start: string;
  label: string;
};

export type Appointment = {
  id: string;
  confirmationCode: string;
  providerId: string;
  visitType: VisitType;
  slotId: string;
  start: string;
  label: string;
  patientName: string;
  phone: string;
  isNewPatient: boolean;
  insurancePlan: string | null;
  status: "booked" | "cancelled";
  createdAt: string;
  synthetic: true;
};

export type RefillTicket = {
  id: string;
  ticketNumber: string;
  patientName: string;
  phone: string;
  medication: string;
  pharmacy: string | null;
  controlled: boolean;
  status: "pending_clinician_review" | "in_review";
  createdAt: string;
  synthetic: true;
};

export type CallbackRequest = {
  id: string;
  ticketNumber: string;
  patientName: string;
  phone: string;
  topic: string;
  createdAt: string;
  status: "open";
  synthetic: true;
};

export type HandoffCategory =
  | "emergency_medical"
  | "emergency_crisis"
  | "human_request"
  | "frustration"
  | "low_confidence"
  | "sensitive";

export type Handoff = {
  id: string;
  sessionId: string;
  category: HandoffCategory;
  createdAt: string;
  status: "flagged";
  note: string;
  summary: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: "guide" | "patient" | "admin" | "system";
  action: string;
  resource: string;
  detail: string;
  sessionId?: string;
};

export type Feedback = {
  id: string;
  at: string;
  sessionId: string;
  messageId: string;
  rating: "up" | "down";
};

export type TurnResult = {
  sessionId: string;
  messageId: string;
  text: string;
  citations: Citation[];
  tools: ToolTrace[];
  suggestions: string[];
  emergency: boolean;
  refusal: boolean;
  handoff: boolean;
};
