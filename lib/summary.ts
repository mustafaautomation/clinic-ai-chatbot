import type { Session } from "@/lib/types";

export function conversationSummary(session: Session): string {
  const lines = session.messages.slice(-6).map((message) => {
    const text = message.text.replace(/\s+/g, " ").slice(0, 160);
    return `${message.role}: ${text}`;
  });
  const summary = lines.join(" | ");
  return summary.slice(0, 700) || "No transcript text was stored.";
}
