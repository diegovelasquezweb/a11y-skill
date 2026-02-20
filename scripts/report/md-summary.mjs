import { buildSummary } from "./utils.mjs";
import { wcagPrinciple } from "./pdf-sections.mjs";
import { buildManualChecksMd } from "./manual-checks.mjs";

export function buildMarkdownSummary(args, findings) {
  const totals = buildSummary(findings);
  const status = findings.length === 0 ? "PASS" : "ISSUES FOUND";

  function findingToMd(f) {
    const evidenceHtml = (() => {
      if (!f.evidence) return "";
      try {
        const nodes = JSON.parse(f.evidence);
        if (!Array.isArray(nodes) || nodes.length === 0) return "";
        return nodes
          .map((n) => (n.html ? `\`\`\`html\n${n.html}\n\`\`\`` : ""))
          .filter(Boolean)
          .join("\n");
      } catch {
        return "";
      }
    })();

    return [
      `---`,
      `### ${f.id} · ${f.severity} · \`${f.ruleId || f.title}\``,
      ``,
      `| Field | Value |`,
      `|---|---|`,
      `| **Page** | \`${f.area}\` |`,
      `| **Selector** | \`${f.selector}\` |`,
      `| **WCAG** | ${f.wcag} |`,
      `| **Impacted users** | ${f.impactedUsers} |`,
      f.screenshotPath
        ? `| **Screenshot** | ![${f.id}](${f.screenshotPath}) |`
        : null,
      ``,
      `**Expected:** ${f.expected}`,
      ``,
      `**Actual:** ${f.actual}`,
      ``,
      f.fixDescription || f.fixCode
        ? [
            f.fixDescription ? `**Fix:** ${f.fixDescription}` : null,
            f.fixCode ? `\`\`\`html\n${f.fixCode}\n\`\`\`` : null,
          ]
            .filter(Boolean)
            .join("\n\n")
        : `**Fix:** ${f.recommendedFix}`,
      ``,
      evidenceHtml ? `**Affected HTML:**\n${evidenceHtml}` : "",
      ``,
      `**Reference:** ${f.recommendedFix}`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  function findingsByPrinciple(severities) {
    const filtered = findings.filter((f) => severities.includes(f.severity));
    if (filtered.length === 0) return "";

    const PRINCIPLES = ["Perceivable", "Operable", "Understandable", "Robust"];
    const groups = {};
    for (const p of PRINCIPLES) groups[p] = [];
    for (const f of filtered) groups[wcagPrinciple(f.ruleId)].push(f);

    return PRINCIPLES.filter((p) => groups[p].length > 0)
      .map(
        (p) =>
          `### ${p} (WCAG ${["1", "2", "3", "4"][PRINCIPLES.indexOf(p)]}.x)\n\n${groups[p].map(findingToMd).join("\n\n")}`,
      )
      .join("\n\n");
  }

  const blockers = findingsByPrinciple(["Critical", "High"]);
  const deferred = findingsByPrinciple(["Medium", "Low"]);

  return (
    `# Accessibility Audit — Remediation Guide

> **Generated:** ${new Date().toISOString()}
> **Target:** ${args.baseUrl || "N/A"}
> **Standard:** ${args.target}
> **Status:** ${status}

## Overview

| Severity | Count |
|---|---|
| Critical | ${totals.Critical} |
| High | ${totals.High} |
| Medium | ${totals.Medium} |
| Low | ${totals.Low} |
| **Total** | **${findings.length}** |

${findings.length === 0 ? "> No accessibility violations found. All checks passed." : ""}

## Agent Instructions

When asked to fix accessibility issues, use this file as your primary reference.
Each finding includes the affected selector, a code fix template, and the exact HTML evidence from the page.
Apply fixes in the source code — do not modify this file or the audit output.
Prioritize Critical and High issues first.

If you have access to the source code, locate the file to edit by searching for
the HTML snippet shown under **Affected HTML** in each finding. The selector and
URL are also available to narrow the search.

${blockers ? `## Priority Fixes (Critical & High)\n\n${blockers}` : "## Priority Fixes\n\nNo critical or high severity issues found."}

${deferred ? `## Deferred Issues (Medium & Low)\n\n${deferred}` : "## Deferred Issues\n\nNo medium or low severity issues found."}

${buildManualChecksMd()}`.trimEnd() + "\n"
  );
}
