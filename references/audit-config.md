# `a11y.config.json` Reference

Persist audit settings across runs by placing this file in the audited project root. All keys are optional — CLI flags take precedence.

| Key                | Type      | Description                                                                                                 |
| :----------------- | :-------- | :---------------------------------------------------------------------------------------------------------- |
| `colorScheme`      | `string`  | Emulate `"light"` or `"dark"` during the audit.                                                             |
| `viewports`        | `array`   | `{ width, height, name }` objects. Only the first entry is used per audit.                                  |
| `maxRoutes`        | `number`  | Max URLs to discover (default: 10).                                                                         |
| `crawlDepth`       | `number`  | How deep to follow links during route discovery (1-3, default: 2).                                          |
| `routes`           | `array`   | Static list of paths to audit (overrides autodiscovery).                                                    |
| `complianceTarget` | `string`  | Report label (default: "WCAG 2.2 AA").                                                                      |
| `axeRules`         | `object`  | Fine-grained Axe-Core rule config passed directly to the auditor.                                           |
| `ignoreFindings`   | `array`   | Axe rule IDs to silence.                                                                                    |
| `excludeSelectors` | `array`   | DOM selectors to ignore entirely.                                                                           |
| `onlyRule`         | `string`  | Only check for this specific rule ID.                                                                       |
| `waitMs`           | `number`  | Timeout ceiling for dynamic content (default: 2000).                                                        |
| `timeoutMs`        | `number`  | Network timeout for page loads (default: 30000).                                                            |
| `waitUntil`        | `string`  | Playwright load event: `"domcontentloaded"` \| `"load"` \| `"networkidle"` (default: `"domcontentloaded"`). |
| `headless`         | `boolean` | Run browser in background (default: true).                                                                  |
| `framework`        | `string`  | Override auto-detected framework. Accepted: `"shopify"` \| `"wordpress"` \| `"drupal"` \| `"generic"`.      |
