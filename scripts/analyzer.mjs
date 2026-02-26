/**
 * @file analyzer.mjs
 * @description Post-scan data processor.
 * Transforms raw axe-core results into enriched findings by applying
 * framework-specific logic, remediation intelligence, and WCAG mapping
 * to generate a structured audit overview.
 */

import { log, readJson, writeJson, getInternalPath } from "./utils.mjs";
import { createHash } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Path to the core remediation intelligence database.
 * @type {string}
 */
const intelligencePath = path.join(__dirname, "../assets/intelligence.json");

/**
 * Path to the WCAG reference database: criterion maps, APG patterns, MDN links, personas.
 * @type {string}
 */
const wcagReferencePath = path.join(__dirname, "../assets/wcag-reference.json");

const complianceConfigPath = path.join(__dirname, "../assets/compliance-config.json");
const stackConfigPath = path.join(__dirname, "../assets/stack-config.json");

let INTELLIGENCE;
let WCAG_REFERENCE;
let COMPLIANCE_CONFIG;
let STACK_CONFIG;

// Initialize remediation and rule metadata assets.
try {
  INTELLIGENCE = JSON.parse(fs.readFileSync(intelligencePath, "utf-8"));
} catch {
  throw new Error(
    `Missing or invalid intelligence.json at ${intelligencePath} — run pnpm install to reinstall.`,
  );
}

try {
  WCAG_REFERENCE = JSON.parse(fs.readFileSync(wcagReferencePath, "utf-8"));
} catch {
  throw new Error(
    `Missing or invalid wcag-reference.json at ${wcagReferencePath} — run pnpm install to reinstall.`,
  );
}

try {
  COMPLIANCE_CONFIG = JSON.parse(fs.readFileSync(complianceConfigPath, "utf-8"));
} catch {
  throw new Error(
    `Missing or invalid compliance-config.json at ${complianceConfigPath} — run pnpm install to reinstall.`,
  );
}

try {
  STACK_CONFIG = JSON.parse(fs.readFileSync(stackConfigPath, "utf-8"));
} catch {
  throw new Error(
    `Missing or invalid stack-config.json at ${stackConfigPath} — run pnpm install to reinstall.`,
  );
}

/**
 * Generates a stable unique ID for a finding based on the rule, URL, and selector.
 * @param {string} ruleId - The ID of the accessibility rule.
 * @param {string} url - The URL of the page where the violation was found.
 * @param {string} selector - The CSS selector of the violating element.
 * @returns {string} A short unique hash in the format A11Y-xxxxxx.
 */
function makeFindingId(ruleId, url, selector) {
  const stableSelector = selector.split(",")[0].trim();
  const key = `${ruleId}||${url}||${stableSelector}`;
  return `A11Y-${createHash("sha256").update(key).digest("hex").slice(0, 6)}`;
}

/** @type {Object} */
const RULES = INTELLIGENCE.rules || {};
/** @type {Object} */
const CODE_PATTERNS = INTELLIGENCE.code_patterns || {};
/** @type {Object<string, string>} */
const APG_PATTERNS = WCAG_REFERENCE.apgPatterns;
/** @type {Object<string, string>} */
const MDN = WCAG_REFERENCE.mdn || {};
/** @type {Object<string, string>} */
const WCAG_CRITERION_MAP = WCAG_REFERENCE.wcagCriterionMap || {};

/**
 * Detects the programming language of a code snippet for syntax highlighting.
 * @param {string} code - The code snippet to analyze.
 * @returns {string} The detected language (html, jsx, or css).
 */
