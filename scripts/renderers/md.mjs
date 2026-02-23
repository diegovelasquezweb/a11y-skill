/**
 * @file format-md.mjs
 * @description Markdown remediation guide builder optimized for AI agents.
 * Generates an actionable markdown document containing technical solutions,
 * surgical selectors, and framework-specific guardrails.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { buildSummary } from "./findings.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Path to the manual check database asset.
 * @type {string}
 */
const frameworkConfigPath = join(__dirname, "../../assets/framework-config.json");

let FRAMEWORK_CONFIG;
try {
  FRAMEWORK_CONFIG = JSON.parse(readFileSync(frameworkConfigPath, "utf-8"));
} catch {
  throw new Error(
    "Missing or invalid assets/framework-config.json — reinstall the skill.",
  );
}

const manualChecksPath = join(__dirname, "../../assets/manual-checks.json");

/**
 * List of manual accessibility checks for documentation.
 * @type {Object[]}
 */
let MANUAL_CHECKS;
try {
  MANUAL_CHECKS = JSON.parse(readFileSync(manualChecksPath, "utf-8"));
} catch {
  throw new Error(
    "Missing or invalid assets/manual-checks.json — reinstall the skill.",
  );
}

/**
 * Generates the manual checks section in Markdown format.
 * Includes descriptions, verification steps, and remediation advice for AI agents.
 * @returns {string} The manual checks remediation section.
 */
function buildManualChecksMd() {
  const entries = MANUAL_CHECKS.map((check) => {
    const codeBlock = check.code_example
      ? [
          ``,
          `**Before / After:**`,
          `\`\`\`${check.code_example.lang || "html"}`,
          check.code_example.before,
          `\`\`\``,
          `\`\`\`${check.code_example.lang || "html"}`,
          check.code_example.after,
          `\`\`\``,
        ].join("\n")
      : null;

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
      codeBlock,
      `**Reference:** ${check.ref}`,
    ]
      .filter(Boolean)
      .join("\n");
  }).join("\n\n");

  return `## WCAG 2.2 Static Code Checks

> These criteria are not detectable by axe-core. Search the source code for the patterns below and apply fixes where missing.

${entries}
`;
}

/**
 * Resolves the active web framework or CMS platform to provide tailored guardrails.
 * @param {Object} [metadata={}] - Scan metadata including project context.
 * @param {string} [baseUrl=""] - The target base URL.
 * @param {string} [configFramework=null] - Explicit framework override from config.
 * @returns {string} The identified framework ID (e.g., 'shopify', 'nextjs', 'generic').
 */
function resolveFramework(metadata = {}, baseUrl = "", configFramework = null) {
  if (configFramework) return configFramework.toLowerCase();
  const detected = metadata.projectContext?.framework;
  if (detected) return detected;
  const url = baseUrl.toLowerCase();
  const urlSignals = FRAMEWORK_CONFIG.frameworkDetection?.urlSignals || [];
  for (const signal of urlSignals) {
    if (url.includes(signal.pattern)) return signal.framework;
  }
  return "generic";
}

/**
 * Constructs a set of guardrail instructions tailored to a specific framework.
 * @param {string} framework - The identified framework ID.
 * @returns {string} A bulleted list of framework-specific operating procedures.
 */
function buildGuardrails(framework) {
  const guardrails = FRAMEWORK_CONFIG.guardrails || {};
  const shared = guardrails.shared || [];
  const frameworkRules = guardrails.framework || {};
  const frameworkRule = frameworkRules[framework] ?? frameworkRules.generic;
  return [frameworkRule, ...shared].join("\n");
}

/**
 * Builds the full AI-optimized remediation guide in Markdown format.
 * Includes a summary table, guardrails, component map, and detailed issue lists.
 * @param {Object} args - The parsed CLI arguments.
 * @param {Object[]} findings - The normalized findings to include.
 * @param {Object} [metadata={}] - Optional scan metadata.
 * @returns {string} The complete Markdown document.
 */
