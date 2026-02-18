#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const MAX_EVIDENCE_ITEMS = 5;

function parseArgs(argv) {
  const args = {
    input: "",
    output: "/tmp/wondersauce-a11y-findings.json"
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value, label) {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid ${label}`);
  }
}

function normalizePath(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "/";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const u = new URL(raw);
      return u.pathname || "/";
    } catch {
      return raw;
    }
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function topSelectors(items, fallback = "(selector unavailable)") {
  return asArray(items)
    .slice(0, MAX_EVIDENCE_ITEMS)
    .map((item) => String(item?.selector ?? fallback).trim())
    .filter(Boolean);
}

function buildFinding(ruleKey, routePath, payload) {
  const common = {
    area: `${routePath} page structure and interaction`,
    url: routePath
  };

  if (ruleKey === "missing_main") {
    return {
      title: "Missing main landmark",
      severity: "Medium",
      wcag: "1.3.1 Info and Relationships (A)",
      selector: "main, [role=\"main\"]",
      impact: "Screen reader landmark navigation is reduced.",
      reproduction: [
        `Open ${routePath}.`,
        "Inspect landmarks in the DOM/accessibility tree.",
        "Confirm there is no main landmark."
      ],
      actual: `No main landmark was detected. Count: ${payload.mainCount}.`,
      expected: "A page should expose one primary main landmark.",
      recommended_fix: "Wrap primary content in <main> (or equivalent role=\"main\") and keep one primary region.",
      ...common
    };
  }

  if (ruleKey === "multiple_main") {
    return {
      title: "Multiple main landmarks",
      severity: "Medium",
      wcag: "1.3.1 Info and Relationships (A)",
      selector: "main, [role=\"main\"]",
      impact: "Landmark navigation becomes ambiguous for assistive technologies.",
      reproduction: [
        `Open ${routePath}.`,
        "Inspect landmarks in the DOM/accessibility tree.",
        "Confirm more than one main landmark exists."
      ],
      actual: `Detected ${payload.mainCount} main landmarks.`,
      expected: "A page should expose exactly one primary main landmark.",
      recommended_fix: "Keep a single primary <main> region and move secondary areas to other semantic landmarks.",
      ...common
    };
  }

  if (ruleKey === "missing_skip_link") {
    return {
      title: "Missing skip-to-content link",
      severity: "High",
      wcag: "2.4.1 Bypass Blocks (A)",
      selector: "a[href=\"#main\"], a[href=\"#main-content\"], a[href^=\"#main-\"]",
      impact: "Keyboard users must tab through repeated blocks before reaching primary content.",
      reproduction: [
        `Open ${routePath}.`,
        "Press Tab from the top of the page.",
        "Confirm there is no skip-to-content mechanism."
      ],
      actual: `Skip-link candidates found: ${payload.skipLinkCount}.`,
      expected: "A skip-to-content control should be available as the first focusable mechanism.",
      recommended_fix: "Add a visible-on-focus skip link that targets the primary content region.",
      ...common
    };
  }

  if (ruleKey === "invalid_h1_count") {
    return {
      title: "Invalid h1 count",
      severity: "Medium",
      wcag: "1.3.1 Info and Relationships (A)",
      selector: "h1",
      impact: "Heading navigation and page structure are less clear for assistive technology users.",
      reproduction: [
        `Open ${routePath}.`,
        "Inspect heading structure.",
        "Confirm h1 count is not exactly one."
      ],
      actual: `Detected h1 count: ${payload.h1Count}.`,
      expected: "Each page should provide exactly one h1.",
      recommended_fix: "Ensure one meaningful h1 exists and keep other headings hierarchical.",
      ...common
    };
  }

  if (ruleKey === "unlabeled_form_controls") {
    const selectors = topSelectors(payload.unlabeledFormControls);
    return {
      title: "Unlabeled form controls",
      severity: "High",
      wcag: "1.3.1 / 3.3.2 / 4.1.2 (A)",
      selector: selectors[0] ?? "input, select, textarea",
      impact: "Screen reader and speech-input users cannot reliably identify field purpose.",
      reproduction: [
        `Open ${routePath}.`,
        "Inspect form controls and accessible names.",
        "Confirm controls without associated labels or ARIA names."
      ],
      actual: `Detected ${payload.unlabeledFormControls.length} unlabeled controls. Examples: ${selectors.join(", ") || "(none listed)"}.`,
      expected: "Every form control should have a programmatic label.",
      recommended_fix: "Associate controls with <label for>, or provide aria-label/aria-labelledby where needed.",
      ...common
    };
  }

  if (ruleKey === "unnamed_interactive_controls") {
    const buttonSelectors = topSelectors(payload.unnamedButtons);
    const linkSelectors = topSelectors(payload.unnamedLinks);
    const combined = [...buttonSelectors, ...linkSelectors].slice(0, MAX_EVIDENCE_ITEMS);
    return {
      title: "Interactive controls without accessible names",
      severity: "High",
      wcag: "4.1.2 Name, Role, Value (A)",
      selector: combined[0] ?? "button, a",
      impact: "Assistive technology users cannot identify the purpose of interactive elements.",
      reproduction: [
        `Open ${routePath}.`,
        "Inspect buttons/links in the accessibility tree.",
        "Confirm controls missing text and ARIA name."
      ],
      actual: `Unnamed controls detected. Buttons: ${payload.unnamedButtons.length}, Links: ${payload.unnamedLinks.length}. Examples: ${combined.join(", ") || "(none listed)"}.`,
      expected: "Every interactive control should expose a clear accessible name.",
      recommended_fix: "Add visible text or aria-label/aria-labelledby to unnamed controls.",
      ...common
    };
  }

  if (ruleKey === "aria_hidden_focusable") {
    const selectors = topSelectors(payload.ariaHiddenFocusable);
    return {
      title: "Focusable content hidden from assistive technology",
      severity: "High",
      wcag: "4.1.2 Name, Role, Value (A)",
      selector: selectors[0] ?? "[aria-hidden=\"true\"]",
      impact: "Focusable elements become unreachable or confusing for screen reader users.",
      reproduction: [
        `Open ${routePath}.`,
        "Inspect focusable elements with aria-hidden.",
        "Confirm focusable nodes are hidden from assistive technologies."
      ],
      actual: `Detected ${payload.ariaHiddenFocusable.length} focusable elements with aria-hidden. Examples: ${selectors.join(", ") || "(none listed)"}.`,
      expected: "Focusable content must not be hidden from assistive technologies.",
      recommended_fix: "Remove aria-hidden from focusable elements, or remove focusability.",
      ...common
    };
  }

  if (ruleKey === "non_semantic_clickables") {
    const selectors = topSelectors(payload.nonSemanticClickables);
    return {
      title: "Non-semantic clickable elements",
      severity: "Medium",
      wcag: "1.3.1 / 4.1.2 (A)",
      selector: selectors[0] ?? "div[onclick], span[onclick]",
      impact: "Custom controls can break expected keyboard and screen reader behavior.",
      reproduction: [
        `Open ${routePath}.`,
        "Inspect clickable non-native elements.",
        "Confirm action/navigation is implemented on non-semantic elements."
      ],
      actual: `Detected ${payload.nonSemanticClickables.length} non-semantic clickable elements. Examples: ${selectors.join(", ") || "(none listed)"}.`,
      expected: "Use <button> for actions and <a> for navigation.",
      recommended_fix: "Replace non-semantic click targets with native interactive elements.",
      ...common
    };
  }

  if (ruleKey === "password_manager_blockers") {
    const off = topSelectors(payload.passwordAutocompleteOff);
    const paste = topSelectors(payload.passwordPasteBlocked);
    const combined = [...off, ...paste].slice(0, MAX_EVIDENCE_ITEMS);
    return {
      title: "Password manager support blockers",
      severity: "Medium",
      wcag: "3.3.8 Accessible Authentication (AA)",
      selector: combined[0] ?? "input[type=\"password\"]",
      impact: "Users relying on password managers face unnecessary authentication barriers.",
      reproduction: [
        `Open ${routePath}.`,
        "Inspect password fields for autocomplete/paste restrictions.",
        "Confirm patterns that block password manager assistance."
      ],
      actual: `autocomplete=off fields: ${payload.passwordAutocompleteOff.length}; paste-blocked fields: ${payload.passwordPasteBlocked.length}. Examples: ${combined.join(", ") || "(none listed)"}.`,
      expected: "Password fields should support password manager workflows (paste/autofill).",
      recommended_fix: "Allow paste on password fields and avoid autocomplete=\"off\" on login/auth fields.",
      ...common
    };
  }

  return null;
}

function evaluateRoute(route) {
  const checks = route.checks ?? {};

  const payload = {
    h1Count: Number(checks.h1Count ?? 0),
    mainCount: Number(checks.mainCount ?? 0),
    skipLinkCount: Number(checks.skipLinkCount ?? 0),
    unlabeledFormControls: asArray(checks.unlabeledFormControls),
    unnamedButtons: asArray(checks.unnamedButtons),
    unnamedLinks: asArray(checks.unnamedLinks),
    ariaHiddenFocusable: asArray(checks.ariaHiddenFocusable),
    nonSemanticClickables: asArray(checks.nonSemanticClickables),
    passwordAutocompleteOff: asArray(checks.passwordAutocompleteOff),
    passwordPasteBlocked: asArray(checks.passwordPasteBlocked)
  };

  const failures = [];
  if (payload.mainCount === 0) failures.push("missing_main");
  if (payload.mainCount > 1) failures.push("multiple_main");
  if (payload.skipLinkCount === 0) failures.push("missing_skip_link");
  if (payload.h1Count !== 1) failures.push("invalid_h1_count");
  if (payload.unlabeledFormControls.length > 0) failures.push("unlabeled_form_controls");
  if (payload.unnamedButtons.length + payload.unnamedLinks.length > 0) failures.push("unnamed_interactive_controls");
  if (payload.ariaHiddenFocusable.length > 0) failures.push("aria_hidden_focusable");
  if (payload.nonSemanticClickables.length > 0) failures.push("non_semantic_clickables");
  if (payload.passwordAutocompleteOff.length + payload.passwordPasteBlocked.length > 0) {
    failures.push("password_manager_blockers");
  }

  return { payload, failures };
}

function buildFindings(inputPayload) {
  ensureObject(inputPayload, "payload");
  const routes = asArray(inputPayload.routes);
  const findings = [];

  for (const route of routes) {
    ensureObject(route, "route");
    const routePath = normalizePath(route.path ?? route.url ?? "/");
    const { payload, failures } = evaluateRoute(route);

    for (const rule of failures) {
      const finding = buildFinding(rule, routePath, payload);
      if (finding) findings.push({ ...finding, _rule: rule, _route: routePath });
    }
  }

  findings.sort((a, b) => {
    if (a._route !== b._route) return a._route.localeCompare(b._route);
    return a._rule.localeCompare(b._rule);
  });

  return findings.map((item, index) => ({
    id: `A11Y-${String(index + 1).padStart(3, "0")}`,
    title: item.title,
    severity: item.severity,
    wcag: item.wcag,
    area: item.area,
    url: item.url,
    selector: item.selector,
    impact: item.impact,
    reproduction: item.reproduction,
    actual: item.actual,
    expected: item.expected,
    recommended_fix: item.recommended_fix
  }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input not found: ${inputPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const findings = buildFindings(payload);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({ findings }, null, 2)}\n`, "utf-8");
  if (findings.length === 0) {
    console.log("Congratulations, no issues found.");
  }
  console.log(`Findings written to ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