function detectCodeLang(code) {
  if (!code) return "html";
  if (/\.(tsx?|jsx?)\b|className=|useState|useRef|<>\s*<\/>/i.test(code))
    return "jsx";
  if (/^\s*[.#][\w-]+\s*\{|:\s*var\(|@media|display\s*:/m.test(code))
    return "css";
  return "html";
}

/**
 * Regulatory links for accessibility compliance standards.
 * @type {Object<string, string>}
 */
const US_REGULATORY = COMPLIANCE_CONFIG.usRegulatory;

/** @type {Object<string, string>} */
const IMPACTED_USERS = WCAG_REFERENCE.impactedUsers || {};
/** @type {Object<string, string>} */
const EXPECTED = WCAG_REFERENCE.expected || {};

/**
 * Returns a description of the primary user groups impacted by a rule violation.
 * @param {string} ruleId - The ID of the accessibility rule.
 * @param {string[]} tags - The tags associated with the rule.
 * @returns {string} A description of the impacted users.
 */
function getImpactedUsers(ruleId, tags) {
  if (IMPACTED_USERS[ruleId]) return IMPACTED_USERS[ruleId];
  const tagFallbacks = WCAG_REFERENCE.tagImpactedUsers || {};
  for (const tag of tags) {
    if (tagFallbacks[tag]) return tagFallbacks[tag];
  }
  return "Users relying on assistive technology";
}

/**
 * Returns the expected accessibility behavior for a given rule.
 * @param {string} ruleId - The ID of the accessibility rule.
 * @returns {string} A description of the expected state for compliance.
 */
function getExpected(ruleId) {
  return EXPECTED[ruleId] || "WCAG accessibility check must pass.";
}

/**
 * Framework-specific file search glob patterns.
 * Used to help developers locate the source of an accessibility violation.
 * @type {Object<string, Object>}
 */
const FRAMEWORK_GLOBS = STACK_CONFIG.frameworkGlobs || {};

/**
 * Rules with managed_by_libraries in intelligence.json — derived at load time.
 * @type {Map<string, string[]>}
 */
const MANAGED_RULES = new Map(
  Object.entries(INTELLIGENCE.rules)
    .filter(([, rule]) => Array.isArray(rule.managed_by_libraries))
    .map(([id, rule]) => [id, rule.managed_by_libraries]),
);

/**
 * Maps detected framework IDs to their respective keys in intelligence.json.
 * @type {Object<string, string>}
 */
const FRAMEWORK_TO_INTEL_KEY = STACK_CONFIG.frameworkAliases?.intelKey || {};

/**
 * Maps detected framework/CMS IDs to their respective keys for CMS-specific notes.
 * @type {Object<string, string>}
 */
const FRAMEWORK_TO_CMS_KEY = STACK_CONFIG.frameworkAliases?.cmsKey || {};

/**
 * Filters the intelligence notes to only include those relevant to the detected framework.
 * @param {Object} notes - The notes object from intelligence.json.
 * @param {string} framework - The detected framework ID.
 * @returns {Object|null} A filtered notes object or null.
 */
function filterNotes(notes, framework) {
  if (!notes || typeof notes !== "object") return null;
  const intelKey = FRAMEWORK_TO_INTEL_KEY[framework];
  if (intelKey && notes[intelKey]) return { [intelKey]: notes[intelKey] };
  const cmsKey = FRAMEWORK_TO_CMS_KEY[framework];
  if (cmsKey && notes[cmsKey]) return { [cmsKey]: notes[cmsKey] };
  return null;
}

/**
 * Returns the file search glob pattern for the given framework and code language.
 * @param {string} framework - The detected framework ID.
 * @param {string} codeLang - The detected code language (jsx, css, etc.).
 * @returns {string|null} The glob pattern or null if not found.
 */
function getFileSearchPattern(framework, codeLang) {
  const globs = FRAMEWORK_GLOBS[framework];
  if (!globs) return null;
  return codeLang === "css" ? globs.styles : globs.components;
}

/**
 * Checks if a rule is typically managed by a UI library like Radix or Headless UI.
 * Uses managed_by_libraries from intelligence.json instead of hardcoded lists.
 * @param {string} ruleId - The ID of the accessibility rule.
 * @param {string[]} uiLibraries - List of detected UI libraries.
 * @returns {string|null} The name of the managing library or null.
 */
function getManagedByLibrary(ruleId, uiLibraries) {
  const allowedLibs = MANAGED_RULES.get(ruleId);
  if (!allowedLibs) return null;
  const managed = uiLibraries.filter((lib) => allowedLibs.includes(lib));
  if (managed.length === 0) return null;
  return managed.join(", ");
}

/**
 * Extracts a component name hint from a CSS selector (e.g., from BEM classes).
 * @param {string} selector - The CSS selector to analyze.
 * @returns {string|null} A potential component name or null.
 */
function extractComponentHint(selector) {
  if (!selector || selector === "N/A") return null;
  const bemMatch = selector.match(/\.([\w-]+?)(?:__|--)/);
  if (bemMatch) return bemMatch[1];
  const classMatch = selector.match(/\.([\w-]+)/);
  if (classMatch) return classMatch[1];
  const idMatch = selector.match(/#([\w-]+)/);
  if (idMatch) return idMatch[1];
  return null;
}

/**
 * Prints the CLI usage instructions and available options for the analyzer.
 */
function printUsage() {
  log.info(`Usage:
  node analyzer.mjs --input <route-checks.json> [options]

Options:
  --output <path>          Output findings JSON path (default: .audit/a11y-findings.json)
  --ignore-findings <csv> Ignore specific rule IDs (overrides config)
  -h, --help               Show this help
`);
}

/**
 * Parses command-line arguments into a structured object for the analyzer.
 * @param {string[]} argv - Array of command-line arguments.
 * @returns {Object} A configuration object for the analyzer.
 */
function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const args = {
    input: getInternalPath("a11y-scan-results.json"),
    output: getInternalPath("a11y-findings.json"),
    ignoreFindings: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    if (key === "--input") args.input = value;
    if (key === "--output") args.output = value;
    if (key === "--ignore-findings")
      args.ignoreFindings = value.split(",").map((v) => v.trim());
    if (key === "--framework") args.framework = value;
    i += 1;
  }

  if (!args.input) throw new Error("Missing required --input");
  return args;
}

const IMPACT_MAP = COMPLIANCE_CONFIG.impactMap;

/**
 * Maps axe-core rule tags to a human-readable WCAG level string.
 * @param {string[]} tags - The tags associated with a violation.
 * @returns {string} The WCAG level (e.g., "WCAG 2.1 AA").
 */
function mapWcag(tags) {
  const labels = WCAG_REFERENCE.wcagTagLabels || {};
  const precedence = WCAG_REFERENCE.wcagTagPrecedence || Object.keys(labels);
  for (const key of precedence) {
    if (tags.includes(key) && labels[key]) return labels[key];
  }
  return "WCAG";
}

/**
 * Detects the implicit ARIA role of an HTML element if not explicitly specified.
 * @param {string} tag - The HTML tag name.
 * @param {string} html - The raw HTML of the element.
 * @returns {string|null} The implicit role or null.
 */
export function detectImplicitRole(tag, html) {
  if (!tag) return null;
  const roles = WCAG_REFERENCE.implicitRoles || {};
  if (tag === "input") {
    const type = html?.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    return (roles.inputTypeMap || {})[type] ?? null;
  }
  return (roles.tagMap || {})[tag] ?? null;
}

/**
 * Extracts a simplified search target from a complex CSS selector to help locate it in code.
 * @param {string} selector - The complex CSS selector.
 * @returns {string} A simplified search string (e.g., "#my-id" or ".my-class").
 */
export function extractSearchHint(selector) {
  if (!selector || selector === "N/A") return selector;
  const specific =
    selector
      .split(/[\s>+~]+/)
      .filter(Boolean)
      .pop() || selector;
  const id = specific.match(/#([\w-]+)/)?.[1];
  if (id) return `id="${id}"`;
  const cls = specific.match(/\.([\w-]+)/)?.[1];
  if (cls) return `.${cls}`;
  const tag = specific.match(/^([a-z][a-z0-9-]*)/i)?.[1];
  if (tag) return `<${tag}`;
  return specific;
}

/**
 * Checks whether a single finding is a confirmed false positive based on evidence HTML patterns.
 * Only covers cases where the violation is provably impossible given the axe evidence.
 * @param {Object} finding - An enriched finding object.
 * @returns {boolean}
 */
function isFalsePositive(finding) {
  const htmls = finding.evidence.map((e) => e.html || "").join(" ");
  if (finding.rule_id === "color-contrast") {
    if (/background(?:-image)?\s*:\s*(?:linear|radial|conic)-gradient/i.test(htmls)) return true;
    if (/visibility\s*:\s*hidden|display\s*:\s*none/i.test(htmls)) return true;
  }
  return false;
}

/**
 * Removes confirmed false positives from findings.
 * @param {Object[]} findings
 * @returns {{ filtered: Object[], removedCount: number }}
 */
function filterFalsePositives(findings) {
  const filtered = [];
  let removedCount = 0;
  for (const finding of findings) {
    if (isFalsePositive(finding)) {
      removedCount++;
    } else {
      filtered.push(finding);
    }
  }
  return { filtered, removedCount };
}

/**
 * Deduplicates findings that fire on the same rule and element pattern across multiple pages.
 * Groups them into one representative finding with pages_affected and affected_urls.
 * @param {Object[]} findings
 * @returns {{ findings: Object[], deduplicatedCount: number }}
 */
function deduplicateFindings(findings) {
  function normalizeSelector(selector) {
    if (!selector) return "";
    return selector
      .replace(/:nth-child\(\d+\)/g, "")
      .replace(/:nth-of-type\(\d+\)/g, "")
      .replace(/\[\d+\]/g, "")
      .trim();
  }

  const UNGROUPABLE = new Set(["N/A", "", "html", "body", ":root", "document"]);

  const groups = new Map();
  for (const finding of findings) {
    const normalized = normalizeSelector(finding.primary_selector);
    const key = UNGROUPABLE.has(normalized)
      ? `__ungroupable__${finding.id}`
      : `${finding.rule_id}||${normalized}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(finding);
  }

  const result = [];
  let deduplicatedCount = 0;
  for (const [, group] of groups) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      const representative = group.reduce((best, f) =>
        (f.total_instances || 1) >= (best.total_instances || 1) ? f : best,
      );
      const affectedUrls = [...new Set(group.map((f) => f.url))];
      const totalInstances = group.reduce((sum, f) => sum + (f.total_instances || 1), 0);
      result.push({
        ...representative,
        total_instances: totalInstances,
        pages_affected: affectedUrls.length,
        affected_urls: affectedUrls,
      });
      deduplicatedCount++;
    }
  }
  return { findings: result, deduplicatedCount };
}

/**
 * Computes the overall WCAG compliance assessment.
 * @param {Object[]} findings
 * @returns {'Fail' | 'Conditional Pass' | 'Pass'}
 */
function computeOverallAssessment(findings) {
  const wcagFindings = findings.filter(
    (f) => f.wcag_classification !== "Best Practice" && f.wcag_classification !== "AAA",
  );
  if (wcagFindings.some((f) => f.severity === "Critical" || f.severity === "Serious")) return "Fail";
  if (wcagFindings.length > 0) return "Conditional Pass";
  return "Pass";
}

/**
 * Aggregates WCAG 2.2 AA criteria that passed across all scanned routes.
 * @param {Object[]} routes - Raw scan routes with a passes array of rule IDs.
 * @param {Object<string, string>} wcagCriterionMap - Map from rule_id to WCAG criterion ID.
 * @returns {string[]} Sorted unique WCAG criterion IDs that passed.
 */
function computePassedCriteria(routes, wcagCriterionMap) {
  const passed = new Set();
  for (const route of routes) {
    for (const ruleId of route.passes || []) {
      const criterion = wcagCriterionMap[ruleId];
      if (criterion) passed.add(criterion);
    }
  }
  return [...passed].sort();
}

/**
 * Computes out-of-scope information: errored routes and static manual/AAA criteria.
 * @param {Object[]} routes - Raw scan routes.
 * @returns {Object}
 */
function computeOutOfScope(routes) {
  const authBlockedRoutes = routes
    .filter((r) => r.error)
    .map((r) => r.url || r.path)
    .filter(Boolean);
  return {
    auth_blocked_routes: authBlockedRoutes,
    manual_testing_required: [
      "1.2.2 Captions (Prerecorded)",
      "1.2.3 Audio Description or Media Alternative",
      "1.2.4 Captions (Live)",
      "1.2.5 Audio Description (Prerecorded)",
      "1.3.3 Sensory Characteristics",
      "1.4.1 Use of Color",
      "2.1.1 Keyboard",
      "2.1.2 No Keyboard Trap",
      "2.3.1 Three Flashes or Below Threshold",
      "2.4.3 Focus Order",
      "2.4.7 Focus Visible",
      "2.5.3 Label in Name",
      "3.2.1 On Focus",
      "3.2.2 On Input",
      "3.3.3 Error Suggestion",
      "3.3.4 Error Prevention",
    ],
    aaa_excluded: true,
  };
}

/**
 * Classifies a finding's WCAG status based on axe rule tags.
 * @param {string[]} tags - The violation's axe tags.
 * @param {string|null} wcagCriterionId - The mapped WCAG criterion ID.
 * @returns {'Best Practice' | 'AAA' | null} null = standard AA/A finding.
 */
function classifyWcag(tags, wcagCriterionId) {
  if (tags.includes("best-practice")) return "Best Practice";
  if (tags.some((t) => /aaa/i.test(t))) return "AAA";
  if (!wcagCriterionId) return "Best Practice";
  return null;
}

/**
 * Identifies single-point-fix opportunities and systemic WCAG patterns from findings.
 * @param {Object[]} findings - Deduplicated enriched findings.
 * @returns {{ single_point_fixes: Object[], systemic_patterns: Object[] }}
 */
function computeRecommendations(findings) {
  const componentGroups = new Map();
  for (const f of findings) {
    if (!f.component_hint) continue;
    if (!componentGroups.has(f.component_hint)) componentGroups.set(f.component_hint, []);
    componentGroups.get(f.component_hint).push(f);
  }

  const singlePointFixes = [];
  for (const [component, group] of componentGroups) {
    const maxPages = Math.max(...group.map((f) => f.pages_affected || 1));
    if (group.length < 2 && maxPages < 3) continue;
    singlePointFixes.push({
      component,
      total_issues: group.length,
      total_pages: maxPages,
      rules: [...new Set(group.map((f) => f.rule_id))],
      severities: [...new Set(group.map((f) => f.severity))],
    });
  }
  singlePointFixes.sort((a, b) => (b.total_issues * b.total_pages) - (a.total_issues * a.total_pages));

  const criterionGroups = new Map();
  for (const f of findings) {
    if (!f.wcag_criterion_id) continue;
    if (!criterionGroups.has(f.wcag_criterion_id)) criterionGroups.set(f.wcag_criterion_id, []);
    criterionGroups.get(f.wcag_criterion_id).push(f);
  }

  const systemicPatterns = [];
  for (const [criterion, group] of criterionGroups) {
    if (group.length < 3) continue;
    const components = [...new Set(group.map((f) => f.component_hint).filter(Boolean))];
    if (components.length < 2) continue;
    systemicPatterns.push({
      wcag_criterion: criterion,
      total_issues: group.length,
      affected_components: components,
      rules: [...new Set(group.map((f) => f.rule_id))],
    });
  }
  systemicPatterns.sort((a, b) => b.total_issues - a.total_issues);

  return { single_point_fixes: singlePointFixes, systemic_patterns: systemicPatterns };
}

/**
 * Auto-generates testing methodology metadata from the raw scan payload.
 * @param {Object} payload - Raw scan payload from scanner.mjs.
 * @returns {Object}
 */
function computeTestingMethodology(payload) {
  const routes = payload.routes || [];
  const scanned = routes.filter((r) => !r.error).length;
  const errored = routes.filter((r) => r.error).length;
  return {
    automated_tools: ["axe-core (via @axe-core/playwright)", "Playwright + Chromium"],
    compliance_target: "WCAG 2.2 AA",
    pages_scanned: scanned,
    pages_errored: errored,
    framework_detected: payload.projectContext?.framework || "Not detected",
    manual_testing: "Not performed — see Out of Scope section",
    assistive_tech_tested: "None (automated scan only)",
  };
}

/**
 * Processes scan results into a high-level auditing findings object.
 * Enriches findings with intelligence metadata, framework notes, and fix recommendations.
 * @param {Object} inputPayload - The raw JSON payload from scanner.mjs.
 * @param {Object} cliArgs - Arguments passed to the analyzer.
 * @returns {Object} A structured object containing findings and metadata.
 */
function buildFindings(inputPayload, cliArgs) {
  const onlyRule = inputPayload.onlyRule;
  const routes = inputPayload.routes || [];
  const ctx = inputPayload.projectContext || {
    framework: null,
    uiLibraries: [],
  };
  if (cliArgs?.framework) ctx.framework = cliArgs.framework;
  const findings = [];

  for (const route of routes) {
    if (route.violations) {
      for (const v of route.violations) {
        const nodes = v.nodes || [];
        const selectors = nodes.map((n) => n.target.join(" ")).slice(0, 5);
        const bestSelector = selectors.reduce((best, s) => {
          if (/#[\w-]+/.test(s)) return s;
          if (best && /#[\w-]+/.test(best)) return best;
          const len = s.replace(/[^a-z0-9-]/gi, "").length;
          const bestLen = best ? best.replace(/[^a-z0-9-]/gi, "").length : 0;
          return len < bestLen ? s : best;
        }, selectors[0] || "N/A");
        const firstNode = nodes[0];
        const explicitRole =
          firstNode?.html?.match(/role=["']([^"']+)["']/)?.[1] ?? null;
        const tag =
          firstNode?.html?.match(/^<([a-z][a-z0-9-]*)/i)?.[1]?.toLowerCase() ??
          null;
        const role = explicitRole ?? detectImplicitRole(tag, firstNode?.html);
        const apgUrl = role ? APG_PATTERNS[role] : null;

        const ruleInfo = RULES[v.id] || {};
        const fixInfo = ruleInfo.fix || {};

        let recFix = apgUrl
          ? `Reference: ${apgUrl}`
          : v.helpUrl
            ? `See ${v.helpUrl}`
            : "Fix the violation.";

        const codeLang = detectCodeLang(fixInfo.code);

        findings.push({
          id: "",
          rule_id: v.id,
          title: v.help,
          severity: IMPACT_MAP[v.impact] || "Medium",
          wcag: mapWcag(v.tags),
          wcag_criterion_id: WCAG_CRITERION_MAP[v.id] ?? null,
          wcag_classification: classifyWcag(v.tags, WCAG_CRITERION_MAP[v.id] ?? null),
          area: `${route.path}`,
          url: route.url,
          selector: selectors.join(", "),
          impacted_users: getImpactedUsers(v.id, v.tags),
          impact: v.description,
          primary_selector: bestSelector,
          reproduction: [
            `Open ${route.url} in a browser to observe the issue`,
            `Search source files for \`${extractSearchHint(bestSelector)}\` to locate the component`,
            `Confirm the violation: ${v.help}`,
          ],
          actual:
            firstNode?.failureSummary || `Found ${nodes.length} instance(s).`,
          expected: getExpected(v.id),
          fix_description: fixInfo.description ?? null,
          fix_code: fixInfo.code ?? null,
          fix_code_lang: codeLang,
          recommended_fix: recFix.trim(),
          mdn: MDN[v.id] ?? null,
          effort: null,
          related_rules: Array.isArray(ruleInfo.related_rules)
            ? ruleInfo.related_rules
            : [],
          false_positive_risk: ruleInfo.false_positive_risk ?? null,
          fix_difficulty_notes: ruleInfo.fix_difficulty_notes ?? null,
          framework_notes: filterNotes(ruleInfo.framework_notes, ctx.framework),
          cms_notes: filterNotes(ruleInfo.cms_notes, ctx.framework),
          total_instances: nodes.length,
          evidence: nodes.slice(0, 3).map((n) => ({
            html: n.html,
            target: n.target,
            failureSummary: n.failureSummary,
          })),
          screenshot_path: v.screenshot_path || null,
          file_search_pattern: getFileSearchPattern(ctx.framework, codeLang),
          managed_by_library: getManagedByLibrary(v.id, ctx.uiLibraries),
          component_hint: extractComponentHint(bestSelector),
          verification_command: `pnpm a11y --base-url ${route.url} --routes ${route.path} --only-rule ${v.id} --max-routes 1`,
        });
      }
    }

    const axeRuleIds = (route.violations || []).map((v) => v.id);

    const meta = route.metadata || {};
    if (
      !onlyRule &&
      meta.h1Count !== undefined &&
      meta.h1Count !== 1 &&
      !axeRuleIds.includes("page-has-heading-one")
    ) {
      const _ruleInfo = RULES["page-has-heading-one"] || {};
      const _fixInfo = _ruleInfo.fix || {};
      findings.push({
        id: "",
        rule_id: "page-has-heading-one",
        title: "Page must have exactly one h1",
        severity: "Moderate",
        wcag: "WCAG 2.1 A",
        wcag_criterion_id: WCAG_CRITERION_MAP["page-has-heading-one"] ?? null,
        area: route.path,
        url: route.url,
        selector: "h1",
        impacted_users: getImpactedUsers("page-has-heading-one", []),
        impact: "Heading hierarchy is broken.",
        reproduction: ["Count h1 tags on page"],
        actual: `Found ${meta.h1Count} h1 tags.`,
        expected: "Exactly 1 h1 tag.",
        fix_description: _fixInfo.description ?? null,
        fix_code: _fixInfo.code ?? null,
        fix_code_lang: detectCodeLang(_fixInfo.code),
        recommended_fix: "Ensure one unique h1 per page.",
        mdn: MDN["page-has-heading-one"] ?? null,
        effort: null,
        related_rules: Array.isArray(_ruleInfo.related_rules) ? _ruleInfo.related_rules : [],
        false_positive_risk: _ruleInfo.false_positive_risk ?? null,
        fix_difficulty_notes: _ruleInfo.fix_difficulty_notes ?? null,
        framework_notes: filterNotes(_ruleInfo.framework_notes, ctx.framework),
        cms_notes: filterNotes(_ruleInfo.cms_notes, ctx.framework),
        wcag_classification: "Best Practice",
      });
    }

    if (
      !onlyRule &&
      meta.mainCount !== undefined &&
      meta.mainCount !== 1 &&
      !axeRuleIds.includes("landmark-one-main")
    ) {
      const _ruleInfo = RULES["landmark-one-main"] || {};
      const _fixInfo = _ruleInfo.fix || {};
      findings.push({
        id: "",
        rule_id: "landmark-one-main",
        title: "Page must have exactly one main landmark",
        severity: "Moderate",
        wcag: "WCAG 2.1 A",
        wcag_criterion_id: WCAG_CRITERION_MAP["landmark-one-main"] ?? null,
        area: route.path,
        url: route.url,
        selector: "main",
        impacted_users: getImpactedUsers("landmark-one-main", []),
        impact: "Landmark navigation is broken.",
        reproduction: ["Count main tags on page"],
        actual: `Found ${meta.mainCount} main tags.`,
        expected: "Exactly 1 main tag.",
        fix_description: _fixInfo.description ?? null,
        fix_code: _fixInfo.code ?? null,
        fix_code_lang: detectCodeLang(_fixInfo.code),
        recommended_fix: "Ensure one main landmark per page.",
        mdn: MDN["landmark-one-main"] ?? null,
        effort: null,
        related_rules: Array.isArray(_ruleInfo.related_rules) ? _ruleInfo.related_rules : [],
        false_positive_risk: _ruleInfo.false_positive_risk ?? null,
        fix_difficulty_notes: _ruleInfo.fix_difficulty_notes ?? null,
        framework_notes: filterNotes(_ruleInfo.framework_notes, ctx.framework),
        cms_notes: filterNotes(_ruleInfo.cms_notes, ctx.framework),
        wcag_classification: "Best Practice",
      });
    }
  }

  return {
    findings: findings.map((f) => ({
      ...f,
      id: makeFindingId(f.rule_id || f.title, f.url, f.selector),
    })),
    metadata: {
      scanDate: new Date().toISOString(),
      regulatory: US_REGULATORY,
      checklist: "https://www.a11yproject.com/checklist/",
      projectContext: ctx,
      code_patterns: CODE_PATTERNS,
    },
  };
}

