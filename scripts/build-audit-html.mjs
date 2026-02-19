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
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            ${escapeHtml(finding.area)}
        </div>
        <div class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            <a href="${escapeHtml(finding.url)}" target="_blank" class="hover:text-indigo-600 hover:underline truncate max-w-[200px] md:max-w-md transition-colors">${escapeHtml(finding.url)}</a>
        </div>
        <div class="flex items-center gap-1.5 w-full md:w-auto mt-1 md:mt-0">
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
            <code class="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-700 border border-slate-200 font-mono truncate max-w-full">${escapeHtml(finding.selector)}</code>
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
  const steps = check.steps
    .map((s) => `<li class="mb-1.5 text-slate-600 text-sm">${escapeHtml(s)}</li>`)
    .join("");
  return `
<div class="bg-white rounded-xl border border-amber-200 shadow-sm mb-4 overflow-hidden">
  <div class="p-5 border-b border-amber-100 bg-gradient-to-r from-amber-50/60 to-white flex flex-wrap items-center gap-3">
    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-amber-100 text-amber-800 border-amber-200">Manual</span>
    <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 font-mono">${escapeHtml(check.criterion)}</span>
    <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 ml-auto">WCAG 2.2 ${escapeHtml(check.level)}</span>
    <h3 class="text-base font-bold text-slate-900 w-full mt-1">${escapeHtml(check.title)}</h3>
  </div>
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
  const cards = MANUAL_CHECKS.map((c) => buildManualCheckCard(c)).join("\n");
  return `
<div class="mt-16">
  <div class="flex items-center gap-3 mb-2">
    <h3 class="text-lg font-bold text-slate-900">Manual Verification Required</h3>
    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">${MANUAL_CHECKS.length} checks</span>
  </div>
  <p class="text-sm text-slate-500 mb-6">These WCAG 2.2 criteria cannot be detected automatically by axe-core. Review each one manually before certifying compliance.</p>
  ${cards}
</div>`;
}

function buildManualChecksPdfSection() {
  const entries = MANUAL_CHECKS.map((check) => {
    const steps = check.steps
      .map((s, i) => `<p style="margin: 4pt 0 4pt 16pt; font-size: 9pt;">${i + 1}. ${escapeHtml(s)}</p>`)
      .join("");
    return `
<div style="border-top: 1pt solid #d1d5db; padding-top: 1rem; margin-top: 1.5rem; page-break-inside: avoid;">
  <p style="font-family: sans-serif; font-size: 9pt; font-weight: 800; text-transform: uppercase; margin-bottom: 4pt;">
    Manual · ${escapeHtml(check.criterion)} · WCAG 2.2 ${escapeHtml(check.level)}
  </p>
  <h4 style="margin: 0 0 6pt 0; border: none; font-size: 12pt;">${escapeHtml(check.title)}</h4>
  <p style="font-size: 9pt; color: #374151; margin-bottom: 6pt;">${escapeHtml(check.description)}</p>
  <p style="font-size: 9pt; font-weight: 700; margin-bottom: 2pt;">How to verify:</p>
  ${steps}
  <p style="font-size: 8pt; color: #6366f1; margin-top: 6pt;">Ref: ${escapeHtml(check.ref)}</p>
</div>`;
  }).join("");

  return `