export function buildMarkdownSummary(args, findings, metadata = {}) {
  const totals = buildSummary(findings);
  const status = findings.length === 0 ? "PASS" : "ISSUES FOUND";

  function findingToMd(f) {
    let evidenceHtml = null;
    let evidenceLabel = "#### Evidence from DOM";
    (() => {
      if (!f.evidence || !Array.isArray(f.evidence) || f.evidence.length === 0)
        return;
      const shownCount = f.evidence.filter((n) => n.html).length;
      if (f.totalInstances && f.totalInstances > shownCount) {
        evidenceLabel = `#### Evidence from DOM (showing ${shownCount} of ${f.totalInstances} instances)`;
      }
      evidenceHtml = f.evidence
        .map((n, i) =>
          n.html ? `**Instance ${i + 1}**:\n\`\`\`html\n${n.html}\n\`\`\`` : "",
        )
        .filter(Boolean)
        .join("\n\n");
    })();

    const codeLang = f.fixCodeLang || "html";
    const fixBlock =
      f.fixDescription || f.fixCode
        ? `#### Recommended Technical Solution\n${f.fixDescription ? `**Implementation:** ${f.fixDescription}\n` : ""}${f.fixCode ? `\`\`\`${codeLang}\n${f.fixCode}\n\`\`\`` : ""}`.trimEnd()
        : `#### Recommended Remediation\n${f.recommendedFix}`;

    const fpRisk =
      f.falsePositiveRisk && f.falsePositiveRisk !== "low"
        ? `> ⚠️ **False Positive Risk (${f.falsePositiveRisk}):** Verify this finding manually before applying a fix — automated detection of this rule has known edge cases.`
        : null;

    const difficultyBlock = f.fixDifficultyNotes
      ? `**Implementation Notes:** ${f.fixDifficultyNotes}`
      : null;

    const frameworkBlock =
      f.frameworkNotes && typeof f.frameworkNotes === "object"
        ? `**Framework Guidance:**\n${Object.entries(f.frameworkNotes)
            .map(
              ([fw, note]) =>
                `- **${fw.charAt(0).toUpperCase() + fw.slice(1)}:** ${note}`,
            )
            .join("\n")}`
        : null;

    const cmsBlock =
      f.cmsNotes && typeof f.cmsNotes === "object"
        ? `**CMS Guidance:**\n${Object.entries(f.cmsNotes)
            .map(
              ([cms, note]) =>
                `- **${cms.charAt(0).toUpperCase() + cms.slice(1)}:** ${note}`,
            )
            .join("\n")}`
        : null;

    const relatedBlock =
      Array.isArray(f.relatedRules) && f.relatedRules.length > 0
        ? `**Fixing this also helps:**\n${f.relatedRules.map((r) => `- \`${r.id}\` — ${r.reason}`).join("\n")}`
        : null;

    const ruleRef = f.ruleId
      ? `**Rule Logic:** https://dequeuniversity.com/rules/axe/4.10/${f.ruleId}`
      : null;

    const searchPatternBlock = f.fileSearchPattern
      ? `**Search in:** \`${f.fileSearchPattern}\``
      : null;

    const managedBlock = f.managedByLibrary
      ? `> ⚠️ **Managed Component Warning:** This project uses **${f.managedByLibrary}** — verify this element is not a library-managed component before applying ARIA fixes.`
      : null;

    const verifyBlock = f.verificationCommand
      ? `**Quick verify:** \`${f.verificationCommand}\``
      : null;

    return [
      `---`,
      `### ID: ${f.id || f.ruleId} · ${f.severity} · \`${f.title}\``,
      ``,
      `- **Target Area:** \`${f.area}\``,
      `- **Surgical Selector:** \`${f.primarySelector || f.selector}\``,
      `- **WCAG Criterion:** ${f.wcag}`,
      `- **Persona Impact:** ${f.impactedUsers}`,
      f.priorityScore != null
        ? `- **Priority Score:** ${f.priorityScore}/100`
        : null,
      ``,
      managedBlock ? `${managedBlock}\n` : null,
      `**Why it matters:** ${f.impact || "This violation creates barriers for users with disabilities."}`,
      ``,
      `**Expected Behavior:** ${f.expected}`,
      ``,
      `**Observed Violation:** ${f.actual}`,
      searchPatternBlock ? `` : null,
      searchPatternBlock,
      ``,
      fixBlock,
      difficultyBlock ? `` : null,
      difficultyBlock,
      frameworkBlock ? `` : null,
      frameworkBlock,
      cmsBlock ? `` : null,
      cmsBlock,
      fpRisk ? `` : null,
      fpRisk,
      evidenceHtml ? `` : null,
      evidenceHtml ? `${evidenceLabel}\n${evidenceHtml}` : null,
      ruleRef ? `` : null,
      ruleRef,
      relatedBlock ? `` : null,
      relatedBlock,
      verifyBlock ? `` : null,
      verifyBlock,
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

  function buildComponentMap() {
    const groups = {};
    for (const f of findings) {
      const hint = f.componentHint || "other";
      if (!groups[hint]) groups[hint] = [];
      groups[hint].push(f);
    }
    const sorted = Object.entries(groups).sort(
      (a, b) => b[1].length - a[1].length,
    );
    if (sorted.length <= 1) return "";
    const rows = sorted.map(([component, items]) => {
      const severities = [...new Set(items.map((i) => i.severity))].join(", ");
      const rules = [...new Set(items.map((i) => i.ruleId))].join(", ");
      return `| \`${component}\` | ${items.length} | ${severities} | ${rules} |`;
    });
    return `## 🧩 Fixes by Component

> Fix all issues in the same component before moving to the next — reduces file switching.

| Component | Issues | Severities | Rules |
|---|---|---|---|
${rows.join("\n")}
`;
  }

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

${buildGuardrails(resolveFramework(metadata, args.baseUrl, args.framework ?? null))}

---

${buildComponentMap()}${blockers ? `## 🔴 Priority Fixes (Critical & High)\n\n${blockers}` : "## Priority Fixes\n\nNo critical or high severity issues found."}

${deferred ? `## 🔵 Deferred Issues (Medium & Low)\n\n${deferred}` : "## Deferred Issues\n\nNo medium or low severity issues found."}

${buildManualChecksMd()}
${referencesSection}`.trimEnd() + "\n"
  );
}
