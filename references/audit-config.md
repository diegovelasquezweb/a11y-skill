# `a11y.config.json` Reference

Persist **project-level** audit settings at `audit/a11y.config.json` inside the audited project. The file is created by the agent on demand — it does not exist until the user requests a persistent setting. CLI flags take precedence when both are set.

> **CLI flags** = per-execution (change between runs). **Config file** = per-project (persist forever).
> **Location**: `<project-root>/audit/a11y.config.json`

## Project-Level Keys

Use config for settings that define the project and should persist across all runs.

| Key                | Type     | CLI Equivalent        | Description                                                                                                                                  |
| :----------------- | :------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `framework`        | `string` | `--framework`         | Override auto-detected framework: `react` \| `vue` \| `angular` \| `svelte` \| `astro` \| `shopify` \| `wordpress` \| `drupal` \| `generic`. |
| `ignoreFindings`   | `array`  | `--ignore-findings`   | Axe rule IDs to silence.                                                                                                                     |
| `excludeSelectors` | `array`  | `--exclude-selectors` | DOM selectors to ignore entirely.                                                                                                            |
| `routes`           | `array`  | `--routes`            | Static list of paths to audit (overrides autodiscovery).                                                                                     |
| `axeRules`         | `object` | _(config-only)_       | Fine-grained Axe-Core rule config passed directly to the scanner.                                                                            |
| `complianceTarget` | `string` | `--target`            | Report label (default: "WCAG 2.2 AA").                                                                                                       |
| `onlyRule`         | `string` | `--only-rule`         | Only check for this specific rule ID.                                                                                                        |

## Execution-Level Keys

Prefer CLI flags for these — config serves as fallback defaults.

| Key           | Type      | CLI Equivalent   | Description                                                                                         |
| :------------ | :-------- | :--------------- | :-------------------------------------------------------------------------------------------------- |
| `maxRoutes`   | `number`  | `--max-routes`   | Max URLs to discover (default: 10).                                                                 |
| `crawlDepth`  | `number`  | `--crawl-depth`  | How deep to follow links during discovery (1-3, default: 2).                                        |
| `waitMs`      | `number`  | `--wait-ms`      | Time to wait after page load (default: 2000).                                                       |
| `timeoutMs`   | `number`  | `--timeout-ms`   | Network timeout for page loads (default: 30000).                                                    |
| `waitUntil`   | `string`  | `--wait-until`   | Playwright load event: `domcontentloaded` \| `load` \| `networkidle` (default: `domcontentloaded`). |
| `headless`    | `boolean` | `--headed`       | Run browser in background (default: true).                                                          |
| `colorScheme` | `string`  | `--color-scheme` | Emulate `"light"` or `"dark"` during the audit.                                                     |
| `viewports`   | `array`   | `--viewport WxH` | `{ width, height, name }` objects. Only the first entry is used per audit.                          |
