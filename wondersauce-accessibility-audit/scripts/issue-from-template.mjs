#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ALLOWED_SEVERITIES = new Set(["Critical", "High", "Medium", "Low"]);
const ALLOWED_LEVELS = new Set(["A", "AA", "AAA"]);
const ALLOWED_RELEASES = new Set(["Block now", "Fix this release", "Next release", "Backlog"]);

function parseArgs(argv) {
  const args = {
    title: "",
    severity: "",
    wcag: "",
    level: "AA",
    area: "",
    url: "",
    selector: "",
    repro: "",
    actual: "Current behavior not provided.",
    expected: "Expected behavior not provided.",
    impact: "User impact not provided.",
    fix: "Fix guidance not provided.",
    evidence: "",
    rationale: "Severity rationale not provided.",
    coreBlocked: "No",
    workaround: "Yes",
    scopeImpact: "Single component",
    releaseRecommendation: "Fix this release",
    prefix: "A11Y",
    outDir: "audit"
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    if (key === "--title") args.title = value;
    if (key === "--severity") args.severity = value;
    if (key === "--wcag") args.wcag = value;
    if (key === "--level") args.level = value;
    if (key === "--area") args.area = value;
    if (key === "--url") args.url = value;
    if (key === "--selector") args.selector = value;
    if (key === "--repro") args.repro = value;
    if (key === "--actual") args.actual = value;
    if (key === "--expected") args.expected = value;
    if (key === "--impact") args.impact = value;
    if (key === "--fix") args.fix = value;
    if (key === "--evidence") args.evidence = value;
    if (key === "--rationale") args.rationale = value;
    if (key === "--core-blocked") args.coreBlocked = value;
    if (key === "--workaround") args.workaround = value;
    if (key === "--scope-impact") args.scopeImpact = value;
    if (key === "--release-recommendation") args.releaseRecommendation = value;
    if (key === "--prefix") args.prefix = value;
    if (key === "--out-dir") args.outDir = value;
    i += 1;
  }

  if (!args.title) throw new Error("Missing required --title");
  if (!args.severity || !ALLOWED_SEVERITIES.has(args.severity)) throw new Error("Invalid --severity");
  if (!args.wcag) throw new Error("Missing required --wcag");
  if (!ALLOWED_LEVELS.has(args.level)) throw new Error("Invalid --level");
  if (!args.area) throw new Error("Missing required --area");
  if (!args.url) throw new Error("Missing required --url");
  if (!ALLOWED_RELEASES.has(args.releaseRecommendation)) throw new Error("Invalid --release-recommendation");

  return args;
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "issue";
}

function nextIssueId(outDir, prefix) {
  const files = fs
    .readdirSync(outDir)
    .filter((name) => name.startsWith(`${prefix}-`) && name.endsWith(".md"))
    .sort();

  if (files.length === 0) return `${prefix}-001`;

  const last = files[files.length - 1].replace(/\.md$/, "").split("-")[1];
  const num = Number.parseInt(last, 10);
  const next = Number.isNaN(num) ? files.length + 1 : num + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function buildMarkdown(args, issueId) {
  const steps = args.repro
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const reproSteps = steps.length > 0 ? steps : ["Reproduction steps not provided."];

  const lines = [];
  lines.push("# Accessibility Issue");
  lines.push("");
  lines.push("Use this template for each audit finding.");
  lines.push("");
  lines.push("## Issue");
  lines.push("");
  lines.push(`- ID: ${issueId}`);
  lines.push(`- Title: ${args.title}`);
  lines.push(`- Severity: ${args.severity}`);
  lines.push(`- WCAG Criterion: ${args.wcag}`);
  lines.push(`- WCAG Level: ${args.level}`);
  lines.push(`- Affected Area: ${args.area}`);
  lines.push("");
  lines.push("## Reproduction");
  lines.push("");
  reproSteps.forEach((step, idx) => lines.push(`${idx + 1}. ${step}`));
  lines.push("");
  lines.push("## Actual Behavior");
  lines.push("");
  lines.push(args.actual);
  lines.push("");
  lines.push("## Expected Behavior");
  lines.push("");
  lines.push(args.expected);
  lines.push("");
  lines.push("## User Impact");
  lines.push("");
  lines.push(args.impact);
  lines.push("");
  lines.push("## Severity Rationale");
  lines.push("");
  lines.push(`- Why this severity is correct: ${args.rationale}`);
  lines.push(`- Is a core user task blocked? ${args.coreBlocked}`);
  lines.push(`- Is there a reasonable workaround? ${args.workaround}`);
  lines.push(`- Scope of impact: ${args.scopeImpact}`);
  lines.push(`- Release recommendation: ${args.releaseRecommendation}`);
  lines.push("");
  lines.push("## Evidence");
  lines.push("");
  lines.push(`- URL: ${args.url}`);
  lines.push(`- Screenshot / recording: ${args.evidence}`);
  lines.push(`- DOM selector / component ID: ${args.selector}`);
  lines.push("- Tool output (if any):");
  lines.push("");
  lines.push("## Recommended Fix");
  lines.push("");
  lines.push(args.fix);
  lines.push("");
  lines.push("## QA Retest Notes");
  lines.push("");
  lines.push("- Retest date:");
  lines.push("- Retested by:");
  lines.push("- Status: Pass | Fail | Needs follow-up");
  lines.push("- Notes:");
  lines.push("");

  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.outDir, { recursive: true });

  const issueId = nextIssueId(args.outDir, args.prefix);
  const slug = slugify(args.title);
  const output = path.join(args.outDir, `${issueId}-${slug}.md`);

  fs.writeFileSync(output, buildMarkdown(args, issueId), "utf-8");
  console.log(`Issue written to ${output}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
