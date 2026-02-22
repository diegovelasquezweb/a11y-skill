export const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function computePriorityScore(item) {
  const sev = SEVERITY_ORDER[item.severity] ?? 3;
  // Severity: 0-50 pts (Critical=50, High=30, Medium=10, Low=0)
  const severityPoints = sev === 0 ? 50 : sev === 1 ? 30 : sev === 2 ? 10 : 0;
  // Instance count: 0-30 pts, logarithmic curve so 1 instance ≠ 0 pts
  const instances = item.total_instances || 1;
  const instancePoints = Math.min(
    Math.round(Math.log2(instances + 1) * 10),
    30,
  );
  // Fix available bonus: 0-20 pts
  const fixPoints = item.fix_code ? 20 : 0;
  return severityPoints + instancePoints + fixPoints;
}

/**
 * Normalizes raw AXE findings into a consistent structure used by all reports.
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
      wcag: String(item.wcag ?? ""),
      wcagCriterionId: item.wcag_criterion_id ?? null,
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
      manualTest: item.manual_test ?? null,
      screenshotPath: item.screenshot_path ?? null,
      falsePositiveRisk: item.false_positive_risk ?? null,
      fixDifficultyNotes: item.fix_difficulty_notes ?? null,
      frameworkNotes: item.framework_notes ?? null,
      cmsNotes: item.cms_notes ?? null,
      fileSearchPattern: item.file_search_pattern ?? null,
      managedByLibrary: item.managed_by_library ?? null,
      componentHint: item.component_hint ?? null,
      verificationCommand: item.verification_command ?? null,
    }))
    .sort((a, b) => {
      const sa = SEVERITY_ORDER[a.severity] ?? 99;
      const sb = SEVERITY_ORDER[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.id.localeCompare(b.id);
    });
}

/**
 * Totals the findings by severity.
 */
export function buildSummary(findings) {
  const totals = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const finding of findings) {
    if (finding.severity in totals) totals[finding.severity] += 1;
  }
  return totals;
}

/**
 * Calculates a 0-100 compliance score based on weighted severities.
 * Weights: Critical=15, High=5, Medium=2, Low=0.5
 */
export function computeComplianceScore(totals) {
  const raw =
    100 -
    totals.Critical * 15 -
    totals.High * 5 -
    totals.Medium * 2 -
    totals.Low * 0.5;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Returns a human-readable grade based on the score.
 */
export function scoreLabel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 55) return "Fair";
  if (score >= 35) return "Poor";
  return "Critical";
}
