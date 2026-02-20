#!/usr/bin/env node

import { log, readJson, getInternalPath } from "./a11y-utils.mjs";
import fs from "node:fs";
import path from "node:path";
import { normalizeFindings } from "./report/utils.mjs";
import { buildMarkdownSummary } from "./report/md-summary.mjs";

function printUsage() {
  log.info(`Usage:
  node build-remediation-md.mjs [options]

Options:
  --input <path>           Findings JSON path (default: audit/internal/a11y-findings.json)
  --output <path>          Output Markdown path (default: audit/remediation.md)
  --base-url <url>         Target website URL
  --target <text>          Compliance target label (default: WCAG 2.2 AA)
  -h, --help               Show this help
`);
}

function parseArgs(argv) {
  const args = {
    input: getInternalPath("a11y-findings.json"),
    output: path.join(process.cwd(), "audit", "remediation.md"),
    baseUrl: "",
    target: "WCAG 2.2 AA",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--input") args.input = value;
    if (key === "--output") args.output = value;
    if (key === "--base-url") args.baseUrl = value;
    if (key === "--target") args.target = value;
    if (key === "--help" || key === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPayload = readJson(args.input);
  if (!inputPayload) {
    throw new Error(`Input findings file not found or invalid: ${args.input}`);
  }

  const findings = normalizeFindings(inputPayload);
  const md = buildMarkdownSummary(args, findings);

  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, md, "utf-8");

  log.success(`Remediation guide written to ${args.output}`);
}

try {
  main();
} catch (error) {
  log.error(error.message);
  process.exit(1);
}
