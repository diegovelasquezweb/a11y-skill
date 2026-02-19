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
    scanResults: getInternalPath("a11y-scan-results.json"),
    output: path.join(process.cwd(), "audit", "index.html"),
    title: "Accessibility Audit Report",
    baseUrl: "",
    environment: "Local Development",
    scope: "Full Site Scan",
    target: "WCAG 2.1 AA",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    if (key === "--input") args.input = value;
    if (key === "--scan-results") args.scanResults = value;
    if (key === "--output") args.output = value;
    if (key === "--base-url") args.baseUrl = value;
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
      ruleId: String(item.rule_id ?? ""),
      title: String(item.title ?? "Untitled finding"),
      severity: String(item.severity ?? "Unknown"),
      wcag: String(item.wcag ?? ""),
      area: String(item.area ?? ""),
      url: String(item.url ?? ""),
      selector: String(item.selector ?? ""),
      impactedUsers: String(item.impacted_users ?? item.impact ?? ""),
      impact: String(item.impact ?? ""),
      reproduction: Array.isArray(item.reproduction)
        ? item.reproduction.map((v) => String(v))
        : [],
      actual: String(item.actual ?? ""),
      expected: String(item.expected ?? ""),
      fixDescription: item.fix_description ?? null,
      fixCode: item.fix_code ?? null,
      recommendedFix: String(item.recommended_fix ?? item.recommendedFix ?? ""),
      evidence: String(item.evidence ?? ""),
      screenshotPath: item.screenshot_path ?? null,
    }))
    .sort((a, b) => {
      const sa = SEVERITY_ORDER[a.severity] ?? 99;
      const sb = SEVERITY_ORDER[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.id.localeCompare(b.id);
    });
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
      return `<pre class="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono border border-slate-700"><code>${escapeHtml(evidence)}</code></pre>`;

    return data
      .map((item) => {
        const failureSummary = item.failureSummary
          ? `<div class="mt-2 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs font-mono whitespace-pre-wrap">${formatMultiline(item.failureSummary)}</div>`
          : "";
        const htmlSnippet = item.html
          ? `<div class="mb-2"><span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Source</span><pre class="bg-slate-900 text-slate-50 p-3 rounded-lg overflow-x-auto text-xs font-mono border border-slate-700"><code>${escapeHtml(item.html)}</code></pre></div>`
          : "";
        return `
        <div class="mb-4 last:mb-0">
          ${htmlSnippet}
          ${failureSummary}
        </div>`;
      })
      .join("");
  } catch (e) {
    return `<pre class="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono border border-slate-700"><code>${escapeHtml(evidence)}</code></pre>`;
  }
}

function buildIssueCard(finding) {
  const reproductionItems =
    finding.reproduction.length > 0
      ? finding.reproduction
          .map(
            (step) =>
              `<li class="mb-1 text-slate-600">${escapeHtml(step)}</li>`,
          )
          .join("")
      : "<li class='text-slate-400 italic'>No specific steps provided.</li>";

  const screenshotHtml = finding.screenshotPath
    ? `<div class="mt-6">
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Visual Evidence
        </h4>
        <img src="${escapeHtml(finding.screenshotPath)}" alt="Screenshot of ${escapeHtml(finding.title)}" class="rounded-lg border border-slate-200 shadow-sm max-h-64 w-auto object-contain bg-slate-50">
      </div>`
    : "";

  const evidenceHtml = finding.evidence
    ? `<div class="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-inner">
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Technical Evidence</h4>
        ${formatEvidence(finding.evidence)}
      </div>`
    : "";

  let severityBadge = "";
  let borderClass = "";

  switch (finding.severity) {
    case "Critical":
      severityBadge = "bg-rose-100 text-rose-800 border-rose-200";
      borderClass = "border-rose-200 hover:border-rose-300";
      break;
    case "High":
      severityBadge = "bg-orange-100 text-orange-800 border-orange-200";
      borderClass = "border-orange-200 hover:border-orange-300";
      break;
    case "Medium":
      severityBadge = "bg-amber-100 text-amber-800 border-amber-200";
      borderClass = "border-amber-200 hover:border-amber-300";
      break;
    case "Low":
      severityBadge = "bg-emerald-100 text-emerald-800 border-emerald-200";
      borderClass = "border-emerald-200 hover:border-emerald-300";
      break;
    default:
      severityBadge = "bg-slate-100 text-slate-800 border-slate-200";
      borderClass = "border-slate-200";
  }

  return `
<article class="issue-card bg-white rounded-xl border ${borderClass} shadow-sm transition-all duration-200 hover:shadow-md mb-6 overflow-hidden" data-severity="${finding.severity}" id="${escapeHtml(finding.id)}">
  <div class="p-5 md:p-6 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/50">
    <div class="flex flex-wrap items-center gap-3 mb-3">
      <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border ${severityBadge}">${escapeHtml(finding.severity)}</span>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 font-mono tracking-tight">${escapeHtml(finding.id)}</span>
      ${finding.ruleId ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 font-mono tracking-tight">${escapeHtml(finding.ruleId)}</span>` : ""}
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 ml-auto">WCAG ${escapeHtml(finding.wcag)}</span>
    </div>
    <h3 class="text-lg md:text-xl font-bold text-slate-900 leading-tight mb-4">${escapeHtml(finding.title)}</h3>
    
    <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
        <div class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            <a href="${escapeHtml(finding.url)}" target="_blank" class="hover:text-indigo-600 hover:underline truncate max-w-[200px] md:max-w-md transition-colors">${escapeHtml(finding.url)}</a>
        </div>
        <div class="flex items-center gap-1.5 w-full md:w-auto mt-1 md:mt-0 min-w-0">
            <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
            <code class="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-700 border border-slate-200 font-mono truncate min-w-0 flex-1">${escapeHtml(finding.selector)}</code>
        </div>
    </div>
  </div>

  <div class="p-5 md:p-6 bg-white">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
      <div>
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            Behavior Analysis
        </h4>
        <div class="space-y-4">
            <div>
                <span class="text-xs font-semibold text-emerald-600 uppercase block mb-1">Expected Behavior</span>
                <p class="text-sm text-slate-700 bg-emerald-50/50 p-2.5 rounded border border-emerald-100 leading-relaxed">${formatMultiline(finding.expected)}</p>
            </div>
            <div>
                <span class="text-xs font-semibold text-rose-600 uppercase block mb-1">Actual Behavior</span>
                <p class="text-sm text-slate-700 bg-rose-50/50 p-2.5 rounded border border-rose-100 leading-relaxed">${formatMultiline(finding.actual)}</p>
            </div>
        </div>
      </div>
      
      <div>
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            Steps to Reproduce
        </h4>
        <ul class="list-decimal list-outside ml-4 space-y-1 text-sm text-slate-600 marker:text-slate-400 marker:font-medium">
            ${reproductionItems}
        </ul>
        
        <div class="mt-6">
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Impacted Users</h4>
            <p class="text-sm text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-3">${formatMultiline(finding.impactedUsers)}</p>
        </div>
      </div>
    </div>
    
    <div class="bg-indigo-50 border border-indigo-100 rounded-lg p-5 relative overflow-hidden">
      <div class="absolute top-0 right-0 p-4 opacity-10">
        <svg class="w-16 h-16 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"></path></svg>
      </div>
      <h4 class="text-sm font-bold text-indigo-900 mb-2 relative z-10 flex items-center gap-2">
        <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        Recommended Remediation
      </h4>
      ${finding.fixDescription ? `<p class="text-sm text-indigo-800 leading-relaxed relative z-10 mb-3">${escapeHtml(finding.fixDescription)}</p>` : ""}
      ${finding.fixCode ? `<pre class="bg-slate-900 text-emerald-300 p-3 rounded-lg overflow-x-auto text-xs font-mono border border-slate-700 mb-3 relative z-10 whitespace-pre-wrap">${escapeHtml(finding.fixCode)}</pre>` : ""}
      <p class="text-xs text-indigo-500 leading-relaxed relative z-10">${linkify(formatMultiline(finding.recommendedFix))}</p>
    </div>

    ${screenshotHtml}
    ${evidenceHtml}
  </div>
