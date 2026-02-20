import { SEVERITY_ORDER } from "./core-findings.mjs";
import { escapeHtml } from "./core-utils.mjs";
import { buildIssueCard } from "./format-html.mjs";

export function computeComplianceScore(totals) {
  const raw =
    100 -
    totals.Critical * 15 -
    totals.High * 5 -
    totals.Medium * 2 -
    totals.Low * 0.5;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function scoreLabel(score) {
  if (score >= 90) return { label: "Excellent", risk: "Minimal Risk" };
  if (score >= 75) return { label: "Good", risk: "Low Risk" };
  if (score >= 55) return { label: "Fair", risk: "Moderate Risk" };
  if (score >= 35) return { label: "Poor", risk: "High Risk" };
  return { label: "Critical", risk: "Severe Risk" };
}

export function buildPdfExecutiveSummary(args, findings, totals) {
  const score = computeComplianceScore(totals);
  const blockers = findings.filter(
    (f) => f.severity === "Critical" || f.severity === "High",
  );
  const totalIssues = findings.length;
  const pagesAffected = new Set(findings.map((f) => f.area)).size;

  const topIssues = blockers
    .slice(0, 3)
    .map(
      (f) =>
        `<li style="margin-bottom: 6pt;">${escapeHtml(f.title)} — <em>${escapeHtml(f.area)}</em></li>`,
    )
    .join("");

  const narrative =
    totalIssues === 0
      ? `<p style="line-height: 1.8; font-size: 10pt; margin-bottom: 8pt;">
        The automated scan of <strong>${escapeHtml(args.baseUrl)}</strong> detected no WCAG 2.2 AA violations across
        the scanned routes. This is a strong result. Six criteria require manual verification before full
        compliance can be certified — see Section 6.
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

  const topIssuesBlock =
    blockers.length > 0
      ? `
    <p style="font-family: sans-serif; font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1pt; margin: 1.2rem 0 6pt 0; color: #6b7280;">Priority Issues</p>
    <ul style="margin: 0; padding-left: 1.2rem; font-size: 10pt;">${topIssues}</ul>`
      : "";

  const conformanceStatement =
    totals.Critical > 0
      ? `<strong>Does not conform</strong> to ${escapeHtml(args.target)}`
      : findings.length > 0
        ? `<strong>Partially conforms</strong> to ${escapeHtml(args.target)}`
        : `<strong>Conforms</strong> to ${escapeHtml(args.target)} (automated checks)`;

  return `
<div style="page-break-before: always;">
  <h2 style="margin-top: 0;">1. Executive Summary</h2>

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

export function buildPdfRiskSection(totals) {
  const score = computeComplianceScore(totals);
  const riskLevel =
    score >= 75
      ? "Low"
      : score >= 55
        ? "Moderate"
        : score >= 35
          ? "High"
          : "Severe";
  const riskColor =
    score >= 75 ? "#16a34a" : score >= 55 ? "#d97706" : "#dc2626";

  return `
<div style="page-break-before: always;">
  <h2 style="margin-top: 0;">2. Compliance &amp; Legal Risk</h2>
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
      ${
        score >= 75
          ? "The site demonstrates strong accessibility fundamentals. Remaining issues should be addressed to achieve full compliance before regulatory deadlines."
          : score >= 55
            ? "The site has meaningful accessibility gaps that create legal exposure under EAA and ADA Title II. A remediation plan should be established and executed before the applicable compliance deadlines."
            : "The site has significant accessibility barriers that create substantial legal exposure. Immediate remediation of Critical and High issues is strongly recommended to mitigate compliance risk under EAA (in force) and ADA Title II (April 2026)."
      }
    </p>
  </div>
</div>`;
}

export function buildPdfRemediationRoadmap(findings) {
  const critical = findings.filter((f) => f.severity === "Critical");
  const high = findings.filter((f) => f.severity === "High");
  const medium = findings.filter((f) => f.severity === "Medium");
  const low = findings.filter((f) => f.severity === "Low");

  const effortHours = (c, h, m, l) =>
    Math.round(c * 4 + h * 2 + m * 1 + l * 0.5);

  const totalHours = effortHours(
    critical.length,
    high.length,
    medium.length,
    low.length,
  );

  function sprintBlock(label, items, hours) {
    if (items.length === 0) return "";
    const rows = items
      .slice(0, 8)
      .map(
        (f) =>
          `<tr><td>${escapeHtml(f.id)}</td><td>${escapeHtml(f.title)}</td><td>${escapeHtml(f.area)}</td></tr>`,
      )
      .join("");
    const more =
      items.length > 8
        ? `<tr><td colspan="3" style="font-style: italic; color: #6b7280;">… and ${items.length - 8} more</td></tr>`
        : "";
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

export function buildPdfMethodologySection(args, findings) {
  const pagesScanned = new Set(findings.map((f) => f.url)).size || 1;
  const scope = args.scope || "Full Site Scan";

  return `
<div style="page-break-before: always;">
  <h2 style="margin-top: 0;">4. Methodology &amp; Scope</h2>
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

export function buildPdfAuditLimitations() {
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

export const WCAG_PRINCIPLE_MAP = {
  "image-alt": "Perceivable",
  "input-image-alt": "Perceivable",
  "object-alt": "Perceivable",
  label: "Perceivable",
  "select-name": "Perceivable",
  "color-contrast": "Perceivable",
  "landmark-one-main": "Perceivable",
  region: "Perceivable",
  list: "Perceivable",
  listitem: "Perceivable",
  "definition-list": "Perceivable",
  dlitem: "Perceivable",
  bypass: "Operable",
  "link-name": "Operable",
  "heading-order": "Operable",
  "page-has-heading-one": "Operable",
  tabindex: "Operable",
  "scrollable-region-focusable": "Operable",
  "target-size": "Operable",
  "focus-appearance": "Operable",
  "dragging-movements": "Operable",
  "meta-viewport": "Operable",
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
  "button-name": "Robust",
  "aria-required-attr": "Robust",
  "aria-valid-attr-value": "Robust",
  "aria-hidden-focus": "Robust",
  "frame-title": "Robust",
  "duplicate-id": "Robust",
};

export function wcagPrinciple(ruleId) {
  return WCAG_PRINCIPLE_MAP[ruleId] || "Robust";
}

export function buildPageGroupedSection(findings) {
  if (findings.length === 0) return "";

  const pageGroups = {};
  for (const f of findings) {
    if (!pageGroups[f.area]) pageGroups[f.area] = [];
    pageGroups[f.area].push(f);
  }

  const sorted = Object.entries(pageGroups).sort(
    (a, b) => b[1].length - a[1].length,
  );

  return sorted
    .map(([page, pageFinding]) => {
      const worstSeverity = pageFinding.reduce((worst, f) => {
        return (SEVERITY_ORDER[f.severity] ?? 99) <
          (SEVERITY_ORDER[worst] ?? 99)
          ? f.severity
          : worst;
      }, "Low");
      const badgeColor =
        {
          Critical: "bg-rose-100 text-rose-700 border-rose-200",
          High: "bg-orange-100 text-orange-700 border-orange-200",
          Medium: "bg-amber-100 text-amber-700 border-amber-200",
          Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
        }[worstSeverity] || "bg-slate-100 text-slate-700 border-slate-200";

      const cards = pageFinding
        .sort(
          (a, b) =>
            (SEVERITY_ORDER[a.severity] ?? 99) -
            (SEVERITY_ORDER[b.severity] ?? 99),
        )
        .map((f) => buildIssueCard(f))
        .join("\n");

      return `<div class="page-group mb-10" data-page="${escapeHtml(page)}">
      ${cards}
    </div>`;
    })
    .join("");
}
