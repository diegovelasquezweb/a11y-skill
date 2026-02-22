/**
 * @file run-analyzer.mjs
 * @description Post-scan data processor.
 * Transforms raw axe-core results into enriched findings by applying
 * framework-specific logic, remediation intelligence, and WCAG mapping
 * to generate a structured audit overview.
 */

import { log, readJson, writeJson, getInternalPath } from "./a11y-utils.mjs";
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
 * Path to shared rule metadata including WCAG mappings and APG patterns.
 * @type {string}
 */
const ruleMetadataPath = path.join(__dirname, "../assets/rule-metadata.json");

let INTELLIGENCE;
let RULE_METADATA;

// Initialize remediation and rule metadata assets.
try {
  INTELLIGENCE = JSON.parse(fs.readFileSync(intelligencePath, "utf-8"));
} catch {
  throw new Error(
    `Missing or invalid intelligence.json at ${intelligencePath} — run pnpm install to reinstall.`,
  );
}

try {
  RULE_METADATA = JSON.parse(fs.readFileSync(ruleMetadataPath, "utf-8"));
} catch {
  throw new Error(
    `Missing or invalid rule-metadata.json at ${ruleMetadataPath} — run pnpm install to reinstall.`,
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
/** @type {Object<string, string>} */
const APG_PATTERNS = RULE_METADATA.apgPatterns;
/** @type {Object<string, string>} */
const MDN = RULE_METADATA.mdn || {};
/** @type {Object<string, string>} */
const WCAG_CRITERION_MAP = RULE_METADATA.wcagCriterionMap || {};

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
const US_REGULATORY = {
  default: "https://accessibility.18f.gov/checklist/",
  section508: "https://www.section508.gov/create/software-websites/",
  "18f": "https://accessibility.18f.gov/tools/",
};

/** @type {Object<string, string>} */
const IMPACTED_USERS = RULE_METADATA.impactedUsers || {};
/** @type {Object<string, string>} */
const EXPECTED = RULE_METADATA.expected || {};

/**
 * Returns a description of the primary user groups impacted by a rule violation.
 * @param {string} ruleId - The ID of the accessibility rule.
 * @param {string[]} tags - The tags associated with the rule.
 * @returns {string} A description of the impacted users.
 */
function getImpactedUsers(ruleId, tags) {
  if (IMPACTED_USERS[ruleId]) return IMPACTED_USERS[ruleId];
  if (tags.includes("cat.color"))
    return "Users with low vision or color blindness";
  if (tags.includes("cat.keyboard")) return "Keyboard-only users";
  if (tags.includes("cat.aria")) return "Screen reader users";
  if (tags.includes("cat.forms"))
    return "Screen reader users and voice control users";
  if (tags.includes("cat.structure"))
    return "Screen reader users navigating by headings or landmarks";
  if (tags.includes("cat.semantics")) return "Screen reader users";
  if (tags.includes("cat.text-alternatives"))
    return "Blind users relying on screen readers";
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
const FRAMEWORK_GLOBS = {
  nextjs: {
    components: "app/**/*.tsx, components/**/*.tsx",
    styles: "**/*.module.css, app/globals.css",
  },
  gatsby: {
    components: "src/**/*.tsx, src/**/*.jsx",
    styles: "src/**/*.css, src/**/*.module.css",
  },
  react: {
    components: "src/**/*.tsx, src/**/*.jsx",
    styles: "src/**/*.css, src/**/*.module.css",
  },
  nuxt: {
    components: "pages/**/*.vue, components/**/*.vue",
    styles: "**/*.css, assets/**/*.scss",
  },
  vue: { components: "src/**/*.vue", styles: "src/**/*.css" },
  angular: {
    components: "src/**/*.component.html, src/**/*.component.ts",
    styles: "src/**/*.component.css",
  },
  astro: {
    components: "src/**/*.astro, src/components/**/*.tsx",
    styles: "src/**/*.css",
  },
  svelte: { components: "src/**/*.svelte", styles: "src/**/*.css" },
  shopify: {
    components: "sections/**/*.liquid, snippets/**/*.liquid",
    styles: "assets/**/*.css",
  },
  wordpress: {
    components: "wp-content/themes/**/*.php",
    styles: "wp-content/themes/**/*.css",
  },
};

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
const FRAMEWORK_TO_INTEL_KEY = {
  nextjs: "react",
  gatsby: "react",
  nuxt: "vue",
  react: "react",
  vue: "vue",
  angular: "angular",
  astro: "astro",
  svelte: "svelte",
};

/**
 * Maps detected framework/CMS IDs to their respective keys for CMS-specific notes.
 * @type {Object<string, string>}
 */
const FRAMEWORK_TO_CMS_KEY = {
  shopify: "shopify",
  wordpress: "wordpress",
  drupal: "drupal",
};

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
  node run-analyzer.mjs --input <route-checks.json> [options]

Options:
  --output <path>          Output findings JSON path (default: audit/internal/a11y-findings.json)
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

const IMPACT_MAP = {
  critical: "Critical",
  serious: "High",
  moderate: "Medium",
  minor: "Low",
};

/**
 * Maps axe-core rule tags to a human-readable WCAG level string.
 * @param {string[]} tags - The tags associated with a violation.
 * @returns {string} The WCAG level (e.g., "WCAG 2.1 AA").
 */
function mapWcag(tags) {
  if (tags.includes("wcag22aa")) return "WCAG 2.2 AA";
  if (tags.includes("wcag22a")) return "WCAG 2.2 A";
  if (tags.includes("wcag21aa") || tags.includes("wcag2aa"))
    return "WCAG 2.1 AA";
  if (tags.includes("wcag21a") || tags.includes("wcag2a")) return "WCAG 2.1 A";
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
  if (tag === "input") {
    const type = html?.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    if (type === "range") return "slider";
    return null;
  }
  const map = {
    a: "link",
    button: "button",
    dialog: "dialog",
    select: "listbox",
    details: "group",
    summary: "group",
    table: "table",
    nav: "navigation",
    header: "banner",
    footer: "contentinfo",
    aside: "complementary",
    main: "main",
    form: "form",
    fieldset: "group",
    h1: "heading",
    h2: "heading",
    h3: "heading",
    h4: "heading",
    h5: "heading",
    h6: "heading",
  };
  return map[tag] ?? null;
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
 * Processes scan results into a high-level auditing findings object.
 * Enriches findings with intelligence metadata, framework notes, and fix recommendations.
 * @param {Object} inputPayload - The raw JSON payload from run-scanner.mjs.
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

        let recFix = v.helpUrl ? `See ${v.helpUrl}` : "Fix the violation.";
        if (apgUrl) {
          recFix = `Reference: ${apgUrl}`;
        }

        const codeLang = detectCodeLang(fixInfo.code);

        findings.push({
          id: "",
          rule_id: v.id,
          title: v.help,
          severity: IMPACT_MAP[v.impact] || "Medium",
          wcag: mapWcag(v.tags),
          wcag_criterion_id: WCAG_CRITERION_MAP[v.id] ?? null,
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
      findings.push({
        id: "",
        title: "Page must have exactly one h1",
        severity: "Medium",
        wcag: "WCAG 2.1 A",
        area: route.path,
        url: route.url,
        selector: "h1",
        impact: "Heading hierarchy is broken.",
        reproduction: ["Count h1 tags on page"],
        actual: `Found ${meta.h1Count} h1 tags.`,
        expected: "Exactly 1 h1 tag.",
        recommended_fix: "Ensure one unique h1 per page.",
      });
    }

    if (
      !onlyRule &&
      meta.mainCount !== undefined &&
      meta.mainCount !== 1 &&
      !axeRuleIds.includes("landmark-one-main")
    ) {
      findings.push({
        id: "",
        title: "Page must have exactly one main landmark",
        severity: "Medium",
        wcag: "WCAG 2.1 A",
        area: route.path,
        url: route.url,
        selector: "main",
        impact: "Landmark navigation is broken.",
        reproduction: ["Count main tags on page"],
        actual: `Found ${meta.mainCount} main tags.`,
        expected: "Exactly 1 main tag.",
        recommended_fix: "Ensure one main landmark per page.",
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
    },
  };
}

/**
 * The main execution function for the analyzer script.
 * Reads scan results, processes findings, and writes the final findings JSON.
 */
function main() {
  const args = parseArgs(process.argv.slice(2));
  const ignoredRules = new Set(
    args.ignoreFindings && args.ignoreFindings.length > 0
      ? args.ignoreFindings
      : [],
  );

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

  const findings =
    ignoredRules.size > 0
      ? result.findings.filter((f) => !ignoredRules.has(f.rule_id))
      : result.findings;

  if (ignoredRules.size > 0 && result.findings.length !== findings.length) {
    log.info(
      `Ignored ${result.findings.length - findings.length} finding(s) via ignoreFindings config.`,
    );
  }

  writeJson(args.output, { ...result, findings });

  if (findings.length === 0) {
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
