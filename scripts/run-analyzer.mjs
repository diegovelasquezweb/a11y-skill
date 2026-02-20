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
let INTELLIGENCE;
try {
  INTELLIGENCE = JSON.parse(fs.readFileSync(intelligencePath, "utf-8"));
} catch {
  throw new Error(
    "Missing or invalid assets/intelligence.json — reinstall the skill.",
  );
}

function makeFindingId(ruleId, url, selector) {
  const key = `${ruleId}||${url}||${selector}`;
  return `A11Y-${createHash("sha256").update(key).digest("hex").slice(0, 6)}`;
}

const RULES = INTELLIGENCE.rules || {};
const APG_PATTERNS = INTELLIGENCE.apgPatterns;
const A11Y_SUPPORT = INTELLIGENCE.a11ySupport;
const INCLUSIVE_COMPONENTS = INTELLIGENCE.inclusiveComponents;

const US_REGULATORY = {
  default: "https://accessibility.18f.gov/checklist/",
  section508: "https://www.section508.gov/create/software-websites/",
  "18f": "https://accessibility.18f.gov/tools/",
};

function getImpactedUsers(ruleId, tags) {
  if (RULES[ruleId]?.impacted_users) return RULES[ruleId].impacted_users;
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
  return RULES[ruleId]?.expected || "WCAG accessibility check must pass.";
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
    ignoreFindings: config.ignoreFindings || [],
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
  const findings = [];

  for (const route of routes) {
    if (route.violations) {
      for (const v of route.violations) {
        const nodes = v.nodes || [];
        const selectors = nodes.map((n) => n.target.join(" ")).slice(0, 5);
        const firstNode = nodes[0];
        const explicitRole =
          firstNode?.html?.match(/role=["']([^"']+)["']/)?.[1] ?? null;
        const tag =
          firstNode?.html?.match(/^<([a-z][a-z0-9-]*)/i)?.[1]?.toLowerCase() ??
          null;
        const role = explicitRole ?? detectImplicitRole(tag, firstNode?.html);
        const apgUrl = role ? APG_PATTERNS[role] : null;
        const supportUrl = role ? A11Y_SUPPORT[role] : null;
        const inclusiveUrl = role ? INCLUSIVE_COMPONENTS[role] : null;

        const ruleInfo = RULES[v.id] || {};
        const fixInfo = ruleInfo.fix || {};

        let recFix = v.helpUrl ? `See ${v.helpUrl}` : "Fix the violation.";
        if (apgUrl || supportUrl || inclusiveUrl) {
          recFix = `Remediation guide for "${role}":\n`;
          if (apgUrl) recFix += `- **Implementation (W3C APG)**: ${apgUrl}\n`;
          if (inclusiveUrl)
            recFix += `- **Inclusive Design Guide**: ${inclusiveUrl}\n`;
          if (supportUrl)
            recFix += `- **Browser/AT Support Data**: ${supportUrl}\n`;
        }

        findings.push({
          id: "",
          rule_id: v.id,
          title: v.help,
          severity: IMPACT_MAP[v.impact] || "Medium",
          wcag: mapWcag(v.tags),
          area: `${route.path}`,
          url: route.url,
          selector: selectors.join(", "),
          impacted_users: getImpactedUsers(v.id, v.tags),
          impact: v.description,
          reproduction: [
            `Open ${route.url} in a browser to observe the issue`,
            `Search source files for \`${extractSearchHint(selectors[0] || "N/A")}\` to locate the component`,
            `Confirm the violation: ${v.help}`,
          ],
          actual:
            firstNode?.failureSummary || `Found ${nodes.length} instance(s).`,
          expected: getExpected(v.id),
          fix_description: fixInfo.description ?? null,
          fix_code: fixInfo.code ?? null,
          recommended_fix: recFix.trim(),
          mdn: ruleInfo.mdn ?? null,
          manual_test: ruleInfo.manual_test ?? null,
          total_instances: nodes.length,
          evidence: JSON.stringify(
            nodes.slice(0, 3).map((n) => ({
              html: n.html,
              target: n.target,
              failureSummary: n.failureSummary,
            })),
            null,
            1,
          ),
          screenshot_path: v.screenshot_path || null,
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
