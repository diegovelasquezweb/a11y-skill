#!/usr/bin/env node

import { log, readJson, writeJson, getInternalPath, loadConfig } from "./a11y-utils.mjs";
import path from "node:path";
import fs from "node:fs";

const FIX_TEMPLATES = {
  "landmark-one-main": {
    description: 'Add a <main> landmark wrapping your page content.',
    code: '<main id="main-content">\n  <!-- page content -->\n</main>',
  },
  "region": {
    description: "Wrap all visible content in semantic landmark elements.",
    code: "<header><!-- header content --></header>\n<main><!-- main content --></main>\n<footer><!-- footer content --></footer>",
  },
  "image-alt": {
    description: 'Add a descriptive alt attribute to every <img>. Use alt="" for decorative images.',
    code: '<img src="photo.jpg" alt="Description of the image">\n<!-- Decorative image (hidden from AT): -->\n<img src="divider.png" alt="">',
  },
  "button-name": {
    description: "Give every button an accessible name via visible text or aria-label.",
    code: '<!-- Via visible text: -->\n<button>Submit form</button>\n<!-- Icon button via aria-label: -->\n<button aria-label="Close dialog"><svg aria-hidden="true">...</svg></button>',
  },
  "link-name": {
    description: 'Use descriptive link text that conveys the destination or purpose. Avoid "click here" or "read more".',
    code: '<a href="/products">View our product catalog</a>\n<!-- Avoid: <a href="/products">click here</a> -->',
  },
  "label": {
    description: "Associate every form input with a visible <label> element.",
    code: '<label for="email">Email address</label>\n<input id="email" type="email" name="email">',
  },
  "color-contrast": {
    description: "Increase the contrast ratio between text and its background. Minimum 4.5:1 for normal text, 3:1 for large text (≥18pt or ≥14pt bold).",
    code: null,
  },
  "duplicate-id": {
    description: "All id attributes must be unique within the page. Search for duplicate values and rename them.",
    code: null,
  },
  "heading-order": {
    description: "Fix the heading hierarchy — no levels may be skipped.",
    code: "<h1>Page title</h1>\n<h2>Section heading</h2>\n<h3>Subsection heading</h3>\n<!-- Invalid: jumping from h1 to h3 -->",
  },
  "page-has-heading-one": {
    description: "Add exactly one <h1> as the primary page heading.",
    code: "<h1>Main page heading</h1>",
  },
  "aria-required-attr": {
    description: "Add the required ARIA attribute(s) for the element's role. See the WAI-ARIA spec for required attributes per role.",
    code: null,
  },
  "aria-valid-attr-value": {
    description: "Set a valid value for the ARIA attribute. Consult the WAI-ARIA spec for the list of allowed values.",
    code: null,
  },
  "aria-hidden-focus": {
    description: 'Remove aria-hidden="true" from elements that can receive focus, or exclude them from the tab order.',
    code: '<!-- Option 1: Remove aria-hidden -->\n<button>Visible button</button>\n<!-- Option 2: Keep hidden but remove from tab order -->\n<span aria-hidden="true" tabindex="-1">Decorative text</span>',
  },
  "tabindex": {
    description: 'Remove positive tabindex values. Use tabindex="0" to include in natural tab order, tabindex="-1" to exclude.',
    code: '<!-- Include in natural tab order: -->\n<div role="button" tabindex="0">Focusable element</div>\n<!-- Programmatically focusable only: -->\n<div tabindex="-1">Focus via script only</div>',
  },
  "autocomplete-valid": {
    description: "Add a valid autocomplete token to form inputs to assist users with autofill.",
    code: '<input type="email" name="email" autocomplete="email">\n<input type="text" name="name" autocomplete="name">\n<input type="tel" name="phone" autocomplete="tel">',
  },
  "form-field-multiple-labels": {
    description: "Each form field must have exactly one associated <label>. Remove duplicate labels.",
    code: '<!-- One label per input: -->\n<label for="name">Full name</label>\n<input id="name" type="text" name="name">',
  },
  "scrollable-region-focusable": {
    description: 'Make scrollable regions keyboard-accessible by adding tabindex="0" and a descriptive label.',
    code: '<div tabindex="0" role="region" aria-label="Content section">\n  <!-- scrollable content -->\n</div>',
  },
  "select-name": {
    description: "Associate every <select> element with a visible <label>.",
    code: '<label for="country">Country</label>\n<select id="country" name="country">\n  <option value="us">United States</option>\n</select>',
  },
  "input-image-alt": {
    description: 'Add an alt attribute to every <input type="image"> describing the action it performs.',
    code: '<input type="image" src="submit.png" alt="Submit form">',
  },
  "object-alt": {
    description: "Add an aria-label to every <object> element describing its content.",
    code: '<object data="chart.svg" type="image/svg+xml" aria-label="Bar chart: Q1 2024 sales by region">\n  Fallback text for unsupported browsers\n</object>',
  },
  "frame-title": {
    description: "Add a descriptive title attribute to every <iframe>.",
    code: '<iframe\n  title="Embedded map showing our store location"\n  src="https://maps.example.com/embed"\n></iframe>',
  },
  "document-title": {
    description: "Add a descriptive, unique <title> element to every page.",
    code: "<title>Product Details — My Store</title>",
  },
  "html-has-lang": {
    description: "Add a lang attribute to the <html> element so screen readers pronounce content correctly.",
    code: '<html lang="en">',
  },
  "html-lang-valid": {
    description: "Use a valid BCP 47 language tag on the <html> element.",
    code: '<!-- English -->\n<html lang="en">\n<!-- French Canadian -->\n<html lang="fr-CA">\n<!-- Brazilian Portuguese -->\n<html lang="pt-BR">',
  },
  "valid-lang": {
    description: "Use a valid BCP 47 language code on any element with a lang attribute.",
    code: '<p lang="es">Hola mundo</p>\n<blockquote lang="fr">Citation en français</blockquote>',
  },
  "bypass": {
    description: "Add a skip link at the very top of each page so keyboard users can bypass repetitive navigation.",
    code: '<a class="skip-link" href="#main-content">Skip to main content</a>\n<nav><!-- navigation --></nav>\n<main id="main-content">\n  <!-- page content -->\n</main>',
  },
  "definition-list": {
    description: "Use proper <dl>/<dt>/<dd> structure for definition lists.",
    code: "<dl>\n  <dt>Term</dt>\n  <dd>Definition of the term</dd>\n  <dt>Another term</dt>\n  <dd>Its definition</dd>\n</dl>",
  },
  "dlitem": {
    description: "Wrap all <dt> and <dd> elements directly inside a <dl> element.",
    code: "<dl>\n  <dt>Term</dt>\n  <dd>Definition</dd>\n</dl>",
  },
  "list": {
    description: "Wrap all <li> elements directly inside a <ul> or <ol> element.",
    code: "<ul>\n  <li>Item one</li>\n  <li>Item two</li>\n</ul>",
  },
  "listitem": {
    description: "Use <ul> or <ol> as the direct parent of all <li> elements.",
    code: "<!-- Unordered list: -->\n<ul>\n  <li>Item</li>\n</ul>\n<!-- Ordered list: -->\n<ol>\n  <li>Step one</li>\n  <li>Step two</li>\n</ol>",
  },
  "meta-refresh": {
    description: "Remove automatic page refresh. If redirecting immediately, a delay of 0 is permitted.",
    code: "<!-- Remove this: -->\n<!-- <meta http-equiv=\"refresh\" content=\"5; url=...\"> -->\n\n<!-- Instant redirect only (delay=0 is OK): -->\n<meta http-equiv=\"refresh\" content=\"0; url=https://example.com/new-page\">",
  },
  "meta-viewport": {
    description: 'Remove user-scalable=no from the viewport meta tag to allow users to zoom.',
    code: '<meta name="viewport" content="width=device-width, initial-scale=1">',
  },
};

