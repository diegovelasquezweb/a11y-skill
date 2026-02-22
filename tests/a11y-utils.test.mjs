import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { DEFAULTS, readJson, getInternalPath, SKILL_ROOT } from "../scripts/a11y-utils.mjs";

vi.mock("node:fs");

describe("a11y-utils", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("DEFAULTS", () => {
    it("exposes expected default values", () => {
      expect(DEFAULTS.maxRoutes).toBe(10);
      expect(DEFAULTS.crawlDepth).toBe(2);
      expect(DEFAULTS.complianceTarget).toBe("WCAG 2.2 AA");
      expect(DEFAULTS.headless).toBe(true);
      expect(DEFAULTS.waitMs).toBe(2000);
      expect(DEFAULTS.timeoutMs).toBe(30000);
      expect(DEFAULTS.waitUntil).toBe("domcontentloaded");
      expect(DEFAULTS.colorScheme).toBe("light");
      expect(DEFAULTS.viewports).toEqual([{ width: 1280, height: 800, name: "Desktop" }]);
    });
  });

  describe("getInternalPath", () => {
    it("returns path inside SKILL_ROOT/audit/internal", () => {
      const result = getInternalPath("a11y-findings.json");
      expect(result).toBe(path.join(SKILL_ROOT, "audit", "internal", "a11y-findings.json"));
    });
  });

  describe("readJson", () => {
    it("returns null for non-existent files", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(readJson("fake.json")).toBeNull();
    });

    it("returns parsed object for valid JSON", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{"test": true}');
      expect(readJson("valid.json")).toEqual({ test: true });
    });
  });
});
