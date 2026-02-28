import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseExtensions,
  makeFindingId,
  isConfirmedByContext,
  scanPattern,
} from "../scripts/pattern-scanner.mjs";

const BASE_PATTERN = {
  id: "placeholder-only-label",
  title: "Input uses placeholder as its only label",
  severity: "Critical",
  wcag: "WCAG 1.3.1 / 4.1.2 A",
  wcag_criterion: "1.3.1",
  wcag_level: "A",
  type: "structural",
  fix_description: "Add an explicit label.",
  requires_manual_verification: true,
  regex: "<input[^/\\n>]*\\bplaceholder=",
  globs: ["**/*.tsx"],
  context_reject_regex: "aria-label|aria-labelledby",
  context_window: 5,
};

describe("parseExtensions", () => {
  it("extracts extensions from standard glob patterns", () => {
    const exts = parseExtensions(["**/*.tsx", "**/*.jsx", "**/*.html"]);
    expect(exts.has(".tsx")).toBe(true);
    expect(exts.has(".jsx")).toBe(true);
    expect(exts.has(".html")).toBe(true);
  });

  it("returns an empty set for malformed globs", () => {
    const exts = parseExtensions(["**/*", "src/", ""]);
    expect(exts.size).toBe(0);
  });

  it("handles an empty array", () => {
    expect(parseExtensions([]).size).toBe(0);
  });
});

describe("makeFindingId", () => {
  it("returns a PAT-xxxxxx stable ID", () => {
    const id = makeFindingId("placeholder-only-label", "src/Form.tsx", 10);
    expect(id).toMatch(/^PAT-[a-f0-9]{6}$/);
  });

  it("is deterministic for the same inputs", () => {
    const a = makeFindingId("test", "file.tsx", 5);
    const b = makeFindingId("test", "file.tsx", 5);
    expect(a).toBe(b);
  });

  it("produces different IDs for different lines", () => {
    const a = makeFindingId("test", "file.tsx", 5);
    const b = makeFindingId("test", "file.tsx", 6);
    expect(a).not.toBe(b);
  });

  it("produces different IDs for different files", () => {
    const a = makeFindingId("test", "a.tsx", 5);
    const b = makeFindingId("test", "b.tsx", 5);
    expect(a).not.toBe(b);
  });
});

describe("isConfirmedByContext", () => {
  const pattern = {
    requires_manual_verification: true,
    context_reject_regex: "aria-label|aria-labelledby",
    context_window: 2,
  };

  it("returns true when no reject match is present in context window", () => {
    const lines = ["<div>", '<input placeholder="x" />', "</div>"];
    expect(isConfirmedByContext(pattern, lines, 1)).toBe(true);
  });

  it("returns false when reject regex matches a line within the context window", () => {
    const lines = ['<input placeholder="x"', 'aria-label="Name"', "/>"];
    expect(isConfirmedByContext(pattern, lines, 0)).toBe(false);
  });

  it("returns true when reject match is outside the context window", () => {
    const lines = [
      "aria-label='far away'",
      "<div>",
      "<div>",
      '<input placeholder="x" />',
      "</div>",
      "</div>",
    ];
    expect(isConfirmedByContext(pattern, lines, 3)).toBe(true);
  });

  it("returns true when requires_manual_verification is false", () => {
    const p = { requires_manual_verification: false };
    expect(isConfirmedByContext(p, [], 0)).toBe(true);
  });

  it("returns true when context_reject_regex is null", () => {
    const p = { requires_manual_verification: true, context_reject_regex: null };
    expect(isConfirmedByContext(p, [], 0)).toBe(true);
  });
});

describe("scanPattern", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "a11y-scan-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("finds a confirmed match in a matching file", () => {
    writeFileSync(join(tmpDir, "form.tsx"), '<input placeholder="Email" />\n');
    const findings = scanPattern(BASE_PATTERN, tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toMatch(/^PAT-[a-f0-9]{6}$/);
    expect(findings[0].status).toBe("confirmed");
    expect(findings[0].file).toBe("form.tsx");
    expect(findings[0].line).toBe(1);
    expect(findings[0].source).toBe("code-pattern");
    expect(findings[0].fix_description).toBe("Add an explicit label.");
  });

  it("marks a match as potential when context reject regex fires", () => {
    writeFileSync(
      join(tmpDir, "form.tsx"),
      '<input placeholder="Email" aria-label="Email" />\n',
    );
    const findings = scanPattern(BASE_PATTERN, tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0].status).toBe("potential");
  });

  it("returns no findings when the regex does not match", () => {
    writeFileSync(join(tmpDir, "form.tsx"), "<input type='text' />\n");
    const findings = scanPattern(BASE_PATTERN, tmpDir);
    expect(findings).toHaveLength(0);
  });

  it("skips files that do not match the glob extensions", () => {
    writeFileSync(join(tmpDir, "form.js"), '<input placeholder="Email" />\n');
    const findings = scanPattern(BASE_PATTERN, tmpDir);
    expect(findings).toHaveLength(0);
  });

  it("skips node_modules directory", () => {
    const libDir = join(tmpDir, "node_modules", "some-lib");
    mkdirSync(libDir, { recursive: true });
    writeFileSync(join(libDir, "form.tsx"), '<input placeholder="Email" />\n');
    const findings = scanPattern(BASE_PATTERN, tmpDir);
    expect(findings).toHaveLength(0);
  });

  it("scans nested directories", () => {
    const nestedDir = join(tmpDir, "src", "components");
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(join(nestedDir, "ContactForm.tsx"), '<input placeholder="Name" />\n');
    const findings = scanPattern(BASE_PATTERN, tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0].file).toBe(join("src", "components", "ContactForm.tsx"));
  });

  it("generates stable IDs for the same file and line", () => {
    writeFileSync(join(tmpDir, "form.tsx"), '<input placeholder="Email" />\n');
    const a = scanPattern(BASE_PATTERN, tmpDir);
    const b = scanPattern(BASE_PATTERN, tmpDir);
    expect(a[0].id).toBe(b[0].id);
  });

  it("includes fix_description from the pattern", () => {
    writeFileSync(join(tmpDir, "form.tsx"), '<input placeholder="Email" />\n');
    const findings = scanPattern(BASE_PATTERN, tmpDir);
    expect(findings[0].fix_description).toBe("Add an explicit label.");
  });

  it("sets fix_description to null when pattern has none", () => {
    const patternWithoutFix = { ...BASE_PATTERN, fix_description: undefined };
    writeFileSync(join(tmpDir, "form.tsx"), '<input placeholder="Email" />\n');
    const findings = scanPattern(patternWithoutFix, tmpDir);
    expect(findings[0].fix_description).toBeNull();
  });
});