const IMPACTED_USERS = {
  "landmark-one-main": "Screen reader users navigating by landmarks",
  "region": "Screen reader users navigating by landmarks",
  "image-alt": "Blind users relying on screen readers",
  "button-name": "Screen reader users and voice control users",
  "link-name": "Screen reader users and voice control users",
  "label": "Screen reader users and voice control users",
  "color-contrast": "Users with low vision or color blindness",
  "duplicate-id": "Screen reader users (broken element references)",
  "heading-order": "Screen reader users navigating by headings",
  "page-has-heading-one": "Screen reader users navigating by headings",
  "aria-required-attr": "Screen reader users",
  "aria-valid-attr-value": "Screen reader users",
  "aria-hidden-focus": "Keyboard-only users and screen reader users",
  "tabindex": "Keyboard-only users",
  "autocomplete-valid": "Users with motor disabilities and cognitive disabilities",
  "form-field-multiple-labels": "Screen reader users",
  "scrollable-region-focusable": "Keyboard-only users",
  "select-name": "Screen reader users and voice control users",
  "input-image-alt": "Blind users relying on screen readers",
  "object-alt": "Blind users relying on screen readers",
  "frame-title": "Screen reader users",
  "document-title": "Screen reader users and users with cognitive disabilities",
  "html-has-lang": "Screen reader users (language detection for pronunciation)",
  "html-lang-valid": "Screen reader users (language detection for pronunciation)",
  "valid-lang": "Screen reader users (language detection for pronunciation)",
  "bypass": "Keyboard-only users and screen reader users",
  "meta-refresh": "Users with cognitive disabilities and screen reader users",
  "meta-viewport": "Users who need to zoom (low vision, motor disabilities)",
};

