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

  const frameworkAlias = STACK_CONFIG.frameworkAliases?.intelKey?.[framework] || framework;
  const inferPatternCodeLang = (files = "") => {
    if (/\.(css|scss|sass)\b/i.test(files)) return "css";
    if (/\.(ts|tsx|js|jsx|vue|svelte)\b/i.test(files)) return "ts";
    return "html";
  };

  const entries = Object.entries(patterns)
    .map(([id, pattern]) => {
      const frameworkNote =
        frameworkAlias && pattern.framework_notes?.[frameworkAlias]
          ? `\n**${frameworkAlias.charAt(0).toUpperCase() + frameworkAlias.slice(1)} Note:** ${pattern.framework_notes[frameworkAlias]}`
          : "";

      const fixBlock = [
        pattern.fix?.description
          ? `**Fix:** ${pattern.fix.description}`
          : null,
        pattern.fix?.code
          ? `\`\`\`${inferPatternCodeLang(pattern.detection?.files || "")}\n${pattern.fix.code}\n\`\`\``
          : null,
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

      const fixPatternBlock =
        pattern.fix_pattern && typeof pattern.fix_pattern === "object"
          ? [
              `**Fix Strategy:** ${pattern.fix_pattern.apply_strategy || "regex-match-then-context-validate"}`,
              Array.isArray(pattern.fix_pattern.source_of_truth) && pattern.fix_pattern.source_of_truth.length > 0
                ? `**Source of Truth:** ${pattern.fix_pattern.source_of_truth.map((s) => `\`${s}\``).join(", ")}`
                : null,
              pattern.fix_pattern.fallback
                ? `**Fallback:** ${pattern.fix_pattern.fallback}`
                : null,
            ]
              .filter(Boolean)
              .join("\n")
          : null;

      const guardrailsBlock =
        pattern.guardrails && typeof pattern.guardrails === "object"
          ? [
              pattern.guardrails.must?.length
                ? `**Preconditions:**\n${pattern.guardrails.must.map((g) => `- ${g}`).join("\n")}`
                : null,
              pattern.guardrails.must_not?.length
                ? `**Do Not Apply If:**\n${pattern.guardrails.must_not.map((g) => `- ${g}`).join("\n")}`
                : null,
              pattern.guardrails.verify?.length
                ? `**Post-Fix Checks:**\n${pattern.guardrails.verify.map((g) => `- ${g}`).join("\n")}`
                : null,
            ]
              .filter(Boolean)
              .join("\n\n")
          : null;

      return [
        `---`,
        `### \`${id}\` — ${pattern.severity.charAt(0).toUpperCase() + pattern.severity.slice(1)} (WCAG ${pattern.wcag}${pattern.level ? ` · Level ${pattern.level}` : ""})`,
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
        fixPatternBlock ? `` : null,
        fixPatternBlock,
        guardrailsBlock ? `` : null,
        guardrailsBlock,
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

function normalizeComponentHint(hint) {
  if (!hint || hint === "other") return "source-not-resolved";
  if (hint.length <= 3) return "source-not-resolved";
  if (/^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|w|h|min|max|gap|space|text|bg|border|rounded|shadow|opacity|z|top|right|bottom|left|flex|grid|items|justify|content|self)-/i.test(hint)) return "source-not-resolved";
  if (/^\d/.test(hint)) return "source-not-resolved";
  return hint;
}

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

/**
 * Builds the Recommendations section with single-point-fix opportunities and systemic patterns.
 * @param {Object} recommendations
 * @returns {string}
 */
function buildRecommendationsSection(recommendations) {
  if (!recommendations) return "";
  const { single_point_fixes = [], systemic_patterns = [] } = recommendations;
  if (single_point_fixes.length === 0 && systemic_patterns.length === 0) return "";

  const parts = [];

  if (single_point_fixes.length > 0) {
    const merged = new Map();
    for (const r of single_point_fixes) {
      const component = normalizeComponentHint(r.component);
      if (!merged.has(component)) {
        merged.set(component, { ...r, component, rules: [...r.rules] });
        continue;
      }
      const current = merged.get(component);
      current.total_issues += r.total_issues;
      current.total_pages = Math.max(current.total_pages, r.total_pages);
      current.rules = [...new Set([...(current.rules || []), ...(r.rules || [])])];
    }
    const mergedRows = [...merged.values()].sort(
      (a, b) => (b.total_issues * b.total_pages) - (a.total_issues * a.total_pages),
    );
    const rows = single_point_fixes.map(
      (r) => `| \`${r.component}\` | ${r.total_issues} | ${r.total_pages} | ${r.rules.map((x) => `\`${x}\``).join(", ")} |`,
    );
    const normalizedRows = mergedRows.map(
      (r) => `| \`${r.component}\` | ${r.total_issues} | ${r.total_pages} | ${(r.rules || []).map((x) => `\`${x}\``).join(", ")} |`,
    );
    parts.push(
      `### Fix once, resolve everywhere\n\nThese issues trace back to shared components — a single fix eliminates all instances.\n\n| Component | Issues | Pages | Rules |\n|---|---|---|---|\n${normalizedRows.length > 0 ? normalizedRows.join("\n") : rows.join("\n")}`,
    );
  }

  if (systemic_patterns.length > 0) {
    const rows = systemic_patterns.map(
      (r) => `| ${r.wcag_criterion} | ${r.total_issues} | ${r.affected_components.map((c) => `\`${c}\``).join(", ")} |`,
    );
    parts.push(
      `### Systemic patterns\n\nThe same WCAG criterion recurs across multiple components — consider a design system-level fix.\n\n| Criterion | Issues | Affected Components |\n|---|---|---|\n${rows.join("\n")}`,
    );
  }

  return `## 💡 Recommendations\n\n${parts.join("\n\n")}\n`;
}

