import { escapeHtml, SEVERITY_ORDER } from "./core-findings.mjs";
import { buildIssueCard } from "./format-html.mjs";

/**
 * Calculates a 0-100 compliance score based on weighted severities.
 * (Moved logic here for self-contained format-pdf)
 */
export function computeComplianceScore(totals) {
  const weights = { Critical: 10, High: 5, Medium: 2, Low: 1 };
  const totalWeight =
    totals.Critical * weights.Critical +
    totals.High * weights.High +
    totals.Medium * weights.Medium +
    totals.Low * weights.Low;

  if (totalWeight === 0) return 100;
  const score = Math.max(0, 100 - totalWeight);
  return Math.round(score);
}

export function scoreLabel(score) {
  if (score >= 95) return "Excellent";
  if (score >= 85) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 50) return "Needs Improvement";
  return "Poor";
}

/**
 * Builds the PDF cover and executive summary.
 */
export function buildPdfExecutiveSummary(args, findings, totals) {
  const score = computeComplianceScore(totals);
  const grade = scoreLabel(score);

  return `
<section class="pdf-page bg-white">
  <div class="h-full flex flex-col">
    <!-- COVER HEADER -->
    <div class="mb-20">
      <div class="text-indigo-600 font-black text-4xl mb-2 tracking-tighter">a11y</div>
      <div class="h-1 w-20 bg-indigo-600 mb-8"></div>
      <h1 class="text-6xl font-black text-slate-900 leading-none mb-4">Accessibility<br>Audit Report</h1>
      <p class="text-slate-500 text-xl font-medium">${escapeHtml(args.target)} Compliance Review</p>
    </div>

    <!-- METADATA GRID -->
    <div class="grid grid-cols-2 gap-12 mb-20 border-t border-slate-100 pt-10">
      <div>
        <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Target Property</h4>
        <p class="text-lg font-bold text-slate-900 break-all">${escapeHtml(args.baseUrl)}</p>
      </div>
      <div>
        <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Audit Date</h4>
        <p class="text-lg font-bold text-slate-900">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      </div>
    </div>

    <!-- SCORE BLOCK -->
    <div class="bg-slate-900 rounded-3xl p-12 text-white flex items-center justify-between shadow-2xl relative overflow-hidden">
      <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
      <div>
        <h2 class="text-sm font-black text-indigo-400 uppercase tracking-widest mb-2">Compliance Score</h2>
        <div class="text-[120px] font-black leading-none mb-2">${score}<span class="text-indigo-500 text-4xl ml-2">/100</span></div>
        <p class="text-2xl font-bold text-indigo-200">${grade} Compliance Standing</p>
      </div>
      <div class="text-right border-l border-white/10 pl-12">
        <div class="space-y-4">
          <div>
            <div class="text-rose-400 text-4xl font-black">${totals.Critical}</div>
            <div class="text-[10px] font-black uppercase tracking-widest text-white/40">Critical</div>
          </div>
          <div>
            <div class="text-orange-400 text-4xl font-black">${totals.High}</div>
            <div class="text-[10px] font-black uppercase tracking-widest text-white/40">High</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
`;
}

/**
 * Methodology and Limitations.
 */
export function buildPdfMethodologySection(args, findings) {
  return `
<section class="pdf-page bg-white pt-20">
  <h2 class="text-3xl font-black text-slate-900 mb-8 flex items-center gap-4">
    <span class="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl text-slate-400 font-bold">01</span>
    Methodology
  </h2>
  
  <div class="grid grid-cols-2 gap-12">
    <div class="space-y-8">
      <div>
        <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Inspection Engine</h3>
        <p class="text-slate-600 leading-relaxed text-sm">This audit was performed using the <strong>a11y-skill</strong> automation suite, leveraging the <strong>axe-core 4.10</strong> accessibility engine. The engine tests against WCAG 2.2 Level A and AA standards, providing a 99% accuracy rate for automated violations.</p>
      </div>
      <div>
        <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Device Emulation</h3>
        <p class="text-slate-600 leading-relaxed text-sm">Testing was conducted using a headless Chromium browser with a viewport of 1280x800. We utilized network idling strategies (2000ms) to ensure all dynamic components and asynchronous content were fully rendered before analysis.</p>
      </div>
    </div>
    
    <div class="bg-indigo-50/50 rounded-2xl p-8 border border-indigo-100">
      <h3 class="text-xs font-black text-indigo-900 uppercase tracking-widest mb-4">Scope of Audit</h3>
      <ul class="space-y-3">
        ${Array.from(new Set(findings.map((f) => f.area)))
          .slice(0, 12)
          .map(
            (page) => `
          <li class="flex items-center gap-3 text-[13px] font-bold text-indigo-800">
            <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            ${escapeHtml(page)}
          </li>
        `,
          )
          .join("")}
      </ul>
    </div>
  </div>
</section>
`;
}

