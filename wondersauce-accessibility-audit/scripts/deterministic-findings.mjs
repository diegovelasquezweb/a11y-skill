#!/usr/bin/env node

import { log, readJson, writeJson, getInternalPath } from "./a11y-utils.mjs";
import path from "node:path";
import fs from "node:fs";

function printUsage() {
  log.info(`Usage:
  node deterministic-findings.mjs --input <route-checks.json> [options]

Options:
  --output <path>          Output findings JSON path (default: audit/internal/a11y-findings.json)
  -h, --help               Show this help
`);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const args = {
    input: getInternalPath("a11y-scan-results.json"),
    output: getInternalPath("a11y-findings.json"),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    if (key === "--input") args.input = value;
    if (key === "--output") args.output = value;
    i += 1;
  }

  if (!args.input) throw new Error("Missing required --input");
  return args;
}

const IMPACT_MAP = {
  critical: "Critical",
  serious: "High",
  moderate: "Medium",
  minor: "Low",
};

function mapWcag(tags) {
  if (tags.includes("wcag2a") || tags.includes("wcag21a")) return "WCAG 2.1 A";
  if (tags.includes("wcag2aa") || tags.includes("wcag21aa"))
    return "WCAG 2.1 AA";
  return "WCAG";
}

function buildFindings(inputPayload) {
  const routes = inputPayload.routes || [];
  const findings = [];

  for (const route of routes) {
    if (route.violations) {
      for (const v of route.violations) {
        const nodes = v.nodes || [];
        const selectors = nodes.map((n) => n.target.join(" ")).slice(0, 5);

        findings.push({
          id: "",
          title: v.help,
          severity: IMPACT_MAP[v.impact] || "Medium",
          wcag: mapWcag(v.tags),
          area: `${route.path}`,
          url: route.url,
          selector: selectors.join(", "),
          impact: v.description,
          reproduction: [
            `Open ${route.url}`,
            `Check selector: ${selectors[0] || "N/A"}`,
            v.help,
          ],
          actual: `Found ${nodes.length} instances.`,
          expected: "Accessibility check should pass.",
          recommended_fix: v.helpUrl
            ? `See ${v.helpUrl}`
            : "Fix the violation.",
          evidence: JSON.stringify(nodes.slice(0, 3), null, 1),
        });
      }
    }

    const meta = route.metadata || {};
    if (meta.h1Count !== 1) {
      findings.push({
        id: "",
        title: "Page must have exactly one h1",
        severity: "Medium",
        wcag: "WCAG 2.1 A",
        area: route.path,
        url: route.url,
        selector: "h1",
        impact: "Heading hierarchy is broken.",
        reproduction: ["Count h1 tags on page"],
        actual: `Found ${meta.h1Count} h1 tags.`,
        expected: "Exactly 1 h1 tag.",
        recommended_fix: "Ensure one unique h1 per page.",
      });
    }

    if (meta.mainCount !== 1) {
      findings.push({
        id: "",
        title: "Page must have exactly one main landmark",
        severity: "Medium",
        wcag: "WCAG 2.1 A",
        area: route.path,
        url: route.url,
        selector: "main",
        impact: "Landmark navigation is broken.",
        reproduction: ["Count main tags on page"],
        actual: `Found ${meta.mainCount} main tags.`,
        expected: "Exactly 1 main tag.",
        recommended_fix: "Ensure one main landmark per page.",
      });
    }
  }

  findings.sort((a, b) => {
    if (a.area !== b.area) return a.area.localeCompare(b.area);
    return a.title.localeCompare(b.title);
  });

  return findings.map((f, i) => ({
    ...f,
    id: `A11Y-${String(i + 1).padStart(3, "0")}`,
  }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = readJson(args.input);
  if (!payload) throw new Error(`Input not found or invalid: ${args.input}`);

  const findings = buildFindings(payload);
  writeJson(args.output, { findings });

  if (findings.length === 0) {
    log.info("Congratulations, no issues found.");
  }
  log.success(`Findings processed and saved to ${args.output}`);
}

try {
  main();
} catch (error) {
  log.error(error.message);
  process.exit(1);
}
