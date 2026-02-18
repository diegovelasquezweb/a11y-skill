#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const REQUIRED_ROWS = [
  { id: "structure_semantics", domain: "Structure and semantics" },
  { id: "aria_usage", domain: "ARIA usage" },
  { id: "keyboard_focus", domain: "Keyboard and focus" },
  { id: "perceivable_content", domain: "Perceivable content" },
  { id: "media_motion", domain: "Media and motion" },
  { id: "forms_auth", domain: "Forms and authentication" },
  { id: "component_patterns", domain: "Common component patterns" },
  { id: "third_party", domain: "Third-party integrations" },
  { id: "automated_validation", domain: "Automated validation" },
  { id: "severity_triage", domain: "Severity and triage quality" }
];

const ALLOWED_STATUS = new Set(["PASS", "FAIL", "N/A"]);

function printUsage() {
  console.log(`Usage:
  node pdf-coverage-validate.mjs --coverage <coverage-input.json> [options]

Options:
  --findings <path>        Findings JSON path (default: /tmp/wondersauce-a11y-findings.json)
  --output <path>          Validation output path (default: /tmp/wondersauce-a11y-coverage.json)
  -h, --help               Show this help
`);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const args = {
    coverage: "",
    findings: "/tmp/wondersauce-a11y-findings.json",
    output: "/tmp/wondersauce-a11y-coverage.json"
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    if (key === "--coverage") args.coverage = value;
    if (key === "--findings") args.findings = value;
    if (key === "--output") args.output = value;
    i += 1;
  }

  if (!args.coverage) {
    throw new Error("Missing required --coverage");
  }

  return args;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function normalizeFindingsIds(findingsPayload) {
  if (!findingsPayload || typeof findingsPayload !== "object" || !Array.isArray(findingsPayload.findings)) {
    throw new Error("Findings file must be a JSON object with a 'findings' array.");
  }
  return new Set(
    findingsPayload.findings
      .map((item) => String(item?.id ?? "").trim())
      .filter(Boolean)
  );
}

function normalizeRows(coveragePayload) {
  if (!coveragePayload || typeof coveragePayload !== "object" || !Array.isArray(coveragePayload.rows)) {
    throw new Error("Coverage file must be a JSON object with a 'rows' array.");
  }

  return coveragePayload.rows.map((row, index) => {
    if (!row || typeof row !== "object") {
      throw new Error(`Coverage row at index ${index} must be an object.`);
    }
    return {
      id: String(row.id ?? "").trim(),
      domain: String(row.domain ?? "").trim(),
      status: String(row.status ?? "").trim().toUpperCase(),
      evidence: String(row.evidence ?? "").trim(),
      notes: String(row.notes ?? "").trim(),
      finding_ids: Array.isArray(row.finding_ids) ? row.finding_ids.map((v) => String(v).trim()).filter(Boolean) : []
    };
  });
}

function validateRows(rows, findingIds) {
  const errors = [];
  const byId = new Map(rows.map((row) => [row.id, row]));

  for (const expected of REQUIRED_ROWS) {
    const row = byId.get(expected.id);
    if (!row) {
      errors.push(`Missing coverage row: ${expected.id}`);
      continue;
    }

    if (!ALLOWED_STATUS.has(row.status)) {
      errors.push(`Invalid status for ${expected.id}: ${row.status}`);
      continue;
    }

    if (!row.domain) {
      errors.push(`Missing domain label for ${expected.id}`);
    }

    if (row.status === "PASS" && !row.evidence) {
      errors.push(`PASS row requires evidence: ${expected.id}`);
    }

    if (row.status === "FAIL") {
      if (!row.evidence) errors.push(`FAIL row requires evidence: ${expected.id}`);
      if (row.finding_ids.length === 0) {
        errors.push(`FAIL row requires finding_ids: ${expected.id}`);
      } else {
        for (const findingId of row.finding_ids) {
          if (!findingIds.has(findingId)) {
            errors.push(`FAIL row ${expected.id} references unknown finding id: ${findingId}`);
          }
        }
      }
    }

    if (row.status === "N/A" && !row.notes) {
      errors.push(`N/A row requires reason in notes: ${expected.id}`);
    }
  }

  const failRows = rows.filter((row) => row.status === "FAIL").length;
  if (findingIds.size === 0 && failRows > 0) {
    errors.push("Coverage has FAIL rows but findings are empty.");
  }

  return errors;
}

function buildSummary(rows) {
  const summary = { PASS: 0, FAIL: 0, "N/A": 0 };
  for (const row of rows) {
    if (row.status in summary) summary[row.status] += 1;
  }
  return summary;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const coveragePath = path.resolve(args.coverage);
  const findingsPath = path.resolve(args.findings);
  const outputPath = path.resolve(args.output);

  const coveragePayload = readJson(coveragePath, "Coverage file");
  const findingsPayload = readJson(findingsPath, "Findings file");

  const rows = normalizeRows(coveragePayload);
  const findingIds = normalizeFindingsIds(findingsPayload);
  const errors = validateRows(rows, findingIds);

  if (errors.length > 0) {
    console.error("PDF coverage validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const result = {
    validated_at: new Date().toISOString(),
    gate_passed: true,
    summary: buildSummary(rows),
    rows
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  console.log(`Coverage validation passed. Output written to ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
