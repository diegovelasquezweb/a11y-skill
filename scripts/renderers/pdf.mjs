/**
 * @file format-pdf.mjs
 * @description PDF report component builders and formatting logic.
 * Generates the structural HTML parts for the executive summary, legal risk,
 * remediation roadmap, and technical methodology for the PDF report.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeComplianceScore, scoreLabel } from "./findings.mjs";
import { escapeHtml } from "./utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCORING_CONFIG = JSON.parse(
  readFileSync(join(__dirname, "../../assets/scoring-config.json"), "utf-8"),
);
const REGULATORY = JSON.parse(
  readFileSync(join(__dirname, "../../assets/regulatory.json"), "utf-8"),
);

/**
 * Maps compliance performance labels to risk assessments for the executive summary.
 * @type {Object<string, string>}
 */
const RISK_LABELS = SCORING_CONFIG.riskLabels;

/**
 * Returns the risk metrics (label and risk assessment) for a given compliance score.
 * @param {number} score - The calculated compliance score.
 * @returns {Object} An object containing 'label' and 'risk' strings.
 */
export function scoreMetrics(score) {
  const label = scoreLabel(score);
  return { label, risk: RISK_LABELS[label] };
}

/**
 * Builds the Executive Summary section for the PDF report.
 * @param {Object} args - The parsed CLI arguments.
 * @param {Object[]} findings - The list of normalized findings.
 * @param {Object<string, number>} totals - Summary counts per severity.
 * @returns {string} The HTML string for the executive summary section.
 */
export function buildPdfExecutiveSummary(args, findings, totals) {
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
      ${SCORING_CONFIG.severityDefinitions.map((d) => `<tr><td><strong>${escapeHtml(d.level)}</strong></td><td>${totals[d.level]}</td><td>${escapeHtml(d.impact)}</td><td>${escapeHtml(d.action)}</td></tr>`).join("\n      ")}
    </tbody>
  </table>
</div>`;
}

/**
 * Builds the Compliance & Legal Risk section for the PDF report.
 * @param {Object<string, number>} totals - Summary counts per severity.
 * @returns {string} The HTML string for the risk analysis section.
 */
export function buildPdfRiskSection(totals) {
  const score = computeComplianceScore(totals);
  const level =
    SCORING_CONFIG.riskLevels.find((l) => score >= l.minScore) ||
    SCORING_CONFIG.riskLevels[SCORING_CONFIG.riskLevels.length - 1];
  const riskLevel = level.label;
  const riskColor = level.color;

  const regulationRows = REGULATORY.regulations
    .map(
      (reg) =>
        `<tr>
        <td><strong>${escapeHtml(reg.name)}</strong></td>
        <td>${escapeHtml(reg.jurisdiction)}</td>
        <td>${escapeHtml(reg.standard)}</td>
        <td>${escapeHtml(reg.deadline)}</td>
      </tr>`,
    )
    .join("\n      ");

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
      ${regulationRows}
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

/**
 * Builds the Remediation Roadmap section for the PDF report.
 * @param {Object[]} findings - The normalized findings to prioritize.
 * @returns {string} The HTML string for the roadmap section.
 */
export function buildPdfRemediationRoadmap(findings) {
  const critical = findings.filter((f) => f.severity === "Critical");
  const high = findings.filter((f) => f.severity === "High");
  const medium = findings.filter((f) => f.severity === "Medium");
  const low = findings.filter((f) => f.severity === "Low");

  const mult = SCORING_CONFIG.effortMultipliers;
  const effortHours = (c, h, m, l) =>
    Math.round(c * mult.Critical + h * mult.High + m * mult.Medium + l * mult.Low);

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

/**
 * Builds the Methodology & Scope section for the PDF report.
 * @param {Object} args - The parsed CLI arguments.
 * @param {Object[]} findings - The normalized findings for scope calculation.
 * @returns {string} The HTML string for the methodology section.
 */
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
      ${SCORING_CONFIG.severityDefinitions.map((d) => `<tr><td><strong>${escapeHtml(d.level)}</strong></td><td>${escapeHtml(d.definition)}</td><td>${escapeHtml(d.action)}</td></tr>`).join("\n      ")}
    </tbody>
  </table>
</div>`;
}

/**
 * Builds the Audit Scope & Limitations section for the PDF report.
 * @returns {string} Reusable HTML block explaining automated audit limits.
 */
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

/**
 * Builds the cover page for the PDF report.
 * @param {Object} options - Cover page configuration.
 * @param {string} options.siteHostname - The hostname of the audited site.
 * @param {string} options.target - The compliance target (e.g., WCAG 2.2 AA).
 * @param {number} options.score - The final compliance score.
 * @param {string} options.coverDate - The formatted date for the cover.
 * @returns {string} The HTML string for the cover page.
 */
