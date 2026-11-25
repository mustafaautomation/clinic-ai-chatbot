import { SYSTEM_PROMPT } from "@/lib/brand";

export async function maybeRewrite(text: string, locked: boolean): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || locked) return text;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\nRewrite the draft so it sounds like a calm front-desk guide. Do not add facts, clinic services, doses, diagnoses, or approvals. Keep every confirmation code, ticket number, time, address, and phone ending exactly as written.`,
          },
          { role: "user", content: text },
        ],
      }),
    });
    if (!response.ok) return text;
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const next = json.choices?.[0]?.message?.content?.trim();
    if (!next) return text;
    const codes = text.match(/\b(?:CG|RF|CB)-\d+\b/g) ?? [];
    if (codes.some((code) => !next.includes(code))) return text;
    return next;
  } catch {
    return text;
  }
}
