#!/usr/bin/env node

import {
  log,
  readJson,
  writeJson,
  getInternalPath,
  loadConfig,
} from "./a11y-utils.mjs";
import { createHash } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const intelligencePath = path.join(__dirname, "../assets/intelligence.json");
const ruleMetadataPath = path.join(__dirname, "../assets/rule-metadata.json");
let INTELLIGENCE;
let RULE_METADATA;
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

function makeFindingId(ruleId, url, selector) {
  const stableSelector = selector.split(",")[0].trim();
  const key = `${ruleId}||${url}||${stableSelector}`;
  return `A11Y-${createHash("sha256").update(key).digest("hex").slice(0, 6)}`;
}

const RULES = INTELLIGENCE.rules || {};
const APG_PATTERNS = RULE_METADATA.apgPatterns;
const MDN = RULE_METADATA.mdn || {};
const WCAG_CRITERION_MAP = RULE_METADATA.wcagCriterionMap || {};

function detectCodeLang(code) {
  if (!code) return "html";
  if (/\.(tsx?|jsx?)\b|className=|useState|useRef|<>\s*<\/>/i.test(code)) return "jsx";
  if (/^\s*[.#][\w-]+\s*\{|:\s*var\(|@media|display\s*:/m.test(code)) return "css";
  return "html";
}

const US_REGULATORY = {
  default: "https://accessibility.18f.gov/checklist/",
  section508: "https://www.section508.gov/create/software-websites/",
  "18f": "https://accessibility.18f.gov/tools/",
};

const IMPACTED_USERS = RULE_METADATA.impactedUsers || {};
const EXPECTED = RULE_METADATA.expected || {};

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

function getExpected(ruleId) {
  return EXPECTED[ruleId] || "WCAG accessibility check must pass.";
}

const FRAMEWORK_GLOBS = {
  nextjs:    { components: "app/**/*.tsx, components/**/*.tsx", styles: "**/*.module.css, app/globals.css" },
  gatsby:    { components: "src/**/*.tsx, src/**/*.jsx", styles: "src/**/*.css, src/**/*.module.css" },
  react:     { components: "src/**/*.tsx, src/**/*.jsx", styles: "src/**/*.css, src/**/*.module.css" },
  nuxt:      { components: "pages/**/*.vue, components/**/*.vue", styles: "**/*.css, assets/**/*.scss" },
  vue:       { components: "src/**/*.vue", styles: "src/**/*.css" },
  angular:   { components: "src/**/*.component.html, src/**/*.component.ts", styles: "src/**/*.component.css" },
  astro:     { components: "src/**/*.astro, src/components/**/*.tsx", styles: "src/**/*.css" },
  svelte:    { components: "src/**/*.svelte", styles: "src/**/*.css" },
  shopify:   { components: "sections/**/*.liquid, snippets/**/*.liquid", styles: "assets/**/*.css" },
  wordpress: { components: "wp-content/themes/**/*.php", styles: "wp-content/themes/**/*.css" },
};

const ARIA_MANAGED_RULES = new Set([
  "aria-required-attr", "aria-required-children", "aria-required-parent",
  "aria-valid-attr", "aria-valid-attr-value", "aria-allowed-attr",
  "aria-allowed-role", "aria-dialog-name", "aria-toggle-field-name",
  "aria-prohibited-attr",
]);

const MANAGED_LIBS = new Set(["radix", "headless-ui", "chakra", "mantine", "material-ui"]);

function getFileSearchPattern(framework, codeLang) {
  const globs = FRAMEWORK_GLOBS[framework];
  if (!globs) return null;
  return codeLang === "css" ? globs.styles : globs.components;
}

function getManagedByLibrary(ruleId, uiLibraries) {
  if (!ARIA_MANAGED_RULES.has(ruleId)) return null;
  const managed = uiLibraries.filter((lib) => MANAGED_LIBS.has(lib));
  if (managed.length === 0) return null;
  return managed.join(", ");
}

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

function printUsage() {
  log.info(`Usage:
  node run-analyzer.mjs --input <route-checks.json> [options]

Options:
  --output <path>          Output findings JSON path (default: audit/internal/a11y-findings.json)
  --ignore-findings <csv> Ignore specific rule IDs (overrides config)
  -h, --help               Show this help
`);
}

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

function mapWcag(tags) {
  if (tags.includes("wcag22aa")) return "WCAG 2.2 AA";
  if (tags.includes("wcag22a")) return "WCAG 2.2 A";
  if (tags.includes("wcag21aa") || tags.includes("wcag2aa"))
    return "WCAG 2.1 AA";
  if (tags.includes("wcag21a") || tags.includes("wcag2a")) return "WCAG 2.1 A";
  return "WCAG";
}

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

function buildFindings(inputPayload) {
  const onlyRule = inputPayload.onlyRule;
  const routes = inputPayload.routes || [];
  const ctx = inputPayload.projectContext || { framework: null, uiLibraries: [] };
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
          manual_test: ruleInfo.manual_test ?? null,
          effort: null,
          related_rules: Array.isArray(ruleInfo.related_rules) ? ruleInfo.related_rules : [],
          false_positive_risk: ruleInfo.false_positive_risk ?? null,
          fix_difficulty_notes: ruleInfo.fix_difficulty_notes ?? null,
          framework_notes: ruleInfo.framework_notes ?? null,
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const ignoredRules = new Set(
    args.ignoreFindings && args.ignoreFindings.length > 0
      ? args.ignoreFindings
      : Array.isArray(config.ignoreFindings)
        ? config.ignoreFindings
        : [],
  );

  const payload = readJson(args.input);
  if (!payload) throw new Error(`Input not found or invalid: ${args.input}`);

  const result = buildFindings(payload);

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