/**
 * Builds the Testing Methodology section from auto-generated scan metadata.
 * @param {Object} tm
 * @returns {string}
 */
function buildTestingMethodologySection(tm) {
  if (!tm) return "";
  return `## 🔬 Testing Methodology

| | |
|---|---|
| **Automated Tools** | ${(tm.automated_tools || []).join(", ")} |
| **Compliance Target** | ${tm.compliance_target} |
| **Pages Scanned** | ${tm.pages_scanned}${tm.pages_errored > 0 ? ` (${tm.pages_errored} failed to load)` : ""} |
| **Framework Detected** | ${tm.framework_detected} |
| **Manual Testing** | ${tm.manual_testing} |
| **Assistive Technology Tested** | ${tm.assistive_tech_tested} |
`;
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
  const framework = resolveFramework(
    metadata,
    args.baseUrl,
    args.framework ?? null,
  );
  const wcagFindings = findings.filter(
    (f) => f.wcagClassification !== "Best Practice" && f.wcagClassification !== "AAA",
  );
  const bpCount = findings.length - wcagFindings.length;
  const totals = buildSummary(wcagFindings);
  const status = wcagFindings.length === 0 ? "PASS" : "ISSUES FOUND";

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
      ? `**Quick verify:** \`${f.verificationCommand}\`${f.verificationCommandFallback ? `\n**Fallback verify:** \`${f.verificationCommandFallback}\`` : ""}`
      : null;

    const fixPatternBlock =
      f.fixPattern && typeof f.fixPattern === "object"
        ? [
            `**Fix Strategy:** ${f.fixPattern.apply_strategy || "surgical-minimal-change"}`,
            Array.isArray(f.fixPattern.source_of_truth) && f.fixPattern.source_of_truth.length > 0
              ? `**Source of Truth:** ${f.fixPattern.source_of_truth.map((s) => `\`${s}\``).join(", ")}`
              : null,
            f.fixPattern.fallback
              ? `**Fallback:** ${f.fixPattern.fallback}`
              : null,
          ].filter(Boolean).join("\n")
        : null;

    const guardrailsBlock =
      f.guardrails && typeof f.guardrails === "object"
        ? [
            Array.isArray(f.guardrails.must) && f.guardrails.must.length > 0
              ? `**Preconditions:**\n${f.guardrails.must.map((g) => `- ${g}`).join("\n")}`
              : null,
            Array.isArray(f.guardrails.must_not) && f.guardrails.must_not.length > 0
              ? `**Do Not Apply If:**\n${f.guardrails.must_not.map((g) => `- ${g}`).join("\n")}`
              : null,
            Array.isArray(f.guardrails.verify) && f.guardrails.verify.length > 0
              ? `**Post-Fix Checks:**\n${f.guardrails.verify.map((g) => `- ${g}`).join("\n")}`
              : null,
          ].filter(Boolean).join("\n\n")
        : null;

    return [
      `---`,
      `### ID: ${f.id || f.ruleId} · ${f.severity} · \`${f.title}\``,
      ``,
      `- **Target Area:** \`${f.area}\``,
      `- **Surgical Selector:** \`${f.primarySelector || f.selector}\``,
      f.wcagClassification === "Best Practice"
        ? `- **WCAG Criterion:** ${f.wcag} _(Best Practice — not a WCAG AA requirement)_`
        : f.wcagClassification === "AAA"
          ? `- **WCAG Criterion:** ${f.wcag} _(Level AAA — informational only)_`
          : `- **WCAG Criterion:** ${f.wcag}`,
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
      fixPatternBlock ? `` : null,
      fixPatternBlock,
      guardrailsBlock ? `` : null,
      guardrailsBlock,
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
    const filtered = wcagFindings.filter((f) => severities.includes(f.severity));
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
    const isLikelyUtilityHint = (hint) => {
      if (!hint || hint === "other") return true;
      if (hint.length <= 3) return true;
      if (/^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|w|h|min|max|gap|space|text|bg|border|rounded|shadow|opacity|z|top|right|bottom|left|flex|grid|items|justify|content|self)-/i.test(hint)) return true;
      if (/^\d/.test(hint)) return true;
      return false;
    };

    const groups = {};
    for (const f of wcagFindings) {
      const hint = isLikelyUtilityHint(f.componentHint)
        ? "source-not-resolved"
        : normalizeComponentHint(f.componentHint);
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
> \`source-not-resolved\` means the selector hint looks like utility CSS; use \`Search in\` + evidence blocks to locate source.

| Component | Issues | Severities | Rules |
|---|---|---|---|
${rows.join("\n")}
`;
  }

  const pipelineNotes = [
    metadata.fpFiltered > 0 ? `${metadata.fpFiltered} false positive(s) removed` : null,
    metadata.deduplicatedCount > 0 ? `${metadata.deduplicatedCount} cross-page finding(s) deduplicated` : null,
    bpCount > 0 ? `${bpCount} Best Practice / AAA finding(s) excluded from WCAG assessment` : null,
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

Total findings: **${wcagFindings.length} WCAG AA violations**${bpCount > 0 ? ` + ${bpCount} informational (Best Practice / AAA)` : ""}${pipelineNotes ? `\n\n> ℹ️ Audit pipeline: ${pipelineNotes}` : ""}

---

## 🤖 AI AGENT OPERATING PROCEDURES (GUARDRAILS)

**FOLLOW THESE RULES TO PREVENT REGRESSIONS AND HALLUCINATIONS:**

${buildGuardrails(framework)}

---

## 🚀 Execution Scope

Apply fixes in this order: **Priority Fixes** -> **Deferred Issues**.  
Use the sections below as the execution plan. Treat **Source Code Pattern Audit** and **Static Code Checks** as appendices for follow-up.

${buildComponentMap()}${buildRecommendationsSection(metadata.recommendations)}
${blockers ? `## 🔴 Priority Fixes (Critical & Serious)\n\n${blockers}` : "## Priority Fixes\n\nNo critical or serious severity issues found."}

${deferred ? `## 🔵 Deferred Issues (Moderate & Minor)\n\n${deferred}` : "## Deferred Issues\n\nNo moderate or minor severity issues found."}

${buildPassedCriteriaSection(metadata.passedCriteria)}${buildOutOfScopeSection(metadata.outOfScope)}${buildTestingMethodologySection(metadata.testingMethodology)}${buildCodePatternsMd(metadata.code_patterns, framework)}`.trimEnd() + "\n"
  );
}
