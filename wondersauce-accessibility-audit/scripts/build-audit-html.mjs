#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function printUsage() {
  console.log(`Usage:
  node build-audit-html.mjs [options]

Options:
  --input <path>           Findings JSON path (default: /tmp/wondersauce-a11y-findings.json)
  --coverage <path>        Coverage JSON path (default: /tmp/wondersauce-a11y-coverage.json)
  --output <path>          Output HTML path (default: audit/index.html)
  --title <text>           Report title
  --environment <text>     Test environment label
  --scope <text>           Audit scope label
  --target <text>          Compliance target label (default: WCAG 2.1 AA)
  -h, --help               Show this help
`);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const args = {
    input: "/tmp/wondersauce-a11y-findings.json",
    coverage: "/tmp/wondersauce-a11y-coverage.json",
    output: path.join("audit", "index.html"),
    title: "Accessibility Audit Report",
    environment: "",
    scope: "",
    target: "WCAG 2.1 AA"
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    if (key === "--input") args.input = value;
    if (key === "--coverage") args.coverage = value;
    if (key === "--output") args.output = value;
    if (key === "--title") args.title = value;
    if (key === "--environment") args.environment = value;
    if (key === "--scope") args.scope = value;
    if (key === "--target") args.target = value;
    i += 1;
  }

  return args;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMultiline(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function normalizeFindings(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.findings)) {
    throw new Error("Input must be a JSON object with a 'findings' array.");
  }

  return payload.findings
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error(`Invalid finding object at index ${index}`);
      }
      return {
        id: String(item.id ?? `A11Y-${String(index + 1).padStart(3, "0")}`),
        title: String(item.title ?? "Untitled finding"),
        severity: String(item.severity ?? "Unknown"),
        wcag: String(item.wcag ?? ""),
        area: String(item.area ?? ""),
        url: String(item.url ?? ""),
        selector: String(item.selector ?? ""),
        impact: String(item.impact ?? ""),
        reproduction: Array.isArray(item.reproduction) ? item.reproduction.map((v) => String(v)) : [],
        actual: String(item.actual ?? ""),
        expected: String(item.expected ?? ""),
        recommendedFix: String(item.recommended_fix ?? item.recommendedFix ?? ""),
        evidence: String(item.evidence ?? "")
      };
    })
    .sort((a, b) => {
      const sa = SEVERITY_ORDER[a.severity] ?? 99;
      const sb = SEVERITY_ORDER[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.id.localeCompare(b.id);
    });
}

function normalizeCoverage(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.rows)) {
    throw new Error("Coverage input must be a JSON object with a 'rows' array.");
  }
  return {
    gatePassed: Boolean(payload.gate_passed),
    summary: payload.summary ?? {},
    rows: payload.rows.map((row) => ({
      id: String(row.id ?? ""),
      domain: String(row.domain ?? ""),
      status: String(row.status ?? ""),
      evidence: String(row.evidence ?? ""),
      notes: String(row.notes ?? ""),
      findingIds: Array.isArray(row.finding_ids) ? row.finding_ids.map((v) => String(v)) : []
    }))
  };
}

function buildSummary(findings) {
  const totals = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const finding of findings) {
    if (finding.severity in totals) totals[finding.severity] += 1;
  }
  return totals;
}

function buildIssueCard(finding) {
  const reproductionItems = finding.reproduction.length > 0
    ? finding.reproduction.map((step) => `<li>${escapeHtml(step)}</li>`).join("")
    : "<li>No reproduction steps provided.</li>";

  const evidenceHtml = finding.evidence
    ? `<p><strong>Evidence:</strong> ${escapeHtml(finding.evidence)}</p>`
    : "";

  return `
<article class="issue">
  <header>
    <h3>${escapeHtml(finding.id)} - ${escapeHtml(finding.title)}</h3>
    <p><strong>Severity:</strong> ${escapeHtml(finding.severity)} | <strong>WCAG:</strong> ${escapeHtml(finding.wcag)}</p>
    <p><strong>Area:</strong> ${escapeHtml(finding.area)}</p>
    <p><strong>URL:</strong> ${escapeHtml(finding.url)}</p>
    <p><strong>Selector:</strong> ${escapeHtml(finding.selector)}</p>
    ${evidenceHtml}
  </header>
  <section>
    <h4>Reproduction</h4>
    <ol>${reproductionItems}</ol>
    <h4>Actual</h4>
    <p>${formatMultiline(finding.actual)}</p>
    <h4>Expected</h4>
    <p>${formatMultiline(finding.expected)}</p>
    <h4>Impact</h4>
    <p>${formatMultiline(finding.impact)}</p>
    <h4>Recommended Fix</h4>
    <p>${formatMultiline(finding.recommendedFix)}</p>
  </section>
</article>`;
}