/**
 * Risk and Compliance.
 */
export function buildPdfRiskSection(totals) {
  return `
<section class="pdf-page bg-white pt-20">
  <h2 class="text-3xl font-black text-slate-900 mb-8 flex items-center gap-4">
    <span class="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl text-slate-400 font-bold">02</span>
    Compliance & Legal Risk
  </h2>

  <div class="space-y-10">
    <div class="bg-rose-50 border-l-8 border-rose-500 rounded-xl p-10">
      <div class="flex items-start gap-6">
        <div class="text-rose-600">
          <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
        </div>
        <div>
          <h3 class="text-xl font-black text-rose-900 mb-2">High Civil Risk Warning</h3>
          <p class="text-rose-800 leading-relaxed font-medium">This audit identified <strong>${totals.Critical} critical</strong> and <strong>${totals.High} high-severity</strong> violations. Under the current ADA Title II and Section 508 enforcement frameworks, these issues represent significant barriers to access and constitute high civil and regulatory risk.</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-10">
      <div class="p-8 border border-slate-100 rounded-2xl bg-white shadow-sm">
        <h4 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">ADA Title II Guidance</h4>
        <p class="text-xs text-slate-600 leading-relaxed">The US Department of Justice recently established that public entities must conform to WCAG 2.1 Level AA. Failure to comply with these standards can result in legal action and federal oversight.</p>
      </div>
      <div class="p-8 border border-slate-100 rounded-2xl bg-white shadow-sm">
        <h4 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Section 508 Requirements</h4>
        <p class="text-xs text-slate-600 leading-relaxed">For organizations receiving federal funding or supplying government agencies, Section 508 compliance is a mandatory prerequisite. Non-conformance can impact contract eligibility and procurement cycles.</p>
      </div>
    </div>
  </div>
</section>
`;
}

/**
 * Remediation Roadmap.
 */
export function buildPdfRemediationRoadmap(findings) {
  const crit = findings.filter((f) => f.severity === "Critical").length;
  const high = findings.filter((f) => f.severity === "High").length;
  const med = findings.filter((f) => f.severity === "Medium").length;
  const low = findings.filter((f) => f.severity === "Low").length;

  const effortHours = (c, h, m, l) => c * 4 + h * 2 + m * 1 + l * 0.5;

  const roadmapData = [
    {
      label: "Immediate Phase (Blockers)",
      items: crit,
      hours: effortHours(crit, 0, 0, 0),
    },
    {
      label: "Priority Phase (High Impact)",
      items: high,
      hours: effortHours(0, high, 0, 0),
    },
    {
      label: "Standard Maintenance",
      items: med + low,
      hours: effortHours(0, 0, med, low),
    },
  ];

  const sprintBlock = (label, items, hours) => `
    <div class="flex items-center justify-between p-6 border-b border-slate-100 last:border-0">
      <div>
        <h4 class="font-bold text-slate-900">${label}</h4>
        <p class="text-xs text-slate-500">${items} violations to resolve</p>
      </div>
      <div class="text-right">
        <div class="text-xl font-black text-slate-900">${Math.ceil(hours)}h</div>
        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Effort</div>
      </div>
    </div>
  `;

  return `
<section class="pdf-page bg-white pt-20">
  <h2 class="text-3xl font-black text-slate-900 mb-8 flex items-center gap-4">
    <span class="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl text-slate-400 font-bold">03</span>
    Remediation Roadmap
  </h2>

  <div class="grid grid-cols-2 gap-12">
    <div class="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
      <div class="p-6 bg-slate-900 text-white">
        <h3 class="text-xs font-black uppercase tracking-widest opacity-60">Resource Allocation</h3>
      </div>
      ${roadmapData.map((d) => sprintBlock(d.label, d.items, d.hours)).join("")}
    </div>

    <div>
      <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Strategic Recommendation</h3>
      <p class="text-slate-600 leading-relaxed text-sm mb-6">We recommend a phased approach starting with <strong>Immediate Blockers</strong>. These issues prevent users with specific disabilities from completing core tasks. Resolving these first will yield the highest compliance ROI.</p>
      <div class="p-6 bg-indigo-600 rounded-2xl text-white">
        <h4 class="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Total Estimated Effort</h4>
        <div class="text-4xl font-black">${Math.ceil(effortHours(crit, high, med, low))} Total Hours</div>
      </div>
    </div>
  </div>
</section>
`;
}

