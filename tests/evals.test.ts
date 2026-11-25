import { describe, expect, it } from "vitest";
import { runEvals } from "@/lib/evals";

const results = runEvals();

describe("Cedar Grove guide evals", () => {
  it("runs the full suite", () => {
    const failed = results.filter((result) => !result.pass);
    expect(failed.map((result) => `${result.name}: ${result.detail}`)).toEqual([]);
  });

  for (const result of results) {
    it(result.name, () => {
      expect(result.pass, result.detail).toBe(true);
    });
  }
});
