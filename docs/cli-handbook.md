# CLI Handbook

**Navigation**: [Home](../README.md) • [Architecture](architecture.md) • [CLI Handbook](cli-handbook.md) • [Configuration](configuration.md) • [Intelligence](engine-intelligence.md) • [Scoring](scoring-system.md) • [Testing](testing.md)

---

## Table of Contents

- [Basic Usage](#basic-usage)
- [Command Categories](#command-categories)
- [Advanced Patterns](#advanced-patterns)

The a11y skill provides a decoupled **Audit Engine** that can be run independently of AI agents for local validation or CI/CD integration.

## Basic Usage

The primary command is `pnpm a11y`. It is an alias for `node scripts/run-audit.mjs`.

```bash
pnpm a11y --base-url https://example.com
```

## Command Categories

To improve clarity, flags are grouped into logical categories.

### 1. Targeting & Scope

Flags used to define _where_ the engine should scan.

| Flag           | Argument | Default    | Description                                                  |
| :------------- | :------- | :--------- | :----------------------------------------------------------- |
| `--base-url`   | `<url>`  | (Required) | The starting point of the audit.                             |
| `--max-routes` | `<num>`  | `10`       | Maximum unique same-origin paths to discover and scan.       |
| `--routes`     | `<csv>`  | `null`     | A list of specific paths to scan (overrides auto-discovery). |

### 2. Audit Intelligence

Flags used to customize _how_ the engine interprets rules.

| Flag                  | Argument | Default       | Description                                                  |
| :-------------------- | :------- | :------------ | :----------------------------------------------------------- |
| `--target`            | `<text>` | `WCAG 2.2 AA` | Label for the compliance target in reports.                  |
| `--only-rule`         | `<id>`   | `null`        | Run ONLY this specific Axe rule ID (e.g., `color-contrast`). |
| `--ignore-findings`   | `<csv>`  | `null`        | List of rule IDs to exclude from the final report.           |
| `--exclude-selectors` | `<csv>`  | `null`        | CSS selectors to ignore during the DOM scan.                 |

### 3. Execution & Emulation

Flags used to control the _browser_ and _output_.

| Flag             | Argument                              | Default             | Description                                                                     |
| :--------------- | :------------------------------------ | :------------------ | :------------------------------------------------------------------------------ |
| `--output`       | `<path>`                              | `audit/report.html` | Location for the final HTML report.                                             |
| `--color-scheme` | `light\|dark`                         | `light`             | Emulates browser `prefers-color-scheme`.                                        |
| `--headed`       | (No arg)                              | `false`             | Runs the browser in visible mode (useful for debugging).                        |
| `--wait-ms`      | `<num>`                               | `2000`              | Max wait for `networkidle` after page load (acts as timeout, not fixed delay).  |
| `--timeout-ms`   | `<num>`                               | `30000`             | Global network timeout for each page load.                                      |
| `--wait-until`   | `domcontentloaded\|load\|networkidle` | `domcontentloaded`  | Playwright page load strategy. Use `networkidle` for SPAs with async rendering. |

## Advanced Patterns

### Running a Focused Audit

If you are only working on a specific issue, like color contrast, you can save time by isolating it:

```bash
pnpm a11y --base-url http://localhost:3000 --only-rule color-contrast --max-routes 1
```

### Testing Dark Mode Accessibility

Ensure your site meets contrast requirements in both themes:

```bash
pnpm a11y --base-url http://localhost:3000 --color-scheme dark --output audit/report-dark.html
```

### Verifying a Single Fix

After applying a fix, verify it passed without re-running the full audit:

```bash
pnpm a11y --base-url http://localhost:3000 --routes /products --only-rule color-contrast --max-routes 1
```

This re-scans only the affected route for the specific rule — takes seconds instead of minutes. The `audit/remediation.md` includes a **Quick verify** command for each finding.

### Scripting with the CLI

The engine returns standard exit codes:

- **`0`**: Audit completed successfully (regardless of findings).
- **`1`**: Runtime error (invalid URL, network failure, etc.).
