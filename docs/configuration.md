# Configuration Reference

**Navigation**: [Home](../README.md) • [Architecture](architecture.md) • [CLI Handbook](cli-handbook.md) • [Configuration](configuration.md) • [Data Validation](data-validation.md) • [Intelligence](engine-intelligence.md) • [Scoring](scoring-system.md) • [Scripts](scripts-catalog.md) • [Testing](testing.md)

---

## Overview

All configuration is passed via **CLI flags**. There is no config file — every parameter is set per-execution. Run `node scripts/run-audit.mjs --help` for the full list.

## Flag Reference

### Targeting & Scope

| Flag | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--base-url <url>` | string | (required) | The target website to audit. |
| `--project-dir <path>` | string | — | Path to the audited project (for framework/library auto-detection from `package.json`). |
| `--max-routes <num>` | number | `10` | Max routes to discover via BFS crawl (only applies when no sitemap is found). |
| `--crawl-depth <num>` | number | `2` | How deep to follow links during discovery (1-3). |
| `--routes <csv>` | string | — | Static list of paths to scan (overrides auto-discovery). |

### Audit Intelligence

| Flag | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--target <text>` | string | `WCAG 2.2 AA` | Compliance target label in reports. |
| `--only-rule <id>` | string | — | Only check for this specific axe rule ID. |
| `--ignore-findings <csv>` | string | — | Axe rule IDs to suppress from results. |
| `--exclude-selectors <csv>` | string | — | CSS selectors to exclude from the DOM scan. |
| `--framework <val>` | string | auto | Override auto-detected framework (`react`\|`vue`\|`angular`\|`svelte`\|`astro`\|`shopify`\|`wordpress`\|`drupal`). |

### Execution & Emulation

| Flag | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--color-scheme <val>` | string | `light` | Emulate `prefers-color-scheme`: `light` or `dark`. |
| `--viewport <WxH>` | string | `1280x800` | Viewport dimensions as WIDTHxHEIGHT (e.g., `375x812`). |
| `--headed` | boolean | `false` | Run browser in visible mode (useful for debugging). |
| `--wait-ms <num>` | number | `2000` | Time to wait after page load before scanning. |
| `--timeout-ms <num>` | number | `30000` | Network timeout per page load. |
| `--wait-until <val>` | string | `domcontentloaded` | Playwright load strategy: `domcontentloaded`\|`load`\|`networkidle`. |

### Reports

| Flag | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--with-reports` | boolean | `false` | Generate HTML and PDF reports (requires `--output`). |
| `--output <path>` | string | — | Location for the HTML report (required with `--with-reports`). |

## Precedence

CLI flags are the only configuration source. Internal defaults are used as fallbacks when a flag is not provided.