const EXPECTED_BEHAVIOR = {
  "landmark-one-main": "Page must contain exactly one <main> landmark element.",
  "region": "All visible page content must be contained within a landmark element (main, nav, header, footer, aside).",
  "image-alt": "Every <img> must have an alt attribute. Decorative images use alt=\"\".",
  "button-name": "Every <button> and [role=\"button\"] must have a non-empty accessible name.",
  "link-name": "Every <a href> must have descriptive, non-empty text content or an aria-label.",
  "label": "Every form input must have an associated <label>, aria-label, or aria-labelledby.",
  "color-contrast": "Text contrast ratio must be at least 4.5:1 for normal text, 3:1 for large text.",
  "duplicate-id": "All id attributes must be unique within the document.",
  "heading-order": "Heading levels must not skip (h1 → h2 → h3, no gaps allowed).",
  "page-has-heading-one": "Page must have exactly one <h1> element as the primary heading.",
  "aria-required-attr": "ARIA roles must include all required attributes defined in the WAI-ARIA spec.",
  "aria-valid-attr-value": "ARIA attributes must use only valid values defined in the WAI-ARIA spec.",
  "aria-hidden-focus": "Elements with aria-hidden=\"true\" must not be focusable.",
  "tabindex": "tabindex values must be 0 or -1. Positive values disrupt natural focus order.",
  "bypass": "Page must provide a mechanism to skip repetitive navigation (e.g., a skip link).",
  "document-title": "Page must have a descriptive, unique <title> element.",
  "html-has-lang": "The <html> element must have a lang attribute.",
  "html-lang-valid": "The lang attribute on <html> must be a valid BCP 47 language tag.",
  "meta-viewport": "Viewport meta must not disable user scaling (user-scalable=no is forbidden).",
};

