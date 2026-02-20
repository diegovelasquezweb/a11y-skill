import { buildSummary } from "./utils.mjs";
import { buildManualChecksMd } from "./manual-checks.mjs";

export function buildMarkdownSummary(args, findings) {
  const totals = buildSummary(findings);
  const status = findings.length === 0 ? "PASS" : "ISSUES FOUND";

  function findingToMd(f) {
    const evidenceHtml = (() => {
      if (!f.evidence) return null;
      try {
        const nodes = JSON.parse(f.evidence);
        if (!Array.isArray(nodes) || nodes.length === 0) return null;
        const blocks = nodes
          .map((n) => (n.html ? `\`\`\`html\n${n.html}\n\`\`\`` : ""))
          .filter(Boolean)
          .join("\n");
        return blocks || null;
      } catch {
        return null;
      }
    })();

    const reproBlock =
      f.reproduction && f.reproduction.length > 0
        ? `**To reproduce:**\n${f.reproduction.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
        : null;

    const fixBlock =
      f.fixDescription || f.fixCode
        ? [
            f.fixDescription ? `**Fix:** ${f.fixDescription}` : null,
            f.fixCode ? `\`\`\`html\n${f.fixCode}\n\`\`\`` : null,
          ]
            .filter(Boolean)
            .join("\n\n")
        : `**Fix:** ${f.recommendedFix}`;

    const ruleRef = f.ruleId
      ? `**Rule:** https://dequeuniversity.com/rules/axe/4.10/${f.ruleId}`
      : null;

    return [
      `---`,
      `### ${f.id} · ${f.severity} · \`${f.ruleId || f.title}\``,
      ``,
      `- **Page:** \`${f.area}\``,
      `- **Selector:** \`${f.selector}\``,
      `- **WCAG:** ${f.wcag}`,
      f.impactedUsers ? `- **Impacted users:** ${f.impactedUsers}` : null,
      ``,
      f.expected ? `**Expected:** ${f.expected}` : null,
      f.expected ? `` : null,
      f.actual ? `**Actual:** ${f.actual}` : null,
      reproBlock ? `` : null,
      reproBlock,
      ``,
      fixBlock,
      evidenceHtml ? `` : null,
      evidenceHtml ? `**Affected HTML:**\n${evidenceHtml}` : null,
      ruleRef ? `` : null,
      ruleRef,
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
        return `## Page: ${page || "/"}\n\n${pageFindings.map(findingToMd).join("\n\n")}`;
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

Critical: ${totals.Critical} · High: ${totals.High} · Medium: ${totals.Medium} · Low: ${totals.Low} · Total: ${findings.length}

${findings.length === 0 ? "> No accessibility violations found. All checks passed." : ""}

## SYSTEM: Agent Instructions

1. This file is grouped by Page/Route. Fix ALL issues on a single route before moving to the next.
2. Use \`grep\` or codebase search to find the CSS selector or the exact HTML shown in **Affected HTML**.
3. **DO NOT** edit compiled files in \`dist/\`, \`build/\`, or \`.next/\`. Always edit source components (\`.tsx\`, \`.vue\`, \`.astro\`).
4. Apply the **Fix** block exactly. Prioritize Critical/High first.
5. After completing all fixes on a route, re-run \`pnpm run audit -- --base-url ${args.baseUrl}\` to verify before moving to the next route.

${blockers ? `## Priority Fixes (Critical & High)\n\n${blockers}` : "## Priority Fixes\n\nNo critical or high severity issues found."}

${deferred ? `## Deferred Issues (Medium & Low)\n\n${deferred}` : "## Deferred Issues\n\nNo medium or low severity issues found."}

${buildManualChecksMd()}`.trimEnd() + "\n"
  );
}
