export const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

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
      area: String(item.area ?? ""),
      url: String(item.url ?? ""),
      selector: String(item.selector ?? ""),
      impactedUsers: String(item.impacted_users ?? "Users relying on assistive technology"),
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
      totalInstances: typeof item.total_instances === "number" ? item.total_instances : null,
      screenshotPath: item.screenshot_path ?? null,
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
 */
export function computeComplianceScore(totals) {
  const weights = { Critical: 10, High: 5, Medium: 2, Low: 1 };
  const totalWeight =
    totals.Critical * weights.Critical +
    totals.High * weights.High +
    totals.Medium * weights.Medium +
    totals.Low * weights.Low;

  if (totalWeight === 0) return 100;

  // Each finding reduces the score. A "perfect" score is 100.
  // We use a logarithmic-like penalty so it doesn't hit 0 too fast but penalizes Critical heavily.
  const score = Math.max(0, 100 - totalWeight);
  return Math.round(score);
}

/**
 * Returns a human-readable grade based on the score.
 */
export function scoreLabel(score) {
  if (score >= 95) return "Excellent";
  if (score >= 85) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 50) return "Needs Improvement";
  return "Poor";
}
