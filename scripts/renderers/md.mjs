/**
 * @file format-md.mjs
 * @description Markdown remediation guide builder optimized for AI agents.
 * Generates an actionable markdown document containing technical solutions,
 * surgical selectors, and framework-specific guardrails.
 */

import { buildSummary } from "./findings.mjs";
import { ASSET_PATHS, loadAssetJson } from "../assets.mjs";

const GUARDRAILS = loadAssetJson(
  ASSET_PATHS.remediation.guardrails,
  "assets/remediation/guardrails.json",
);

const SOURCE_BOUNDARIES = loadAssetJson(
  ASSET_PATHS.remediation.sourceBoundaries,
  "assets/remediation/source-boundaries.json",
);


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
  return "generic";
}

/**
 * Constructs a set of guardrail instructions tailored to a specific framework.
 * @param {string} framework - The identified framework ID.
 * @returns {string} A numbered list of framework-specific operating procedures.
 */
function buildGuardrails(framework) {
  const guardrails = GUARDRAILS || {};
  const shared = guardrails.shared || [];
  const stackRules = guardrails.stack || {};
  const frameworkRule = stackRules[framework] ?? stackRules.generic;
  return [frameworkRule, ...shared]
    .filter(Boolean)
    .map((rule, index) => `${index + 1}. ${rule}`)
    .join("\n");
}

/**
 * Renders the source file location table for the detected framework.
 * @param {string} framework
 * @returns {string}
 */
function buildSourceBoundariesSection(framework) {
  const boundaries = SOURCE_BOUNDARIES?.[framework];
  if (!boundaries) return "";
  const rows = [];
  if (boundaries.components) rows.push(`| Components | \`${boundaries.components}\` |`);
  if (boundaries.styles) rows.push(`| Styles | \`${boundaries.styles}\` |`);
  if (rows.length === 0) return "";
  return `## Source File Locations\n\n| Type | Glob Pattern |\n|---|---|\n${rows.join("\n")}\n`;
}

function formatViolation(actual) {
  return actual || "";
}

function normalizeComponentHint(hint) {
  if (!hint || hint === "other") return "source-not-resolved";
  if (hint.length <= 3) return "source-not-resolved";
  if (/^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|w|h|min|max|gap|space|text|bg|border|rounded|shadow|opacity|z|top|right|bottom|left|flex|grid|items|justify|content|self)-/i.test(hint)) return "source-not-resolved";
  if (/^\d/.test(hint)) return "source-not-resolved";
  return hint;
}

const PRIORITY_BY_SEVERITY = {
  Critical: 1,
  Serious: 2,
  Moderate: 3,
  Minor: 4,
};

function inferActionType(finding) {
  if ((finding.fixCodeLang || "").toLowerCase() === "css") return "style";
  if ((finding.fixCodeLang || "").toLowerCase() === "jsx") return "component";
  const category = String(finding.category || "").toLowerCase();
  if (["color", "keyboard"].includes(category)) return "interaction";
  if (["aria", "name-role-value", "semantics", "structure"].includes(category))
    return "markup";
  return "general";
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
    const normalizedRows = mergedRows.map(
      (r) => `| \`${r.component}\` | ${r.total_issues} | ${r.total_pages} | ${(r.rules || []).map((x) => `\`${x}\``).join(", ")} |`,
    );
    parts.push(
      `### Shared Component Opportunities\n\n| Component | Issues | Pages | Rules |\n|---|---|---|---|\n${normalizedRows.join("\n")}`,
    );
  }

  if (systemic_patterns.length > 0) {
    const rows = systemic_patterns.map(
      (r) => `| ${r.wcag_criterion} | ${r.total_issues} | ${r.affected_components.map((c) => `\`${normalizeComponentHint(c)}\``).join(", ")} |`,
    );
    parts.push(
      `### Systemic Patterns\n\n| Criterion | Issues | Affected Components |\n|---|---|---|\n${rows.join("\n")}`,
    );
  }

  return `## Recommendations\n\n${parts.join("\n\n")}\n`;
}


/**
 * Builds the Potential Issues section from incomplete (needs-review) axe violations.
 * @param {Object[]} incompleteFindings
 * @returns {string}
 */
function buildIncompleteSection(incompleteFindings) {
  if (!Array.isArray(incompleteFindings) || incompleteFindings.length === 0) return "";
  const rows = incompleteFindings.map((f) => {
    const msg = (f.message || f.description || "Needs manual review").replace(/\|/g, "\\|");
    const areaCell = f.pages_affected > 1
      ? `${f.pages_affected} pages`
      : `\`${f.areas?.[0] ?? "?"}\``;
    let actionableHint = "";
    if (f.rule_id === "duplicate-id-aria" && f.message) {
      const idMatch = f.message.match(/same id attribute[:\s]+(\S+?)\.?\s*$/i);
      if (idMatch) actionableHint = ` — grep: \`id="${idMatch[1]}"\``;
    }
    return `| \`${f.rule_id}\` | ${f.impact ?? "?"} | ${areaCell} | ${msg}${actionableHint} |`;
  });
  return `## Potential Issues — Manual Review Required

axe flagged these but could not auto-confirm them. Do not apply automated fixes — verify manually before acting.

| Rule | Impact | Area | Axe Message |
|---|---|---|---|
${rows.join("\n")}
`;
}