function getImpactedUsers(ruleId, tags) {
  if (IMPACTED_USERS[ruleId]) return IMPACTED_USERS[ruleId];
  if (tags.includes("cat.color")) return "Users with low vision or color blindness";
  if (tags.includes("cat.keyboard")) return "Keyboard-only users";
  if (tags.includes("cat.aria")) return "Screen reader users";
  if (tags.includes("cat.forms")) return "Screen reader users and voice control users";
  if (tags.includes("cat.structure")) return "Screen reader users navigating by headings or landmarks";
  if (tags.includes("cat.semantics")) return "Screen reader users";
  if (tags.includes("cat.text-alternatives")) return "Blind users relying on screen readers";
  return "Users relying on assistive technology";
}

function getExpected(ruleId) {
  return EXPECTED_BEHAVIOR[ruleId] || "WCAG accessibility check must pass.";
}

function printUsage() {
  log.info(`Usage:
  node deterministic-findings.mjs --input <route-checks.json> [options]

Options:
  --output <path>          Output findings JSON path (default: audit/internal/a11y-findings.json)
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
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    if (key === "--input") args.input = value;
    if (key === "--output") args.output = value;
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
  if (tags.includes("wcag2a") || tags.includes("wcag21a")) return "WCAG 2.1 A";
  if (tags.includes("wcag2aa") || tags.includes("wcag21aa"))
    return "WCAG 2.1 AA";
  return "WCAG";
}

function buildFindings(inputPayload) {
  const routes = inputPayload.routes || [];
  const findings = [];

  for (const route of routes) {
    if (route.violations) {
      for (const v of route.violations) {
        const nodes = v.nodes || [];
        const selectors = nodes.map((n) => n.target.join(" ")).slice(0, 5);
        const firstFailure = nodes[0]?.failureSummary || null;

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
            `Open ${route.url}`,
            `Check selector: ${selectors[0] || "N/A"}`,
            v.help,
          ],
          actual: firstFailure || `Found ${nodes.length} instance(s).`,
          expected: getExpected(v.id),
          fix_description: FIX_TEMPLATES[v.id]?.description ?? null,
          fix_code: FIX_TEMPLATES[v.id]?.code ?? null,
          recommended_fix: v.helpUrl
            ? `See ${v.helpUrl}`
            : "Fix the violation.",
          evidence: JSON.stringify(
            nodes.slice(0, 3).map((n) => ({
              html: n.html,
              target: n.target,
              failureSummary: n.failureSummary,
            })),
            null,
            1,
          ),
        });
      }
    }

    const axeRuleIds = (route.violations || []).map((v) => v.id);

    const meta = route.metadata || {};
    if (meta.h1Count !== 1 && !axeRuleIds.includes("page-has-heading-one")) {
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

    if (meta.mainCount !== 1 && !axeRuleIds.includes("landmark-one-main")) {
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

  findings.sort((a, b) => {
    if (a.area !== b.area) return a.area.localeCompare(b.area);
    return a.title.localeCompare(b.title);
  });

  return findings.map((f, i) => ({
    ...f,
    id: `A11Y-${String(i + 1).padStart(3, "0")}`,
  }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const ignoredRules = new Set(
    Array.isArray(config.ignoreFindings) ? config.ignoreFindings : [],
  );

  const payload = readJson(args.input);
  if (!payload) throw new Error(`Input not found or invalid: ${args.input}`);

  const allFindings = buildFindings(payload);
  const findings = ignoredRules.size > 0
    ? allFindings.filter((f) => !ignoredRules.has(f.rule_id))
    : allFindings;

  if (ignoredRules.size > 0 && allFindings.length !== findings.length) {
    log.info(`Ignored ${allFindings.length - findings.length} finding(s) via ignoreFindings config.`);
  }

  writeJson(args.output, { findings });

  if (findings.length === 0) {
    log.info("Congratulations, no issues found.");
  }
  log.success(`Findings processed and saved to ${args.output}`);
}

try {
  main();
} catch (error) {
  log.error(error.message);
  process.exit(1);
}
