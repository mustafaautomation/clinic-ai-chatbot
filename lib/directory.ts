import { atClinic, clinicDays, formatSlotLabel } from "@/lib/time";
import type { NetworkStatus, Slot, Specialty, VisitType } from "@/lib/types";

export type Provider = {
  id: string;
  name: string;
  shortName: string;
  credentials: string;
  specialty: Specialty;
  specialtyLabel: string;
  languages: string[];
  campus: "grove" | "river";
  weekdays: number[];
  visitTypes: VisitType[];
  bio: string;
};

export const CAMPUSES = {
  grove: {
    label: "Grove campus",
    address: "418 Cedar Lane, Cedar City",
    phone: "(555) 010-0140",
  },
  river: {
    label: "River campus",
    address: "22 Willow Street, Cedar City",
    phone: "(555) 010-0141",
  },
} as const;

export const PROVIDERS: Provider[] = [
  {
    id: "alvarez",
    name: "Elena Alvarez",
    shortName: "Dr. Alvarez",
    credentials: "MD",
    specialty: "family-medicine",
    specialtyLabel: "Family medicine",
    languages: ["english", "spanish"],
    campus: "grove",
    weekdays: [1, 2, 4, 5],
    visitTypes: ["new_patient", "follow_up", "annual_physical", "telehealth", "vaccine"],
    bio: "Family medicine at the Grove campus. Speaks English and Spanish. Sees new patients, follow-ups, annual visits, vaccines, and video visits.",
  },
  {
    id: "whitaker",
    name: "James Whitaker",
    shortName: "Dr. Whitaker",
    credentials: "DO",
    specialty: "family-medicine",
    specialtyLabel: "Family medicine",
    languages: ["english"],
    campus: "river",
    weekdays: [1, 3, 5],
    visitTypes: ["new_patient", "follow_up", "annual_physical", "vaccine"],
    bio: "Family medicine at the River campus. English-speaking. Sees new patients and same-campus follow-ups.",
  },
  {
    id: "shah",
    name: "Priya Shah",
    shortName: "Dr. Shah",
    credentials: "MD",
    specialty: "pediatrics",
    specialtyLabel: "Pediatrics",
    languages: ["english", "hindi", "gujarati"],
    campus: "grove",
    weekdays: [2, 3, 4],
    visitTypes: ["new_patient", "follow_up", "annual_physical", "vaccine"],
    bio: "Pediatrics at the Grove campus. Speaks English, Hindi, and Gujarati. Well visits and vaccines are scheduled as visits, not advice in chat.",
  },
  {
    id: "hale",
    name: "Marcus Hale",
    shortName: "Dr. Hale",
    credentials: "MD",
    specialty: "internal-medicine",
    specialtyLabel: "Internal medicine",
    languages: ["english"],
    campus: "river",
    weekdays: [1, 2, 3],
    visitTypes: ["new_patient", "follow_up", "annual_physical", "telehealth"],
    bio: "Internal medicine at the River campus for adult primary care.",
  },
  {
    id: "diallo",
    name: "Amina Diallo",
    shortName: "NP Diallo",
    credentials: "NP",
    specialty: "womens-health",
    specialtyLabel: "Women's health",
    languages: ["english", "french"],
    campus: "grove",
    weekdays: [1, 4, 5],
    visitTypes: ["new_patient", "follow_up", "annual_physical", "telehealth"],
    bio: "Women's health at the Grove campus. Speaks English and French.",
  },
  {
    id: "nguyen",
    name: "Sofia Nguyen",
    shortName: "Dr. Nguyen",
    credentials: "MD",
    specialty: "behavioral-health",
    specialtyLabel: "Behavioral health",
    languages: ["english", "vietnamese"],
    campus: "grove",
    weekdays: [2, 3, 4],
    visitTypes: ["new_patient", "follow_up", "telehealth"],
    bio: "Behavioral health visits at the Grove campus and by video. Chat cannot provide counseling.",
  },
  {
    id: "haddad",
    name: "Omar Haddad",
    shortName: "Dr. Haddad",
    credentials: "MD",
    specialty: "cardiology",
    specialtyLabel: "Cardiology",
    languages: ["english", "arabic"],
    campus: "river",
    weekdays: [3],
    visitTypes: ["new_patient", "follow_up"],
    bio: "Visiting cardiology on Wednesdays at the River campus. Speaks English and Arabic. A primary-care clinician usually requests the first visit.",
  },
];

