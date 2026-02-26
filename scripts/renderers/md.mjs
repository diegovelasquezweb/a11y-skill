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
const stackConfigPath = join(__dirname, "../../assets/stack-config.json");

let STACK_CONFIG;
try {
  STACK_CONFIG = JSON.parse(readFileSync(stackConfigPath, "utf-8"));
} catch {
  throw new Error(
    "Missing or invalid assets/stack-config.json — reinstall the skill.",
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
 * Renders the source code pattern audit section from intelligence.json code_patterns.
 * Each pattern includes a detection regex, file globs, and a concrete code fix.
 * @param {Object} patterns - The code_patterns object from intelligence.json (via metadata).
 * @param {string} [framework] - Detected framework ID for filtering framework-specific notes.
 * @returns {string} The source code pattern audit section, or empty string if no patterns.
 */
function buildCodePatternsMd(patterns, framework) {
  if (!patterns || Object.keys(patterns).length === 0) return "";

  const entries = Object.entries(patterns)
    .map(([id, pattern]) => {
      const frameworkNote =
        framework && pattern.framework_notes?.[framework]
          ? `\n**${framework.charAt(0).toUpperCase() + framework.slice(1)} Note:** ${pattern.framework_notes[framework]}`
          : "";

      const fixBlock = [
        pattern.fix?.description
          ? `**Fix:** ${pattern.fix.description}`
          : null,
        pattern.fix?.code ? `\`\`\`jsx\n${pattern.fix.code}\n\`\`\`` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const fpRisk =
        pattern.false_positive_risk && pattern.false_positive_risk !== "low"
          ? `> ⚠️ **False Positive Risk (${pattern.false_positive_risk}):** Verify the match is a real violation before applying the fix — the search regex may match code that already handles this correctly at a higher level.`
          : null;

      const managedBlock =
        Array.isArray(pattern.managed_by_libraries) &&
        pattern.managed_by_libraries.length > 0
          ? `> ⚠️ **Managed Component Warning:** This pattern may match components managed by **${pattern.managed_by_libraries.join(", ")}** — verify the library does not already handle this before applying a fix.`
          : null;

      return [
        `---`,
        `### \`${id}\` — ${pattern.severity.charAt(0).toUpperCase() + pattern.severity.slice(1)} (WCAG ${pattern.wcag})`,
        ``,
        `${pattern.description}`,
        ``,
        `**Search for:** \`${pattern.detection.search}\``,
        `**In files:** \`${pattern.detection.files}\``,
        ``,
        managedBlock,
        fpRisk,
        ``,
        fixBlock,
        frameworkNote || null,
      ]
        .filter((line) => line !== null)
        .join("\n");
    })
    .join("\n\n");

  return `## 🔍 Source Code Pattern Audit

> These patterns are not detectable by axe-core at runtime. Use the search regex to grep source files and apply the fixes wherever the pattern is found.

${entries}
`;
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
  const urlSignals = STACK_CONFIG.frameworkDetection?.urlSignals || [];
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
  const guardrails = STACK_CONFIG.guardrails || {};
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
/**
 * Builds the Passed Criteria section listing WCAG criteria with no violations.
 * @param {string[]} passedCriteria
 * @returns {string}
 */
function buildPassedCriteriaSection(passedCriteria) {
  if (!Array.isArray(passedCriteria) || passedCriteria.length === 0) return "";
  return `## ✅ Passed Criteria

The following WCAG 2.2 AA criteria were verified by automated scanning and returned no violations. This list reflects automated coverage only — manual testing may reveal additional issues.

${passedCriteria.map((c) => `- ${c}`).join("\n")}
`;
}

/**
 * Builds the Out of Scope section documenting what was not tested.
 * @param {Object} outOfScope
 * @returns {string}
 */
function buildOutOfScopeSection(outOfScope) {
  if (!outOfScope) return "";
  const parts = [];
  if (outOfScope.auth_blocked_routes?.length > 0) {
    parts.push(
      `**Routes not tested (access error):**\n${outOfScope.auth_blocked_routes.map((r) => `- \`${r}\``).join("\n")}`,
    );
  }
  if (outOfScope.manual_testing_required?.length > 0) {
    parts.push(
      `**Requires manual testing (not detectable by axe-core):**\n${outOfScope.manual_testing_required.map((c) => `- ${c}`).join("\n")}`,
    );
  }
  if (outOfScope.aaa_excluded) {
    parts.push(`**AAA criteria:** Not in scope for this audit.`);
  }
  if (parts.length === 0) return "";
  return `## 📋 Out of Scope

${parts.join("\n\n")}
`;
}

export function buildMarkdownSummary(args, findings, metadata = {}) {
  const framework = resolveFramework(
    metadata,
    args.baseUrl,
    args.framework ?? null,
  );
  const totals = buildSummary(findings);
  const status = findings.length === 0 ? "PASS" : "ISSUES FOUND";

  const assessmentEmoji =
    metadata.overallAssessment === "Pass" ? "✅" :
    metadata.overallAssessment === "Conditional Pass" ? "⚠️" : "❌";
  const assessmentLine = metadata.overallAssessment
    ? `> **Overall Assessment:** ${assessmentEmoji} ${metadata.overallAssessment}\n`
    : "";

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

    const crossPageBlock =
      f.pagesAffected && f.pagesAffected > 1
        ? `> ℹ️ **Found on ${f.pagesAffected} pages** — same pattern detected across: ${(f.affectedUrls || []).join(", ")}`
        : null;

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
      ? `**Rule Logic:** https://dequeuniversity.com/rules/axe/4.11/${f.ruleId}`
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
      crossPageBlock ? `${crossPageBlock}\n` : null,
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

  const blockers = findingsByPage(["Critical", "Serious"]);
  const deferred = findingsByPage(["Moderate", "Minor"]);

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

  const pipelineNotes = [
    metadata.fpFiltered > 0 ? `${metadata.fpFiltered} false positive(s) removed` : null,
    metadata.deduplicatedCount > 0 ? `${metadata.deduplicatedCount} cross-page finding(s) deduplicated` : null,
  ].filter(Boolean).join(" · ");

  return (
    `# 🛡️ Accessibility Remediation Guide — AI MODE
> **Scan Date:** ${metadata.scanDate || new Date().toISOString()}
> **Base URL:** ${args.baseUrl || "N/A"}
> **Target:** ${args.target}
> **Status:** ${status}
${assessmentLine}
## 📊 Findings Overview

| Severity | Count | Priority |
|---|---|---|
| 🔴 **Critical** | ${totals.Critical} | **Blocker** |
| 🟠 **Serious** | ${totals.Serious} | **Immediate** |
| 🟡 **Moderate** | ${totals.Moderate} | **Standard** |
| 🔵 **Minor** | ${totals.Minor} | **Backlog** |

Total findings: **${findings.length} issues**${pipelineNotes ? `\n\n> ℹ️ Audit pipeline: ${pipelineNotes}` : ""}

---

## 🤖 AI AGENT OPERATING PROCEDURES (GUARDRAILS)

**FOLLOW THESE RULES TO PREVENT REGRESSIONS AND HALLUCINATIONS:**

${buildGuardrails(framework)}

---

${buildComponentMap()}${blockers ? `## 🔴 Priority Fixes (Critical & Serious)\n\n${blockers}` : "## Priority Fixes\n\nNo critical or serious severity issues found."}

${deferred ? `## 🔵 Deferred Issues (Moderate & Minor)\n\n${deferred}` : "## Deferred Issues\n\nNo moderate or minor severity issues found."}

${buildPassedCriteriaSection(metadata.passedCriteria)}${buildOutOfScopeSection(metadata.outOfScope)}${buildCodePatternsMd(metadata.code_patterns, framework)}
${buildManualChecksMd()}
${referencesSection}`.trimEnd() + "\n"
  );
}
