#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const REQUIRED_KEYS = [
  "id",
  "title",
  "severity",
  "wcag",
  "area",
  "url",
  "selector",
  "impact",
  "reproduction",
  "actual",
  "expected",
  "recommended_fix"
];

function parseArgs(argv) {
  const args = {
    input: "",
    project: "",
    environment: "",
    scope: "In-scope pages and key user flows",
    wcagTarget: "WCAG 2.1 AA",
    auditor: "Accessibility Team",
    output: ""
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    if (key === "--input") args.input = value;
    if (key === "--project") args.project = value;
    if (key === "--environment") args.environment = value;
    if (key === "--scope") args.scope = value;
    if (key === "--wcag-target") args.wcagTarget = value;
    if (key === "--auditor") args.auditor = value;
    if (key === "--output") args.output = value;
    i += 1;
  }

  if (!args.input) throw new Error("Missing required --input");
  if (!args.project) throw new Error("Missing required --project");
  if (!args.environment) throw new Error("Missing required --environment");

  return args;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function loadFindings(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const payload = JSON.parse(raw);

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.findings)) {
    throw new Error("Input must be a JSON object with a 'findings' array");
  }

  payload.findings.forEach((finding, index) => {
    if (!finding || typeof finding !== "object") {
      throw new Error(`Finding #${index + 1} must be an object`);
    }

    const missing = REQUIRED_KEYS.filter((key) => !(key in finding));
    if (missing.length > 0) {
      throw new Error(`Finding #${index + 1} is missing keys: ${missing.join(", ")}`);
    }

    if (!Array.isArray(finding.reproduction) || finding.reproduction.length === 0) {
      throw new Error(`Finding #${index + 1} needs a non-empty 'reproduction' array`);
    }
  });

  return payload.findings;
}

function escapeTableCell(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function buildMarkdown(findings, args) {
  const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const sorted = [...findings].sort(
    (a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99)
  );

  const totals = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const item of sorted) {
    if (item.severity in totals) totals[item.severity] += 1;
  }

  const lines = [];
  lines.push(`# Accessibility Report - ${args.project}`);
  lines.push("");
  lines.push("## 1. Executive Summary");
  lines.push("");
  lines.push(`- Date: ${todayIso()}`);
  lines.push(`- Auditor: ${args.auditor}`);
  lines.push(`- Test Environment: ${args.environment}`);
  lines.push(`- Scope: ${args.scope}`);
  lines.push(`- Target: ${args.wcagTarget}`);
  lines.push(`- Total findings: ${sorted.length}`);
  lines.push(`- Severity split: Critical ${totals.Critical}, High ${totals.High}, Medium ${totals.Medium}, Low ${totals.Low}`);
  lines.push("");

  lines.push("## 2. Findings Table");
  lines.push("");
  lines.push("| ID | Severity | WCAG | Area | Short Impact |");
  lines.push("|---|---|---|---|---|");
  for (const finding of sorted) {
    lines.push(
      `| ${escapeTableCell(finding.id)} | ${escapeTableCell(finding.severity)} | ${escapeTableCell(finding.wcag)} | ${escapeTableCell(finding.area)} | ${escapeTableCell(finding.impact)} |`
    );
  }
  lines.push("");

  lines.push("## 3. Issue Details");
  lines.push("");
  for (const finding of sorted) {
    lines.push(`### ${finding.id} - ${finding.title}`);
    lines.push("");
    lines.push(`- Severity: ${finding.severity}`);
    lines.push(`- WCAG Criterion: ${finding.wcag}`);
    lines.push(`- Affected Area: ${finding.area}`);
    lines.push(`- URL: ${finding.url}`);
    lines.push(`- Selector/Component: ${finding.selector}`);
    lines.push("");
    lines.push("**Reproduction**");
    finding.reproduction.forEach((step, idx) => lines.push(`${idx + 1}. ${step}`));
    lines.push("");
    lines.push("**Actual Behavior**");
    lines.push(finding.actual);
    lines.push("");
    lines.push("**Expected Behavior**");
    lines.push(finding.expected);
    lines.push("");
    lines.push("**User Impact**");
    lines.push(finding.impact);
    lines.push("");
    lines.push("**Recommended Fix**");
    lines.push(finding.recommended_fix);
    lines.push("");
  }

  lines.push("## 4. Remediation Plan");
  lines.push("");
  lines.push("- Immediate: Fix all Critical and High findings first.");
  lines.push("- Current release: Resolve remaining Medium findings tied to affected flows.");
  lines.push("- Backlog: Track Low findings and close during related component updates.");
  lines.push("");

  lines.push("## 5. Retest Checklist");
  lines.push("");
  lines.push("- Verify each fixed issue with keyboard-only navigation.");
  lines.push("- Verify with screen reader spot-check.");
  lines.push("- Re-run automated checks and compare diffs.");
  lines.push("- Attach updated evidence for each closed issue.");
  lines.push("");

  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const findings = loadFindings(args.input);
  if (findings.length === 0) {
    console.log("Congratulations, no issues found.");
    return;
  }

  const markdown = buildMarkdown(findings, args);

  const outputPath = args.output || path.join("audit", `a11y-report-${todayIso()}.md`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, "utf-8");

  console.log(`Report written to ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