export const SPECIALTY_PATTERNS: { id: Specialty; label: string; patterns: RegExp[] }[] = [
  {
    id: "family-medicine",
    label: "Family medicine",
    patterns: [/family medicine/, /family doctor/, /primary care/, /\bpcp\b/, /family practice/],
  },
  {
    id: "pediatrics",
    label: "Pediatrics",
    patterns: [/pediatric/, /pediatrician/],
  },
  {
    id: "internal-medicine",
    label: "Internal medicine",
    patterns: [/internal medicine/, /internist/],
  },
  {
    id: "womens-health",
    label: "Women's health",
    patterns: [/women's health/, /womens health/, /\bobgyn\b/, /gynecolog/, /ob\/gyn/],
  },
  {
    id: "behavioral-health",
    label: "Behavioral health",
    patterns: [/behavioral health/, /mental health/, /psychiatr/],
  },
  {
    id: "cardiology",
    label: "Cardiology",
    patterns: [/cardiolog/, /heart doctor/],
  },
];

export const LANGUAGES: { id: string; label: string; pattern: RegExp }[] = [
  { id: "spanish", label: "Spanish", pattern: /spanish|español/i },
  { id: "hindi", label: "Hindi", pattern: /hindi/i },
  { id: "gujarati", label: "Gujarati", pattern: /gujarati/i },
  { id: "french", label: "French", pattern: /french/i },
  { id: "vietnamese", label: "Vietnamese", pattern: /vietnamese/i },
  { id: "arabic", label: "Arabic", pattern: /arabic/i },
  { id: "english", label: "English", pattern: /\benglish\b/i },
];

const PLANS: { name: string; network: "in" | "out"; aliases: RegExp[] }[] = [
  {
    name: "Blue Cross Blue Shield",
    network: "in",
    aliases: [/blue\s*cross\s*blue\s*shield/i, /\bbcbs\b/i, /blue\s*cross/i, /\banthem\b/i],
  },
  { name: "Aetna", network: "in", aliases: [/aetna/i] },
  { name: "Cigna", network: "in", aliases: [/cigna/i] },
  {
    name: "UnitedHealthcare",
    network: "in",
    aliases: [/united\s*health/i, /\buhc\b/i, /unitedhealthcare/i],
  },
  { name: "Medicare", network: "in", aliases: [/medicare/i] },
  { name: "Cedar State Medicaid", network: "in", aliases: [/medicaid/i] },
  { name: "Humana", network: "in", aliases: [/humana/i] },
  { name: "Tricare", network: "in", aliases: [/tricare/i] },
  { name: "Kaiser Permanente", network: "out", aliases: [/kaiser/i] },
  { name: "Oscar Health", network: "out", aliases: [/\boscar\b/i] },
  { name: "Ambetter", network: "out", aliases: [/ambetter/i] },
];

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

export function matchProviderName(text: string): Provider | undefined {
  return PROVIDERS.find((provider) => {
    const last = provider.name.split(" ").at(-1)!;
    const pattern = new RegExp(
      `\\b(${provider.name}|${provider.shortName}|${last})\\b`,
      "i",
    );
    return pattern.test(text);
  });
}

export function matchSpecialty(text: string): Specialty | null {
  const lower = text.toLowerCase();
  for (const specialty of SPECIALTY_PATTERNS) {
    if (specialty.patterns.some((pattern) => pattern.test(lower))) return specialty.id;
  }
  return null;
}

export function specialtyLabel(id: Specialty): string {
  return SPECIALTY_PATTERNS.find((item) => item.id === id)?.label ?? id;
}

export function matchLanguage(text: string): string | null {
  for (const language of LANGUAGES) {
    if (language.pattern.test(text)) return language.id;
  }
  return null;
}

export function languageLabel(id: string): string {
  return LANGUAGES.find((language) => language.id === id)?.label ?? id;
}

export function findProviders(specialty: Specialty | null, language: string | null) {
  const pool = PROVIDERS.filter((provider) => !specialty || provider.specialty === specialty);
  if (!language) return { matches: pool, relaxed: false };
  const strict = pool.filter((provider) => provider.languages.includes(language));
  if (strict.length) return { matches: strict, relaxed: false };
  return { matches: pool, relaxed: true };
}

export type InsuranceResult = {
  plan_query: string;
  matched_plan: string | null;
  network: NetworkStatus;
  note: string;
};

export function isSelfPay(text: string): boolean {
  return /\b(self[-\s]?pay|no insurance|uninsured|don't have insurance|do not have insurance|without insurance)\b/i.test(
    text,
  );
}

export function extractPlanQuery(text: string): string | null {
  for (const plan of PLANS) {
    if (plan.aliases.some((alias) => alias.test(text))) return plan.name;
  }
  const named = text.match(
    /\b(?:accept|take|with|have)\s+([A-Z][A-Za-z0-9&'.-]*(?:\s+[A-Z][A-Za-z0-9&'.-]*){0,3})/,
  );
  if (named && !/^(Insurance|A|The|My)$/.test(named[1])) return named[1];
  return null;
}

