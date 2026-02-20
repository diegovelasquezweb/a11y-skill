import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { escapeHtml, formatMultiline, linkify } from "./core-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manualChecksPath = join(__dirname, "../../assets/manual-checks.json");
let MANUAL_CHECKS;
try {
  MANUAL_CHECKS = JSON.parse(readFileSync(manualChecksPath, "utf-8"));
} catch {
  throw new Error(
    "Missing or invalid assets/manual-checks.json — reinstall the skill.",
  );
}

/**
 * Renders technical evidence (HTML snippets and failure summaries) for the dashboard.
 */
export function formatEvidence(evidence) {
  const data = Array.isArray(evidence) ? evidence : [];
  if (data.length === 0) return "";

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
}

/**
 * Builds an interactive card for an automated accessibility violation.
 */
export function buildIssueCard(finding) {
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
    ? `<div class="mt-8 border-t border-slate-100 pt-6">
        <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <div class="p-1 bg-slate-100 rounded-md">
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
          Visual Evidence
        </h4>
        <div class="bg-slate-50/50 p-2 rounded-xl border border-slate-200/60 inline-block shadow-sm">
          <img src="${escapeHtml(finding.screenshotPath)}" alt="Screenshot of ${escapeHtml(finding.title)}" class="rounded-lg border border-slate-200 shadow-sm max-h-[300px] w-auto object-contain bg-white" loading="lazy">
        </div>
      </div>`
    : "";

  const evidenceHtml = finding.evidence
    ? `<div class="mt-8 bg-slate-900 rounded-xl p-6 border border-slate-700 shadow-2xl relative overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 relative z-10 flex items-center gap-2">
            <div class="p-1 bg-slate-800 rounded-md border border-slate-700">
                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
            </div>
            Technical Evidence
        </h4>
        <div class="relative z-10">
            ${formatEvidence(finding.evidence)}
        </div>
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
      severityBadge = "bg-emerald-100 text-emerald-700 border-emerald-200";
      borderClass = "border-emerald-200 hover:border-emerald-300";
      break;
    default:
      severityBadge = "bg-slate-100 text-slate-800 border-slate-200";
      borderClass = "border-slate-200";
  }

  let effortBadge = "";
  if (finding.fixCode) {
    effortBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-widest shadow-sm">Low Effort</span>`;
  } else if (
    finding.ruleId &&
    (finding.ruleId.includes("aria") || finding.ruleId.includes("name"))
  ) {
    effortBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 uppercase tracking-widest shadow-sm">Med Effort</span>`;
  } else {
    effortBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60 uppercase tracking-widest shadow-sm">High Effort</span>`;
  }

  return `
<article class="issue-card bg-white/90 backdrop-blur-xl rounded-2xl border ${borderClass} shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 mb-8 overflow-hidden group" data-severity="${finding.severity}" data-rule-id="${escapeHtml(finding.ruleId)}" data-wcag="${escapeHtml(finding.wcag)}" data-collapsed="true" id="${escapeHtml(finding.id)}">
  <div class="card-header p-5 md:p-6 bg-gradient-to-r from-white to-slate-50/80 cursor-pointer select-none relative" onclick="toggleCard(this)">
    <div class="absolute inset-y-0 left-0 w-1.5 ${severityBadge.split(" ")[0]} opacity-80"></div>
    <div class="flex items-start gap-4 pl-2">
    <div class="flex-1 min-w-0">
    <div class="flex flex-wrap items-center gap-2.5 mb-3.5">
      <span class="px-3 py-1 rounded-full text-[11px] font-bold border ${severityBadge} shadow-sm backdrop-blur-sm uppercase tracking-wider">${escapeHtml(finding.severity)}</span>
      ${effortBadge}
      <span class="wcag-label px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50/80 text-indigo-700 border border-indigo-100/80 ml-auto shadow-sm backdrop-blur-sm">WCAG ${escapeHtml(finding.wcag)}</span>
    </div>
    <h3 class="text-lg md:text-xl font-extrabold text-slate-900 leading-tight mb-3 group-hover:text-indigo-900 transition-colors searchable-field issue-title">${escapeHtml(finding.title)}</h3>

    <div class="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-slate-500 font-medium">
        <div class="flex items-center gap-1.5 bg-slate-50/50 px-2 py-1 rounded-md border border-slate-100">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            <a href="${escapeHtml(finding.url)}" target="_blank" class="hover:text-indigo-600 hover:underline truncate max-w-[200px] md:max-w-md transition-colors searchable-field issue-url">${escapeHtml(finding.url)}</a>
        </div>
        <div class="flex items-center gap-1.5 w-full md:w-auto mt-1 md:mt-0 min-w-0 bg-slate-50/50 px-2 py-1 rounded-md border border-slate-100">
            <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
            <code class="text-[12px] text-slate-700 font-mono truncate min-w-0 flex-1 searchable-field issue-selector">${escapeHtml(finding.selector)}</code>
        </div>
    </div>
    </div>
      <div class="bg-white p-1.5 rounded-full border border-slate-100 shadow-sm group-hover:bg-slate-50 transition-colors mt-1">
        <svg class="card-chevron w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  </div>

  <div class="card-body grid transition-all duration-300 ease-in-out" style="grid-template-rows: 0fr;">
  <div class="overflow-hidden">
  <div class="p-6 md:p-8 bg-slate-50/30 border-t border-slate-100/60">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      <div class="bg-white p-5 rounded-xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
        <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <div class="p-1 bg-slate-100 rounded-md">
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            </div>
            Behavior Analysis
        </h4>
        <div class="space-y-4">
            <div class="relative pl-3 border-l-2 border-emerald-400">
                <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Expected Behavior</span>
                <p class="text-[13px] text-slate-700 leading-relaxed font-medium">${formatMultiline(finding.expected)}</p>
            </div>
            <div class="relative pl-3 border-l-2 border-rose-400">
                <span class="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">Actual Behavior</span>
                <p class="text-[13px] text-slate-700 leading-relaxed font-medium">${formatMultiline(finding.actual)}</p>
            </div>
        </div>
      </div>

      <div class="bg-white p-5 rounded-xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
        <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <div class="p-1 bg-slate-100 rounded-md">
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </div>
            Steps to Reproduce
        </h4>
        <ul class="list-decimal list-outside ml-5 space-y-2 text-[13px] text-slate-600 marker:text-slate-400 marker:font-bold">
            ${reproductionItems}
        </ul>

        <div class="mt-5 pt-4 border-t border-slate-100">
            <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Impacted Users</h4>
            <p class="text-[13px] text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-3 py-0.5 bg-slate-50 rounded-r-md">${formatMultiline(finding.impactedUsers)}</p>
        </div>

        ${
          finding.manual_test
            ? `
        <div class="mt-5 pt-4 border-t border-slate-100">
            <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
              Manual Validation Steps
            </h4>
            <div class="bg-amber-50/50 rounded-lg p-3 border border-amber-100/50">
              <p class="text-[12px] text-amber-900 font-bold mb-2">${escapeHtml(finding.manual_test.description)}</p>
              <ul class="list-disc list-outside ml-4 space-y-1 text-[12px] text-amber-800/80">
                ${finding.manual_test.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
              </ul>
            </div>
        </div>`
            : ""
        }
      </div>
    </div>

    <div class="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/80 rounded-xl p-6 relative overflow-hidden shadow-sm">
      <div class="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4">
        <svg class="w-32 h-32 text-indigo-900" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"></path></svg>
      </div>
      <h4 class="text-sm font-bold text-indigo-900 mb-2 relative z-10 flex items-center gap-2">
        <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        Recommended Remediation
      </h4>
      ${finding.fixDescription ? `<p class="text-sm text-indigo-800 leading-relaxed relative z-10 mb-3">${escapeHtml(finding.fixDescription)}</p>` : ""}
      ${
        finding.fixCode
          ? `
        <div class="relative group">
          <pre class="bg-slate-900 text-emerald-300 p-3 rounded-lg overflow-x-auto text-xs font-mono border border-slate-700 mb-3 relative z-10 whitespace-pre-wrap">${escapeHtml(finding.fixCode)}</pre>
          <button onclick="copyToClipboard(\`${escapeHtml(finding.fixCode).replace(/`/g, "\\`")}\`, this)" class="absolute top-2 right-2 p-1.5 rounded-lg bg-indigo-500/50 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-500">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          </button>
        </div>`
          : ""
      }
      <p class="text-xs text-indigo-500 leading-relaxed relative z-10">${linkify(formatMultiline(finding.recommendedFix))}</p>
      ${
        finding.mdn
          ? `
        <div class="mt-4 pt-3 border-t border-indigo-100/50">
          <a href="${escapeHtml(finding.mdn)}" target="_blank" class="text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 uppercase tracking-wider">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.246 18.477 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            Technical Docs (MDN)
          </a>
        </div>`
          : ""
      }
    </div>

    ${screenshotHtml}
    ${evidenceHtml}
  </div>
  </div>
  </div>
