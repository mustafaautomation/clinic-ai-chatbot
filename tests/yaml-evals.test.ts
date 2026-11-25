import { describe, expect, it } from "vitest";
import { runConfigEvals, writeEvalReports } from "@/lib/eval-suite";

const results = runConfigEvals();
writeEvalReports(results);

describe("config-as-code evals", () => {
  it("has at least 20 cases", () => {
    expect(results.length).toBeGreaterThanOrEqual(20);
  });

  for (const result of results) {
    it(result.name, () => {
      expect(result.pass, result.detail).toBe(true);
    });
  }
});