function buildFindingsTable(findings) {
  const rows = findings
    .map((finding) => `
      <tr>
        <td>${escapeHtml(finding.id)}</td>
        <td>${escapeHtml(finding.severity)}</td>
        <td>${escapeHtml(finding.wcag)}</td>
        <td>${escapeHtml(finding.area)}</td>
        <td>${escapeHtml(finding.impact)}</td>
      </tr>`)
    .join("");

  return `
<table>
  <thead>
    <tr>
      <th>ID</th>
      <th>Severity</th>
      <th>WCAG</th>
      <th>Area</th>
      <th>Short Impact</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function buildCoverageTable(coverage) {
  const rows = coverage.rows
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.domain || row.id)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td>${formatMultiline(row.evidence || "(none)")}</td>
        <td>${formatMultiline(row.notes || "")}</td>
      </tr>`)
    .join("");

  return `
<table>
  <thead>
    <tr>
      <th>Coverage Domain</th>
      <th>Status</th>
      <th>Evidence</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function buildHtml(args, findings, coverage) {
  const totals = buildSummary(findings);
  const date = new Date().toISOString().slice(0, 10);

  const findingsSection = findings.length === 0
    ? `<section class="ok"><h3>Congratulations, no issues found.</h3></section>`
    : `
<section>
  <h2>Findings Table</h2>
  ${buildFindingsTable(findings)}
</section>
<section>
  <h2>Issue Details</h2>
  ${findings.map((finding) => buildIssueCard(finding)).join("\n")}
</section>`;

  const coverageSummary = coverage.summary ?? {};
  const coverageBadge = coverage.gatePassed
    ? '<p class="gate pass"><strong>Coverage Gate:</strong> PASS</p>'
    : '<p class="gate fail"><strong>Coverage Gate:</strong> FAIL</p>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(args.title)}</title>
  <style>
    body { margin: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; }
    h1, h2, h3, h4 { margin: 0 0 8px; }
    section { margin: 16px 0; }
    .summary { background: #fff; border: 1px solid #dbe3ee; border-radius: 10px; padding: 16px; }
    .summary p { margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #dbe3ee; }
    th, td { border: 1px solid #dbe3ee; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #eef3f8; }
    .issue { background: #fff; border: 1px solid #dbe3ee; border-radius: 10px; padding: 14px; margin-bottom: 14px; }
    .issue p { margin: 4px 0; }
    .ok { background: #ecfdf5; border: 1px solid #86efac; border-radius: 10px; padding: 16px; }
    .gate { margin-top: 8px; padding: 8px 10px; border-radius: 8px; display: inline-block; }
    .gate.pass { background: #ecfdf5; border: 1px solid #86efac; }
    .gate.fail { background: #fef2f2; border: 1px solid #fca5a5; }
  </style>
</head>
<body>
  <h1>${escapeHtml(args.title)}</h1>
  <section class="summary">
    <h2>Executive Summary</h2>
    <p><strong>Date:</strong> ${escapeHtml(date)}</p>
    <p><strong>Environment:</strong> ${escapeHtml(args.environment || "Not provided")}</p>
    <p><strong>Scope:</strong> ${escapeHtml(args.scope || "Not provided")}</p>
    <p><strong>Target:</strong> ${escapeHtml(args.target)}</p>
    <p><strong>Total findings:</strong> ${findings.length}</p>
    <p><strong>Severity split:</strong> Critical ${totals.Critical}, High ${totals.High}, Medium ${totals.Medium}, Low ${totals.Low}</p>
    <p><strong>Coverage split:</strong> PASS ${escapeHtml(coverageSummary.PASS ?? 0)}, FAIL ${escapeHtml(coverageSummary.FAIL ?? 0)}, N/A ${escapeHtml(coverageSummary["N/A"] ?? 0)}</p>
    ${coverageBadge}
  </section>
  <section>
    <h2>PDF Coverage Matrix</h2>
    ${buildCoverageTable(coverage)}
  </section>
  ${findingsSection}
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const coveragePath = path.resolve(args.coverage);
  const outputPath = path.resolve(args.output);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input findings file not found: ${inputPath}`);
  }
  if (!fs.existsSync(coveragePath)) {
    throw new Error(`Coverage file not found: ${coveragePath}`);
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const coveragePayload = JSON.parse(fs.readFileSync(coveragePath, "utf-8"));
  const findings = normalizeFindings(payload);
  const coverage = normalizeCoverage(coveragePayload);
  if (!coverage.gatePassed) {
    throw new Error("Coverage gate is not passed. Run pdf-coverage-validate before generating HTML.");
  }
  const html = buildHtml(args, findings, coverage);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, "utf-8");
  const reportDate = new Date().toISOString().slice(0, 10);
  const datedOutputPath = path.join(path.dirname(outputPath), `index-${reportDate}.html`);
  fs.writeFileSync(datedOutputPath, html, "utf-8");

  if (findings.length === 0) {
    console.log("Congratulations, no issues found.");
  }
  console.log(`HTML report written to ${outputPath}`);
  console.log(`Dated HTML report written to ${datedOutputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
