import { randomUUID } from "crypto";
import { handleTurn, type TurnOptions } from "@/lib/engine";
import { llmEnabled, runGroundedToolLoop } from "@/lib/llm";
import { answerFromGuide } from "@/lib/rag";
import { redact, redactDeep } from "@/lib/redact";
import {
  detectEmergency,
  injectionAttempt,
  isFrustrated,
  isMedicalAdvice,
  isOffTopic,
  isSensitive,
  wantsHuman,
} from "@/lib/safety";
import type { ClinicStore } from "@/lib/store";
import type { Citation, Session, ToolTrace, TurnResult } from "@/lib/types";

function hardGuardrail(message: string): boolean {
  return (
    injectionAttempt(message) ||
    Boolean(detectEmergency(message)) ||
    isMedicalAdvice(message) ||
    isOffTopic(message) ||
    isSensitive(message) ||
    wantsHuman(message) ||
    isFrustrated(message)
  );
}

function saveExchange(
  store: ClinicStore,
  session: Session,
  userText: string,
  assistant: {
    text: string;
    citations: Citation[];
    tools: ToolTrace[];
    suggestions: string[];
    emergency: boolean;
    refusal: boolean;
  },
): TurnResult {
  store.addMessage(session, {
    id: randomUUID(),
    role: "user",
    text: redact(userText),
    createdAt: new Date().toISOString(),
  });
  const messageId = randomUUID();
  const text = redact(assistant.text);
  store.addMessage(session, {
    id: messageId,
    role: "assistant",
    text,
    createdAt: new Date().toISOString(),
    citations: assistant.citations,
    tools: redactDeep(assistant.tools) as ToolTrace[],
    suggestions: assistant.suggestions,
    emergency: assistant.emergency,
    refusal: assistant.refusal,
  });
  store.commit();
  return {
    sessionId: session.id,
    messageId,
    text,
    citations: assistant.citations,
    tools: assistant.tools,
    suggestions: assistant.suggestions,
    emergency: assistant.emergency,
    refusal: assistant.refusal,
    handoff: assistant.tools.some((tool) => tool.name === "flag_staff_handoff"),
  };
}

export async function runAgent(
  store: ClinicStore,
  sessionId: string,
  message: string,
  options: TurnOptions = {},
): Promise<TurnResult> {
  const trimmed = message.trim();
  if (!llmEnabled() || hardGuardrail(trimmed) || !answerFromGuide(trimmed)) {
    const likelyAction = /\b(book|appointment|opening|insurance|accept|refill|cancel|reschedul|provider|doctor|specialty|spanish|pediatric)\b/i.test(
      trimmed,
    );
    if (!llmEnabled() || hardGuardrail(trimmed) || !likelyAction) {
      return { ...handleTurn(store, sessionId, trimmed, options), engine: "demo" };
    }
  }
  const session = store.getSession(sessionId);
  if (!session) throw new Error("Unknown session");
  const llm = await runGroundedToolLoop({ store, session, message: trimmed, now: options.now });
  if (!llm) return { ...handleTurn(store, sessionId, trimmed, options), engine: "demo" };
  const grounded = answerFromGuide(trimmed);
  return {
    ...saveExchange(store, session, trimmed, {
    text: llm.text,
    citations: grounded?.citations ?? [],
    tools: llm.tools,
    suggestions: [],
    emergency: false,
    refusal: false,
  }),
    engine: "live",
  };
}
