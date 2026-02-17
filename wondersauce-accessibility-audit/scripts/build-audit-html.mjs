#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const ITEM_STATUS = new Set(["PASS", "FAIL", "N/A"]);
const RUN_STATUS = new Set(["PASS", "FAIL", "SKIPPED"]);

function defaultTemplatePath() {
  const scriptPath = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(scriptPath);
  return path.resolve(scriptDir, "..", "references", "pdf-coverage-template.json");
}

function parseArgs(argv) {
  const args = {
    input: "/tmp/wondersauce-a11y-findings.json",
    coverage: "/tmp/wondersauce-a11y-coverage.json",
    template: defaultTemplatePath(),
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
    if (key === "--template") args.template = value;
    if (key === "--output") args.output = value;
    if (key === "--title") args.title = value;
    if (key === "--environment") args.environment = value;
    if (key === "--scope") args.scope = value;
    if (key === "--target") args.target = value;
    i += 1;
  }

  return args;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} is not valid JSON: ${filePath}`);
  }
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

function normalizeToolUsed(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean).join(", ");
  }
  return String(value ?? "").trim();
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function validateTemplate(templatePayload) {
  if (!templatePayload || typeof templatePayload !== "object") {
    throw new Error("Template payload must be an object.");
  }

  const checklistItems = Array.isArray(templatePayload.checklist_items) ? templatePayload.checklist_items : [];
  if (checklistItems.length === 0) {
    throw new Error("Template must include a non-empty 'checklist_items' array.");
  }

  const requiredTools = Array.isArray(templatePayload.required_tools)
    ? templatePayload.required_tools.map((v) => String(v).trim()).filter(Boolean)
    : [];

  if (requiredTools.length === 0) {
    throw new Error("Template must include a non-empty 'required_tools' array.");
  }

  const ids = new Set();
  for (const item of checklistItems) {
    const id = String(item?.id ?? "").trim();
    if (!id) throw new Error("Every template checklist item must include an id.");
    if (ids.has(id)) throw new Error(`Duplicate checklist item id in template: ${id}`);
    ids.add(id);
  }

  return { requiredTools, checklistItems };
}

function normalizeCoverage(coveragePayload, template, findings) {
  if (!coveragePayload || typeof coveragePayload !== "object") {
    throw new Error("Coverage input must be a JSON object.");
  }

  const sourceItems = Array.isArray(coveragePayload.checklist_items)
    ? coveragePayload.checklist_items
    : [];

  if (sourceItems.length === 0) {
    throw new Error("Coverage input must include a non-empty 'checklist_items' array.");
  }

  const errors = [];
  const findingIds = new Set(findings.map((f) => f.id));

  const sourceById = new Map();
  for (const item of sourceItems) {
    const id = String(item?.id ?? "").trim();
    if (!id) {
      errors.push("Coverage checklist contains an item with missing id.");
      continue;
    }
    if (sourceById.has(id)) {
      errors.push(`Coverage checklist has duplicate item id: ${id}`);
      continue;
    }
    sourceById.set(id, item);
  }

  const templateIds = new Set(template.checklistItems.map((item) => String(item.id)));
  for (const id of sourceById.keys()) {
    if (!templateIds.has(id)) {
      errors.push(`Coverage checklist contains unknown item id not in template: ${id}`);
    }
  }

  const checklistItems = template.checklistItems.map((templateItem) => {
    const id = String(templateItem.id);
    const current = sourceById.get(id);

    if (!current) {
      errors.push(`Missing checklist item from coverage: ${id}`);
      return {
        id,
        section: String(templateItem.section ?? ""),
        check: String(templateItem.check ?? ""),
        wcag: normalizeStringArray(templateItem.wcag),
        status: "",
        toolUsed: "",
        evidence: "",
        findingIds: [],
        notes: ""
      };
    }

    const status = String(current.status ?? "").trim().toUpperCase();
    const toolUsed = normalizeToolUsed(current.tool_used);
    const evidence = String(current.evidence ?? "").trim();
    const itemFindingIds = normalizeStringArray(current.finding_ids);
    const notes = String(current.notes ?? "").trim();

    if (!ITEM_STATUS.has(status)) {
      errors.push(`Invalid status for checklist item ${id}: ${status || "(empty)"}`);
    }

    if (!toolUsed) {
      errors.push(`Missing tool_used for checklist item ${id}`);
    }

    if ((status === "PASS" || status === "FAIL") && !evidence) {
      errors.push(`Missing evidence for checklist item ${id} with status ${status}`);
    }

    if (status === "N/A" && !notes) {
      errors.push(`Missing notes reason for checklist item ${id} with status N/A`);
    }

    if (status === "FAIL") {
      if (itemFindingIds.length === 0) {
        errors.push(`Checklist item ${id} with FAIL status must include finding_ids`);
      }
      for (const findingId of itemFindingIds) {
        if (!findingIds.has(findingId)) {
          errors.push(`Checklist item ${id} references unknown finding id: ${findingId}`);
        }
      }
    }

    return {
      id,
      section: String(templateItem.section ?? ""),
      check: String(templateItem.check ?? ""),
      wcag: normalizeStringArray(templateItem.wcag),
      status,
      toolUsed,
      evidence,
      findingIds: itemFindingIds,
      notes
    };
  });

  const sourceLog = Array.isArray(coveragePayload.execution_log) ? coveragePayload.execution_log : [];
  if (sourceLog.length === 0) {
    errors.push("Coverage input must include a non-empty execution_log array.");
  }

  const logByTool = new Map();
  for (const row of sourceLog) {
    const tool = String(row?.tool ?? "").trim();
    if (!tool) {
      errors.push("Execution log contains an entry with missing tool name.");
      continue;
    }
    if (logByTool.has(tool)) {
      errors.push(`Execution log contains duplicate tool entry: ${tool}`);
      continue;
    }

    const command = String(row.command ?? "").trim();
    const status = String(row.status ?? "").trim().toUpperCase();
    const summary = String(row.summary ?? "").trim();

    if (!command) errors.push(`Execution log entry for ${tool} is missing command.`);
    if (!RUN_STATUS.has(status)) errors.push(`Execution log entry for ${tool} has invalid status: ${status || "(empty)"}`);
    if (!summary) errors.push(`Execution log entry for ${tool} is missing summary.`);

    logByTool.set(tool, { tool, command, status, summary });
  }

  const executionLog = template.requiredTools.map((tool) => {
    const entry = logByTool.get(tool);
    if (!entry) {
      errors.push(`Execution log is missing required tool entry: ${tool}`);
      return { tool, command: "", status: "", summary: "" };
    }
    return entry;
  });

  const summary = { PASS: 0, FAIL: 0, "N/A": 0 };
  for (const item of checklistItems) {
    if (item.status in summary) summary[item.status] += 1;
  }

  return {
    gatePassed: errors.length === 0,
    summary,
    checklistItems,
    executionLog,
    errors
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
  const rows = coverage.checklistItems
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.section)}</td>
        <td>${escapeHtml(item.id)}</td>
        <td>${escapeHtml(item.check)}</td>
        <td>${escapeHtml(item.wcag.join(", "))}</td>
        <td>${escapeHtml(item.status)}</td>
        <td>${escapeHtml(item.toolUsed)}</td>
        <td>${formatMultiline(item.evidence || "")}</td>
        <td>${escapeHtml(item.findingIds.join(", "))}</td>
        <td>${formatMultiline(item.notes || "")}</td>
      </tr>`)
    .join("");

  return `
<table>
  <thead>
    <tr>
      <th>Section</th>
      <th>Item ID</th>
      <th>Check</th>
      <th>WCAG</th>
      <th>Status</th>
      <th>Tool Used</th>
      <th>Evidence</th>
      <th>Finding IDs</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function buildExecutionLogTable(coverage) {
  const rows = coverage.executionLog
    .map((entry) => `
      <tr>
        <td>${escapeHtml(entry.tool)}</td>
        <td><code>${escapeHtml(entry.command)}</code></td>
        <td>${escapeHtml(entry.status)}</td>
        <td>${formatMultiline(entry.summary)}</td>
      </tr>`)
    .join("");

  return `