</article>`;
}

const MANUAL_CHECKS = [
  {
    criterion: "2.4.11",
    title: "Focus Appearance",
    level: "AA",
    description: "Focus indicators must be clearly visible with a minimum area (perimeter × 2 CSS px) and 3:1 contrast ratio between focused and unfocused states.",
    steps: [
      "Tab through every interactive element on the page",
      "Verify each focused element has a clearly visible outline or indicator",
      "Check the focus indicator has at least 3:1 contrast vs adjacent colors",
      "Confirm the indicator area is at least: component perimeter × 2 CSS pixels",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html",
  },
  {
    criterion: "2.5.7",
    title: "Dragging Movements",
    level: "AA",
    description: "All drag-and-drop functionality must have a single-pointer alternative (click-to-select + click-to-drop, arrow buttons, etc.).",
    steps: [
      "Identify all drag-and-drop interactions: sortable lists, sliders, file upload zones",
      "Verify each can be operated without dragging (arrow keys, click alternatives)",
      "Test using only pointer clicks — no drag gestures allowed as the sole method",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html",
  },
  {
    criterion: "2.5.8",
    title: "Target Size (Minimum)",
    level: "AA",
    description: "Interactive targets must be at least 24×24 CSS pixels, or have sufficient spacing to offset a smaller size.",
    steps: [
      "Inspect computed size of small buttons, links, and icon controls",
      "Use DevTools: select element → Computed → check width/height",
      "For targets under 24×24 px, verify at least (24 − size) px of non-interactive spacing surrounds it",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html",
  },
  {
    criterion: "3.2.6",
    title: "Consistent Help",
    level: "A",
    description: "Help mechanisms (support link, chat widget, contact info) must appear in the same relative order on every page where they appear.",
    steps: [
      "Navigate to at least 3 different pages that contain help links or contact info",
      "Verify the help mechanism is always in the same location (e.g., always in the footer)",
      "Check that its order relative to surrounding elements is consistent across pages",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html",
  },
  {
    criterion: "3.3.7",
    title: "Redundant Entry",
    level: "A",
    description: "Information already provided by the user in the same session must not be required again unless essential or for security.",
    steps: [
      "Complete multi-step forms that span multiple pages (checkout, registration, surveys)",
      "Verify that data entered earlier (name, address, email) is pre-populated or selectable in later steps",
      "Check that users are never asked to re-type the same information twice",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html",
  },
  {
    criterion: "3.3.8",
    title: "Accessible Authentication (Minimum)",
    level: "AA",
    description: "Authentication must not rely solely on cognitive function tests (CAPTCHA, puzzles, memorization) — an accessible alternative must be available.",
    steps: [
      "Test the login and signup flow end-to-end",
      "If a CAPTCHA is present, verify an audio alternative or another accessible option exists",
      "Confirm copy-paste is allowed in password fields",
      "Check whether passkeys or email magic links are offered as alternatives",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html",
  },
];

function buildManualCheckCard(check) {
  const id = `manual-${check.criterion.replace(".", "-")}`;
  const steps = check.steps
    .map((s) => `<li class="mb-1.5 text-slate-600 text-sm">${escapeHtml(s)}</li>`)
    .join("");
  return `
<div class="manual-card bg-white rounded-xl border border-amber-200 shadow-sm mb-4 overflow-hidden transition-all duration-200" id="${id}" data-criterion="${escapeHtml(check.criterion)}">
  <label class="flex items-start gap-4 p-5 border-b border-amber-100 bg-gradient-to-r from-amber-50/60 to-white cursor-pointer select-none hover:from-amber-50 transition-colors">
    <div class="flex-shrink-0 mt-0.5">
      <input type="checkbox" class="manual-checkbox w-5 h-5 rounded border-2 border-amber-300 text-emerald-600 cursor-pointer accent-emerald-500" data-criterion="${escapeHtml(check.criterion)}">
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex flex-wrap items-center gap-2 mb-2">
        <span class="manual-badge px-2.5 py-0.5 rounded-full text-xs font-bold border bg-amber-100 text-amber-800 border-amber-200">Manual</span>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 font-mono">${escapeHtml(check.criterion)}</span>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">WCAG 2.2 ${escapeHtml(check.level)}</span>
        <span class="verified-label hidden ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">✓ Verified</span>
      </div>
      <h3 class="text-base font-bold text-slate-900">${escapeHtml(check.title)}</h3>
    </div>
  </label>
  <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">What to verify</h4>
      <p class="text-sm text-slate-600 leading-relaxed">${escapeHtml(check.description)}</p>
    </div>
    <div>
      <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">How to test</h4>
      <ol class="list-decimal list-outside ml-4 space-y-1 marker:text-slate-400 marker:font-medium">
        ${steps}
      </ol>
    </div>
  </div>
  <div class="px-5 pb-4">
    <a href="${escapeHtml(check.ref)}" target="_blank" class="text-xs text-indigo-600 hover:underline font-medium">WCAG 2.2 Understanding — ${escapeHtml(check.criterion)} ${escapeHtml(check.title)} →</a>
  </div>
</div>`;
}

function buildManualChecksSection() {
  const total = MANUAL_CHECKS.length;
  const cards = MANUAL_CHECKS.map((c) => buildManualCheckCard(c)).join("\n");
  return `
<div class="mt-16">
  <div class="flex items-center gap-3 mb-2">
    <h3 class="text-lg font-bold text-slate-900">Manual Verification Required</h3>
    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">${total} checks</span>
  </div>
  <p class="text-sm text-slate-500 mb-4">These WCAG 2.2 criteria cannot be detected automatically by axe-core. Check each one off as you verify it — progress is saved in your browser.</p>

  <div class="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex items-center gap-4">
    <div class="flex-1">
      <div class="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
        <span>Verification progress</span>
        <span id="manual-progress-label">0 / ${total} verified</span>
      </div>
      <div class="w-full bg-slate-100 rounded-full h-2">
        <div id="manual-progress-bar" class="bg-emerald-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
      </div>
    </div>
    <button onclick="resetManualChecks()" class="text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium whitespace-nowrap">Reset all</button>
  </div>

  ${cards}
</div>`;
}


function buildManualChecksMd() {
  const entries = MANUAL_CHECKS.map((check) => {
    const steps = check.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    return [
      `---`,
      `### ${check.criterion} — ${check.title} (WCAG 2.2 ${check.level})`,
      ``,
      `${check.description}`,
      ``,
      `**How to verify:**`,
      steps,
      ``,
      `**Reference:** ${check.ref}`,
    ].join("\n");
  }).join("\n\n");

  return `## Manual Verification Required (WCAG 2.2)

> These criteria cannot be detected automatically. Verify each one manually before certifying compliance.

${entries}
`;
}

// ── PDF premium helpers ───────────────────────────────────────────────────