<div style="page-break-before: always;">
  <h2>3. Manual Verification Required (WCAG 2.2)</h2>
  <p style="font-size: 10pt;">The following criteria cannot be detected by automated tools. Each must be verified manually before declaring WCAG 2.2 AA compliance.</p>
  ${entries}
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

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-5 mb-12">
        <div class="bg-white p-5 rounded-xl border border-rose-100"><p class="text-xs font-bold text-rose-600 uppercase">Critical</p><div class="text-4xl font-bold">${totals.Critical}</div></div>
        <div class="bg-white p-5 rounded-xl border border-orange-100"><p class="text-xs font-bold text-orange-600 uppercase">High</p><div class="text-4xl font-bold">${totals.High}</div></div>
        <div class="bg-white p-5 rounded-xl border border-amber-100"><p class="text-xs font-bold text-amber-600 uppercase">Medium</p><div class="text-4xl font-bold">${totals.Medium}</div></div>
        <div class="bg-white p-5 rounded-xl border border-emerald-100"><p class="text-xs font-bold text-emerald-600 uppercase">Low</p><div class="text-4xl font-bold">${totals.Low}</div></div>
      </div>

      <div class="sticky top-16 z-40 bg-slate-50/95 backdrop-blur py-4 border-b border-slate-200 mb-6 flex justify-between items-center">
        <h3 class="text-lg font-bold">Detailed Findings (${findings.length})</h3>
        <div class="flex gap-2">
          <button onclick="filterIssues('all')" class="filter-btn active px-3 py-1.5 rounded-md text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-100">All</button>
          <button onclick="filterIssues('Critical')" class="filter-btn px-3 py-1.5 rounded-md text-xs font-medium border bg-white text-slate-600 border-slate-200 hover:bg-slate-50">Critical</button>
          <button onclick="filterIssues('High')" class="filter-btn px-3 py-1.5 rounded-md text-xs font-medium border bg-white text-slate-600 border-slate-200 hover:bg-slate-50">High</button>
        </div>
      </div>

      <div id="issues-container" class="space-y-6">
        ${findings.length === 0 ? "No issues found." : findings.map((f) => buildIssueCard(f)).join("\n")}
      </div>

      ${buildManualChecksSection()}
    </div>
  </div>

  <!-- PDF VERSION (Pure Document Design) -->
  <div class="pdf-only">
    <div class="cover-page">
      <p style="font-family: sans-serif; font-weight: 900; letter-spacing: 2pt; font-size: 14pt; margin-bottom: 4cm;">ACCESSIBILITY AUDIT REPORT</p>
      <h1 style="font-size: 42pt !important; line-height: 1.1; border: none; margin: 0;">${escapeHtml(args.title)}</h1>
      <div style="margin-top: 5cm; font-family: sans-serif;">
        <p><strong>Target:</strong> ${escapeHtml(args.baseUrl)}</p>
        <p><strong>Environment:</strong> ${escapeHtml(args.environment)}</p>
        <p><strong>Standards:</strong> ${escapeHtml(args.target)}</p>
        <p><strong>Date:</strong> ${dateStr}</p>
      </div>
    </div>

    <h2>1. Executive Summary</h2>
    <p>This document provides a comprehensive analysis of the accessibility compliance for the targeted routes. Below is a summary of the violations detected during the automated scan.</p>
    
    <table class="stats-table">
      <thead>
        <tr><th>Severity</th><th>Issue Count</th><th>Description</th></tr>
      </thead>
      <tbody>
        <tr><td>Critical</td><td>${totals.Critical}</td><td>Immediate barriers for users with disabilities.</td></tr>
        <tr><td>High</td><td>${totals.High}</td><td>Serious impediments to core task completion.</td></tr>
        <tr><td>Medium</td><td>${totals.Medium}</td><td>Usability friction and partial WCAG violations.</td></tr>
        <tr><td>Low</td><td>${totals.Low}</td><td>Best practice improvements and minor defects.</td></tr>
      </tbody>
    </table>

    <div style="page-break-after: always;"></div>

    <h2>2. Detailed Technical Findings</h2>
    <div id="pdf-findings">
      ${findings
        .map(
          (f) => `
        <div class="finding-entry">
          <div class="severity-tag">${f.severity}</div>
          <h3 style="margin-top: 0 !important; border: none;">${f.id}: ${f.title}</h3>
          ${f.ruleId ? `<p style="font-family: monospace; font-size: 9pt; color: #555;">Rule: ${escapeHtml(f.ruleId)} &bull; ${escapeHtml(f.wcag)}</p>` : ""}

          <p><strong>Location:</strong> ${escapeHtml(f.area)} at <a href="${f.url}">${f.url}</a></p>
          <p><strong>Selector:</strong> <code>${escapeHtml(f.selector)}</code></p>
          <p><strong>Impacted Users:</strong> ${escapeHtml(f.impactedUsers)}</p>

          <h4>Issue Discovery</h4>
          <p><strong>Expected:</strong> ${escapeHtml(f.expected)}</p>
          <p><strong>Actual:</strong> ${escapeHtml(f.actual)}</p>

          <div class="remediation-box">
            <h4 style="margin: 0 0 0.5rem 0; border: none;">Remediation</h4>
            ${f.fixDescription ? `<p style="margin: 0 0 0.5rem 0; font-size: 9pt;">${escapeHtml(f.fixDescription)}</p>` : ""}
            ${f.fixCode ? `<pre style="margin: 0 0 0.5rem 0; font-size: 8pt;">${escapeHtml(f.fixCode)}</pre>` : ""}
            <p style="margin-bottom: 0; font-size: 9pt;">${linkify(escapeHtml(f.recommendedFix))}</p>
          </div>

          ${f.evidence ? `<h4>Technical Evidence</h4>${formatEvidence(f.evidence)}` : ""}
        </div>
      `,
        )
        .join("")}
    </div>

    ${buildManualChecksPdfSection()}
  </div>

    <footer class="mt-20 pt-10 border-t border-slate-200 text-center">
        <p class="text-slate-400 text-sm font-medium">Generated by Automated Accessibility Pipeline &bull; <span class="text-slate-500">${escapeHtml(args.target)}</span></p>
    </footer>

  </div>

  <script>
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

  const findingsBySection = (severities) =>
    findings
      .filter((f) => severities.includes(f.severity))
      .map((f) => {
        const evidenceHtml = (() => {
          if (!f.evidence) return "";
          try {
            const nodes = JSON.parse(f.evidence);
            if (!Array.isArray(nodes) || nodes.length === 0) return "";
            return nodes
              .map((n) =>
                n.html
                  ? `\`\`\`html\n${n.html}\n\`\`\``
                  : "",
              )
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
      })
      .join("\n\n");

  const blockers = findingsBySection(["Critical", "High"]);
  const deferred = findingsBySection(["Medium", "Low"]);

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

${deferred ? `## Deferred Issues (Medium & Low)\n\n${deferred}` : ""}

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
