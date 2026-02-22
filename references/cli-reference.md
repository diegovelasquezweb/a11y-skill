# CLI Reference

Run `node scripts/run-audit.mjs --help` for the full and up-to-date list. Common flags:

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--base-url <url>` | Target website (required) | — |
| `--project-dir <path>` | User's project path (for auto-detection) | — |
| `--max-routes <num>` | Max routes to crawl | `10` |
| `--crawl-depth <num>` | Link crawl depth (1-3) | `2` |
| `--routes <csv>` | Specific paths to scan | — |
| `--framework <val>` | Override detected framework | auto |
| `--ignore-findings <csv>` | Axe rule IDs to silence | — |
| `--exclude-selectors <csv>` | CSS selectors to skip | — |
| `--viewport <WxH>` | Viewport dimensions | `1280x800` |
| `--color-scheme <val>` | `light` or `dark` | `light` |
| `--headed` | Show browser window | headless |
| `--only-rule <id>` | Check one specific rule | — |

## Multi-Viewport Testing

The auditor uses a single viewport per run. For responsive testing:

1. Use `--viewport 375x812` (WIDTHxHEIGHT) to set a specific breakpoint.
2. Run separate audits for each viewport.
3. Only flag viewport-specific findings when a violation appears at one breakpoint but not another.