function computeComplianceScore(totals) {
  const raw = 100 - (totals.Critical * 15) - (totals.High * 5) - (totals.Medium * 2) - (totals.Low * 0.5);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function scoreLabel(score) {
  if (score >= 90) return { label: "Excellent", risk: "Minimal Risk" };
  if (score >= 75) return { label: "Good", risk: "Low Risk" };
  if (score >= 55) return { label: "Fair", risk: "Moderate Risk" };
  if (score >= 35) return { label: "Poor", risk: "High Risk" };
  return { label: "Critical", risk: "Severe Risk" };
}

function buildPdfExecutiveSummary(args, findings, totals) {
  const score = computeComplianceScore(totals);
  const { label, risk } = scoreLabel(score);
  const blockers = findings.filter(f => f.severity === "Critical" || f.severity === "High");
  const totalIssues = findings.length;
  const pagesAffected = new Set(findings.map(f => f.area)).size;

  const topIssues = blockers.slice(0, 3).map(f =>
    `<li style="margin-bottom: 6pt;">${escapeHtml(f.title)} — <em>${escapeHtml(f.area)}</em></li>`
  ).join("");

  const scoreBar = `
<div style="margin: 1.5rem 0; padding: 1.2rem 1.5rem; border: 1.5pt solid #e5e7eb; border-left: 5pt solid ${score >= 75 ? "#16a34a" : score >= 55 ? "#d97706" : "#dc2626"}; background: #f9fafb;">
  <p style="font-family: sans-serif; font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1pt; margin: 0 0 6pt 0; color: #6b7280;">WCAG 2.2 AA Compliance Score</p>
  <p style="font-family: sans-serif; font-size: 32pt; font-weight: 900; margin: 0; line-height: 1; color: ${score >= 75 ? "#16a34a" : score >= 55 ? "#d97706" : "#dc2626"};">${score}<span style="font-size: 14pt; font-weight: 400; color: #9ca3af;"> / 100</span></p>
  <p style="font-family: sans-serif; font-size: 10pt; font-weight: 700; margin: 4pt 0 0 0; color: #374151;">${label} &mdash; ${risk}</p>
</div>`;

  const narrative = totalIssues === 0
    ? `<p style="line-height: 1.8; font-size: 10pt; margin-bottom: 8pt;">
        The automated scan of <strong>${escapeHtml(args.baseUrl)}</strong> detected no WCAG 2.2 AA violations across
        the scanned routes. This is a strong result. Six criteria require manual verification before full
        compliance can be certified — see Section 3.
      </p>`
    : `<p style="line-height: 1.8; font-size: 10pt; margin-bottom: 8pt;">
        The automated scan of <strong>${escapeHtml(args.baseUrl)}</strong> identified <strong>${totalIssues} accessibility
        violation${totalIssues !== 1 ? "s" : ""}</strong> across <strong>${pagesAffected} page${pagesAffected !== 1 ? "s" : ""}</strong>,
        including <strong>${totals.Critical} Critical</strong> and <strong>${totals.High} High</strong> severity issues
        that constitute immediate barriers for users relying on assistive technology.
      </p>
      <p style="line-height: 1.8; font-size: 10pt; margin-bottom: 8pt;">
        Critical issues prevent disabled users from completing core tasks entirely.
        High issues create significant friction that forces users to abandon flows.
        Together, these ${totals.Critical + totals.High} blockers represent the primary compliance and
        user experience risk for the organization.
      </p>`;

  const topIssuesBlock = blockers.length > 0 ? `
    <p style="font-family: sans-serif; font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1pt; margin: 1.2rem 0 6pt 0; color: #6b7280;">Priority Issues</p>
    <ul style="margin: 0; padding-left: 1.2rem; font-size: 10pt;">${topIssues}</ul>` : "";

  const conformanceStatement = totals.Critical > 0
    ? `<strong>Does not conform</strong> to ${escapeHtml(args.target)}`
    : findings.length > 0
    ? `<strong>Partially conforms</strong> to ${escapeHtml(args.target)}`
    : `<strong>Conforms</strong> to ${escapeHtml(args.target)} (automated checks)`;

  return `
<div style="page-break-before: always;">
  <h2 style="margin-top: 0;">1. Executive Summary</h2>
  ${scoreBar}

  <p style="font-size: 10pt; line-height: 1.7; margin-bottom: 1rem; padding: 0.8rem 1rem; border: 1pt solid #e5e7eb; background: #f9fafb;">
    <strong>Conformance status:</strong> This site ${conformanceStatement} based on automated testing conducted on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
    See Section 6 for scope and limitations.
  </p>

  ${narrative}
  ${topIssuesBlock}

  <table class="stats-table" style="margin-top: 1.5rem;">
    <thead>
      <tr><th>Severity</th><th>Count</th><th>Impact</th><th>Action Required</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>Critical</strong></td><td>${totals.Critical}</td><td>Complete barrier — users cannot proceed</td><td>Fix immediately</td></tr>
      <tr><td><strong>High</strong></td><td>${totals.High}</td><td>Serious friction — core tasks impaired</td><td>Fix this sprint</td></tr>
      <tr><td><strong>Medium</strong></td><td>${totals.Medium}</td><td>Partial violation — usability degraded</td><td>Fix next sprint</td></tr>
      <tr><td><strong>Low</strong></td><td>${totals.Low}</td><td>Best practice gap — minor impact</td><td>Fix when convenient</td></tr>
    </tbody>
  </table>
</div>`;
}

function buildPdfRiskSection(totals) {
  const score = computeComplianceScore(totals);
  const riskLevel = score >= 75 ? "Low" : score >= 55 ? "Moderate" : score >= 35 ? "High" : "Severe";
  const riskColor = score >= 75 ? "#16a34a" : score >= 55 ? "#d97706" : "#dc2626";

  return `
<div style="page-break-before: always;">
  <h2 style="margin-top: 0;">2. Compliance & Legal Risk</h2>
  <p style="line-height: 1.8; font-size: 10pt; margin-bottom: 1rem;">
    Web accessibility compliance is governed by international standards and increasingly enforced
    by law across major markets. The following regulations apply to most digital products and services.
  </p>

  <table class="stats-table">
    <thead>
      <tr><th>Regulation</th><th>Jurisdiction</th><th>Standard</th><th>Deadline</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>European Accessibility Act (EAA)</strong></td>
        <td>European Union</td>
        <td>EN 301 549 / WCAG 2.2 AA</td>
        <td>June 28, 2025 (in force)</td>
      </tr>
      <tr>
        <td><strong>ADA Title II — DOJ Final Rule</strong></td>
        <td>United States</td>
        <td>WCAG 2.1 AA</td>
        <td>April 24, 2026</td>
      </tr>
      <tr>
        <td><strong>EU Web Accessibility Directive</strong></td>
        <td>European Union (Public Sector)</td>
        <td>EN 301 549 / WCAG 2.1 AA</td>
        <td>In force since 2018</td>
      </tr>
      <tr>
        <td><strong>Section 508</strong></td>
        <td>United States (Federal)</td>
        <td>WCAG 2.0 AA</td>
        <td>In force since 2018</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 1.5rem; padding: 1rem 1.2rem; border: 1.5pt solid ${riskColor}; border-left: 5pt solid ${riskColor}; background: #f9fafb;">
    <p style="font-family: sans-serif; font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1pt; margin: 0 0 4pt 0; color: #6b7280;">Current Risk Assessment</p>
    <p style="font-family: sans-serif; font-size: 16pt; font-weight: 900; margin: 0; color: ${riskColor};">${riskLevel} Risk</p>
    <p style="font-size: 9pt; margin: 6pt 0 0 0; color: #374151; line-height: 1.6;">
      ${score >= 75
        ? "The site demonstrates strong accessibility fundamentals. Remaining issues should be addressed to achieve full compliance before regulatory deadlines."
        : score >= 55
        ? "The site has meaningful accessibility gaps that create legal exposure under EAA and ADA Title II. A remediation plan should be established and executed before the applicable compliance deadlines."
        : "The site has significant accessibility barriers that create substantial legal exposure. Immediate remediation of Critical and High issues is strongly recommended to mitigate compliance risk under EAA (in force) and ADA Title II (April 2026)."
      }
    </p>
  </div>
</div>`;
}

function buildPdfRemediationRoadmap(findings) {
  const critical = findings.filter(f => f.severity === "Critical");
  const high = findings.filter(f => f.severity === "High");
  const medium = findings.filter(f => f.severity === "Medium");
  const low = findings.filter(f => f.severity === "Low");

  const effortHours = (c, h, m, l) =>
    Math.round(c * 4 + h * 2 + m * 1 + l * 0.5);

  const totalHours = effortHours(critical.length, high.length, medium.length, low.length);

  function sprintBlock(label, items, hours) {
    if (items.length === 0) return "";
    const rows = items.slice(0, 8).map(f =>
      `<tr><td>${escapeHtml(f.id)}</td><td>${escapeHtml(f.title)}</td><td>${escapeHtml(f.area)}</td></tr>`
    ).join("");
    const more = items.length > 8
      ? `<tr><td colspan="3" style="font-style: italic; color: #6b7280;">… and ${items.length - 8} more</td></tr>` : "";
    return `
<div style="margin-bottom: 1.5rem; page-break-inside: avoid;">
  <p style="font-family: sans-serif; font-size: 9pt; font-weight: 800; text-transform: uppercase;
     letter-spacing: 1pt; margin: 0 0 4pt 0; color: #6b7280;">
    ${label}
    <span style="font-weight: 400; color: #9ca3af;"> — ${items.length} issue${items.length !== 1 ? "s" : ""} · ~${hours}h estimated</span>
  </p>
  <table class="stats-table" style="margin: 0;">
    <thead><tr><th>ID</th><th>Issue</th><th>Page</th></tr></thead>
    <tbody>${rows}${more}</tbody>
  </table>
</div>`;
  }

  return `
<div style="page-break-before: always;">
  <h2 style="margin-top: 0;">3. Remediation Roadmap</h2>
  <p style="line-height: 1.8; font-size: 10pt; margin-bottom: 1.2rem;">
    Issues are prioritized by severity and grouped into recommended remediation sprints.
    Effort estimates assume a developer familiar with the codebase.
    Total estimated remediation effort: <strong>~${totalHours} hours</strong>.
  </p>

  ${sprintBlock("Sprint 1 — Fix Immediately (Critical)", critical, effortHours(critical.length, 0, 0, 0))}
  ${sprintBlock("Sprint 2 — Fix This Cycle (High)", high, effortHours(0, high.length, 0, 0))}
  ${sprintBlock("Sprint 3 — Fix Next Cycle (Medium + Low)", [...medium, ...low], effortHours(0, 0, medium.length, low.length))}

  ${findings.length === 0 ? `<p style="font-style: italic; color: #6b7280;">No automated issues found. Complete the manual verification checklist in Section 5 to finalize the assessment.</p>` : ""}
</div>`;
}

function buildPdfMethodologySection(args, findings) {
  const pagesScanned = new Set(findings.map(f => f.url)).size || 1;
  const scope = args.scope || "Full Site Scan";

  return `
<div style="page-break-before: always;">
  <h2 style="margin-top: 0;">2. Methodology &amp; Scope</h2>
  <p style="font-size: 10pt; line-height: 1.7; margin-bottom: 1rem;">
    This audit was conducted using automated accessibility testing tools against the live
    environment of <strong>${escapeHtml(args.baseUrl)}</strong>. The methodology, tools, and
    scope boundaries are documented below to ensure the results can be accurately interpreted.
  </p>

  <h3 style="font-size: 11pt; margin-bottom: 6pt;">Testing Approach</h3>
  <table class="stats-table" style="margin-bottom: 1.2rem;">
    <tbody>
      <tr><td style="width: 35%; font-weight: 700;">Method</td><td>Automated scanning via axe-core engine injected into a live Chromium browser</td></tr>
      <tr><td style="font-weight: 700;">Engine</td><td>axe-core 4.10+ (Deque Systems) — industry-standard accessibility rules library</td></tr>
      <tr><td style="font-weight: 700;">Browser</td><td>Chromium (headless) via Playwright</td></tr>
      <tr><td style="font-weight: 700;">Standard</td><td>${escapeHtml(args.target)}</td></tr>
      <tr><td style="font-weight: 700;">Environment</td><td>${escapeHtml(args.environment)}</td></tr>
      <tr><td style="font-weight: 700;">Audit date</td><td>${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
    </tbody>
  </table>

  <h3 style="font-size: 11pt; margin-bottom: 6pt;">Scope</h3>
  <table class="stats-table" style="margin-bottom: 1.2rem;">
    <tbody>
      <tr><td style="width: 35%; font-weight: 700;">Audit scope</td><td>${escapeHtml(scope)}</td></tr>
      <tr><td style="font-weight: 700;">Base URL</td><td><a href="${escapeHtml(args.baseUrl)}">${escapeHtml(args.baseUrl)}</a></td></tr>
      <tr><td style="font-weight: 700;">Pages scanned</td><td>${pagesScanned} route${pagesScanned !== 1 ? "s" : ""} (autodiscovered via same-origin link crawl)</td></tr>
      <tr><td style="font-weight: 700;">Color scheme</td><td>Light mode (default)</td></tr>
    </tbody>
  </table>

  <h3 style="font-size: 11pt; margin-bottom: 6pt;">Severity Definitions</h3>
  <table class="stats-table">
    <thead><tr><th>Level</th><th>Definition</th><th>Recommended action</th></tr></thead>
    <tbody>
      <tr><td><strong>Critical</strong></td><td>Complete barrier — users with disabilities cannot access or complete the affected feature</td><td>Fix immediately</td></tr>
      <tr><td><strong>High</strong></td><td>Significant impediment — core tasks are seriously impaired but may still be possible</td><td>Fix within current sprint</td></tr>
      <tr><td><strong>Medium</strong></td><td>Partial violation — functionality works but creates friction or excludes some users</td><td>Fix next sprint</td></tr>
      <tr><td><strong>Low</strong></td><td>Best practice gap — minor deviation with limited real-world impact</td><td>Fix when convenient</td></tr>
    </tbody>
  </table>
</div>`;
}

function buildPdfAuditLimitations() {
  return `
<div style="page-break-before: always;">
  <h2 style="margin-top: 0;">6. Audit Scope &amp; Limitations</h2>
  <p style="font-size: 10pt; line-height: 1.7; margin-bottom: 1rem;">
    Automated accessibility tools, including axe-core, reliably detect approximately 30–40% of
    WCAG violations. The remaining 60–70% require human judgement, assistive technology testing,
    and contextual evaluation that no automated tool can perform.
  </p>
  <p style="font-size: 10pt; line-height: 1.7; margin-bottom: 1.2rem;">
    This report documents the results of automated testing only. The following areas are
    <strong>outside the scope</strong> of this audit and require separate manual review
    before full WCAG 2.2 AA conformance can be certified:
  </p>

  <table class="stats-table" style="margin-bottom: 1.2rem;">
    <thead><tr><th>Out-of-scope area</th><th>Why it requires manual review</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>Authenticated pages</strong> (dashboards, account areas, checkout)</td>
        <td>Automated tools cannot log in or maintain sessions — these pages were not scanned</td>
      </tr>
      <tr>
        <td><strong>Dynamic &amp; interactive components</strong> (modals, carousels, dropdowns)</td>
        <td>Axe-core evaluates the page at load time; interactions triggered by user input require scripted or manual testing</td>
      </tr>
      <tr>
        <td><strong>Screen reader compatibility</strong></td>
        <td>Real screen reader testing (NVDA, JAWS, VoiceOver) is required to verify announced content and navigation flow</td>
      </tr>
      <tr>
        <td><strong>Keyboard navigation flow</strong></td>
        <td>Logical tab order and focus management must be verified by a human tester navigating without a mouse</td>
      </tr>
      <tr>
        <td><strong>Alternative text quality</strong></td>
        <td>Axe-core confirms alt text exists, but cannot evaluate whether the description is meaningful or accurate</td>
      </tr>
      <tr>
        <td><strong>6 WCAG 2.2 manual-only criteria</strong></td>
        <td>Focus Appearance (2.4.11), Dragging Movements (2.5.7), Target Size (2.5.8), Consistent Help (3.2.6), Redundant Entry (3.3.7), Accessible Authentication (3.3.8)</td>
      </tr>
      <tr>
        <td><strong>Third-party content</strong> (chat widgets, maps, embedded iframes)</td>
        <td>Accessibility of third-party components is the responsibility of the vendor and was not assessed</td>
      </tr>
      <tr>
        <td><strong>PDF &amp; document downloads</strong></td>
        <td>Document accessibility requires separate evaluation using dedicated tools (Adobe Acrobat Accessibility Checker, PAC 2024)</td>
      </tr>
    </tbody>
  </table>

  <div style="padding: 1rem 1.2rem; border: 1.5pt solid #d97706; border-left: 5pt solid #d97706; background: #fffbeb;">
    <p style="font-family: sans-serif; font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1pt; margin: 0 0 4pt 0; color: #92400e;">Recommendation</p>
    <p style="font-size: 9pt; line-height: 1.7; margin: 0; color: #374151;">
      To achieve verified WCAG 2.2 AA conformance, this automated audit should be complemented
      with manual testing by an accessibility specialist, including screen reader testing,
      keyboard-only navigation, and review of the 6 manual-only WCAG 2.2 criteria.
      The accompanying HTML report provides step-by-step verification guidance for your development team.
    </p>
  </div>
</div>`;
}

// ── Dashboard helpers ─────────────────────────────────────────────────────────

const WCAG_PRINCIPLE_MAP = {
  // Perceivable (1.x)
  "image-alt": "Perceivable",
  "input-image-alt": "Perceivable",
  "object-alt": "Perceivable",
  "label": "Perceivable",
  "select-name": "Perceivable",
  "color-contrast": "Perceivable",
  "landmark-one-main": "Perceivable",
  "region": "Perceivable",
  "list": "Perceivable",
  "listitem": "Perceivable",
  "definition-list": "Perceivable",
  "dlitem": "Perceivable",
  // Operable (2.x)
  "bypass": "Operable",
  "link-name": "Operable",
  "heading-order": "Operable",
  "page-has-heading-one": "Operable",
  "tabindex": "Operable",
  "scrollable-region-focusable": "Operable",
  "target-size": "Operable",
  "focus-appearance": "Operable",
  "dragging-movements": "Operable",
  "meta-viewport": "Operable",
  // Understandable (3.x)
  "html-has-lang": "Understandable",
  "html-lang-valid": "Understandable",
  "valid-lang": "Understandable",
  "document-title": "Understandable",
  "meta-refresh": "Understandable",
  "redundant-entry": "Understandable",
  "autocomplete-valid": "Understandable",
  "consistent-help": "Understandable",
  "form-field-multiple-labels": "Understandable",
  "accessible-auth-minimum": "Understandable",
  // Robust (4.x)
  "button-name": "Robust",
  "aria-required-attr": "Robust",
  "aria-valid-attr-value": "Robust",
  "aria-hidden-focus": "Robust",
  "frame-title": "Robust",
  "duplicate-id": "Robust",
};

function wcagPrinciple(ruleId) {
  return WCAG_PRINCIPLE_MAP[ruleId] || "Robust";
}


function buildPageGroupedSection(findings) {
  if (findings.length === 0) return "";

  const pageGroups = {};
  for (const f of findings) {
    if (!pageGroups[f.area]) pageGroups[f.area] = [];
    pageGroups[f.area].push(f);
  }

  const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const sorted = Object.entries(pageGroups).sort((a, b) => b[1].length - a[1].length);

  return sorted.map(([page, pageFinding]) => {
    const worstSeverity = pageFinding.reduce((worst, f) => {
      return (SEVERITY_ORDER[f.severity] ?? 99) < (SEVERITY_ORDER[worst] ?? 99) ? f.severity : worst;
    }, "Low");
    const badgeColor = {
      Critical: "bg-rose-100 text-rose-700 border-rose-200",
      High: "bg-orange-100 text-orange-700 border-orange-200",
      Medium: "bg-amber-100 text-amber-700 border-amber-200",
      Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    }[worstSeverity] || "bg-slate-100 text-slate-700 border-slate-200";

    const cards = pageFinding
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99))
      .map((f) => buildIssueCard(f))
      .join("\n");

    return `<div class="page-group mb-10" data-page="${escapeHtml(page)}">
      ${cards}
    </div>`;
  }).join("");
}

