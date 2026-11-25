const CLINIC_DIGITS = ["5550100140", "5550100141"];

const PHONE =
  /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}|\b\d{3}[\s.-]\d{4}\b/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const MEMBER =
  /\b(?:member|subscriber|policy)\s*(?:id|#|number)?\s*(?:is|:|#)?\s*[A-Z0-9-]{5,}\b/gi;
const ACCOUNT = /\b[A-Z]{2,}\d{4,}\b/g;
const DOB_LABELED =
  /\b(?:dob|date of birth)\s*(?:is|:)?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi;
const LONG_DIGITS = /\b\d{9,16}\b/g;

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskPhone(phone: string): string {
  const d = digits(phone);
  const last4 = d.slice(-4).padStart(4, "•");
  return `(***) ***-${last4}`;
}

export function last4(phone: string): string {
  return digits(phone).slice(-4);
}

function maskPhoneMatch(match: string): string {
  const d = digits(match);
  if (CLINIC_DIGITS.some((n) => d.endsWith(n))) return match;
  return maskPhone(match);
}

export function redact(text: string): string {
  return text
    .replace(EMAIL, "[redacted-email]")
    .replace(SSN, "[redacted-ssn]")
    .replace(DOB_LABELED, "[redacted-dob]")
    .replace(MEMBER, "[redacted-id]")
    .replace(ACCOUNT, "[redacted-id]")
    .replace(PHONE, maskPhoneMatch)
    .replace(LONG_DIGITS, "[redacted-id]");
}

export function findPhone(text: string): string | undefined {
  const patterns = [
    /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/,
    /\b\d{3}[\s.-]\d{4}\b/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const d = digits(match[0]);
    if (CLINIC_DIGITS.some((n) => d.endsWith(n))) continue;
    return match[0];
  }
  return undefined;
}

export function redactDeep(value: unknown): unknown {
  if (typeof value === "string") return redact(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      if (key === "phone" && typeof inner === "string") out[key] = maskPhone(inner);
      else out[key] = redactDeep(inner);
    }
    return out;
  }
  return value;
}

export function excessPhiMention(text: string): boolean {
  return /\b(ssn|social security|date of birth|\bdob\b|member id|subscriber id)\b/i.test(
    text,
  );
}
