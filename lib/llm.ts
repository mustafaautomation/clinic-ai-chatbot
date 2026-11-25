import { SYSTEM_PROMPT } from "@/lib/brand";
import { answerFromGuide } from "@/lib/rag";
import type { ClinicStore } from "@/lib/store";
import { executeTool, toolDefinitions } from "@/lib/tools";
import type { Session, ToolTrace } from "@/lib/types";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type LlmProvider = {
  name: "groq" | "gemini";
  url: string;
  key: string;
  model: string;
};

export function llmProviders(): LlmProvider[] {
  const providers: LlmProvider[] = [];
  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    });
  }
  if (process.env.GEMINI_API_KEY) {
    providers.push({
      name: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    });
  }
  return providers;
}

export function llmEnabled(): boolean {
  return llmProviders().length > 0;
}

async function complete(provider: LlmProvider, messages: ChatMessage[]): Promise<ChatMessage> {
  const response = await fetch(provider.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.key}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.2,
      messages,
      tools: toolDefinitions,
      tool_choice: "auto",
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`${provider.name} ${response.status}: ${detail}`);
  }
  const json = (await response.json()) as {
    choices?: { message?: ChatMessage }[];
  };
  const message = json.choices?.[0]?.message;
  if (!message) throw new Error(`${provider.name} returned no message`);
  return message;
}

export async function runGroundedToolLoop(input: {
  store: ClinicStore;
  session: Session;
  message: string;
  now?: Date;
}): Promise<{ text: string; tools: ToolTrace[]; provider: string } | null> {
  const providers = llmProviders();
  if (!providers.length) return null;
  const grounded = answerFromGuide(input.message);
  const context = grounded
    ? grounded.citations
        .map((citation, index) => `[${index + 1}] ${citation.title}: ${citation.excerpt}`)
        .join("\n")
    : "No confident passage was retrieved. Do not invent clinic facts. Use tools for schedule and insurance data, or say you do not know.";
  const history: ChatMessage[] = input.session.messages.slice(-8).map((message) => ({
    role: message.role,
    content: message.text,
  }));
  const base: ChatMessage[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}

You are calling tools yourself. Use check_insurance, find_provider, get_available_slots, book_appointment, reschedule_appointment, cancel_appointment, request_refill, and create_callback_request when the patient asks for those actions. Quote only the passages and tool results below. Never invent a confirmation code, a copay, a dose, or a diagnosis. Refill tools never mean the refill is approved.

Retrieved passages:
${context}`,
    },
    ...history,
    { role: "user", content: input.message },
  ];

  let lastError: Error | null = null;
  for (const provider of providers) {
    try {
      const messages = base.map((message) => ({ ...message }));
      const traces: ToolTrace[] = [];
      let text = "";
      for (let step = 0; step < 4; step += 1) {
        const reply = await complete(provider, messages);
        const calls = reply.tool_calls ?? [];
        if (!calls.length) {
          text = reply.content ?? "";
          break;
        }
        messages.push({
          role: "assistant",
          content: reply.content ?? "",
          tool_calls: calls,
        });
        for (const call of calls) {
          let parsed: unknown = {};
          try {
            parsed = JSON.parse(call.function.arguments || "{}");
          } catch {
            parsed = {};
          }
          const execution = executeTool(
            input.store,
            input.session,
            call.function.name,
            parsed,
            input.now,
          );
          traces.push({
            name: execution.name,
            args: execution.args,
            result: execution.result,
            ok: execution.ok,
          });
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(execution.result),
          });
        }
        text = summarizeTools(traces);
      }
      if (!text.trim()) text = summarizeTools(traces);
      return { text, tools: traces, provider: provider.name };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  if (lastError) return null;
  return null;
}

function summarizeTools(traces: ToolTrace[]): string {
  if (!traces.length) return "";
  return traces
    .map((trace) => {
      const result = trace.result as { confirmation_code?: string; note?: string; ticket?: string; status?: string };
      if (result.confirmation_code) return `Confirmation ${result.confirmation_code}.`;
      if (result.ticket) return `Ticket ${result.ticket} is ${result.status ?? "open"} and is not an approval.`;
      if (result.note) return result.note;
      return `${trace.name} completed.`;
    })
    .join(" ");
}
