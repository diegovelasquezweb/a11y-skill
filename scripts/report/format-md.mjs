import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { buildSummary } from "./core-findings.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manualChecksPath = join(__dirname, "../../assets/manual-checks.json");
let MANUAL_CHECKS;
try {
  MANUAL_CHECKS = JSON.parse(readFileSync(manualChecksPath, "utf-8"));
} catch {
  throw new Error("Missing or invalid assets/manual-checks.json — reinstall the skill.");
}

/**
 * Builds the manual checks section in Markdown format for AI agents.
 */
export function buildManualChecksMd() {
  const entries = MANUAL_CHECKS.map((check) => {
    return [
      `---`,
      `### ${check.criterion} — ${check.title} (WCAG 2.2 ${check.level})`,
      ``,
      `${check.description}`,
      ``,
      `**Verification Steps:**`,
      check.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
      ``,
      ...(check.remediation?.length
        ? [
            `**Recommended Fix:**`,
            check.remediation.map((r) => `- ${r}`).join("\n"),
            ``,
          ]
        : []),
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
export function buildMarkdownSummary(args, findings, metadata = {}) {
  const totals = buildSummary(findings);
  const status = findings.length === 0 ? "PASS" : "ISSUES FOUND";

  function findingToMd(f) {
    let evidenceHtml = null;
    let evidenceLabel = "#### Evidence from DOM";
    (() => {
      if (!f.evidence) return;
      try {
        const nodes = JSON.parse(f.evidence);
        if (!Array.isArray(nodes) || nodes.length === 0) return;
        const shownCount = nodes.filter((n) => n.html).length;
        if (f.totalInstances && f.totalInstances > shownCount) {
          evidenceLabel = `#### Evidence from DOM (showing ${shownCount} of ${f.totalInstances} instances)`;
        }
        evidenceHtml = nodes
          .map((n, i) =>
            n.html
              ? `**Instance ${i + 1}**:\n\`\`\`html\n${n.html}\n\`\`\``
              : "",
          )
          .filter(Boolean)
          .join("\n\n");
      } catch {
        // ignore malformed evidence
      }
    })();

    const reproBlock =
      f.reproduction && f.reproduction.length > 0
        ? `**To reproduce:**\n${f.reproduction.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
        : null;

    const fixBlock =
      f.fixDescription || f.fixCode
        ? `#### Recommended Technical Solution\n${f.fixDescription ? `**Implementation:** ${f.fixDescription}\n` : ""}${f.fixCode ? `\`\`\`html\n${f.fixCode}\n\`\`\`` : ""}`.trimEnd()
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
      evidenceHtml ? `${evidenceLabel}\n${evidenceHtml}` : null,
      ruleRef ? `` : null,
      ruleRef,
      f.fixDescription || f.fixCode ? `` : null,
      f.fixDescription || f.fixCode
        ? `**Context & Patterns:** ${f.recommendedFix}`
        : null,
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

  const referencesSection = metadata.regulatory
    ? `
---

## 📚 Global References & Regulatory Context

### US Regulatory Context (ADA/Section 508)
- **18F Accessibility Guide**: ${metadata.regulatory["18f"]}
- **Section 508 Standards**: ${metadata.regulatory.section508}

### Verification & Checklists
- **A11y Project Checklist**: ${metadata.checklist}
`
    : "";

  return (
    `# 🛡️ Accessibility Remediation Guide — AI MODE
> **Scan Date:** ${metadata.scanDate || new Date().toISOString()}
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

1.  **Framework & CMS Awareness**: This project may use React, Vue, Next.js, Astro, **Shopify** (.liquid), **WordPress** (.php), or **Drupal** (.twig).
    - **NEVER** edit compiled, minified, or cached files (e.g., \`dist/\`, \`.next/\`, \`build/\`, \`wp-content/cache/\`, \`assets/*.min.js\`).
    - **WordPress**: Work only in \`wp-content/themes/\` or \`plugins/\`. **NEVER** edit \`wp-admin/\` or \`wp-includes/\`.
    - **Shopify**: Edit \`.liquid\` files in \`sections/\`, \`snippets/\`, or \`layout/\`. Avoid minified assets.
    - **Drupal**: Search for \`.html.twig\` in \`themes/\`. Clear cache with \`drush cr\` after changes.
    - **Source of Truth**: Traced DOM violations must be fixed at the **Source Component** or **Server-side Template**. Edit the origin, not the output.
2.  **Surgical Selection**: Use the **Surgical Selector** and **Evidence from DOM** to verify you are editing the correct element. Accessibility fixes are context-sensitive.
3.  **Global Component Check**: If an issue repeats across multiple pages, it is likely inside a Global Component (e.g., \`Header.tsx\`, \`Button.vue\`). Fix it once at the source.
4.  **Verification**: After applying a fix, explain *why* it resolves the WCAG criterion mentioned.
5.  **No Placeholders**: Do not add "todo" comments. Provide the complete code fix.

---

${blockers ? `## 🔴 Priority Fixes (Critical & High)\n\n${blockers}` : "## Priority Fixes\n\nNo critical or high severity issues found."}

${deferred ? `## 🔵 Deferred Issues (Medium & Low)\n\n${deferred}` : "## Deferred Issues\n\nNo medium or low severity issues found."}

${buildManualChecksMd()}
${referencesSection}`.trimEnd() + "\n"
  );
}