export function buildPdfCoverPage({ siteHostname, target, score, coverDate }) {
  const metrics = scoreMetrics(score);
  const scoreColor =
    score >= 75 ? "#16a34a" : score >= 55 ? "#d97706" : "#dc2626";

  return `
    <div class="cover-page">
      <!-- Top accent line -->
      <div style="border-top: 5pt solid #111827; padding-top: 1.3cm;">
        <p style="font-family: 'Inter', sans-serif; font-size: 7pt; font-weight: 700; letter-spacing: 3.5pt; text-transform: uppercase; color: #9ca3af; margin: 0;">Accessibility Assessment</p>
      </div>

      <!-- Main content -->
      <div style="flex: 1; padding: 2cm 0 1.5cm 0;">
        <p style="font-family: 'Inter', sans-serif; font-size: 13pt; color: #6b7280; margin: 0 0 0.4cm 0; font-weight: 400;">${escapeHtml(siteHostname)}</p>
        <h1 style="font-family: 'Inter', sans-serif !important; font-size: 38pt !important; font-weight: 900 !important; line-height: 1.08 !important; color: #111827 !important; margin: 0 0 1.8cm 0 !important; border: none !important; padding: 0 !important;">Web Accessibility<br>Audit</h1>
        <div style="border-top: 1.5pt solid #111827; width: 4.5cm; margin-bottom: 1.5cm;"></div>

        <!-- Score + meta -->
        <div style="display: flex; align-items: flex-start;">
          <div style="min-width: 7cm;">
            <p style="font-family: 'Inter', sans-serif; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5pt; color: #9ca3af; margin: 0 0 5pt 0;">Compliance Score</p>
            <p style="font-family: 'Inter', sans-serif; font-size: 40pt; font-weight: 900; line-height: 1; margin: 0; color: ${scoreColor};">${score}<span style="font-size: 16pt; font-weight: 400; color: #9ca3af;"> / 100</span></p>
            <p style="font-family: 'Inter', sans-serif; font-size: 9.5pt; font-weight: 700; color: #374151; margin: 5pt 0 0 0;">${metrics.label} &mdash; ${metrics.risk}</p>
          </div>
          <div style="border-left: 1pt solid #e5e7eb; padding-left: 2cm;">
            <p style="font-family: 'Inter', sans-serif; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5pt; color: #9ca3af; margin: 0 0 4pt 0;">Standard</p>
            <p style="font-family: 'Inter', sans-serif; font-size: 11pt; font-weight: 700; color: #111827; margin: 0 0 1.1cm 0;">${escapeHtml(target)}</p>
            <p style="font-family: 'Inter', sans-serif; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5pt; color: #9ca3af; margin: 0 0 4pt 0;">Audit Date</p>
            <p style="font-family: 'Inter', sans-serif; font-size: 11pt; font-weight: 700; color: #111827; margin: 0;">${escapeHtml(coverDate)}</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top: 1pt solid #e5e7eb; padding-top: 0.6cm; display: flex; justify-content: space-between; align-items: center;">
        <p style="font-family: 'Inter', sans-serif; font-size: 8pt; color: #9ca3af; margin: 0;">Generated by <strong style="color: #6b7280;">a11y</strong></p>
        <p style="font-family: 'Inter', sans-serif; font-size: 8pt; color: #9ca3af; margin: 0;">github.com/diegovelasquezweb/a11y</p>
      </div>
    </div>`;
}

/**
 * Builds the detailed issue summary table for the PDF report.
 * @param {Object[]} findings - The list of findings to display in the table.
 * @returns {string} The HTML string for the issue summary section.
 */
export function buildPdfIssueSummaryTable(findings) {
  if (findings.length === 0) {
    return `
    <div style="page-break-before: always;">
      <h2 style="margin-top: 0;">5. Issue Summary</h2>
      <p style="font-size: 10pt; line-height: 1.7; margin-bottom: 1rem;">
        The table below lists all accessibility issues detected during the automated scan.
        Each issue is identified by severity, affected page, and the user groups it impacts.
        Full technical detail for developers is provided in the accompanying HTML report.
      </p>
      <p style="font-style: italic; color: #6b7280; font-size: 10pt;">No accessibility violations were detected during the automated scan.</p>
    </div>`;
  }

  const rows = findings
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
    .join("");

  return `
    <div style="page-break-before: always;">
      <h2 style="margin-top: 0;">5. Issue Summary</h2>
      <p style="font-size: 10pt; line-height: 1.7; margin-bottom: 1rem;">
        The table below lists all accessibility issues detected during the automated scan.
        Each issue is identified by severity, affected page, and the user groups it impacts.
        Full technical detail for developers is provided in the accompanying HTML report.
      </p>
      <table class="stats-table">
        <thead>
          <tr><th>ID</th><th>Issue</th><th>Page</th><th>Severity</th><th>Users Affected</th></tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>`;
}
