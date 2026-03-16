/**
 * @file engine-integration.test.mjs
 * @description Verifies that @diegovelasquezweb/a11y-engine is correctly
 * integrated and its public API is accessible from the skill.
 */

import { describe, it, expect } from "vitest";

describe("Engine exports", () => {
  it("exports all required public API functions", async () => {
    const engine = await import("@diegovelasquezweb/a11y-engine");

    expect(typeof engine.runAudit).toBe("function");
    expect(typeof engine.getFindings).toBe("function");
    expect(typeof engine.getOverview).toBe("function");
    expect(typeof engine.getPDFReport).toBe("function");
    expect(typeof engine.getHTMLReport).toBe("function");
    expect(typeof engine.getChecklist).toBe("function");
    expect(typeof engine.getRemediationGuide).toBe("function");
    expect(typeof engine.getSourcePatterns).toBe("function");
    expect(typeof engine.getKnowledge).toBe("function");
  });

  it("exports VIEWPORT_PRESETS as an array", async () => {
    const { VIEWPORT_PRESETS } = await import("@diegovelasquezweb/a11y-engine");

    expect(Array.isArray(VIEWPORT_PRESETS)).toBe(true);
    expect(VIEWPORT_PRESETS.length).toBeGreaterThanOrEqual(3);
    expect(VIEWPORT_PRESETS[0]).toHaveProperty("label");
    expect(VIEWPORT_PRESETS[0]).toHaveProperty("width");
    expect(VIEWPORT_PRESETS[0]).toHaveProperty("height");
  });

  it("exports DEFAULT_AI_SYSTEM_PROMPT as a string", async () => {
    const { DEFAULT_AI_SYSTEM_PROMPT } = await import("@diegovelasquezweb/a11y-engine");

    expect(typeof DEFAULT_AI_SYSTEM_PROMPT).toBe("string");
    expect(DEFAULT_AI_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });
});