/**
 * Builds the Source Code Pattern Findings section from pattern-scanner output.
 * @param {Object|null} patternPayload - The a11y-pattern-findings.json payload.
 * @returns {string}
 */
function buildPatternSection(patternPayload) {
  if (!patternPayload || !Array.isArray(patternPayload.findings) || patternPayload.findings.length === 0) return "";

  const { findings, project_dir } = patternPayload;
  const confirmed = findings.filter((f) => f.status === "confirmed");
  const potential = findings.filter((f) => f.status === "potential");

  const badge = [
    confirmed.length > 0 ? `${confirmed.length} confirmed` : null,
    potential.length > 0 ? `${potential.length} potential` : null,
  ].filter(Boolean).join(", ");

  function patternFindingToMd(f) {
    return [
      `---`,
      `### ${f.id} · ${f.severity} · ${f.title}`,
      ``,
      `- **File:** \`${f.file}:${f.line}\``,
      `- **Status:** ${f.status}`,
      `- **WCAG:** ${f.wcag}`,
      `- **Type:** ${f.type}`,
      ``,
      `**Match:**`,
      `\`\`\``,
      f.match,
      `\`\`\``,
      f.context ? `` : null,
      f.context ? `**Context:**\n\`\`\`\n${f.context}\n\`\`\`` : null,
      f.fix_description ? `` : null,
      f.fix_description ? `#### Recommended Fix\n${f.fix_description}` : null,
    ].filter((line) => line !== null).join("\n");
  }

  const parts = [];
  if (confirmed.length > 0) {
    parts.push(`### Confirmed (${confirmed.length})\n\n${confirmed.map(patternFindingToMd).join("\n\n")}`);
  }
  if (potential.length > 0) {
    parts.push(`### Potential — Verify Before Fixing (${potential.length})\n\n> These matches require manual verification. Inspect each match in the source file before applying any fix.\n\n${potential.map(patternFindingToMd).join("\n\n")}`);
  }

  return `## Source Code Pattern Findings

These findings were detected via static source code analysis and are not visible to the browser scanner. Do not auto-fix — inspect each match in the source file first.

**${badge}** — scanned \`${project_dir || "project"}\`

${parts.join("\n\n")}`;
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
  const wcagFindings = findings.filter((f) => f.wcagClassification !== "AAA");
  const totals = buildSummary(wcagFindings);
  const orderedFindings = [...wcagFindings].sort((a, b) => {
    const pa = PRIORITY_BY_SEVERITY[a.severity] ?? 99;
    const pb = PRIORITY_BY_SEVERITY[b.severity] ?? 99;
    if (pa !== pb) return pa - pb;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
  const executionIndex = new Map(
    orderedFindings.map((f, idx) => [f.id || f.ruleId, idx + 1]),
  );

  function buildExecutionOrderSection() {
    if (orderedFindings.length === 0) return "";
    const rows = orderedFindings.map((f) => {
      const id = f.id || f.ruleId;
      return `| ${executionIndex.get(id)} | \`${id}\` | ${f.severity} | \`${f.ruleId}\` | ${f.category || "n/a"} | \`${f.area}\` |`;
    });
    return `## Execution Order\n\n| Priority | ID | Severity | Rule | Category | Area |\n|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
  }

  function findingToMd(f) {
    let evidenceHtml = null;
    let evidenceLabel = "#### Evidence from DOM";
    (() => {
      if (!f.evidence || !Array.isArray(f.evidence) || f.evidence.length === 0)
        return;
      const seen = new Set();
      const unique = f.evidence.filter((n) => {
        if (!n.html || seen.has(n.html)) return false;
        seen.add(n.html);
        return true;
      });
      const shownCount = unique.length;
      if (f.totalInstances && f.totalInstances > shownCount) {
        evidenceLabel = `#### Evidence from DOM (showing ${shownCount} of ${f.totalInstances} instances)`;
      }
      evidenceHtml = unique
        .map((n, i) => {
          const ancestryLine = n.ancestry ? `\n**DOM Path:** \`${n.ancestry}\`` : "";
          return `**Instance ${i + 1}**:\n\`\`\`html\n${n.html}\n\`\`\`${ancestryLine}`;
        })
        .join("\n\n");
    })();

    const codeLang = f.fixCodeLang || "html";
    const fixBlock =
      f.fixDescription || f.fixCode
        ? `#### Recommended Technical Solution\n${f.fixDescription ? `${f.fixDescription}\n\n` : ""}${f.fixCode ? `\`\`\`${codeLang}\n${f.fixCode}\n\`\`\`` : ""}`.trimEnd()
        : `#### Recommended Remediation\n${f.recommendedFix}`;

    const crossPageBlock =
      f.pagesAffected && f.pagesAffected > 1
        ? `> ℹ️ **Cross-page:** Found on ${f.pagesAffected} pages — ${(f.affectedUrls || []).join(", ")}`
        : null;

    const difficultyBlock = f.fixDifficultyNotes
      ? `#### Implementation Notes\n${
          Array.isArray(f.fixDifficultyNotes)
            ? f.fixDifficultyNotes.map((n) => `- ${n}`).join("\n")
            : f.fixDifficultyNotes
        }`
      : null;

    const frameworkBlock =
      f.frameworkNotes && typeof f.frameworkNotes === "object"
        ? `#### Framework Notes\n${Object.entries(f.frameworkNotes)
            .map(([fw, note]) => `- **${fw.charAt(0).toUpperCase() + fw.slice(1)}:** ${note}`)
            .join("\n")}`
        : null;

    const cmsBlock =
      f.cmsNotes && typeof f.cmsNotes === "object"
        ? `#### CMS Notes\n${Object.entries(f.cmsNotes)
            .map(([cms, note]) => `- **${cms.charAt(0).toUpperCase() + cms.slice(1)}:** ${note}`)
            .join("\n")}`
        : null;

    const relatedBlock =
      Array.isArray(f.relatedRules) && f.relatedRules.length > 0
        ? `**Fixing this also helps:**\n${f.relatedRules.map((r) => `- \`${r.id}\` — ${r.reason}`).join("\n")}`
        : null;
    const engineReasonBlock =
      f.primaryFailureMode ||
      f.relationshipHint ||
      (Array.isArray(f.failureChecks) && f.failureChecks.length > 0)
        ? [
            "#### Why Axe Flagged This",
            f.primaryFailureMode
              ? `- **Primary failure mode:** \`${f.primaryFailureMode}\``
              : null,
            f.relationshipHint
              ? `- **Relationship hint:** \`${f.relationshipHint}\``
              : null,
            Array.isArray(f.failureChecks) && f.failureChecks.length > 0
              ? `- **Detected checks:** ${f.failureChecks.join("; ")}`
              : null,
            Array.isArray(f.relatedContext) && f.relatedContext.length > 0
              ? `- **Related context:** ${f.relatedContext
                  .slice(0, 2)
                  .map((entry) => `\`${entry}\``)
                  .join(", ")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n")
        : null;

    const contrastDiagnosticsBlock = (() => {
      if (!["color-contrast", "color-contrast-enhanced"].includes(f.ruleId)) return null;
      const d = f.checkData;
      if (!d || !d.fgColor) return null;
      const ratio = d.contrastRatio ?? d.contrast ?? "?";
      const expected = d.expectedContrastRatio ?? "4.5:1";
      const rows = [
        `| Foreground | \`${d.fgColor}\` |`,
        `| Background | \`${d.bgColor ?? "unknown"}\` |`,
        `| Measured ratio | **${ratio}:1** |`,
        `| Required ratio | **${expected}** |`,
        d.fontSize ? `| Font | ${d.fontSize} · ${d.fontWeight ?? "normal"} weight |` : null,
      ].filter(Boolean).join("\n");
      return `#### Contrast Diagnostics\n| Property | Value |\n|---|---|\n${rows}`;
    })();

    const searchPatternBlock = f.fileSearchPattern
      ? `**Search in:** \`${f.fileSearchPattern}\``
      : null;

    const managedBlock = f.managedByLibrary
      ? `> ⚠️ **Managed Component:** Controlled by \`${f.managedByLibrary}\` — fix via the library's prop API, not direct DOM attributes.`
      : null;
    const ownershipBlock =
      f.ownershipStatus === "outside_primary_source"
        ? `> ⚠️ **Ownership Check Required:** ${f.ownershipReason}\n> Ask the user whether to ignore this issue or handle it outside the primary source before editing.`
        : f.ownershipStatus === "unknown"
          ? `> ⚠️ **Ownership Unclear:** ${f.ownershipReason}\n> Ask the user whether to ignore this issue until the editable source is confirmed.`
          : null;

    const verifyBlock = f.verificationCommand
      ? `**Quick verify:** \`${f.verificationCommand}\`${f.verificationCommandFallback ? `\n**Fallback verify:** \`${f.verificationCommandFallback}\`` : ""}`
      : null;

    const id = f.id || f.ruleId;
    const requiresManualVerification = f.falsePositiveRisk && f.falsePositiveRisk !== "low";

    const executionMeta = [
      `**Execution Metadata**`,
      `- \`fix_priority\`: ${executionIndex.get(id) || "n/a"}`,
      `- \`action_type\`: ${inferActionType(f)}`,
      `- \`target_files_glob\`: ${f.fileSearchPattern ? `\`${f.fileSearchPattern}\`` : "`n/a`"}`,
      `- \`ownership_status\`: ${f.ownershipStatus || "unknown"}`,
      `- \`search_strategy\`: ${f.searchStrategy || "verify_ownership_before_search"}`,
      requiresManualVerification ? `- \`requires_manual_verification\`: true _(false positive risk: ${f.falsePositiveRisk})_` : `- \`requires_manual_verification\`: false`,
    ].join("\n");

    const guardrailsBlock =
      f.guardrails && typeof f.guardrails === "object"
        ? [
            Array.isArray(f.guardrails.must) && f.guardrails.must.length > 0
              ? `#### Preconditions\n${f.guardrails.must.map((g) => `- ${g}`).join("\n")}`
              : null,
            Array.isArray(f.guardrails.must_not) && f.guardrails.must_not.length > 0
              ? `#### Do Not Apply\n${f.guardrails.must_not.map((g) => `- ${g}`).join("\n")}`
              : null,
            Array.isArray(f.guardrails.verify) && f.guardrails.verify.length > 0
              ? `#### Post-Fix Checks\n${f.guardrails.verify.map((g) => `- ${g}`).join("\n")}`
              : null,
          ].filter(Boolean).join("\n\n")
        : null;

    return [
      `---`,
      `### ID: ${id} · ${f.severity} · \`${f.title}\``,
      ``,
      `- **Target Area:** \`${f.area}\``,
      `- **Surgical Selector:** \`${f.primarySelector || f.selector}\``,
      f.wcagClassification === "Best Practice"
        ? `- **WCAG Criterion:** ${f.wcag} _(Best Practice — not a WCAG AA requirement)_`
        : `- **WCAG Criterion:** ${f.wcag}`,
      f.category ? `- **Category:** ${f.category}` : null,
      requiresManualVerification ? `- **False Positive Risk:** ${f.falsePositiveRisk} — verify before applying` : null,
      ``,
      crossPageBlock,
      managedBlock,
      ownershipBlock,
      crossPageBlock || managedBlock || ownershipBlock ? `` : null,
      `**Observed Violation:** ${formatViolation(f.actual)}`,
      contrastDiagnosticsBlock ? `` : null,
      contrastDiagnosticsBlock,
      engineReasonBlock ? `` : null,
      engineReasonBlock,
      searchPatternBlock ? `` : null,
      searchPatternBlock,
      ``,
      executionMeta,
      ``,
      fixBlock,
      guardrailsBlock ? `` : null,
      guardrailsBlock,
      difficultyBlock ? `` : null,
      difficultyBlock,
      frameworkBlock ? `` : null,
      frameworkBlock,
      cmsBlock ? `` : null,
      cmsBlock,
      evidenceHtml ? `` : null,
      evidenceHtml ? `${evidenceLabel}\n${evidenceHtml}` : null,
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
    return `## Fixes by Component

| Component | Issues | Severities | Rules |
|---|---|---|---|
${rows.join("\n")}
`;
  }

  const incompleteSection = buildIncompleteSection(metadata.incomplete_findings);
  const patternSection = buildPatternSection(metadata.pattern_findings);
  const sourceBoundariesSection = buildSourceBoundariesSection(framework);

  return (
      `# Accessibility Remediation Guide
> **Base URL:** ${args.baseUrl || "N/A"}

| Severity | Count |
|---|---|
| Critical | ${totals.Critical} |
| Serious | ${totals.Serious} |
| Moderate | ${totals.Moderate} |
| Minor | ${totals.Minor} |

---

## Agent Operating Procedures (Guardrails)

${buildGuardrails(framework)}

---
${sourceBoundariesSection ? `\n${sourceBoundariesSection}\n---` : ""}

${buildComponentMap()}
${buildRecommendationsSection(metadata.recommendations)}
${buildExecutionOrderSection()}
${blockers ? `## Priority Fixes (Critical and Serious)\n\n${blockers}` : "## Priority Fixes\n\nNo critical or serious severity issues found."}
${deferred ? `\n## Deferred Issues (Moderate and Minor)\n\n${deferred}` : ""}
${incompleteSection ? `\n${incompleteSection}` : ""}
${patternSection ? `\n${patternSection}` : ""}
`
  .trimEnd() + "\n"
  );
}