export function checkInsurance(planName: string): InsuranceResult {
  const query = planName.trim();
  const hit = PLANS.find(
    (plan) =>
      plan.name.toLowerCase() === query.toLowerCase() ||
      plan.aliases.some((alias) => alias.test(query)),
  );
  if (!hit) {
    return {
      plan_query: query,
      matched_plan: null,
      network: "unknown",
      note: "That plan name is not on the synthetic in-network or out-of-network list. The front desk can check benefits. This is not a coverage determination.",
    };
  }
  if (hit.network === "in") {
    return {
      plan_query: query,
      matched_plan: hit.name,
      network: "in",
      note: `${hit.name} is in network at both Cedar Grove campuses. The front desk still verifies benefits before the visit. A plan name is not a coverage quote.`,
    };
  }
  return {
    plan_query: query,
    matched_plan: hit.name,
    network: "out",
    note: `${hit.name} is out of network at Cedar Grove. Self-pay rates are posted in the billing guide. This is not a coverage determination.`,
  };
}

export function acceptedPlanNames(): string[] {
  return PLANS.filter((plan) => plan.network === "in").map((plan) => plan.name);
}

const STARTS: Record<VisitType, [number, number][]> = {
  new_patient: [
    [8, 30],
    [10, 0],
    [11, 30],
    [13, 30],
    [15, 0],
  ],
  annual_physical: [
    [8, 30],
    [10, 0],
    [11, 30],
    [13, 30],
    [15, 0],
  ],
  follow_up: [
    [8, 30],
    [9, 15],
    [10, 0],
    [11, 0],
    [13, 0],
    [14, 0],
    [15, 15],
    [16, 0],
  ],
  vaccine: [
    [9, 0],
    [9, 30],
    [10, 0],
    [15, 0],
    [15, 30],
    [16, 0],
  ],
  telehealth: [
    [8, 0],
    [12, 0],
    [16, 30],
  ],
};

export function visitLabel(visitType: VisitType): string {
  switch (visitType) {
    case "new_patient":
      return "new-patient visit";
    case "follow_up":
      return "follow-up";
    case "annual_physical":
      return "annual visit";
    case "telehealth":
      return "video visit";
    case "vaccine":
      return "vaccine visit";
  }
}

export function inferVisitType(text: string, isNewPatient: boolean): VisitType | null {
  const lower = text.toLowerCase();
  if (/telehealth|video visit|virtual visit/.test(lower)) return "telehealth";
  if (/vaccine visit|flu shot appointment|schedule .*shot|book .*vaccine/.test(lower)) {
    return "vaccine";
  }
  if (/annual|physical|well visit|checkup|check-up/.test(lower)) return "annual_physical";
  if (/follow-?up/.test(lower)) return "follow_up";
  if (/new patient/.test(lower)) return "new_patient";
  if (isNewPatient) return "new_patient";
  return null;
}