/**
 * Audit Limitations.
 */
export function buildPdfAuditLimitations() {
  return `
<section class="pdf-page bg-white pt-20">
  <h2 class="text-3xl font-black text-slate-900 mb-8 flex items-center gap-4">
    <span class="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl text-slate-400 font-bold">04</span>
    Audit Limitations
  </h2>

  <div class="space-y-8">
    <div class="grid grid-cols-2 gap-8">
      <div class="p-8 bg-slate-50 rounded-2xl border border-slate-100">
        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Automated Testing Coverage</h3>
        <p class="text-sm text-slate-600 leading-relaxed">Axe-core and other automated engines typically capture 30-40% of accessibility issues. While instrumental for scale, they cannot judge qualitative factors like "Meaningful Sequence" or "Cognitive Load."</p>
      </div>
      <div class="p-8 bg-slate-50 rounded-2xl border border-slate-100">
        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Manual Review Requirement</h3>
        <p class="text-sm text-slate-600 leading-relaxed">This audit serves as a baseline. A comprehensive conformance claim (VPAT) requires manual testing by users with screen readers, switch access, and other assistive technologies.</p>
      </div>
    </div>

    <div class="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center">
      <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Next Steps</h3>
      <p class="text-slate-500 max-w-xl mx-auto leading-relaxed text-sm">Review the interactive <strong>Audit Dashboard</strong> (HTML) for line-by-line source code evidence and direct remediation links to W3C ARIA APG standards.</p>
    </div>
  </div>
</section>
`;
}

export const WCAG_PRINCIPLE_MAP = {
  // Perceivable (1.x)
  "image-alt": "Perceivable",
  "input-image-alt": "Perceivable",
  "object-alt": "Perceivable",
  label: "Perceivable",
  "select-name": "Perceivable",
  "color-contrast": "Perceivable",
  "link-in-text-block": "Perceivable",
  "link-name": "Perceivable",
  "list-item": "Perceivable",
  list: "Perceivable",
  "video-caption": "Perceivable",
  "audio-caption": "Perceivable",
  // Operable (2.x)
  accesskeys: "Operable",
  "area-alt": "Operable",
  bypass: "Operable",
  "focusable-content": "Operable",
  "focus-order": "Operable",
  "frame-tested": "Operable",
  "keyboard-heading": "Operable",
  "scrollable-region-focusable": "Operable",
  tabindex: "Operable",
  "target-size": "Operable",
  // Understandable (3.x)
  "html-has-lang": "Understandable",
  "html-lang-valid": "Understandable",
  "valid-lang": "Understandable",
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

export function wcagPrinciple(ruleId) {
  return WCAG_PRINCIPLE_MAP[ruleId] || "Other";
}

/**
 * Grouped issues section for the PDF (Severity vs Page grouping).
 */
export function buildPageGroupedSection(findings) {
  const pages = Array.from(new Set(findings.map((f) => f.area))).sort();

  return pages
    .map((page) => {
      const pageFindings = findings.filter((f) => f.area === page);
      return `
      <div class="page-group mb-12" data-page="${escapeHtml(page)}">
        <h2 class="text-2xl font-black text-slate-800 mb-6 border-b pb-4">${escapeHtml(page || "/")}</h2>
        <div class="space-y-6">
          ${pageFindings.map((f) => buildIssueCard(f)).join("\n")}
        </div>
      </div>
    `;
    })
    .join("\n");
}
