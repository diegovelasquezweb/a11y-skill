#!/usr/bin/env node

import { log, readJson, getInternalPath, loadConfig } from "./a11y-utils.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeFindings,
  buildSummary,
  computeComplianceScore,
  scoreLabel,
} from "./report/core-findings.mjs";
import { escapeHtml } from "./report/core-utils.mjs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manualChecksPath = path.join(__dirname, "../assets/manual-checks.json");
const MANUAL_CHECKS = JSON.parse(fs.readFileSync(manualChecksPath, "utf-8"));
import {
  buildIssueCard,
  buildManualChecksSection,
  buildGlobalReferencesSection,
} from "./report/format-html.mjs";
import {
  buildPdfExecutiveSummary,
  buildPdfMethodologySection,
  buildPdfRiskSection,
  buildPdfRemediationRoadmap,
  buildPdfAuditLimitations,
  buildPageGroupedSection,
} from "./report/format-pdf.mjs";

function printUsage() {
  log.info(`Usage:
  node build-report-html.mjs [options]

Options:
  --input <path>           Findings JSON path (default: audit/internal/a11y-findings.json)
  --output <path>          Output HTML path (default: audit/report.html)
  --title <text>           Report title
  --environment <text>     Test environment label
  --scope <text>           Audit scope label
  --target <text>          Compliance target label (default: WCAG 2.2 AA)
  --company-name <text>    Company name override
  --accent-color <hex>     Accent color override (e.g., #6366f1)
  -h, --help               Show this help
`);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const config = loadConfig();
  const args = {
    input: getInternalPath("a11y-findings.json"),
    scanResults: getInternalPath("a11y-scan-results.json"),
    output: path.join(process.cwd(), config.outputDir, "report.html"),
    title: config.reportTitle,
    baseUrl: "",
    environment: "Local Development",
    scope: "Full Site Scan",
    target: config.complianceTarget,
    accentColor: config.accentColor,
    companyName: config.companyName,
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
    if (key === "--company-name") args.companyName = value;
    if (key === "--accent-color") args.accentColor = value;
    i += 1;
  }

  return args;
}