export function buildSlots(input: {
  provider: Provider;
  visitType: VisitType;
  now: Date;
  taken: Set<string>;
  weekday?: number | null;
  limit?: number;
}): Slot[] {
  if (!input.provider.visitTypes.includes(input.visitType)) return [];
  const start = new Date(input.now.getTime() + 2 * 60 * 60 * 1000);
  const end = new Date(input.now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const slots: Slot[] = [];
  for (const day of clinicDays(start, end)) {
    if (!input.provider.weekdays.includes(day.weekday)) continue;
    if (input.weekday != null && day.weekday !== input.weekday) continue;
    for (const [hour, minute] of STARTS[input.visitType]) {
      const when = atClinic(day.year, day.month, day.day, hour, minute);
      if (when.getTime() < start.getTime() || when.getTime() > end.getTime()) continue;
      const id = `${input.provider.id}|${when.toISOString()}`;
      if (input.taken.has(id)) continue;
      slots.push({
        id,
        providerId: input.provider.id,
        visitType: input.visitType,
        start: when.toISOString(),
        label: formatSlotLabel(when),
      });
      if (slots.length >= (input.limit ?? 5)) return slots;
    }
  }
  return slots;
}

const CONTROLLED = [
  "oxycodone",
  "hydrocodone",
  "percocet",
  "vicodin",
  "adderall",
  "ritalin",
  "concerta",
  "xanax",
  "alprazolam",
  "valium",
  "diazepam",
  "clonazepam",
  "klonopin",
  "lorazepam",
  "ativan",
  "ambien",
  "zolpidem",
  "tramadol",
  "codeine",
  "morphine",
  "vyvanse",
  "lisdexamfetamine",
];

const ROUTINE = [
  "lisinopril",
  "metformin",
  "atorvastatin",
  "levothyroxine",
  "omeprazole",
  "sertraline",
  "albuterol",
  "amlodipine",
  "losartan",
  "montelukast",
  "synthroid",
  "lipitor",
  "lexapro",
  "escitalopram",
  "gabapentin",
  "prednisone",
  "fluoxetine",
  "metoprolol",
];

export function extractMedication(text: string): { name: string; controlled: boolean } | null {
  const lower = text.toLowerCase();
  for (const name of CONTROLLED) {
    if (lower.includes(name)) return { name, controlled: true };
  }
  for (const name of ROUTINE) {
    if (lower.includes(name)) return { name, controlled: false };
  }
  const captured = text.match(/\brefill(?:\s+\w+){0,3}\s+(?:of|for|on)\s+(?:my\s+)?([a-z][a-z-]{2,})/i);
  if (captured) {
    const name = captured[1].toLowerCase();
    return { name, controlled: CONTROLLED.includes(name) };
  }
  return null;
}

export function isControlled(name: string): boolean {
  return CONTROLLED.includes(name.toLowerCase());
}

export function extractPharmacy(text: string): string | null {
  const match = text.match(
    /\b(?:pharmacy is|pharmacy at|at)\s+(walgreens|cvs|rite aid|walmart|kroger|costco|[A-Z][a-z]+(?:\s+Pharmacy)?)/i,
  );
  return match ? match[1] : null;
}

const NAME_SKIP = new Set([
  "mon",
  "monday",
  "tue",
  "tues",
  "tuesday",
  "wed",
  "wednesday",
  "thu",
  "thur",
  "thurs",
  "thursday",
  "fri",
  "friday",
  "sat",
  "saturday",
  "sun",
  "sunday",
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
  "dr",
  "np",
  "md",
  "do",
  "grove",
  "river",
  "cedar",
  "family",
  "blue",
  "cross",
  "show",
  "book",
  "openings",
]);

function titleCaseName(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function parsePersonName(text: string): string | null {
  const labeled = text.match(
    /\b(?:my name is|this is|i am|i'm|name is)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i,
  );
  if (labeled) {
    const cleaned = labeled[1].replace(/\b(and|at|phone|number)$/i, "").trim();
    return titleCaseName(cleaned);
  }
  const stripped = text
    .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g, " ")
    .replace(/\b\d{3}[\s.-]\d{4}\b/g, " ")
    .replace(/\b(my name is|this is|i'm|i am|please|thanks|thank you|call me|phone|number)\b/gi, " ")
    .replace(/[^A-Za-z\s'-]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  const words = stripped
    .split(" ")
    .filter((word) => /^[A-Za-z][A-Za-z'-]+$/.test(word) && !NAME_SKIP.has(word.toLowerCase()));
  if (!words.length) return null;
  return titleCaseName(words.slice(0, 3).join(" "));
}
