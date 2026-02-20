import { buildSummary } from "./core-findings.mjs";
import { MANUAL_CHECKS } from "./data-manual-checks.mjs";

/**
 * Builds the manual checks section in Markdown format for AI agents.
 */
export function buildManualChecksMd() {
  const entries = MANUAL_CHECKS.map((check) => {
    // Note: In a real scenario, we might want to add agent-specific tasks to the data-manual-checks.mjs
    // For now, we'll use the description as the base task.
    return [
      `---`,
      `### ${check.criterion} — ${check.title} (WCAG 2.2 ${check.level})`,
      ``,
      `${check.description}`,
      ``,
      `**Verification Steps:**`,
      check.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
      ``,
      `**Reference:** ${check.ref}`,
    ].join("\n");
  }).join("\n\n");

  return `## WCAG 2.2 Static Code Checks

> These criteria are not detectable by axe-core. Search the source code for the patterns below and apply fixes where missing.

${entries}
`;
}

/**
 * Builds the AI-optimized remediation guide in Markdown.
 */
export function buildMarkdownSummary(args, findings) {
  const totals = buildSummary(findings);
  const status = findings.length === 0 ? "PASS" : "ISSUES FOUND";

  function findingToMd(f) {
    const evidenceHtml = (() => {
      if (!f.evidence) return null;
      try {
        const nodes = JSON.parse(f.evidence);
        if (!Array.isArray(nodes) || nodes.length === 0) return null;
        return nodes
          .map((n, i) =>
            n.html
              ? `**Instance ${i + 1}**:\n\`\`\`html\n${n.html}\n\`\`\``
              : "",
          )
          .filter(Boolean)
          .join("\n\n");
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
        ? `#### Recommended Technical Solution\n${f.fixDescription ? `**Implementation:** ${f.fixDescription}` : ""}${f.fixCode ? `\n\`\`\`html\n${f.fixCode}\n\`\`\`` : ""}`
        : `#### Recommended Remediation\n${f.recommendedFix}`;

    const ruleRef = f.ruleId
      ? `**Rule Logic:** https://dequeuniversity.com/rules/axe/4.10/${f.ruleId}`
      : null;

    return [
      `---`,
      `### ID: ${f.id || f.ruleId} · ${f.severity} · \`${f.title}\``,
      ``,
      `- **Target Area:** \`${f.area}\``,
      `- **Surgical Selector:** \`${f.selector}\``,
      `- **WCAG Criterion:** ${f.wcag}`,
      `- **Persona Impact:** ${f.impactedUsers}`,
      ``,
      `**Why it matters:** ${f.impact || "This violation creates barriers for users with disabilities."}`,
      ``,
      `**Expected Behavior:** ${f.expected}`,
      ``,
      `**Observed Violation:** ${f.actual}`,
      reproBlock ? `` : null,
      reproBlock,
      ``,
      fixBlock,
      evidenceHtml ? `` : null,
      evidenceHtml ? `#### Evidence from DOM\n${evidenceHtml}` : null,
      ruleRef ? `` : null,
      ruleRef,
      ``,
      `**Context & Patterns:** ${f.recommendedFix}`,
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
        return `## [PAGE] ${page || "/"}\n\n${pageFindings.map(findingToMd).join("\n\n")}`;
      })
      .join("\n\n");
  }

  const blockers = findingsByPage(["Critical", "High"]);
  const deferred = findingsByPage(["Medium", "Low"]);

  return (
    `# 🛡️ Accessibility Remediation Guide — AI MODE
> **Scan Date:** ${new Date().toISOString()}
> **Base URL:** ${args.baseUrl || "N/A"}
> **Target:** ${args.target}
> **Status:** ${status}

## 📊 Findings Overview

| Severity | Count | Priority |
|---|---|---|
| 🔴 **Critical** | ${totals.Critical} | **Blocker** |
| 🟠 **High** | ${totals.High} | **Immediate** |
| 🟡 **Medium** | ${totals.Medium} | **Standard** |
| 🔵 **Low** | ${totals.Low} | **Backlog** |

Total findings: **${findings.length} issues**

---

## 🤖 AI AGENT OPERATING PROCEDURES (GUARDRAILS)

**FOLLOW THESE RULES TO PREVENT REGRESSIONS AND HALLUCINATIONS:**

1.  **Framework Awareness**: This project may use React, Vue, Next.js, or Astro. **NEVER** edit files in \`dist/\`, \`.next/\`, or \`build/\`. If remediation requires a DOM change, locate the corresponding **Source Component** (.tsx, .jsx, .vue, .astro) and apply the logic there.
2.  **Surgical Selection**: Use the **Surgical Selector** and **Evidence from DOM** to verify you are editing the correct element. Accessibility fixes are context-sensitive.
3.  **Global Component Check**: If an issue repeats across multiple pages, it is likely inside a Global Component (e.g., \`Header.tsx\`, \`Button.vue\`). Fix it once at the source.
4.  **Verification**: After applying a fix, explain *why* it resolves the WCAG criterion mentioned.
5.  **No Placeholders**: Do not add "todo" comments. Provide the complete code fix.

---

${blockers ? `## 🔴 Priority Fixes (Critical & High)\n\n${blockers}` : "## Priority Fixes\n\nNo critical or high severity issues found."}

${deferred ? `## 🔵 Deferred Issues (Medium & Low)\n\n${deferred}` : "## Deferred Issues\n\nNo medium or low severity issues found."}

${buildManualChecksMd()}`.trimEnd() + "\n"
  );
}
