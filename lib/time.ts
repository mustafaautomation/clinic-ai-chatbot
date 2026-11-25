export const CLINIC_TZ = "America/Chicago";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const list = fmt.formatToParts(date);
  const get = (type: string) => list.find((part) => part.type === type)?.value ?? "";
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
    weekdayShort: get("weekday"),
    hour,
    minute: Number(get("minute")),
  };
}

export function clinicParts(date: Date) {
  const p = parts(date);
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TZ,
    month: "short",
  }).format(date);
  return { ...p, month };
}

export function formatSlotLabel(date: Date): string {
  const p = clinicParts(date);
  const ap = p.hour >= 12 ? "p.m." : "a.m.";
  let hour = p.hour % 12;
  if (hour === 0) hour = 12;
  const minute = p.minute.toString().padStart(2, "0");
  return `${p.weekdayShort}, ${p.month} ${p.day}, ${hour}:${minute} ${ap}`;
}

export function atClinic(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const p = parts(guess);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const offset = asUtc - guess.getTime();
  return new Date(guess.getTime() - offset);
}

export function clinicDays(start: Date, end: Date) {
  const days: { year: number; month: number; day: number; weekday: number }[] = [];
  const cursor = new Date(start);
  cursor.setUTCHours(18, 0, 0, 0);
  const seen = new Set<string>();
  while (cursor.getTime() <= end.getTime() + 36 * 60 * 60 * 1000) {
    const p = parts(cursor);
    const key = `${p.year}-${p.month}-${p.day}`;
    if (!seen.has(key)) {
      seen.add(key);
      days.push({
        year: p.year,
        month: p.month,
        day: p.day,
        weekday: p.weekday,
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (days.length > 40) break;
  }
  return days;
}

const WEEKDAYS: { n: number; re: RegExp }[] = [
  { n: 0, re: /\b(sun|sunday)\b/i },
  { n: 1, re: /\b(mon|monday)\b/i },
  { n: 2, re: /\b(tue|tues|tuesday)\b/i },
  { n: 3, re: /\b(wed|wednesday)\b/i },
  { n: 4, re: /\b(thu|thur|thurs|thursday)\b/i },
  { n: 5, re: /\b(fri|friday)\b/i },
  { n: 6, re: /\b(sat|saturday)\b/i },
];

export function mentionedWeekday(text: string): number | null {
  for (const day of WEEKDAYS) {
    if (day.re.test(text)) return day.n;
  }
  return null;
}

export function parseTime(text: string): { hour: number; minute: number } | null {
  const clock = text.match(/\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)\b/i);
  const hourOnly = text.match(/\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)\b/i);
  const match = clock ?? hourOnly;
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = clock ? Number(clock[2]) : 0;
  const ap = (clock ? match[3] : match[2])?.toLowerCase() ?? "";
  if (ap.startsWith("p") && hour < 12) hour += 12;
  if (ap.startsWith("a") && hour === 12) hour = 0;
  return { hour, minute };
}