function buildHtml(args, findings, metadata = {}) {
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

  const _pageCounts = {};
  for (const f of findings) {
    _pageCounts[f.area] = (_pageCounts[f.area] || 0) + 1;
  }
  const _sortedPages = Object.entries(_pageCounts).sort((a, b) => b[1] - a[1]);
  const selectClasses =
    "pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] shadow-sm transition-all appearance-none cursor-pointer relative bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat";

  const pageSelectHtml =
    _sortedPages.length > 1
      ? `<div id="page-select-container" style="display:none" class="flex items-center gap-2 shrink-0">
          <label for="page-select" class="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:block whitespace-nowrap">Page:</label>
          <select id="page-select" onchange="filterByPage(this.value)" class="${selectClasses}">
            <option value="all">All pages (${_sortedPages.length})</option>
            ${_sortedPages.map(([pg, cnt]) => `<option value="${escapeHtml(pg)}">${escapeHtml(pg)} (${cnt})</option>`).join("")}
          </select>
        </div>`
      : "";

  const score = computeComplianceScore(totals);
  const label = scoreLabel(score);
  const scoreHue = score >= 90 ? 142 : score >= 75 ? 142 : score >= 55 ? 38 : 0;

  const personaGroups = {
    screenReader: {
      label: "Screen Readers",
      count: 0,
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    keyboard: {
      label: "Keyboard Only",
      count: 0,
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 10h18M7 15h1m4 0h1m4 0h1m-7 4h4M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    vision: {
      label: "Color/Low Vision",
      count: 0,
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    cognitive: {
      label: "Cognitive/Motor",
      count: 0,
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
  };

  // Smart Mapping: Define rules and keywords for accurate persona categorization
  const SMART_MAP = {
    screenReader: {
      rules: [
        "frame-title",
        "aria-dialog-name",
        "landmark-unique",
        "aria-allowed-role",
        "nested-interactive",
        "aria-hidden-focus",
        "aria-valid-attr",
      ],
      keywords: [
        "screen reader",
        "assistive technology",
        "aria",
        "label",
        "announced",
      ],
    },
    keyboard: {
      rules: [
        "nested-interactive",
        "scrollable-region-focusable",
        "focus-order-semantics",
        "tabindex",
      ],
      keywords: ["keyboard", "focusable", "tab order", "interactive"],
    },
    vision: {
      rules: ["color-contrast", "image-redundant-alt", "image-alt"],
      keywords: ["vision", "color", "contrast", "blind"],
    },
    cognitive: {
      rules: [
        "heading-order",
        "empty-heading",
        "page-has-heading-one",
        "duplicate-id",
      ],
      keywords: [
        "cognitive",
        "motor",
        "heading",
        "structure",
        "navigation",
        "hierarchy",
      ],
    },
  };

  const uniqueIssues = {
    screenReader: new Set(),
    keyboard: new Set(),
    vision: new Set(),
    cognitive: new Set(),
  };

  for (const f of findings) {
    const users = f.impactedUsers.toLowerCase();
    const ruleId = (f.ruleId || "").toLowerCase();
    const title = (f.title || "").toLowerCase();
    const issueKey = f.ruleId || f.title;

    Object.keys(SMART_MAP).forEach((persona) => {
      const { rules, keywords } = SMART_MAP[persona];
      const matchRule = rules.some((r) => ruleId.includes(r));
      const matchKeyword = keywords.some(
        (k) => users.includes(k) || title.includes(k),
      );

      if (matchRule || matchKeyword) {
        uniqueIssues[persona].add(issueKey);
      }
    });
  }

  personaGroups.screenReader.count = uniqueIssues.screenReader.size;
  personaGroups.keyboard.count = uniqueIssues.keyboard.size;
  personaGroups.vision.count = uniqueIssues.vision.size;
  personaGroups.cognitive.count = uniqueIssues.cognitive.size;

  const quickWins = findings
    .filter(
      (f) => (f.severity === "Critical" || f.severity === "High") && f.fixCode,
    )
    .slice(0, 3);

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
      :root {
        --primary-h: 226;
        --primary-s: 70%;
        --primary-l: 50%;
        --primary: ${args.accentColor || "hsl(var(--primary-h), var(--primary-s), var(--primary-l))"};
        --primary-light: ${args.accentColor ? args.accentColor + "15" : "hsl(var(--primary-h), var(--primary-s), 95%)"};
        --primary-dark: ${args.accentColor || "hsl(var(--primary-h), var(--primary-s), 30%)"};
        --slate-50: #f8fafc;
        --slate-100: #f1f5f9;
        --slate-200: #e2e8f0;
        --slate-300: #cbd5e1;
        --slate-400: #94a3b8;
        --slate-500: #64748b;
        --slate-600: #475569;
        --slate-700: #334155;
        --slate-800: #1e293b;
        --slate-900: #0f172a;
      }
      body { background-color: var(--slate-50); font-family: 'Outfit', 'Inter', sans-serif; -webkit-font-smoothing: antialiased; letter-spacing: -0.011em; }
      .glass-header { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px) saturate(180%); -webkit-backdrop-filter: blur(12px) saturate(180%); }
      .premium-card { background: white; border: 1px solid var(--slate-200); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      .premium-card:hover { transform: translateY(-2px); border-color: var(--slate-300); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04); }
      .issue-card { position: relative; transition: all 0.3s ease; }
      .issue-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 4px 0 0 4px; opacity: 0.8; }
      .issue-card[data-severity="Critical"]::before { background: #e11d48; }
      .issue-card[data-severity="High"]::before { background: #f97316; }
      .issue-card[data-severity="Medium"]::before { background: #f59e0b; }
      .issue-card[data-severity="Low"]::before { background: #10b981; }

      .score-gauge { transform: rotate(-90deg); }
      .score-gauge-bg { fill: none; stroke: var(--slate-100); stroke-width: 3; }
      .score-gauge-val { fill: none; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 1s ease-out; }
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
          <div class="px-3 h-10 rounded-lg bg-[var(--primary)] text-white font-bold text-base font-mono flex items-center justify-center shadow-lg">${args.companyName || "a11y"}</div>
          <h1 class="text-xl font-bold">${args.companyName ? escapeHtml(args.reportTitle) : 'Accessibility <span class="text-slate-500">Report</span>'}</h1>
        </div>
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusColor}">
          ${statusIcon} <span>${statusText}</span>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 pt-24 pb-20">
      <div class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-3xl font-extrabold mb-2">${escapeHtml(args.title)}</h2>
          <p class="text-slate-500">${dateStr} &bull; ${escapeHtml(args.baseUrl)}</p>
        </div>
      </div>

      <!-- Dashboard Grid -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-12">
        <!-- 1. Score & Main Stats -->
        <div class="xl:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div class="md:col-span-5 premium-card rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div class="absolute top-0 right-0 p-4 opacity-5">
              <svg class="w-32 h-32 text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </div>
            <div class="relative w-32 h-32 mb-4">
              <svg class="w-full h-full score-gauge" viewBox="0 0 36 36">
                <circle class="score-gauge-bg" cx="18" cy="18" r="16" />
                <circle class="score-gauge-val" cx="18" cy="18" r="16"
                  stroke="hsl(${scoreHue}, 70%, 50%)"
                  stroke-dasharray="${score}, 100" />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-4xl font-extrabold text-slate-900">${score}</span>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Score</span>
              </div>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-1">${label} Compliance</h3>
            <p class="text-xs font-medium text-slate-500 max-w-[200px] leading-snug">Automated testing coverage based on ${escapeHtml(args.target)} technical checks.</p>
          </div>

          <div class="md:col-span-7 grid grid-cols-2 gap-4">
            <div class="premium-card p-5 rounded-2xl border-l-[6px] border-rose-500">
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Critical</span>
              </div>
              <div class="text-4xl font-black text-slate-900">${totals.Critical}</div>
              <p class="text-[10px] text-slate-400 font-medium mt-1 leading-tight">Functional blockers</p>
            </div>
            <div class="premium-card p-5 rounded-2xl border-l-[6px] border-orange-500">
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold text-orange-600 uppercase tracking-widest">High</span>
              </div>
              <div class="text-4xl font-black text-slate-900">${totals.High}</div>
              <p class="text-[10px] text-slate-400 font-medium mt-1 leading-tight">Serious impediments</p>
            </div>
            <div class="premium-card p-5 rounded-2xl border-l-[6px] border-amber-400">
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Medium</span>
              </div>
              <div class="text-4xl font-black text-slate-900">${totals.Medium}</div>
              <p class="text-[10px] text-slate-400 font-medium mt-1 leading-tight">Significant friction</p>
            </div>
            <div class="premium-card p-5 rounded-2xl border-l-[6px] border-emerald-500">
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Low</span>
              </div>
              <div class="text-4xl font-black text-slate-900">${totals.Low}</div>
              <p class="text-[10px] text-slate-400 font-medium mt-1 leading-tight">Best practices</p>
            </div>
          </div>
        </div>

        <!-- 2. Persona Impact -->
        <div class="xl:col-span-4 premium-card rounded-2xl p-6">
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Persona Impact Matrix
          </h3>
          <p class="text-xs text-slate-400 mb-6 -mt-4 leading-relaxed italic">Distribution of unique accessibility barriers per user profile. Duplicate errors are grouped to show strategic impact.</p>
          <div class="space-y-4">
            ${Object.entries(personaGroups)
              .map(
                ([, p]) => `
            <div class="group">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[var(--primary-light)] group-hover:text-[var(--primary)] transition-colors">${p.icon}</div>
                  <span class="text-sm font-bold text-slate-700">${p.label}</span>
                </div>
                <span class="text-xs font-black text-slate-900">${p.count} issues</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div class="bg-[var(--primary)] h-full rounded-full transition-all duration-500" style="width: ${findings.length > 0 ? (p.count / findings.length) * 100 : 0}%"></div>
              </div>
            </div>`,
              )
              .join("")}
          </div>
        </div>
      </div>

      <!-- Quick Wins Banner (Actionable Insight) -->
      ${
        quickWins.length > 0
          ? `
      <div class="premium-card rounded-2xl bg-slate-900 p-6 mb-12 relative overflow-hidden">
        <div class="absolute -right-4 -bottom-4 opacity-10">
          <svg class="w-32 h-32 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <div class="relative z-10">
          <div class="flex items-center gap-3 mb-4">
            <span class="px-2 py-0.5 rounded bg-[var(--primary)] text-[10px] font-black text-white uppercase tracking-tighter">AI Analysis</span>
            <h3 class="text-xl font-bold text-white">Recommended Quick Wins</h3>
          </div>
          <p class="text-xs text-[var(--primary)]/80 mb-6 -mt-2 leading-relaxed italic">High-priority issues with ready-to-use code fixes for immediate remediation.</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${quickWins
              .map(
                (w) => `
            <div class="bg-slate-800/50 border border-slate-700 p-4 rounded-xl backdrop-blur-sm">
              <div class="flex items-center justify-between mb-2">
                <span class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold uppercase tracking-tight line-clamp-1">${w.severity}</span>
                <span class="text-slate-500 text-[9px] font-mono">${w.id}</span>
              </div>
              <h4 class="text-sm font-bold text-slate-200 mb-1 line-clamp-1">${w.title}</h4>
              <p class="text-[10px] text-slate-500 font-mono mb-3 truncate">Page: ${w.area}</p>
              <button onclick="scrollToIssue('${w.id}')" class="text-[10px] font-bold text-[var(--primary)] hover:opacity-80 transition-colors uppercase tracking-widest flex items-center gap-1">
                View Solution
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>`,
              )
              .join("")}
          </div>
        </div>
      </div>`
          : ""
      }

      <div id="findings-toolbar" class="sticky top-16 z-40 bg-slate-50/95 backdrop-blur-md py-5 border-b border-slate-200/80 mb-8 flex flex-col gap-5">
        <!-- Row 1: Title, View Toggle & Expand All -->
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-4">
            <h3 class="text-xl font-extrabold text-slate-900 tracking-tight">Findings <span class="text-slate-400 font-bold ml-1">${findings.length}</span></h3>
            <div class="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button onclick="setView('severity')" id="view-severity" class="view-btn px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-[var(--primary-light)] text-[var(--primary)] transition-all">By Severity</button>
              ${
                Object.keys(_pageCounts).length > 1
                  ? `<button onclick="setView('page')" id="view-page" class="view-btn px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-all">By Page</button>`
                  : ""
              }
            </div>
          </div>
          <button onclick="toggleAllCards()" id="expand-all-btn" class="px-5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold uppercase tracking-widest text-slate-600 hover:border-slate-300 hover:text-slate-800 shadow-sm transition-all">Expand all</button>
        </div>

        <!-- Row 2: Search & Filter Select -->
        <div class="flex items-center gap-4 w-full">
          <div class="relative flex-1">
            <input type="text" id="search-input" oninput="handleSearch(this.value)" placeholder="Search violations..." class="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition-all shadow-sm">
            <svg class="absolute left-4 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          
          <div id="filter-controls" class="flex items-center gap-2 shrink-0">
            <label for="filter-select" class="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:block whitespace-nowrap">Filter by:</label>
            <select id="filter-select" onchange="filterIssues(this.value)" class="${selectClasses}">
              <optgroup label="General">
                <option value="all">All Issues</option>
              </optgroup>
              <optgroup label="Severity">
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </optgroup>
              <optgroup label="WCAG Principle">
                <option value="Perceivable">Perceivable</option>
                <option value="Operable">Operable</option>
                <option value="Understandable">Understandable</option>
                <option value="Robust">Robust</option>
              </optgroup>
            </select>
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
      ${
        findings.length === 0
          ? `<p style="font-style: italic; color: #6b7280; font-size: 10pt;">No accessibility violations were detected during the automated scan.</p>`
          : `<table class="stats-table">
            <thead>
              <tr><th>ID</th><th>Issue</th><th>Page</th><th>Severity</th><th>Users Affected</th></tr>
            </thead>
            <tbody>
              ${findings
                .map(
                  (f) => `
              <tr>
                <td style="font-family: monospace; font-size: 8pt; white-space: nowrap;">${escapeHtml(f.id)}</td>
                <td style="font-size: 9pt;">${escapeHtml(f.title)}</td>
                <td style="font-family: monospace; font-size: 8pt; white-space: nowrap;">${escapeHtml(f.area)}</td>
                <td style="font-weight: 700; font-size: 9pt; white-space: nowrap;">${escapeHtml(f.severity)}</td>
                <td style="font-size: 9pt;">${escapeHtml(f.impactedUsers)}</td>
              </tr>`,
                )
                .join("")}
            </tbody>
          </table>`
      }
    </div>

    <!-- 6. Audit Scope & Limitations -->
    ${buildPdfAuditLimitations()}

      ${buildGlobalReferencesSection(metadata)}
    </div>

    <footer class="mt-10 py-6 border-t border-slate-200 text-center">
        <p class="text-slate-400 text-sm font-medium">Generated by <a href="https://github.com/diegovelasquezweb/a11y" target="_blank" class="text-slate-500 hover:text-[var(--primary)] font-semibold transition-colors">a11y</a> &bull; <span class="text-slate-500">${escapeHtml(args.target)}</span></p>
    </footer>

  </div>

  <script>
    // ── Manual checks — localStorage persistence ──────────────────────────
    const STORAGE_KEY = 'a11y-manual:${escapeHtml(args.baseUrl)}';
    const TOTAL_CHECKS = ${MANUAL_CHECKS.length};

    function getState() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
      catch { return {}; }
    }

    function saveState(state) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    }

    function updateProgress() {
      let verified = 0, na = 0;
      document.querySelectorAll('.manual-card').forEach(c => {
        const s = c.dataset.state;
        if (s === 'verified') verified++;
        else if (s === 'na') na++;
      });
      const applicable = TOTAL_CHECKS - na;
      const pct = applicable > 0 ? Math.round((verified / applicable) * 100) : 100;
      let label = verified + ' / ' + (applicable) + ' verified';
      if (na > 0) label += ' · ' + na + ' N/A';
      document.getElementById('manual-progress-label').textContent = label;
      document.getElementById('manual-progress-bar').style.width = pct + '%';
    }

    function applyCardState(card, state) {
      const header = card.querySelector('.manual-header');
      const badge = card.querySelector('.manual-badge');
      const verifiedBtn = card.querySelector('.manual-verified-btn');
      const naBtn = card.querySelector('.manual-na-btn');
      card.dataset.state = state || '';
      const BASE_VERIFIED = 'manual-verified-btn px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap';
      const BASE_NA = 'manual-na-btn px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap';
      card.classList.remove('border-amber-200', 'border-emerald-200', 'border-slate-300');
      header.classList.remove('from-amber-50\\/60', 'hover:from-amber-50', 'from-emerald-50\\/60', 'hover:from-emerald-50', 'from-slate-50\\/60', 'hover:from-slate-50');
      if (state === 'verified') {
        card.classList.add('border-emerald-200');
        header.classList.add('from-emerald-50\\/60', 'hover:from-emerald-50');
        badge.textContent = '✓ Verified';
        badge.className = 'manual-badge px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-700 border-emerald-200';
        if (verifiedBtn) verifiedBtn.className = BASE_VERIFIED + ' border-emerald-400 bg-emerald-100 text-emerald-700';
        if (naBtn) naBtn.className = BASE_NA + ' border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50';
      } else if (state === 'na') {
        card.classList.add('border-slate-300');
        header.classList.add('from-slate-50\\/60', 'hover:from-slate-50');
        badge.textContent = 'N/A';
        badge.className = 'manual-badge px-2.5 py-0.5 rounded-full text-xs font-bold border bg-slate-100 text-slate-600 border-slate-300';
        if (verifiedBtn) verifiedBtn.className = BASE_VERIFIED + ' border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50';
        if (naBtn) naBtn.className = BASE_NA + ' border-slate-400 bg-slate-100 text-slate-600';
      } else {
        card.classList.add('border-amber-200');
        header.classList.add('from-amber-50\\/60', 'hover:from-amber-50');
        badge.textContent = 'Manual';
        badge.className = 'manual-badge px-2.5 py-0.5 rounded-full text-xs font-bold border bg-amber-100 text-amber-800 border-amber-200';
        if (verifiedBtn) verifiedBtn.className = BASE_VERIFIED + ' border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50';
        if (naBtn) naBtn.className = BASE_NA + ' border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50';
      }
    }

    function setManualState(criterion, newState) {
      const card = document.getElementById('manual-' + criterion.replace('.', '-'));
      const current = card ? card.dataset.state : '';
      const next = current === newState ? '' : newState;
      const s = getState();
      if (next) s[criterion] = next; else delete s[criterion];
      saveState(s);
      if (card) applyCardState(card, next);
      updateProgress();
    }

    function initManualChecks() {
      const state = getState();
      document.querySelectorAll('.manual-card').forEach(card => {
        const criterion = card.dataset.criterion;
        applyCardState(card, state[criterion] || '');
      });
      updateProgress();
    }

    function resetManualChecks() {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      document.querySelectorAll('.manual-card').forEach(card => applyCardState(card, ''));
      updateProgress();
    }

    document.addEventListener('DOMContentLoaded', function() {
      initManualChecks();
      const toolbar = document.getElementById('findings-toolbar');
      const manualBar = document.getElementById('manual-progress-sticky');
      if (toolbar && manualBar) {
        manualBar.style.top = (64 + toolbar.offsetHeight - 1) + 'px';
      }
    });
    // ─────────────────────────────────────────────────────────────────────

    function setView(view) {
      const severityContainer = document.getElementById('issues-container');
      const pageContainer = document.getElementById('page-container');
      const filterControls = document.getElementById('filter-controls');
      const pageSelectCont = document.getElementById('page-select-container');
      const btnSeverity = document.getElementById('view-severity');
      const btnPage = document.getElementById('view-page');

      if (view === 'severity') {
        severityContainer.style.display = '';
        pageContainer.style.display = 'none';
        if (filterControls) filterControls.style.display = 'flex';
        if (pageSelectCont) pageSelectCont.style.display = 'none';
        
        if (btnSeverity) {
          btnSeverity.classList.add('bg-[var(--primary-light)]', 'text-[var(--primary)]');
          btnSeverity.classList.remove('text-slate-500', 'hover:text-slate-700');
        }
        if (btnPage) {
          btnPage.classList.remove('bg-[var(--primary-light)]', 'text-[var(--primary)]');
          btnPage.classList.add('text-slate-500', 'hover:text-slate-700');
        }
      } else {
        severityContainer.style.display = 'none';
        pageContainer.style.display = '';
        if (filterControls) filterControls.style.display = 'flex';
        if (pageSelectCont) {
          pageSelectCont.style.display = 'flex';
          const ps = document.getElementById('page-select');
          if (ps) { ps.value = 'all'; filterByPage('all'); }
        }
        
        if (btnPage) {
          btnPage.classList.add('bg-[var(--primary-light)]', 'text-[var(--primary)]');
          btnPage.classList.remove('text-slate-500', 'hover:text-slate-700');
        }
        if (btnSeverity) {
          btnSeverity.classList.remove('bg-[var(--primary-light)]', 'text-[var(--primary)]');
          btnSeverity.classList.add('text-slate-500', 'hover:text-slate-700');
        }
      }
      _syncExpandBtn();
    }

    function _activeCards() {
      const sev = document.getElementById('issues-container');
      const pg = document.getElementById('page-container');
      const container = sev && sev.style.display !== 'none' ? sev : pg;
      return container ? [...container.querySelectorAll('.issue-card')] : [];
    }

    function _syncExpandBtn() {
      const btn = document.getElementById('expand-all-btn');
      if (!btn) return;
      const anyCollapsed = _activeCards().some(c => c.dataset.collapsed === 'true');
      btn.textContent = anyCollapsed ? 'Expand all' : 'Collapse all';
    }



    function toggleCard(header) {
      const card = header.closest('.issue-card');
      const body = card.querySelector('.card-body');
      const chevron = header.querySelector('.card-chevron');
      const isCollapsed = card.dataset.collapsed === 'true';
      if (isCollapsed) {
        body.style.gridTemplateRows = '1fr';
        card.dataset.collapsed = 'false';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
      } else {
        body.style.gridTemplateRows = '0fr';
        card.dataset.collapsed = 'true';
        if (chevron) chevron.style.transform = '';
      }
      _syncExpandBtn();
    }

    function toggleAllCards() {
      const cards = _activeCards();
      const anyCollapsed = cards.some(c => c.dataset.collapsed === 'true');
      cards.forEach(card => {
        const body = card.querySelector('.card-body');
        const chevron = card.querySelector('.card-chevron');
        if (anyCollapsed) {
          body.style.display = '';
          card.dataset.collapsed = 'false';
          if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
          body.style.display = 'none';
          card.dataset.collapsed = 'true';
          if (chevron) chevron.style.transform = '';
        }
      });
      const btn = document.getElementById('expand-all-btn');
      if (btn) btn.textContent = anyCollapsed ? 'Collapse all' : 'Expand all';
    }

    function filterByPage(page) {
      document.querySelectorAll('.page-group').forEach(group => {
        group.style.display = (page === 'all' || group.dataset.page === page) ? '' : 'none';
      });
    }

    function filterIssues(type) {
        const cards = document.querySelectorAll('.issue-card');
        const q = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
        let visibleCount = 0;
        const principles = ['Perceivable', 'Operable', 'Understandable', 'Robust'];
        let emptyMsg = document.getElementById('dynamic-empty-state');
        const container = document.getElementById('issues-container');

        const manualCards = document.querySelectorAll('.manual-card');

        cards.forEach(card => {
            const severity = card.dataset.severity;

            let match = false;
            if (type === 'all') match = true;
            else if (severity === type) match = true;
            if (principles.includes(type)) {
                const badge = card.querySelector('.wcag-label');
                const wcagText = badge ? badge.textContent : '';
                
                if (type === 'Perceivable' && wcagText.includes(' 1.')) match = true;
                if (type === 'Operable' && wcagText.includes(' 2.')) match = true;
                if (type === 'Understandable' && wcagText.includes(' 3.')) match = true;
                if (type === 'Robust' && wcagText.includes(' 4.')) match = true;
            }

            // Surgical search: only search in Title, Selector, URL, and the card's ID
            const searchableText = [...card.querySelectorAll('.searchable-field')]
              .map(el => el.textContent)
              .join(' ')
              .concat(' ', card.id)
              .toLowerCase();
            const textMatch = !q || searchableText.includes(q);

            if (match && textMatch) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Search in manual checks if the filter is 'all'
        let anyManualVisible = false;
        manualCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const criterion = card.querySelector('.font-mono').textContent.toLowerCase();
            const textMatch = !q || title.includes(q) || criterion.includes(q);
            
            // Only show manual cards if search is active or filter is 'all'
            if (type === 'all' && textMatch) {
                card.style.display = '';
                anyManualVisible = true;
            } else if (q && textMatch) {
                // If there's an active search, let manual cards show up regardless of severity tab (manual don't have severity)
                card.style.display = '';
                anyManualVisible = true;
                visibleCount++; // Count them to avoid "empty state"
            } else {
                card.style.display = 'none';
            }
        });
        
        // Hide entire manual check section if no search results match it, to save space
        const manualSection = document.getElementById('manual-checks-section');
        if (manualSection) {
            manualSection.style.display = (!q && type === 'all') || anyManualVisible ? '' : 'none';
        }

        if (visibleCount === 0) {
            if (!emptyMsg) {
                emptyMsg = document.createElement('div');
                emptyMsg.id = 'dynamic-empty-state';
                emptyMsg.className = 'text-center py-12 bg-slate-50 rounded-xl border border-slate-100 border-dashed';
                emptyMsg.innerHTML = '<div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4 text-slate-400"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div><h3 class="text-sm font-bold text-slate-900">No matching issues</h3><p class="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">No violations found for this filter</p>';
                container.appendChild(emptyMsg);
            }
            emptyMsg.style.display = 'block';
        } else {
            if (emptyMsg) emptyMsg.style.display = 'none';
        }
    }

    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 20) {
            nav.classList.add('shadow-md');
        } else {
            nav.classList.remove('shadow-md');
        }
    });

    function scrollToIssue(id) {
        const el = document.getElementById(id);
        if (!el) return;

        setView('severity');
        filterIssues('all');

        const body = el.querySelector('.card-body');
        const chevron = el.querySelector('.card-chevron');
        if (el.dataset.collapsed === 'true') {
            body.style.display = '';
            el.dataset.collapsed = 'false';
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        }

        const navHeight = 64 + (document.getElementById('findings-toolbar')?.offsetHeight || 0);
        window.scrollTo({
            top: el.offsetTop - navHeight - 20,
            behavior: 'smooth'
        });

        el.classList.add('ring-4', 'ring-[var(--primary)]/30', 'border-[var(--primary)]');
        setTimeout(() => {
            el.classList.remove('ring-4', 'ring-[var(--primary)]/30', 'border-[var(--primary)]');
        }, 2000);
    }

    function handleSearch(query) {
        const filterType = document.getElementById('filter-select')?.value || 'all';
        filterIssues(filterType);
    }

    async function copyToClipboard(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
            const original = btn.innerHTML;
            btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
            btn.classList.add('bg-emerald-500');
            setTimeout(() => {
                btn.innerHTML = original;
                btn.classList.remove('bg-emerald-500');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
        }
    }
  </script>
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPayload = readJson(args.input);
  if (!inputPayload)
    throw new Error(`Input findings file not found or invalid: ${args.input}`);

  const findings = normalizeFindings(inputPayload);

  const html = buildHtml(args, findings, inputPayload.metadata);
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