// ─────────────────────────────────────────────────────────────────────────────

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(
    urlRegex,
    '<a href="$1" target="_blank" class="text-indigo-600 hover:underline font-medium break-all">$1</a>',
  );
}

function buildHtml(args, findings) {
  const totals = buildSummary(findings);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const hasIssues = findings.length > 0;

  const statusColor = hasIssues
    ? "text-rose-600 bg-rose-50 border-rose-200"
    : "text-emerald-600 bg-emerald-50 border-emerald-200";
  const statusIcon = hasIssues
    ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`
    : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  const statusText = hasIssues ? "WCAG Violations Found" : "Audit Passed";

  // Page select for "By Page" view
  const _pageCounts = {};
  for (const f of findings) { _pageCounts[f.area] = (_pageCounts[f.area] || 0) + 1; }
  const _sortedPages = Object.entries(_pageCounts).sort((a, b) => b[1] - a[1]);
  const pageSelectHtml = _sortedPages.length > 1
    ? `<select id="page-select" onchange="filterByPage(this.value)" style="display:none" class="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300 cursor-pointer"><option value="all">All pages (${_sortedPages.length})</option>${_sortedPages.map(([pg, cnt]) => `<option value="${escapeHtml(pg)}">${escapeHtml(pg)} (${cnt})</option>`).join("")}</select>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(args.title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    /* WEB STYLES (Screen) */
    @media screen {
      .pdf-only { display: none !important; }
      body { background-color: #f8fafc; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
      .glass-header { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); }
    }

    /* PDF STYLES (Print) */
    @media print {
      .web-only { display: none !important; }
      .pdf-only { display: block !important; }
      
      @page {
        size: A4;
        margin: 2cm;
      }

      body {
        background: white !important;
        color: black !important;
        font-family: 'Libre Baskerville', serif !important;
        font-size: 11pt !important;
        line-height: 1.6;
      }

      h1, h2, h3, h4 { font-family: 'Inter', sans-serif !important; color: black !important; margin-top: 1.5rem !important; margin-bottom: 1rem !important; }
      
      .cover-page {
        height: 25cm;
        display: flex;
        flex-direction: column;
        justify-content: center;
        border-bottom: 2pt solid black;
        margin-bottom: 3cm;
        page-break-after: always;
      }

      .finding-entry {
        border-top: 1pt solid black;
        padding-top: 1.5rem;
        margin-top: 2rem;
        page-break-inside: avoid;
      }

      .severity-tag {
        font-weight: 800;
        text-transform: uppercase;
        border: 1.5pt solid black;
        padding: 2pt 6pt;
        font-size: 9pt;
        margin-bottom: 1rem;
        display: inline-block;
      }

      .remediation-box {
        background-color: #f3f4f6 !important;
        border-left: 4pt solid black;
        padding: 1rem;
        margin: 1rem 0;
        font-style: italic;
      }

      pre {
        background: #f9fafb !important;
        border: 1pt solid #ddd !important;
        padding: 10pt !important;
        font-size: 8pt !important;
        overflow: hidden !important;
        white-space: pre-wrap !important;
      }

      .stats-table {
        width: 100%;
        border-collapse: collapse;
        margin: 2rem 0;
      }
      .stats-table th, .stats-table td {
        border: 1pt solid black;
        padding: 10pt;
        text-align: left;
      }
    }
  </style>
</head>
<body class="text-slate-900 min-h-screen">
  
  <!-- WEB VERSION -->
  <div class="web-only">
    <div class="fixed top-0 left-0 right-0 z-50 glass-header border-b border-slate-200/80 shadow-sm" id="navbar">
      <div class="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="px-3 h-10 rounded-lg bg-slate-900 text-white font-bold text-base font-mono flex items-center justify-center shadow-md">a11y</div>
          <h1 class="text-xl font-bold">Accessibility <span class="text-slate-500">Report</span></h1>
        </div>
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusColor}">
          ${statusIcon} <span>${statusText}</span>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 pt-24 pb-20">
      <div class="mb-10">
        <h2 class="text-3xl font-extrabold mb-2">${escapeHtml(args.title)}</h2>
        <p class="text-slate-500">${dateStr} &bull; ${escapeHtml(args.baseUrl)}</p>
      </div>

      <!-- Stats + WCAG Principles row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
        <!-- Severity cards (original style) -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-white p-4 rounded-xl border border-rose-100 text-center"><p class="text-xs font-bold text-rose-600 uppercase mb-1">Critical</p><div class="text-3xl font-extrabold">${totals.Critical}</div></div>
          <div class="bg-white p-4 rounded-xl border border-orange-100 text-center"><p class="text-xs font-bold text-orange-600 uppercase mb-1">High</p><div class="text-3xl font-extrabold">${totals.High}</div></div>
          <div class="bg-white p-4 rounded-xl border border-amber-100 text-center"><p class="text-xs font-bold text-amber-600 uppercase mb-1">Medium</p><div class="text-3xl font-extrabold">${totals.Medium}</div></div>
          <div class="bg-white p-4 rounded-xl border border-emerald-100 text-center"><p class="text-xs font-bold text-emerald-600 uppercase mb-1">Low</p><div class="text-3xl font-extrabold">${totals.Low}</div></div>
        </div>
        <!-- WCAG Principles -->
        ${findings.length > 0 ? (() => {
          const pc = { Perceivable: 0, Operable: 0, Understandable: 0, Robust: 0 };
          for (const f of findings) pc[wcagPrinciple(f.ruleId)]++;
          return `<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Issues by WCAG Principle</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-lg border border-blue-100 bg-blue-50/50 text-center"><p class="text-xs font-bold text-blue-600 uppercase mb-1">Perceivable</p><div class="text-2xl font-extrabold text-blue-900">${pc.Perceivable}</div></div>
              <div class="p-3 rounded-lg border border-violet-100 bg-violet-50/50 text-center"><p class="text-xs font-bold text-violet-600 uppercase mb-1">Operable</p><div class="text-2xl font-extrabold text-violet-900">${pc.Operable}</div></div>
              <div class="p-3 rounded-lg border border-amber-100 bg-amber-50/50 text-center"><p class="text-xs font-bold text-amber-600 uppercase mb-1">Understandable</p><div class="text-2xl font-extrabold text-amber-900">${pc.Understandable}</div></div>
              <div class="p-3 rounded-lg border border-teal-100 bg-teal-50/50 text-center"><p class="text-xs font-bold text-teal-600 uppercase mb-1">Robust</p><div class="text-2xl font-extrabold text-teal-900">${pc.Robust}</div></div>
            </div>
          </div>`;
        })() : ""}
      </div>

      <div class="sticky top-16 z-40 bg-slate-50/95 backdrop-blur py-4 border-b border-slate-200 mb-6 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-bold">Detailed Findings (${findings.length})</h3>
          <div class="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
            <button onclick="setView('severity')" id="view-severity" class="view-btn px-3 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700">By Severity</button>
            <button onclick="setView('page')" id="view-page" class="view-btn px-3 py-1 rounded text-xs font-medium text-slate-500 hover:text-slate-700">By Page</button>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div id="filter-controls" class="flex gap-2">
            <button onclick="filterIssues('all')" class="filter-btn active px-3 py-1.5 rounded-md text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-100">All</button>
            <button onclick="filterIssues('Critical')" class="filter-btn px-3 py-1.5 rounded-md text-xs font-medium border bg-white text-slate-600 border-slate-200 hover:bg-slate-50">Critical</button>
            <button onclick="filterIssues('High')" class="filter-btn px-3 py-1.5 rounded-md text-xs font-medium border bg-white text-slate-600 border-slate-200 hover:bg-slate-50">High</button>
          </div>
          ${pageSelectHtml}
        </div>
      </div>

      <div id="issues-container" class="space-y-6">
        ${findings.length === 0 ? "No issues found." : findings.map((f) => buildIssueCard(f)).join("\n")}
      </div>

      <div id="page-container" style="display:none">
        ${buildPageGroupedSection(findings)}
      </div>

      ${buildManualChecksSection()}
    </div>
  </div>

  <!-- PDF VERSION (Pure Document Design) -->
  <div class="pdf-only">

    <!-- Cover -->
    <div class="cover-page">
      <p style="font-family: sans-serif; font-weight: 900; letter-spacing: 2pt; font-size: 14pt; margin-bottom: 4cm;">ACCESSIBILITY AUDIT REPORT</p>
      <h1 style="font-size: 42pt !important; line-height: 1.1; border: none; margin: 0 0 1cm 0;">${escapeHtml(args.title)}</h1>
      <div style="display: flex; align-items: baseline; gap: 1rem; margin-bottom: 1cm;">
        <span style="font-family: sans-serif; font-size: 48pt; font-weight: 900; color: ${computeComplianceScore(totals) >= 75 ? "#16a34a" : computeComplianceScore(totals) >= 55 ? "#d97706" : "#dc2626"};">${computeComplianceScore(totals)}</span>
        <span style="font-family: sans-serif; font-size: 18pt; color: #9ca3af;">/ 100</span>
        <span style="font-family: sans-serif; font-size: 13pt; font-weight: 700; color: #374151; margin-left: 0.5rem;">${scoreLabel(computeComplianceScore(totals)).label} &mdash; ${scoreLabel(computeComplianceScore(totals)).risk}</span>
      </div>
      <div style="font-family: sans-serif; font-size: 10pt; line-height: 2; color: #374151; border-top: 1pt solid #e5e7eb; padding-top: 0.8cm;">
        <p style="margin: 0;"><strong>Target:</strong> ${escapeHtml(args.baseUrl)}</p>
        <p style="margin: 0;"><strong>Environment:</strong> ${escapeHtml(args.environment)}</p>
        <p style="margin: 0;"><strong>Standard:</strong> ${escapeHtml(args.target)}</p>
        <p style="margin: 0;"><strong>Date:</strong> ${dateStr}</p>
        <p style="margin: 0;"><strong>Automated findings:</strong> ${findings.length} &nbsp;|&nbsp; <strong>Manual checks:</strong> ${MANUAL_CHECKS.length} required</p>
      </div>
    </div>

    <!-- 1. Executive Summary -->
    ${buildPdfExecutiveSummary(args, findings, totals)}

    <!-- 2. Methodology & Scope -->
    ${buildPdfMethodologySection(args, findings)}

    <!-- 3. Compliance & Legal Risk -->
    ${buildPdfRiskSection(totals)}

    <!-- 4. Remediation Roadmap -->
    ${buildPdfRemediationRoadmap(findings)}

    <!-- 5. Issue Summary -->
    <div style="page-break-before: always;">
      <h2 style="margin-top: 0;">5. Issue Summary</h2>
      <p style="font-size: 10pt; line-height: 1.7; margin-bottom: 1rem;">
        The table below lists all accessibility issues detected during the automated scan.
        Each issue is identified by severity, affected page, and the user groups it impacts.
        Full technical detail for developers is provided in the accompanying HTML report.
      </p>
      ${findings.length === 0
        ? `<p style="font-style: italic; color: #6b7280; font-size: 10pt;">No accessibility violations were detected during the automated scan.</p>`
        : `<table class="stats-table">
            <thead>
              <tr><th>ID</th><th>Issue</th><th>Page</th><th>Severity</th><th>Users Affected</th></tr>
            </thead>
            <tbody>
              ${findings.map(f => `
              <tr>
                <td style="font-family: monospace; font-size: 8pt; white-space: nowrap;">${escapeHtml(f.id)}</td>
                <td style="font-size: 9pt;">${escapeHtml(f.title)}</td>
                <td style="font-family: monospace; font-size: 8pt; white-space: nowrap;">${escapeHtml(f.area)}</td>
                <td style="font-weight: 700; font-size: 9pt; white-space: nowrap;">${escapeHtml(f.severity)}</td>
                <td style="font-size: 9pt;">${escapeHtml(f.impactedUsers)}</td>
              </tr>`).join("")}
            </tbody>
          </table>`}
    </div>

    <!-- 6. Audit Scope & Limitations -->
    ${buildPdfAuditLimitations()}

  </div>

    <footer class="mt-10 py-6 border-t border-slate-200 text-center">
        <p class="text-slate-400 text-sm font-medium">Generated by <a href="https://github.com/diegovelasquezweb/a11y" target="_blank" class="text-slate-500 hover:text-indigo-600 font-semibold transition-colors">a11y</a> &bull; <span class="text-slate-500">${escapeHtml(args.target)}</span></p>
    </footer>

  </div>

  <script>
    // ── Manual checks — localStorage persistence ──────────────────────────
    const STORAGE_KEY = 'a11y-manual:${escapeHtml(args.baseUrl)}:${dateStr}';
    const TOTAL_CHECKS = ${MANUAL_CHECKS.length};

    function getState() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
      catch { return {}; }
    }

    function saveState(state) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    }

    function updateProgress() {
      const checked = document.querySelectorAll('.manual-checkbox:checked').length;
      const pct = TOTAL_CHECKS > 0 ? Math.round((checked / TOTAL_CHECKS) * 100) : 0;
      document.getElementById('manual-progress-label').textContent = checked + ' / ' + TOTAL_CHECKS + ' verified';
      document.getElementById('manual-progress-bar').style.width = pct + '%';
    }

    function applyCardState(card, checked) {
      const badge = card.querySelector('.manual-badge');
      const verifiedLabel = card.querySelector('.verified-label');
      if (checked) {
        card.classList.remove('border-amber-200');
        card.classList.add('border-emerald-200');
        card.querySelector('label').classList.remove('from-amber-50\\/60', 'hover:from-amber-50');
        card.querySelector('label').classList.add('from-emerald-50\\/60', 'hover:from-emerald-50');
        badge.textContent = '✓ Verified';
        badge.classList.replace('bg-amber-100', 'bg-emerald-100');
        badge.classList.replace('text-amber-800', 'text-emerald-700');
        badge.classList.replace('border-amber-200', 'border-emerald-200');
        verifiedLabel.classList.remove('hidden');
      } else {
        card.classList.add('border-amber-200');
        card.classList.remove('border-emerald-200');
        card.querySelector('label').classList.add('from-amber-50\\/60', 'hover:from-amber-50');
        card.querySelector('label').classList.remove('from-emerald-50\\/60', 'hover:from-emerald-50');
        badge.textContent = 'Manual';
        badge.classList.replace('bg-emerald-100', 'bg-amber-100');
        badge.classList.replace('text-emerald-700', 'text-amber-800');
        badge.classList.replace('border-emerald-200', 'border-amber-200');
        verifiedLabel.classList.add('hidden');
      }
    }

    function initManualChecks() {
      const state = getState();
      document.querySelectorAll('.manual-checkbox').forEach(cb => {
        const criterion = cb.dataset.criterion;
        const card = document.getElementById('manual-' + criterion.replace('.', '-'));
        cb.checked = !!state[criterion];
        if (card) applyCardState(card, cb.checked);
        cb.addEventListener('change', () => {
          const s = getState();
          s[criterion] = cb.checked;
          saveState(s);
          if (card) applyCardState(card, cb.checked);
          updateProgress();
        });
      });
      updateProgress();
    }

    function resetManualChecks() {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      document.querySelectorAll('.manual-checkbox').forEach(cb => {
        cb.checked = false;
        const card = document.getElementById('manual-' + cb.dataset.criterion.replace('.', '-'));
        if (card) applyCardState(card, false);
      });
      updateProgress();
    }

    document.addEventListener('DOMContentLoaded', initManualChecks);
    // ─────────────────────────────────────────────────────────────────────

    function setView(view) {
      const severityContainer = document.getElementById('issues-container');
      const pageContainer = document.getElementById('page-container');
      const filterControls = document.getElementById('filter-controls');
      const pageSelect = document.getElementById('page-select');
      const btnSeverity = document.getElementById('view-severity');
      const btnPage = document.getElementById('view-page');

      if (view === 'severity') {
        severityContainer.style.display = '';
        pageContainer.style.display = 'none';
        filterControls.style.display = '';
        if (pageSelect) pageSelect.style.display = 'none';
        btnSeverity.classList.add('bg-indigo-50', 'text-indigo-700');
        btnSeverity.classList.remove('text-slate-500', 'hover:text-slate-700');
        btnPage.classList.remove('bg-indigo-50', 'text-indigo-700');
        btnPage.classList.add('text-slate-500', 'hover:text-slate-700');
      } else {
        severityContainer.style.display = 'none';
        pageContainer.style.display = '';
        filterControls.style.display = 'none';
        if (pageSelect) {
          pageSelect.style.display = '';
          pageSelect.value = 'all';
          filterByPage('all');
        }
        btnPage.classList.add('bg-indigo-50', 'text-indigo-700');
        btnPage.classList.remove('text-slate-500', 'hover:text-slate-700');
        btnSeverity.classList.remove('bg-indigo-50', 'text-indigo-700');
        btnSeverity.classList.add('text-slate-500', 'hover:text-slate-700');
      }
    }

    function filterByPage(page) {
      document.querySelectorAll('.page-group').forEach(group => {
        group.style.display = (page === 'all' || group.dataset.page === page) ? '' : 'none';
      });
    }

    function filterIssues(severity) {
        // Reset buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            // Remove active styles
            btn.classList.remove('bg-indigo-50', 'text-indigo-700', 'border-indigo-100');
            // Remove inactive styles
            btn.classList.remove('bg-white', 'text-slate-600', 'border-slate-200', 'hover:bg-slate-50');
            
            if(btn.textContent.includes(severity) || (severity === 'all' && btn.textContent.includes('All'))) {
                // Add Active
                btn.classList.add('bg-indigo-50', 'text-indigo-700', 'border-indigo-100');
            } else {
                // Add Inactive
                btn.classList.add('bg-white', 'text-slate-600', 'border-slate-200', 'hover:bg-slate-50');
            }
        });

        // Filter cards
        const cards = document.querySelectorAll('.issue-card');
        let visibleCount = 0;
        
        cards.forEach(card => {
            if (severity === 'all' || card.dataset.severity === severity) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Handle empty state
        const container = document.getElementById('issues-container');
        let emptyMsg = document.getElementById('dynamic-empty-state');
        
        if (visibleCount === 0) {
            if (!emptyMsg) {
                emptyMsg = document.createElement('div');
                emptyMsg.id = 'dynamic-empty-state';
                emptyMsg.className = 'text-center py-12 bg-slate-50 rounded-xl border border-slate-100 border-dashed';
                emptyMsg.innerHTML = \`
                    <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4 text-slate-400">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h3 class="text-sm font-bold text-slate-900">No matching issues</h3>
                    <p class="text-xs text-slate-500 mt-1">There are no \${severity === 'all' ? '' : severity.toLowerCase()} issues in this report.</p>
                \`;
                container.appendChild(emptyMsg);
            }
            emptyMsg.style.display = 'block';
        } else {
            if (emptyMsg) emptyMsg.style.display = 'none';
        }
    }

    // Header scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 20) {
            nav.classList.add('shadow-md');
        } else {
            nav.classList.remove('shadow-md');
        }
    });
  </script>
</body>
</html>`;
}

function buildMarkdownSummary(args, findings) {
  const totals = buildSummary(findings);
  const status = findings.length === 0 ? "PASS" : "ISSUES FOUND";

  function findingToMd(f) {
    const evidenceHtml = (() => {
      if (!f.evidence) return "";
      try {
        const nodes = JSON.parse(f.evidence);
        if (!Array.isArray(nodes) || nodes.length === 0) return "";
        return nodes
          .map((n) => (n.html ? `\`\`\`html\n${n.html}\n\`\`\`` : ""))
          .filter(Boolean)
          .join("\n");
      } catch {
        return "";
      }
    })();

    return [
      `---`,
      `### ${f.id} · ${f.severity} · \`${f.ruleId || f.title}\``,
      ``,
      `| Field | Value |`,
      `|---|---|`,
      `| **Page** | \`${f.area}\` |`,
      `| **Selector** | \`${f.selector}\` |`,
      `| **WCAG** | ${f.wcag} |`,
      `| **Impacted users** | ${f.impactedUsers} |`,
      f.screenshotPath ? `| **Screenshot** | ![${f.id}](${f.screenshotPath}) |` : null,
      ``,
      `**Expected:** ${f.expected}`,
      ``,
      `**Actual:** ${f.actual}`,
      ``,
      f.fixDescription || f.fixCode
        ? [
            f.fixDescription ? `**Fix:** ${f.fixDescription}` : null,
            f.fixCode ? `\`\`\`html\n${f.fixCode}\n\`\`\`` : null,
          ].filter(Boolean).join("\n\n")
        : `**Fix:** ${f.recommendedFix}`,
      ``,
      evidenceHtml ? `**Affected HTML:**\n${evidenceHtml}` : "",
      ``,
      `**Reference:** ${f.recommendedFix}`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  function findingsByPrinciple(severities) {
    const filtered = findings.filter((f) => severities.includes(f.severity));
    if (filtered.length === 0) return "";

    const PRINCIPLES = ["Perceivable", "Operable", "Understandable", "Robust"];
    const groups = {};
    for (const p of PRINCIPLES) groups[p] = [];
    for (const f of filtered) groups[wcagPrinciple(f.ruleId)].push(f);

    return PRINCIPLES.filter((p) => groups[p].length > 0)
      .map((p) => `### ${p} (WCAG ${["1","2","3","4"][PRINCIPLES.indexOf(p)]}.x)\n\n${groups[p].map(findingToMd).join("\n\n")}`)
      .join("\n\n");
  }

  const blockers = findingsByPrinciple(["Critical", "High"]);
  const deferred = findingsByPrinciple(["Medium", "Low"]);

  return `# Accessibility Audit — Remediation Guide

> **Generated:** ${new Date().toISOString()}
> **Target:** ${args.baseUrl || "N/A"}
> **Standard:** ${args.target}
> **Status:** ${status}

## Overview

| Severity | Count |
|---|---|
| Critical | ${totals.Critical} |
| High | ${totals.High} |
| Medium | ${totals.Medium} |
| Low | ${totals.Low} |
| **Total** | **${findings.length}** |

${findings.length === 0 ? "> No accessibility violations found. All checks passed." : ""}

## Agent Instructions

When asked to fix accessibility issues, use this file as your primary reference.
Each finding includes the affected selector, a code fix template, and the exact HTML evidence from the page.
Apply fixes in the source code — do not modify this file or the audit output.
Prioritize Critical and High issues first.

If you have access to the source code, locate the file to edit by searching for
the HTML snippet shown under **Affected HTML** in each finding. The selector and
URL are also available to narrow the search.

${blockers ? `## Priority Fixes (Critical & High)\n\n${blockers}` : "## Priority Fixes\n\nNo critical or high severity issues found."}

${deferred ? `## Deferred Issues (Medium & Low)\n\n${deferred}` : "## Deferred Issues\n\nNo medium or low severity issues found."}

${buildManualChecksMd()}`.trimEnd() + "\n";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPayload = readJson(args.input);
  if (!inputPayload)
    throw new Error(`Input findings file not found or invalid: ${args.input}`);

  const findings = normalizeFindings(inputPayload);

  const html = buildHtml(args, findings);
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, html, "utf-8");

  const md = buildMarkdownSummary(args, findings);
  const mdPath = path.join(path.dirname(args.output), "summary.md");
  fs.writeFileSync(mdPath, md, "utf-8");

  if (findings.length === 0) {
    log.info("Congratulations, no issues found.");
  }
  log.success(`HTML report written to ${args.output}`);
  log.success(`AI summary written to ${mdPath}`);
}

try {
  main();
} catch (error) {
  log.error(error.message);
  process.exit(1);
}
