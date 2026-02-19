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
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">User Impact</h4>
            <p class="text-sm text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-3">${formatMultiline(finding.impact)}</p>
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
      <p class="text-sm text-indigo-800 leading-relaxed relative z-10 whitespace-pre-line">${linkify(formatMultiline(finding.recommendedFix))}</p>
    </div>

    ${evidenceHtml}
  </div>
</article>`;
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

  let version = "v1.0.0";
  try {
    const pkg = readJson(path.join(getInternalPath(".."), "package.json"));
    if (pkg && pkg.version) version = `v${pkg.version}`;
  } catch (e) {
    log.warn(`Could not read package.json version: ${e.message}`);
  }

  function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(
      urlRegex,
      '<a href="$1" target="_blank" class="text-indigo-600 hover:underline font-medium break-all">$1</a>',
    );
  }

  const statusColor = hasIssues
    ? "text-rose-600 bg-rose-50 border-rose-200"
    : "text-emerald-600 bg-emerald-50 border-emerald-200";
  const statusIcon = hasIssues
    ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`
    : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  const statusText = hasIssues ? "WCAG Violations Found" : "Audit Passed";

  return `<!doctype html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(args.title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
          colors: {
            slate: { 850: '#151e2e' }
          }
        }
      }
    }
  </script>
  <style>
    body { -webkit-font-smoothing: antialiased; }
    .glass-header { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  
  <div class="fixed top-0 left-0 right-0 z-50 glass-header border-b border-slate-200/80 shadow-sm transition-all duration-300" id="navbar">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center gap-3">
            <div class="flex items-center justify-center px-2 h-8 rounded-lg bg-slate-800 text-white font-bold text-sm shadow-sm shadow-slate-200 tracking-wide font-mono">a11y</div>
            <h1 class="text-lg font-bold text-slate-900 tracking-tight">Accessibility <span class="text-slate-500">Report</span></h1>
            <span class="hidden md:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">${version}</span>
        </div>
        <div class="flex items-center gap-4 text-sm font-medium text-slate-600">
            <div class="hidden sm:block">Target: ${escapeHtml(args.target)}</div>
            <div class="hidden sm:block h-4 w-px bg-slate-300"></div>
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusColor}">
                ${statusIcon}
                <span>${statusText}</span>
            </div>
        </div>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
    
    <!-- Hero Summary -->
    <div class="mb-10">
        <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">${escapeHtml(args.title)}</h2>
        <p class="text-slate-500 text-lg max-w-3xl">Comprehensive accessibility analysis executed on <span class="font-medium text-slate-700">${dateStr}</span> against <a href="${escapeHtml(args.baseUrl)}" target="_blank" class="text-indigo-600 hover:text-indigo-700 hover:underline font-medium">${escapeHtml(args.baseUrl || "Target Environment")}</a>.</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
        <!-- Critical -->
        <div class="bg-white rounded-xl shadow-sm border border-rose-100 p-5 relative overflow-hidden group hover:border-rose-200 transition-all">
            <div class="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg class="w-24 h-24 text-rose-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
            </div>
            <p class="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Critical Issues</p>
            <div class="text-4xl font-extrabold text-rose-900 mb-2">${totals.Critical}</div>
            <p class="text-xs text-rose-700/80 font-medium">Blocking barriers requiring immediate fix</p>
        </div>

        <!-- High -->
        <div class="bg-white rounded-xl shadow-sm border border-orange-100 p-5 relative overflow-hidden group hover:border-orange-200 transition-all">
            <div class="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg class="w-24 h-24 text-orange-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
            </div>
            <p class="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">High Severity</p>
            <div class="text-4xl font-extrabold text-orange-900 mb-2">${totals.High}</div>
            <p class="text-xs text-orange-700/80 font-medium">Core task impediments</p>
        </div>

        <!-- Medium -->
        <div class="bg-white rounded-xl shadow-sm border border-amber-100 p-5 relative overflow-hidden group hover:border-amber-200 transition-all">
            <div class="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg class="w-24 h-24 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>
            </div>
            <p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Medium Severity</p>
            <div class="text-4xl font-extrabold text-amber-900 mb-2">${totals.Medium}</div>
            <p class="text-xs text-amber-700/80 font-medium">Usability friction points</p>
        </div>

        <!-- Low -->
        <div class="bg-white rounded-xl shadow-sm border border-emerald-100 p-5 relative overflow-hidden group hover:border-emerald-200 transition-all">
            <div class="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg class="w-24 h-24 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path></svg>
            </div>
            <p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Low Severity</p>
            <div class="text-4xl font-extrabold text-emerald-900 mb-2">${totals.Low}</div>
            <p class="text-xs text-emerald-700/80 font-medium">Best practice improvements</p>
        </div>
    </div>

    <!-- Filter Bar -->
    <div class="sticky top-16 z-40 bg-slate-50/95 backdrop-blur py-4 mb-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
            Detailed Findings
            <span class="bg-slate-200 text-slate-600 text-xs py-0.5 px-2 rounded-full">${findings.length}</span>
        </h3>
        
        <div class="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
            <button onclick="filterIssues('all')" class="filter-btn active px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 transition-colors">All Issues</button>
            <button onclick="filterIssues('Critical')" class="filter-btn px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">Critical</button>
            <button onclick="filterIssues('High')" class="filter-btn px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">High</button>
            <button onclick="filterIssues('Medium')" class="filter-btn px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">Medium</button>
            <button onclick="filterIssues('Low')" class="filter-btn px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">Low</button>
        </div>
    </div>

    <!-- Issues List -->
    <div id="issues-container" class="space-y-6">
        ${
          findings.length === 0
            ? `
        <div class="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 mb-6">
                <svg class="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 class="text-2xl font-bold text-slate-900 mb-2">No Accessibility Issues Found!</h3>
            <p class="text-slate-500 max-w-md mx-auto">Great job! The automated scan detected zero violations across the targeted routes based on WCAG 2.1 AA standards.</p>
        </div>`
            : findings.map((finding) => buildIssueCard(finding)).join("\n")
        }
    </div>

    <footer class="mt-20 pt-10 border-t border-slate-200 text-center">
        <p class="text-slate-400 text-sm font-medium">Generated by Automated Accessibility Pipeline &bull; <span class="text-slate-500">WCAG 2.1 AA Standards</span></p>
    </footer>

  </div>

  <script>
    function filterIssues(severity) {
        // Reset buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('bg-indigo-50', 'text-indigo-700', 'border', 'border-indigo-100');
            btn.classList.add('text-slate-600');
            if(btn.textContent.includes(severity) || (severity === 'all' && btn.textContent.includes('All'))) {
                btn.classList.add('bg-indigo-50', 'text-indigo-700', 'border', 'border-indigo-100');
                btn.classList.remove('text-slate-600');
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
  const criticalIssues = findings.filter(
    (f) => f.severity === "Critical" || f.severity === "High",
  );

  return `# Accessibility Audit Summary
> Generated: ${new Date().toISOString()}
> Target: ${args.baseUrl || "N/A"}
> Compliance: ${args.target}

## 📊 Overview
- **Critical Issues**: ${totals.Critical}
- **High Severity**: ${totals.High}
- **Medium Severity**: ${totals.Medium}
- **Low Severity**: ${totals.Low}

- **Status**: ${findings.length === 0 ? "✅ PASS" : "❌ ISSUES FOUND"}

## 🚨 Top Priority Issues
${
  criticalIssues.length > 0
    ? criticalIssues
        .map((f) => `- [${f.id}] **${f.severity}**: ${f.title} (${f.area})`)
        .join("\n")
    : "No critical or high severity issues found."
}

## 📝 Next Steps
Review the full HTML report for detailed reproduction steps and remediation advice.
`;
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
