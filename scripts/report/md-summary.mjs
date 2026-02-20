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
      `- **Page:** \`${f.area}\``,
      `- **Selector:** \`${f.selector}\``,
      `- **WCAG:** ${f.wcag}`,
      `- **Impacted users:** ${f.impactedUsers}`,
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

  function findingsByPage(severities) {
    const filtered = findings.filter((f) => severities.includes(f.severity));
    if (filtered.length === 0) return "";

    const pages = new Set();
    for (const f of filtered) pages.add(f.area);

    return Array.from(pages)
      .sort()
      .map((page) => {
        const pageFindings = filtered.filter((f) => f.area === page);
        return `## Page: ${page}\n\n${pageFindings.map(findingToMd).join("\n\n")}`;
      })
      .join("\n\n");
  }

  const blockers = findingsByPage(["Critical", "High"]);
  const deferred = findingsByPage(["Medium", "Low"]);

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

## 🤖 SYSTEM: Agent Instructions

**CRITICAL INSTRUCTIONS FOR AI AGENTS:**
1. This file is grouped by Page/Route. Fix ALL issues on a single route before moving to the next.
2. Use your \`grep\` or codebase search tools to find the unique CSS selectors or the exact code shown in **Affected HTML**.
3. **DO NOT** edit compiled files in \`dist/\`, \`build/\`, or \`.next/\`. Always edit the original source components (e.g., \`.tsx\`, \`.vue\`, \`.astro\`).
4. Apply the exact logic from the **Fix** block to resolve the violation. Prioritize Critical/High first.

${blockers ? `## Priority Fixes (Critical & High)\n\n${blockers}` : "## Priority Fixes\n\nNo critical or high severity issues found."}

${deferred ? `## Deferred Issues (Medium & Low)\n\n${deferred}` : "## Deferred Issues\n\nNo medium or low severity issues found."}

${buildManualChecksMd()}`.trimEnd() + "\n"
  );
}
