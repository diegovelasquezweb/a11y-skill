# Configuration Reference

**Navigation**: [Home](../README.md) • [Architecture](architecture.md) • [CLI Handbook](cli-handbook.md) • [Configuration](configuration.md) • [Data Validation](data-validation.md) • [Intelligence](engine-intelligence.md) • [Scoring](scoring-system.md) • [Scripts](scripts-catalog.md) • [Testing](testing.md)

---

## Table of Contents

- [Schema Overview](#schema-overview)
- [Key Definitions](#key-definitions)
- [Precedence Logic](#precedence-logic)
- [Example Config](#example-config-for-a-complex-spa)

The skill uses an optional `a11y.config.json` file at `audit/a11y.config.json` (inside the audited project) for **per-project decisions** that persist across all audit runs. The file is created on demand by the agent when the user requests a persistent setting — it does not exist by default.

> [!IMPORTANT]
> **CLI flags** = per-execution (change between runs). **Config file** = per-project (persist forever).
> If the user says "always" or "for this project", edit the config. If it's a runtime parameter, use a CLI flag.

## Schema Overview

All keys are optional. The engine will merge this file with internal defaults.

```json
{
  "complianceTarget": "WCAG 2.2 AA",
  "maxRoutes": 10,
  "waitMs": 2000,
  "timeoutMs": 30000,
  "waitUntil": "domcontentloaded",
  "colorScheme": "light",
  "framework": null,
  "ignoreFindings": ["color-contrast"],
  "excludeSelectors": [".ads-container", "#third-party-widget"]
}
```

## Key Definitions

### Targeting & Scope

- **`maxRoutes`** _(number, default: 10)_:
  Cap for auto-discovery. Lower values speed up audits; higher values increase coverage.
- **`routes`** _(array, default: null)_:
  A static list of paths to scan (e.g., `["/", "/about", "/contact"]`). When set, overrides auto-discovery entirely. Equivalent to the `--routes` CLI flag.
- **`excludeSelectors`** _(array, default: [])_:
  A list of CSS selectors to remove from the DOM before scanning. Useful for ignoring third-party widgets or "noisy" areas outside your control.

### Engine Intelligence

- **`complianceTarget`** _(string, default: "WCAG 2.2 AA")_:
  The label used in generated reports. It does not change the rule-set (which is always 2.2 AA).
- **`ignoreFindings`** _(array, default: [])_:
  Rule IDs that should be suppressed. Useful for rules that are known false positives in a specific framework environment.
- **`framework`** _(string, default: null)_:
  Overrides auto-detected framework for guardrails in the remediation guide. Accepted values: `"react"`, `"vue"`, `"angular"`, `"svelte"`, `"astro"`, `"shopify"`, `"wordpress"`, `"drupal"`, `"generic"`. When `null`, the engine infers the framework from the base URL. Equivalent to the `--framework` CLI flag.
- **`onlyRule`** _(string, default: null)_:
  Run ONLY this specific Axe rule ID (e.g., `"color-contrast"`). Useful for targeted audits during active remediation. Equivalent to the `--only-rule` CLI flag.
- **`axeRules`** _(object, default: {})_:
  Fine-grained Axe-Core rule configuration passed directly to the scanner. Use to enable, disable, or configure specific rules beyond the standard WCAG 2.2 set.

### Execution & Emulation

- **`waitMs`** _(number, default: 2000)_:
  Milliseconds to wait after a page signals "load" before the scan starts. Essential for sites with heavy client-side hydration or entrance animations.
- **`timeoutMs`** _(number, default: 30000)_:
  Maximum milliseconds to wait for a page network request before skipping the route.
- **`waitUntil`** _(string, default: "domcontentloaded")_:
  Playwright page load strategy. Accepted values: `"domcontentloaded"` | `"load"` | `"networkidle"`. Use `"networkidle"` for SPAs that render after all network activity completes. Equivalent to the `--wait-until` CLI flag.
- **`colorScheme`** _(string, default: "light")_:
  Accepted values: `"light"` or `"dark"`. Controls the CSS media feature emulation.
- **`headless`** _(boolean, default: true)_:
  Run the browser in headless (background) mode. Set to `false` to see the browser window during scanning — equivalent to the `--headed` CLI flag.
- **`viewports`** _(array, default: system default)_:
  List of `{ width, height, name }` objects. Only the first entry is used for scanning. Example: `[{ "width": 375, "height": 812, "name": "mobile" }]`. Also configurable via `--viewport 375x812` CLI flag.

## Precedence Logic

The engine resolves configuration using the following priority (highest to lowest):

1. **CLI Flags**: (e.g., `--max-routes 50`) — Always wins.
2. **`audit/a11y.config.json`**: Project-specific persistent settings (created on demand).
3. **Internal Defaults**: Hardcoded safe values.

## Example Config for a Complex SPA

```json
{
  "maxRoutes": 30,
  "waitMs": 5000,
  "waitUntil": "networkidle",
  "excludeSelectors": [".dynamic-chart-overlay", "[data-test-ignore]"],
  "ignoreFindings": ["region"]
}
```
