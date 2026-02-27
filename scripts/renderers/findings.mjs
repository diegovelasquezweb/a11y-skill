/**
 * @file findings.mjs
 * @description Core data normalization and scoring logic for accessibility findings.
 * Provides functions to process raw scanner results into a structured format used
 * across all report types (HTML, Markdown, PDF).
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCORING_CONFIG = JSON.parse(
  readFileSync(join(__dirname, "../../assets/compliance-config.json"), "utf-8"),
);
const RULE_METADATA = JSON.parse(
  readFileSync(join(__dirname, "../../assets/wcag-reference.json"), "utf-8"),
);

/**
 * Defines the priority order for severity levels, where lower values indicate higher priority.
 * @type {Object<string, number>}
 */
export const SEVERITY_ORDER = SCORING_CONFIG.severityOrder;

/**
 * Calculates a weighted priority score for a finding based on severity, instance count, and fix availability.
 * @param {Object} item - The finding item to score.
 * @returns {number} A calculated score (typically 0-100).
 */
function computePriorityScore(item) {
  const sev = SEVERITY_ORDER[item.severity] ?? 3;
  const { severityPoints, instancePointsMax, instanceScale, fixBonus } =
    SCORING_CONFIG.priorityScoring;
  const sevPts = severityPoints[String(sev)] ?? 0;
  const instances = item.total_instances || 1;
  const instancePts = Math.min(
    Math.round(Math.log2(instances + 1) * instanceScale),
    instancePointsMax,
  );
  const fixPts = item.fix_code ? fixBonus : 0;
  return sevPts + instancePts + fixPts;
}

/**
 * Normalizes raw scanner finding objects into a consistent structure for reporting.
 * Sorts the result by severity and then by ID.
 * @param {Object} payload - The raw scanner result payload.
 * @param {Object[]} payload.findings - The array of findings to normalize.
 * @returns {Object[]} An array of normalized and sorted finding objects.
 * @throws {Error} If the payload structure is invalid.
 */
export function normalizeFindings(payload) {
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
      wcag: String(item.wcag ?? item.wcag_criterion_id ?? ""),
      wcagCriterionId: item.wcag_criterion_id ?? null,
      wcagClassification: item.wcag_classification ?? null,
      area: String(item.area ?? ""),
      url: String(item.url ?? ""),
      selector: String(item.selector ?? ""),
      primarySelector: String(item.primary_selector ?? item.selector ?? ""),
      impactedUsers: String(
        item.impacted_users ?? "Users relying on assistive technology",
      ),
      impact: String(item.impact ?? ""),
      reproduction: Array.isArray(item.reproduction)
        ? item.reproduction.map((v) => String(v))
        : [],
      actual: String(item.actual ?? ""),
      expected: String(item.expected ?? ""),
      mdn: item.mdn ?? null,
      fixDescription: item.fix_description ?? null,
      fixCode: item.fix_code ?? null,
      recommendedFix: String(item.recommended_fix ?? item.recommendedFix ?? ""),
      evidence: Array.isArray(item.evidence) ? item.evidence : [],
      totalInstances:
        typeof item.total_instances === "number" ? item.total_instances : null,
      priorityScore: computePriorityScore(item),
      effort: item.effort ?? null,
      relatedRules: Array.isArray(item.related_rules) ? item.related_rules : [],
      fixCodeLang: item.fix_code_lang ?? "html",
      screenshotPath: item.screenshot_path ?? null,
      falsePositiveRisk: item.false_positive_risk ?? null,
      fixPattern: item.fix_pattern ?? null,
      guardrails: item.guardrails ?? null,
      fixDifficultyNotes: item.fix_difficulty_notes ?? null,
      frameworkNotes: item.framework_notes ?? null,
      cmsNotes: item.cms_notes ?? null,
      fileSearchPattern: item.file_search_pattern ?? null,
      managedByLibrary: item.managed_by_library ?? null,
      componentHint: item.component_hint ?? null,
      verificationCommand: item.verification_command ?? null,
      verificationCommandFallback: item.verification_command_fallback ?? null,
      pagesAffected: typeof item.pages_affected === "number" ? item.pages_affected : null,
      affectedUrls: Array.isArray(item.affected_urls) ? item.affected_urls : null,
    }))
    .sort((a, b) => {
      const sa = SEVERITY_ORDER[a.severity] ?? 99;
      const sb = SEVERITY_ORDER[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.id.localeCompare(b.id);
    });
}

/**
 * Aggregates findings by their severity level.
 * @param {Object[]} findings - The normalized list of findings.
 * @returns {Object<string, number>} An object mapping severity labels to counts.
 */
export function buildSummary(findings) {
  const totals = { Critical: 0, Serious: 0, Moderate: 0, Minor: 0 };
  for (const finding of findings) {
    if (finding.severity in totals) totals[finding.severity] += 1;
  }
  return totals;
}

/**
 * Calculates a global compliance score (0-100) based on weighted severity counts.
 * @param {Object<string, number>} totals - The summary of counts per severity.
 * @returns {number} An integer compliance score from 0 to 100.
 */
export function computeComplianceScore(totals) {
  const { baseScore, penalties } = SCORING_CONFIG.complianceScore;
  const raw =
    baseScore -
    totals.Critical * penalties.Critical -
    totals.Serious * penalties.Serious -
    totals.Moderate * penalties.Moderate -
    totals.Minor * penalties.Minor;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Returns a human-readable performance label (grade) based on the compliance score.
 * @param {number} score - The calculated compliance score.
 * @returns {string} A label like "Excellent", "Good", "Fair", "Poor", or "Critical".
 */
export function scoreLabel(score) {
  for (const { min, label } of SCORING_CONFIG.gradeThresholds) {
    if (score >= min) return label;
  }
  return "Critical";
}

/**
 * Analyzes findings to determine the unique number of issues impacting specific user personas.
 * @param {Object[]} findings - The normalized list of findings.
 * @returns {Object} An object containing impact counts for screenReader, keyboard, vision, and cognitive personas.
 */
export function buildPersonaSummary(findings) {
  const SMART_MAP = RULE_METADATA.personaMapping;

  const uniqueIssues = {};
  for (const persona of Object.keys(SMART_MAP)) {
    uniqueIssues[persona] = new Set();
  }

  for (const f of findings) {
    const users = (f.impactedUsers || "").toLowerCase();
    const ruleId = (f.ruleId || "").toLowerCase();
    const title = (f.title || "").toLowerCase();
    const issueKey = f.ruleId || f.title;

    Object.keys(SMART_MAP).forEach((persona) => {
      const { rules, keywords } = SMART_MAP[persona];
      const matchRule = rules.some((r) => ruleId.includes(r.toLowerCase()));
      const matchKeyword = keywords.some(
        (k) => users.includes(k) || title.includes(k),
      );

      if (matchRule || matchKeyword) {
        uniqueIssues[persona].add(issueKey);
      }
    });
  }

  const result = {};
  for (const persona of Object.keys(SMART_MAP)) {
    result[persona] = uniqueIssues[persona].size;
  }
  return result;
}
