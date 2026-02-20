import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Note: Intelligence mapping is loaded at module level in run-analyzer.mjs
// We mock the filesystem BEFORE importing the analyzer logic if possible,
// OR we test the logic assuming the environment is set up.

describe("run-analyzer", () => {
  // We will test the logic by mocking the inputs to the core processing functions
  // Since run-analyzer is a CLI script, we'd ideally export the logic functions.
  // For now, let's verify that the intelligence mappings are correctly structured.

  it("verifies that assets/intelligence.json matches the expected schema", () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const intelligence = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../assets/intelligence.json"),
        "utf-8",
      ),
    );

    expect(intelligence).toHaveProperty("apgPatterns");
    expect(intelligence).toHaveProperty("a11ySupport");
    expect(intelligence).toHaveProperty("inclusiveComponents");

    // Check a couple of critical mappings
    expect(intelligence.apgPatterns.dialog).toContain(
      "apg/patterns/dialogmodal",
    );
    expect(intelligence.inclusiveComponents.tab).toContain("tabbed-interfaces");
  });
});