<table>
  <thead>
    <tr>
      <th>Tool</th>
      <th>Command</th>
      <th>Status</th>
      <th>Summary</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function toEmbeddedJson(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function buildHtml(args, findings, coverage) {
  const totals = buildSummary(findings);
  const date = new Date().toISOString().slice(0, 10);
  const hasHigh = findings.some((f) => f.severity === "Critical" || f.severity === "High");
  const hasMedium = findings.some((f) => f.severity === "Medium");

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

  const remediationPlan = findings.length === 0
    ? "<li>No remediation actions required for this run.</li>"
    : [
        hasHigh ? "<li>Fix Critical/High findings first across shared components and core flows.</li>" : "",
        hasMedium ? "<li>Address Medium findings in the current or next release cycle.</li>" : "",
        "<li>Retest all fixed items with keyboard and screen reader spot checks.</li>"
      ].filter(Boolean).join("");

  const retestChecklist = `
<ul>
  <li>Keyboard-only pass across audited routes.</li>
  <li>Screen reader spot-check on updated components.</li>
  <li>Confirm issue evidence no longer reproduces.</li>
  <li>Re-run standard tooling and rebuild HTML report.</li>
</ul>`;

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
    <h2>PDF Item Checklist</h2>
    ${buildCoverageTable(coverage)}
  </section>
  <section>
    <h2>Tool Execution Log</h2>
    ${buildExecutionLogTable(coverage)}
    <details>
      <summary>Coverage JSON</summary>
      <pre><code>${escapeHtml(JSON.stringify(coverage, null, 2))}</code></pre>
    </details>
  </section>
  ${findingsSection}
  <section>
    <h2>Remediation Plan</h2>
    <ul>${remediationPlan}</ul>
  </section>
  <section>
    <h2>Retest Checklist</h2>
    ${retestChecklist}
  </section>
  <script id="coverage-json" type="application/json">${toEmbeddedJson(coverage)}</script>
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const coveragePath = path.resolve(args.coverage);
  const templatePath = path.resolve(args.template);
  const outputPath = path.resolve(args.output);

  const findingsPayload = readJson(inputPath, "Input findings file");
  const coveragePayload = readJson(coveragePath, "Coverage file");
  const templatePayload = readJson(templatePath, "Coverage template file");

  const findings = normalizeFindings(findingsPayload);
  const template = validateTemplate(templatePayload);
  const coverage = normalizeCoverage(coveragePayload, template, findings);

  if (!coverage.gatePassed) {
    throw new Error(`Coverage gate failed:\n- ${coverage.errors.join("\n- ")}`);
  }

  const html = buildHtml(args, findings, coverage);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, "utf-8");

  const coverageOutputPath = path.join(path.dirname(outputPath), "coverage.json");
  fs.writeFileSync(coverageOutputPath, `${JSON.stringify(coverage, null, 2)}\n`, "utf-8");

  if (findings.length === 0) {
    console.log("Congratulations, no issues found.");
  }
  console.log(`HTML report written to ${outputPath}`);
  console.log(`Coverage copy written to ${coverageOutputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
