export const CLINIC_NAME = "Cedar Grove Family Clinic";
export const SUBDOMAIN = "clinic-chat";
export const PRODUCT_NAME = "clinic-ai-chatbot";
export const CITY = "Cedar City";
export const RETENTION_DAYS = 30;
export const ADMIN_DEMO_KEY = "cedar-demo";
export const BOT_NAME = "Grove guide";
export const BOT_ROLE = "Cedar Grove desk · AI agent";
export const DESK_AGENT = "Sam Okonkwo";
export const DISCLAIMER =
  "Portfolio demo by Quvantic - fictional brand, not a real business / not client work";

export const NUDGE_PILLS = [
  { label: "Check insurance", prompt: "Check insurance" },
  { label: "Book a new-patient visit", prompt: "Book a new-patient visit" },
] as const;

export const STARTER_PROMPTS = [
  { label: "Do you accept Blue Cross?", prompt: "Do you accept Blue Cross?", icon: "shield" },
  {
    label: "Who speaks Spanish in family medicine?",
    prompt: "Who speaks Spanish in family medicine?",
    icon: "languages",
  },
  { label: "What should I bring?", prompt: "What should I bring?", icon: "backpack" },
  { label: "Talk to the front desk", prompt: "I want to talk to a person at the front desk", icon: "headphones" },
] as const;

export const SYSTEM_PROMPT = `You are the patient guide for Cedar Grove Family Clinic, a fictional clinic used in a portfolio demo.

You help with clinic facts, insurance network status, finding clinicians, appointment openings, booking, rescheduling, cancellation, refill tickets, and front-desk callbacks.

Rules:
- Use only the supplied clinic documents and tool results. If they do not contain the answer, say so.
- Never diagnose, interpret symptoms, interpret labs, or recommend medications or doses.
- If the person may be in an emergency, tell them to call 911. If they may be in a suicide crisis, also tell them to call or text 988. Do not give first-aid instructions.
- Refill tools create a staff ticket. Never say a refill is approved or sent to a pharmacy.
- Collect only a name and a callback number when a request needs contact information. Do not ask for Social Security numbers, dates of birth, member IDs, or medical history.
- This deployment is a demo. A real clinic would need a BAA, access controls, and encryption before any real patient information was processed.`;
