import fs from "fs";
import path from "path";
import YAML from "yaml";
import { handleTurn, startSession } from "@/lib/engine";
import { ClinicStore } from "@/lib/store";
import type { ToolTrace, TurnResult } from "@/lib/types";

const NOW = new Date("2026-11-25T15:00:00.000Z");

type TurnSpec = {
  user: string;
  includes?: string[];
  excludes?: string[];
  tools?: string[];
  tool_args?: Record<string, Record<string, string>>;
  citation?: string;
  emergency?: boolean;
  refusal?: boolean;
  handoff?: boolean;
  matches?: string;
  has_suggestions?: boolean;
};

type CaseSpec = {
  name: string;
  turns: TurnSpec[];
  phone_absent?: string;
};

export type EvalCaseResult = {
  name: string;
  pass: boolean;
  detail: string;
};

function assert(condition: unknown, detail: string) {
  if (!condition) throw new Error(detail);
}

function checkTurn(spec: TurnSpec, result: TurnResult) {
  for (const needle of spec.includes ?? []) {
    assert(result.text.toLowerCase().includes(needle.toLowerCase()), `Expected “${needle}” in: ${result.text}`);
  }
  for (const needle of spec.excludes ?? []) {
    assert(!result.text.toLowerCase().includes(needle.toLowerCase()), `Did not expect “${needle}” in: ${result.text}`);
  }
  if (spec.tools) {
    const names = result.tools.map((tool) => tool.name);
    for (const tool of spec.tools) assert(names.includes(tool as ToolTrace["name"]), `missing tool ${tool}`);
  }
  if (spec.tool_args) {
    for (const [name, args] of Object.entries(spec.tool_args)) {
      const tool = result.tools.find((item) => item.name === name);
      assert(tool, `missing ${name}`);
      for (const [key, value] of Object.entries(args)) {
        assert(String(tool?.args[key] ?? "") === value, `${name}.${key} was ${String(tool?.args[key])}`);
      }
    }
  }
  if (spec.citation) {
    assert(
      result.citations.some((citation) => citation.slug === spec.citation),
      `missing citation ${spec.citation}`,
    );
  }
  if (spec.emergency !== undefined) assert(result.emergency === spec.emergency, "emergency flag");
  if (spec.refusal !== undefined) assert(result.refusal === spec.refusal, "refusal flag");
  if (spec.handoff !== undefined) assert(result.handoff === spec.handoff, "handoff flag");
  if (spec.matches) assert(new RegExp(spec.matches).test(result.text), `did not match ${spec.matches}`);
  if (spec.has_suggestions) assert(result.suggestions.length > 0, "no suggestions");
}

export function runConfigEvals(): EvalCaseResult[] {
  const file = path.join(process.cwd(), "evals", "cases.yaml");
  const cases = YAML.parse(fs.readFileSync(file, "utf8")) as CaseSpec[];
  return cases.map((spec) => {
    const store = new ClinicStore();
    const session = startSession(store, true);
    let suggestions: string[] = [];
    try {
      for (const turn of spec.turns) {
        const user = turn.user === "{{suggestion}}" ? suggestions[0] : turn.user;
        assert(user, "No suggestion was available for the next turn.");
        const result = handleTurn(store, session.id, user, { now: NOW });
        suggestions = result.suggestions;
        checkTurn(turn, result);
      }
      if (spec.phone_absent) {
        assert(!JSON.stringify(session.messages).includes(spec.phone_absent), "phone leaked into the transcript");
      }
      return { name: spec.name, pass: true, detail: "Passed" };
    } catch (error) {
      return {
        name: spec.name,
        pass: false,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

export function writeEvalReports(results: EvalCaseResult[]) {
  const passed = results.filter((result) => result.pass).length;
  const lines = [
    "# Cedar Grove eval report",
    "",
    "Offline demo engine. Live model keys are not used.",
    "",
    `| Case | Result |`,
    `| --- | --- |`,
    ...results.map((result) => `| ${result.name} | ${result.pass ? "pass" : "fail"} |`),
    "",
    `${passed} passed, ${results.length - passed} failed, ${results.length} total.`,
    "",
  ];
  if (results.some((result) => !result.pass)) {
    lines.push("## Failures", "");
    for (const result of results.filter((item) => !item.pass)) {
      lines.push(`- **${result.name}:** ${result.detail}`);
    }
    lines.push("");
  }
  fs.mkdirSync(path.join(process.cwd(), "docs"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), "evals"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "docs", "eval-report.md"), lines.join("\n"));
  fs.writeFileSync(
    path.join(process.cwd(), "evals", "report.json"),
    JSON.stringify(
      {
        mode: "offline",
        engine: "deterministic",
        passed,
        failed: results.length - passed,
        total: results.length,
        cases: results,
      },
      null,
      2,
    ),
  );
}
