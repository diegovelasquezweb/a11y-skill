# CLI Reference

Run `node scripts/audit.mjs --help` for the full and up-to-date list. Common flags:

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
| `--wait-until <val>` | Page load strategy: `domcontentloaded`, `load`, `networkidle` | `domcontentloaded` |
| `--wait-ms <num>` | Extra wait time after page load (ms) | `2000` |
| `--timeout-ms <num>` | Network timeout (ms) — increase for slow servers | `30000` |

## Default Values Reference

Why these defaults were chosen — do not override without a concrete user reason:

| Flag | Default | Rationale |
| :--- | :--- | :--- |
| `--max-routes` | `10` | Covers all major page types (home, listing, detail, form, about) while keeping runtime under 2 min on most sites |
| `--crawl-depth` | `2` | Two hops from the homepage reaches ~90% of a site's unique templates without exponential page explosion |
| `--viewport` | `1280x800` | Matches the most common desktop resolution for axe-core element visibility checks |
| `--color-scheme` | `light` | Light mode is the default rendering context for most sites; run a separate `--color-scheme dark` audit when a dark mode is implemented |
| Concurrency | 3 tabs | Three parallel Playwright tabs balance speed against Chromium memory pressure; higher values cause instability on constrained CI runners |

## Multi-Viewport Testing

The auditor uses a single viewport per run. For responsive testing:

1. Use `--viewport 375x812` (WIDTHxHEIGHT) to set a specific breakpoint.
2. Run separate audits for each viewport.
3. Only flag viewport-specific findings when the same finding appears at one breakpoint but not another.