</article>`;
}

/**
 * Builds a manual check card for the dashboard.
 */
export function buildManualCheckCard(check) {
  const id = `manual-${check.criterion.replace(".", "-")}`;
  const steps = check.steps
    .map(
      (s) => `<li class="mb-1.5 text-slate-600 text-sm">${escapeHtml(s)}</li>`,
    )
    .join("");
  return `
<div class="manual-card bg-white rounded-xl border border-amber-200 shadow-sm mb-4 overflow-hidden transition-all duration-200" id="${id}" data-criterion="${escapeHtml(check.criterion)}" data-state="">
  <div class="manual-header flex items-start gap-4 p-5 border-b border-amber-100 bg-gradient-to-r from-amber-50/60 to-white transition-colors">
    <div class="flex-1 min-w-0">
      <div class="flex flex-wrap items-center gap-2 mb-2">
        <span class="manual-badge px-2.5 py-0.5 rounded-full text-xs font-bold border bg-amber-100 text-amber-800 border-amber-200">Manual</span>
        ${check.level !== "AT" ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 font-mono">${escapeHtml(check.criterion)}</span>` : ""}
        ${check.level === "AT"
          ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">Assistive Technology</span>`
          : `<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">WCAG ${escapeHtml(check.level)}</span>`}
      </div>
      <h3 class="text-base font-bold text-slate-900">${escapeHtml(check.title)}</h3>
    </div>
    <div class="flex gap-2 flex-shrink-0 mt-0.5">
      <button class="manual-verified-btn px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors whitespace-nowrap" onclick="setManualState('${escapeHtml(check.criterion)}', 'verified')">✓ Verified</button>
      <button class="manual-na-btn px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap" onclick="setManualState('${escapeHtml(check.criterion)}', 'na')">N/A</button>
    </div>
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
    <a href="${escapeHtml(check.ref)}" target="_blank" class="text-xs text-indigo-600 hover:underline font-medium">${check.level === "AT" ? `W3C Reference — ${escapeHtml(check.title)}` : `WCAG 2.2 Understanding — ${escapeHtml(check.criterion)} ${escapeHtml(check.title)}`} →</a>
  </div>
</div>`;
}

/**
 * Builds the entire manual checks section for the dashboard.
 */
export function buildManualChecksSection() {
  const total = MANUAL_CHECKS.length;
  const cards = MANUAL_CHECKS.map((c) => buildManualCheckCard(c)).join("\n");
  return `
<div class="mt-16 mb-4">
  <div class="flex items-center gap-3 mb-2">
    <h3 class="text-lg font-bold text-slate-900">Manual Verification Required</h3>
    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">${total} checks</span>
  </div>
  <p class="text-sm text-slate-500">Axe-core covers ~40% of WCAG issues automatically. The remaining checks below require human verification and are split into three categories: <strong class="text-slate-700">WCAG A</strong> and <strong class="text-slate-700">WCAG AA</strong> criteria verifiable with a browser and DevTools, and <strong class="text-violet-700">Assistive Technology</strong> checks that require VoiceOver (macOS) or NVDA (Windows). Check each off as you verify it — progress is saved per site.</p>
</div>

<div id="manual-progress-sticky" class="sticky top-14 z-30 bg-white rounded-xl border border-slate-200 p-4 mb-6 flex items-center gap-4 shadow-sm">
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

${cards}`;
}

/**
 * Builds the global references section for the HTML report.
 */
export function buildGlobalReferencesSection(metadata = {}) {
  if (!metadata.regulatory) return "";

  return `
<div class="mt-16 mb-12">
  <div class="flex items-center gap-3 mb-6">
    <div class="p-2 bg-indigo-100 rounded-xl text-indigo-600">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.246 18.477 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
    </div>
    <h3 class="text-xl font-extrabold text-slate-900 tracking-tight">Global References & Regulatory Context</h3>
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="premium-card p-6 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <h4 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>
        US Regulatory Context (ADA/508)
      </h4>
      <ul class="space-y-3">
        <li>
          <a href="${metadata.regulatory["18f"]}" target="_blank" class="text-sm text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-2 transition-colors">
            <span>18F Accessibility Guide (Govt Standards)</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          </a>
        </li>
        <li>
          <a href="${metadata.regulatory.section508}" target="_blank" class="text-sm text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-2 transition-colors">
            <span>Section 508 Standards (Federal Web)</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          </a>
        </li>
      </ul>
    </div>
    
    <div class="premium-card p-6 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <h4 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
        Verification Checklists
      </h4>
      <ul class="space-y-3">
        <li>
          <a href="${metadata.checklist}" target="_blank" class="text-sm text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-2 transition-colors">
            <span>The A11y Project Checklist</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          </a>
        </li>
      </ul>
    </div>
  </div>
</div>`;
}
