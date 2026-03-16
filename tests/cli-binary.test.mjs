/**
 * @file cli-binary.test.mjs
 * @description Verifies that the a11y-audit CLI binary is available and responds to --help.
 */

import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.join(__dirname, "..");

describe("a11y-audit CLI", () => {
  it("is accessible via npx from the skill directory", () => {
    const output = execSync("npx a11y-audit --help", {
      cwd: SKILL_ROOT,
      encoding: "utf-8",
      timeout: 30000,
    });

    expect(output).toContain("--base-url");
    expect(output).toContain("--max-routes");
  });

  it("shows required flags in help output", () => {
    const output = execSync("npx a11y-audit --help", {
      cwd: SKILL_ROOT,
      encoding: "utf-8",
      timeout: 30000,
    });

    expect(output).toContain("--project-dir");
    expect(output).toContain("--framework");
    expect(output).toContain("--with-reports");
    expect(output).toContain("--affected-only");
    expect(output).toContain("--skip-patterns");
  });

  it("exits with error when --base-url is missing", () => {
    expect(() => {
      execSync("npx a11y-audit", {
        cwd: SKILL_ROOT,
        encoding: "utf-8",
        timeout: 30000,
        stdio: "pipe",
      });
    }).toThrow();
  });
});
