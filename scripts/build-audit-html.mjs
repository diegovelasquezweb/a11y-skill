#!/usr/bin/env node

import { log, readJson, getInternalPath } from "./a11y-utils.mjs";
import fs from "node:fs";
import path from "node:path";

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function printUsage() {
  log.info(`Usage:
  node build-audit-html.mjs [options]

Options:
  --input <path>           Findings JSON path (default: audit/internal/a11y-findings.json)
  --coverage <path>        Coverage JSON path (default: audit/internal/a11y-coverage.json)
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
    input: getInternalPath("a11y-findings.json"),
    coverage: getInternalPath("a11y-coverage.json"),
    output: path.join("audit", "index.html"),
    title: "Accessibility Audit Report",
    environment: "",
    scope: "",
    target: "WCAG 2.1 AA",
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
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray(payload.findings)
  ) {
    throw new Error("Input must be a JSON object with a 'findings' array.");
  }

  return payload.findings
    .map((item, index) => ({
      id: String(item.id ?? `A11Y-${String(index + 1).padStart(3, "0")}`),
      title: String(item.title ?? "Untitled finding"),
      severity: String(item.severity ?? "Unknown"),
      wcag: String(item.wcag ?? ""),
      area: String(item.area ?? ""),
      url: String(item.url ?? ""),
      selector: String(item.selector ?? ""),
      impact: String(item.impact ?? ""),
      reproduction: Array.isArray(item.reproduction)
        ? item.reproduction.map((v) => String(v))
        : [],
      actual: String(item.actual ?? ""),
      expected: String(item.expected ?? ""),
      recommendedFix: String(item.recommended_fix ?? item.recommendedFix ?? ""),
      evidence: String(item.evidence ?? ""),
    }))
    .sort((a, b) => {
      const sa = SEVERITY_ORDER[a.severity] ?? 99;
      const sb = SEVERITY_ORDER[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.id.localeCompare(b.id);
    });
}

function normalizeCoverage(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.rows)) {
    throw new Error(
      "Coverage input must be a JSON object with a 'rows' array.",
    );
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
      findingIds: Array.isArray(row.finding_ids)
        ? row.finding_ids.map((v) => String(v))
        : [],
    })),
  };
}

function buildSummary(findings) {
  const totals = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const finding of findings) {
    if (finding.severity in totals) totals[finding.severity] += 1;
  }
  return totals;
}

function formatEvidence(evidence) {
  if (!evidence) return "";
  try {
    const data = JSON.parse(evidence);
    if (!Array.isArray(data))
      return `<pre class="raw-evidence"><code>${escapeHtml(evidence)}</code></pre>`;

    return data
      .map((item) => {
        const failureSummary = item.failureSummary
          ? `<div class="failure-summary">${formatMultiline(item.failureSummary)}</div>`
          : "";
        const htmlSnippet = item.html
          ? `<pre class="code-snippet"><code>${escapeHtml(item.html)}</code></pre>`
          : "";
        return `
        <div class="evidence-item">
          ${htmlSnippet}
          ${failureSummary}
        </div>`;
      })
      .join("");
  } catch (e) {
    return `<pre class="raw-evidence"><code>${escapeHtml(evidence)}</code></pre>`;
  }
}

function buildIssueCard(finding) {
  const reproductionItems =
    finding.reproduction.length > 0
      ? finding.reproduction
          .map((step) => `<li>${escapeHtml(step)}</li>`)
          .join("")
      : "<li>No reproduction steps provided.</li>";

  const evidenceHtml = finding.evidence
    ? `<div class="evidence-section">
        <h4 class="evidence-title">Technical Evidence</h4>
        ${formatEvidence(finding.evidence)}
      </div>`
    : "";

  const severityClass = finding.severity.toLowerCase();

  return `
<article class="issue-card" id="${escapeHtml(finding.id)}">
  <div class="issue-header">
    <div class="issue-meta">
      <span class="badge badge-severity-${severityClass}">${escapeHtml(finding.severity)}</span>
      <span class="badge badge-wcag">${escapeHtml(finding.wcag)}</span>
      <span class="issue-id">${escapeHtml(finding.id)}</span>
    </div>
    <h3 class="issue-title">${escapeHtml(finding.title)}</h3>
    <div class="issue-location">
      <div class="location-item"><strong>Area:</strong> ${escapeHtml(finding.area)}</div>
      <div class="location-item"><strong>URL:</strong> <a href="${escapeHtml(finding.url)}" target="_blank">${escapeHtml(finding.url)}</a></div>
      <div class="location-item"><strong>Selector:</strong> <code>${escapeHtml(finding.selector)}</code></div>
    </div>
  </div>
  <div class="issue-body">
    <div class="issue-grid">
      <div class="grid-col">
        <h4>Reproduction Steps</h4>
        <ul class="steps-list">${reproductionItems}</ul>
        
        <h4>Expected Results</h4>
        <p class="text-block">${formatMultiline(finding.expected)}</p>
      </div>
      <div class="grid-col">
        <h4>Actual Results</h4>
        <p class="text-block">${formatMultiline(finding.actual)}</p>

        <h4>Impact</h4>
        <p class="text-block impact-text">${formatMultiline(finding.impact)}</p>
      </div>
    </div>
    
    <div class="recommendation">
      <h4>Recommended Fix</h4>
      <p>${formatMultiline(finding.recommendedFix)}</p>
    </div>

    ${evidenceHtml}
  </div>
</article>`;
}

function buildFindingsTable(findings) {
  const rows = findings
    .map((finding) => {
      const severityClass = finding.severity.toLowerCase();
      return `
      <tr>
        <td class="id-cell"><a href="#${escapeHtml(finding.id)}">${escapeHtml(finding.id)}</a></td>
        <td><span class="badge badge-severity-${severityClass}">${escapeHtml(finding.severity)}</span></td>
        <td><span class="badge badge-wcag-small">${escapeHtml(finding.wcag)}</span></td>
        <td class="area-cell">${escapeHtml(finding.area)}</td>
        <td class="impact-cell">${escapeHtml(finding.impact)}</td>
      </tr>`;
    })
    .join("");

  return `
<div class="table-container">
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Severity</th>
        <th>WCAG</th>
        <th>Area</th>
        <th>Impact</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

function buildCoverageTable(coverage) {
  const rows = coverage.rows
    .map((row) => {
      const statusClass = row.status.toLowerCase();
      return `
      <tr>
        <td class="domain-cell"><strong>${escapeHtml(row.domain || row.id)}</strong></td>
        <td><span class="badge badge-status-${statusClass}">${escapeHtml(row.status)}</span></td>
        <td class="evidence-cell">${formatMultiline(row.evidence || "(none)")}</td>
        <td class="notes-cell">${formatMultiline(row.notes || "")}</td>
      </tr>`;
    })
    .join("");

  return `
<div class="table-container">
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
  </table>
</div>`;
}

function buildHtml(args, findings, coverage) {
  const totals = buildSummary(findings);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const findingsSection =
    findings.length === 0
      ? `<div class="empty-state">
         <div class="empty-icon">✓</div>
         <h3>No accessibility issues found</h3>
         <p>The automated scan did not detect any violations for the selected routes.</p>
       </div>`
      : `
<section id="findings-summary" class="report-section">
  <div class="section-header">
    <h2>Findings Overview</h2>
    <p>A high-level summary of all detected violations.</p>
  </div>
  ${buildFindingsTable(findings)}
</section>

<section id="issue-details" class="report-section">
  <div class="section-header">
    <h2>Detailed Findings</h2>
    <p>Technical details, evidence, and remediation steps for each issue.</p>
  </div>
  <div class="issues-list">
    ${findings.map((finding) => buildIssueCard(finding)).join("\n")}
  </div>
</section>`;

  const coverageSummary = coverage.summary ?? {};
  const coverageStatusClass = coverage.gatePassed ? "pass" : "fail";
  const coverageGateIcon = coverage.gatePassed ? "✓" : "✗";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <title>${escapeHtml(args.title)}</title>
  <style>
    :root {
      --primary: #2563eb;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      
      --critical: #ef4444;
      --high: #f97316;
      --medium: #f59e0b;
      --low: #10b981;
      
      --pass: #10b981;
      --fail: #ef4444;
    }

    * { box-sizing: border-box; }
    body { 
      margin: 0; 
      font-family: 'Inter', system-ui, sans-serif; 
      background: var(--bg); 
      color: var(--text-main); 
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .container { max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
    
    header.report-header {
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .header-main h1 { margin: 0; font-size: 2.5rem; letter-spacing: -0.025em; font-weight: 800; }
    .header-main p { margin: 8px 0 0; color: var(--text-muted); font-size: 1.1rem; }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .stat-card {
      background: var(--card-bg);
      padding: 24px;
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .stat-label { font-size: 0.875rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 1.875rem; font-weight: 700; margin-top: 8px; }
    
    .gate-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 30px;
      font-weight: 600;
      font-size: 0.875rem;
      margin-top: 12px;
    }
    .gate-badge.pass { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
    .gate-badge.fail { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

    .severity-split { display: flex; gap: 12px; margin-top: 12px; }
    .sev-dot { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 600; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }

    .report-section { margin-bottom: 60px; }
    .section-header { margin-bottom: 24px; }
    .section-header h2 { font-size: 1.75rem; font-weight: 700; margin: 0; }
    .section-header p { margin: 8px 0 0; color: var(--text-muted); }

    .table-container { 
      background: var(--card-bg);
      border-radius: 16px;
      border: 1px solid var(--border);
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #f1f5f9; padding: 12px 20px; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    td { padding: 16px 20px; border-bottom: 1px solid var(--border); font-size: 0.9375rem; }
    tr:last-child td { border-bottom: none; }
    
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-severity-critical { background: #fee2e2; color: #991b1b; }
    .badge-severity-high { background: #ffedd5; color: #9a3412; }
    .badge-severity-medium { background: #fef3c7; color: #92400e; }
    .badge-severity-low { background: #dcfce7; color: #166534; }
    
    .badge-wcag { background: #e0f2fe; color: #075985; }
    .badge-wcag-small { background: #f1f5f9; color: #475569; border: 1px solid var(--border); }
    
    .badge-status-pass { background: #d1fae5; color: #065f46; }
    .badge-status-fail { background: #fee2e2; color: #991b1b; }
    .badge-status-na { background: #f1f5f9; color: #475569; }

    .issue-card {
      background: var(--card-bg);
      border-radius: 20px;
      border: 1px solid var(--border);
      margin-bottom: 30px;
      overflow: hidden;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      scroll-margin-top: 40px;
    }
    .issue-header { padding: 24px 30px; border-bottom: 1px solid var(--border); background: #fafafa; }
    .issue-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .issue-id { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--text-muted); }
    .issue-title { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .issue-location { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 20px; font-size: 0.875rem; color: var(--text-muted); }
    .issue-location code { font-family: 'JetBrains Mono', monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: var(--text-main); }
    
    .issue-body { padding: 30px; }
    .issue-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
    .issue-body h4 { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin: 0 0 12px; }
    
    .steps-list { margin: 0; padding-left: 20px; }
    .steps-list li { margin-bottom: 6px; }
    .text-block { margin: 0; font-size: 1rem; }
    .impact-text { color: #475569; font-weight: 500; }
    
    .recommendation { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
    .recommendation h4 { color: #1e40af; }
    .recommendation p { margin: 0; color: #1e3a8a; }

    .evidence-section { background: #1e293b; border-radius: 12px; padding: 24px; color: #e2e8f0; }
    .evidence-title { color: #94a3b8 !important; }
    .evidence-item { margin-bottom: 20px; }
    .evidence-item:last-child { margin-bottom: 0; }
    .code-snippet { background: #0f172a; padding: 16px; border-radius: 8px; margin: 0 0 12px; overflow-x: auto; border: 1px solid #334155; }
    .code-snippet code { font-family: 'JetBrains Mono', monospace; color: #f8fafc; font-size: 0.875rem; }
    .failure-summary { font-family: 'JetBrains Mono', monospace; font-size: 0.8125rem; color: #fb7185; border-left: 3px solid #e11d48; padding-left: 12px; }

    .empty-state { text-align: center; padding: 80px 40px; background: #fff; border-radius: 20px; border: 2px dashed var(--border); }
    .empty-icon { font-size: 48px; color: var(--pass); margin-bottom: 16px; }
    
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }

    @media (max-width: 768px) {
      .issue-grid { grid-template-columns: 1fr; gap: 24px; }
      header.report-header { flex-direction: column; align-items: flex-start; gap: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="report-header">
      <div class="header-main">
        <h1>${escapeHtml(args.title)}</h1>
        <p>Executed on ${dateStr}</p>
      </div>
      <div class="header-compliance">
        <span class="badge badge-wcag">Focus: ${escapeHtml(args.target)}</span>
      </div>
    </header>

    <div class="summary-grid">
      <div class="stat-card">
        <div class="stat-label">Critical Issues</div>
        <div class="stat-value" style="color: var(--critical)">${totals.Critical}</div>
        <div class="severity-split">
          <div class="sev-dot"><span class="dot" style="background: var(--high)"></span> ${totals.High} High</div>
          <div class="sev-dot"><span class="dot" style="background: var(--medium)"></span> ${totals.Medium} Med</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Coverage Gate</div>
        <div class="stat-value">${escapeHtml(coverageSummary.PASS ?? 0)} / ${escapeHtml((coverageSummary.PASS ?? 0) + (coverageSummary.FAIL ?? 0) + (coverageSummary["N/A"] ?? 0))} Domains</div>
        <div class="gate-badge ${coverageStatusClass}">${coverageGateIcon} Audit ${coverage.gatePassed ? "Passed" : "At Risk"}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Environment</div>
        <div class="stat-value" style="font-size: 1.25rem">${escapeHtml(args.environment || "Live Site")}</div>
        <div class="stat-label" style="margin-top: 12px">Compliance</div>
        <div class="stat-value" style="font-size: 1.25rem">${escapeHtml(args.target)}</div>
      </div>
    </div>

    <section id="coverage" class="report-section">
      <div class="section-header">
        <h2>PDF Coverage Matrix</h2>
        <p>Manual and automated verification status across accessibility domains.</p>
      </div>
      ${buildCoverageTable(coverage)}
    </section>

    ${findingsSection}
    
    <footer style="margin-top: 80px; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
      <p>Generated by Accessibility Audit using Playwright & Axe-Core</p>
    </footer>
  </div>
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPayload = readJson(args.input);
  if (!inputPayload)
    throw new Error(`Input findings file not found or invalid: ${args.input}`);

  const coveragePayload = readJson(args.coverage);
  if (!coveragePayload)
    throw new Error(`Coverage file not found or invalid: ${args.coverage}`);

  const findings = normalizeFindings(inputPayload);
  const coverage = normalizeCoverage(coveragePayload);

  if (!coverage.gatePassed) {
    throw new Error(
      "Coverage gate is not passed. Run pdf-coverage-validate before generating HTML.",
    );
  }
  const html = buildHtml(args, findings, coverage);

  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, html, "utf-8");

  if (findings.length === 0) {
    log.info("Congratulations, no issues found.");
  }
  log.success(`HTML report written to ${args.output}`);
}

try {
  main();
} catch (error) {
  log.error(error.message);
  process.exit(1);
}
