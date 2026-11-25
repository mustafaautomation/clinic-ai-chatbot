import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { ClinicStore } from "@/lib/store";
import { startSession } from "@/lib/engine";
import { executeTool } from "@/lib/tools";
import { llmProviders } from "@/lib/llm";
import { writeStoreSnapshot } from "@/lib/persist";

describe("zod tool validation", () => {
  it("rejects a booking without a phone number", () => {
    const store = new ClinicStore();
    const session = startSession(store, true);
    const result = executeTool(store, session, "book_appointment", {
      provider: "Dr. Alvarez",
      patient_name: "Jordan",
      phone: "12",
    });
    expect(result.ok).toBe(false);
    expect(store.appointments).toHaveLength(0);
  });

  it("checks insurance through the validated tool", () => {
    const store = new ClinicStore();
    const session = startSession(store, true);
    const result = executeTool(store, session, "check_insurance", { plan_name: "Aetna" });
    expect(result.ok).toBe(true);
    expect(result.result).toMatchObject({ network: "in", matched_plan: "Aetna" });
  });
});

describe("serverless store", () => {
  it("keeps memory when the snapshot path is not writable", () => {
    const store = new ClinicStore();
    store.addAudit({
      actor: "system",
      action: "seed_demo",
      resource: "synthetic",
      detail: "memory only",
    });
    const blocker = path.join(os.tmpdir(), `clinic-not-a-dir-${process.pid}`);
    fs.writeFileSync(blocker, "not a directory");
    expect(writeStoreSnapshot(path.join(blocker, "store.json"), store)).toBe(false);
    fs.unlinkSync(blocker);
    expect(store.audit).toHaveLength(1);
  });
});

describe("model provider order", () => {
  it("prefers Groq and then Gemini", () => {
    const previous = {
      groq: process.env.GROQ_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
    };
    process.env.GROQ_API_KEY = "test-groq";
    process.env.GEMINI_API_KEY = "test-gemini";
    const names = llmProviders().map((provider) => provider.name);
    expect(names).toEqual(["groq", "gemini"]);
    expect(llmProviders()[0]?.model).toBe("llama-3.3-70b-versatile");
    expect(llmProviders()[1]?.model).toBe("gemini-2.0-flash");
    if (previous.groq === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous.groq;
    if (previous.gemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous.gemini;
  });
});