/**
 * The main execution function for the analyzer script.
 * Reads scan results, processes findings, and writes the final findings JSON.
 */
function main() {
  const args = parseArgs(process.argv.slice(2));
  const ignoredRules = new Set(args.ignoreFindings);

  const payload = readJson(args.input);
  if (!payload) throw new Error(`Input not found or invalid: ${args.input}`);

  const result = buildFindings(payload, args);

  if (ignoredRules.size > 0) {
    const knownIds = new Set(
      result.findings.map((f) => f.rule_id).filter(Boolean),
    );
    for (const r of ignoredRules) {
      if (!knownIds.has(r))
        log.warn(`ignoreFindings: rule "${r}" not found in this scan — typo?`);
    }
  }

  let findings =
    ignoredRules.size > 0
      ? result.findings.filter((f) => !ignoredRules.has(f.rule_id))
      : result.findings;

  if (ignoredRules.size > 0 && result.findings.length !== findings.length) {
    log.info(
      `Ignored ${result.findings.length - findings.length} finding(s) via ignoreFindings config.`,
    );
  }

  const { filtered: fpFiltered, removedCount: fpRemovedCount } = filterFalsePositives(findings);
  if (fpRemovedCount > 0) log.info(`Removed ${fpRemovedCount} confirmed false positive(s).`);

  const { findings: dedupedFindings, deduplicatedCount } = deduplicateFindings(fpFiltered);
  if (deduplicatedCount > 0) log.info(`Deduplicated ${deduplicatedCount} cross-page finding group(s).`);

  const overallAssessment = computeOverallAssessment(dedupedFindings);
  const passedCriteria = computePassedCriteria(payload.routes || [], WCAG_CRITERION_MAP);
  const outOfScope = computeOutOfScope(payload.routes || []);
  const recommendations = computeRecommendations(dedupedFindings);
  const testingMethodology = computeTestingMethodology(payload);

  writeJson(args.output, {
    ...result,
    findings: dedupedFindings,
    metadata: {
      ...result.metadata,
      overallAssessment,
      passedCriteria,
      outOfScope,
      recommendations,
      testingMethodology,
      fpFiltered: fpRemovedCount,
      deduplicatedCount,
    },
  });

  if (dedupedFindings.length === 0) {
    log.info("Congratulations, no issues found.");
  }
  log.success(`Findings processed and saved to ${args.output}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    log.error(error.message);
    process.exit(1);
  }
}
