import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.CEDAR_ADMIN_SECRET || "cedar-grove-demo-secret";
export const ADMIN_COOKIE = "cg_desk";

export function expectedAdminKey(): string {
  return process.env.CEDAR_ADMIN_KEY || "cedar-demo";
}

export function adminKeyMatches(key: string): boolean {
  const given = Buffer.from(key);
  const expected = Buffer.from(expectedAdminKey());
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

export function signAdminToken(now = Date.now()): string {
  const exp = now + 12 * 60 * 60 * 1000;
  const sig = createHmac("sha256", SECRET).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyAdminToken(token?: string | null, now = Date.now()): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < now) return false;
  const expected = createHmac("sha256", SECRET).update(exp).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
