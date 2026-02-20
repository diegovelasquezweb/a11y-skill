export const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function computePriorityScore(item) {
  const sev = SEVERITY_ORDER[item.severity] ?? 3;
  // Severity: 0-50 pts (Critical=50, High=30, Medium=10, Low=0)
  const severityPoints = sev === 0 ? 50 : sev === 1 ? 30 : sev === 2 ? 10 : 0;
  // Instance count: 0-30 pts, logarithmic curve so 1 instance ≠ 0 pts
  const instances = item.total_instances || 1;
  const instancePoints = Math.min(Math.round(Math.log2(instances + 1) * 10), 30);
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
      area: String(item.area ?? ""),
      url: String(item.url ?? ""),
      selector: String(item.selector ?? ""),
      primarySelector: String(item.primary_selector ?? item.selector ?? ""),
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
      evidence: Array.isArray(item.evidence) ? item.evidence : [],
      totalInstances: typeof item.total_instances === "number" ? item.total_instances : null,
      priorityScore: computePriorityScore(item),
      effort: item.effort ?? null,
      relatedRules: Array.isArray(item.related_rules) ? item.related_rules : [],
      fixCodeLang: item.fix_code_lang ?? "html",
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
