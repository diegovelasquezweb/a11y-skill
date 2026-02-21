# Configuration Reference

**Navigation**: [Architecture](architecture.md) • [CLI Handbook](cli-handbook.md) • [Configuration](configuration.md) • [Intelligence](engine-intelligence.md) • [Scoring](scoring-system.md) • [Testing](testing.md)

---

The skill uses an optional `a11y.config.json` file in the project root to persist settings across audit runs. This file allows you to define project-specific guardrails and preferences.

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
- **`excludeSelectors`** _(array, default: [])_:
  A list of CSS selectors to remove from the DOM before scanning. Useful for ignoring third-party widgets or "noisy" areas outside your control.

### Engine Intelligence

- **`complianceTarget`** _(string, default: "WCAG 2.2 AA")_:
  The label used in generated reports. It does not change the rule-set (which is always 2.2 AA).
- **`ignoreFindings`** _(array, default: [])_:
  Rule IDs that should be suppressed. Useful for rules that are known false positives in a specific framework environment.
- **`framework`** _(string, default: null)_:
  Overrides auto-detected framework for guardrails in the remediation guide. Accepted values: `"shopify"`, `"wordpress"`, `"drupal"`, `"generic"`. When `null`, the engine infers the framework from the base URL.

### Execution & Emulation

- **`waitMs`** _(number, default: 2000)_:
  Milliseconds to wait after a page signals "load" before the scan starts. Essential for sites with heavy client-side hydration or entrance animations.
- **`timeoutMs`** _(number, default: 30000)_:
  Maximum milliseconds to wait for a page network request before skipping the route.
- **`waitUntil`** _(string, default: "domcontentloaded")_:
  Playwright page load strategy. Accepted values: `"domcontentloaded"` | `"load"` | `"networkidle"`. Use `"networkidle"` for SPAs that render after all network activity completes.
- **`colorScheme`** _(string, default: "light")_:
  Accepted values: `"light"` or `"dark"`. Controls the CSS media feature emulation.

## Precedence Logic

The engine resolves configuration using the following priority (highest to lowest):

1. **CLI Flags**: (e.g., `--max-routes 50`) — Always wins.
2. **`a11y.config.json`**: Project-specific persistent settings.
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
