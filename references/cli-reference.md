# CLI Reference

Run `a11y-audit --help` for the full and up-to-date flag list.

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
