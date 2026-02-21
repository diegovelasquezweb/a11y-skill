import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadConfig, readJson } from "../scripts/a11y-utils.mjs";

vi.mock("node:fs");

describe("a11y-utils", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("loadConfig", () => {
    it("returns defaults when no config file exists", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const config = loadConfig();
      expect(config.maxRoutes).toBe(10);
      expect(config.complianceTarget).toBe("WCAG 2.2 AA");
    });

    it("merges user config with defaults", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ maxRoutes: 50 }),
      );

      const config = loadConfig();
      expect(config.maxRoutes).toBe(50);
      expect(config.complianceTarget).toBe("WCAG 2.2 AA"); // Should stay default
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
