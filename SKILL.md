---
name: a11y
description: Detects and fixes WCAG 2.2 AA accessibility violations on websites using automated scanning (axe-core + Playwright). Use when requested to audit a URL for WCAG compliance or fix accessibility issues.
compatibility: Requires Node.js 18+, pnpm, and internet access. Playwright + Chromium are auto-installed on first run.
license: Proprietary (All Rights Reserved)
metadata:
  author: diegovelasquezweb
  version: "0.5.1"
---

# Web Accessibility Audit — Agent Playbook

## Constraints

These rules apply at all times, independent of any workflow step.

- Never install, remove, or initialize packages in the user's project. The skill has its own `node_modules` — only run `pnpm install` inside the skill directory, never in the audited project.
- Never edit files in `audit/` manually — reports only change via re-audit.
- Never modify engine scripts (`scripts/*.mjs`) to hardcode project-specific exclusions.
- Never declare "100% accessible" based on a targeted audit. Only a Final Certification Audit can confirm that.
- Always ensure `audit/` is in the user's project `.gitignore` before running an audit. The pipeline auto-appends it when a `.gitignore` exists in the project root; if the project has none, create one first.

**Platform quirks**: See [references/platform-setup.md](references/platform-setup.md) for Antigravity, Windsurf, Codex, and Gemini CLI notes.

## Workflow

Follow these steps sequentially when the user requests an audit. Copy this checklist and track your progress:

```
Audit Progress:
- [ ] Step 1: Run audit + ask about visual reports
- [ ] Step 2: Present findings and request permission
- [ ] Step 3a: Structural fixes (Critical → High → Medium → Low)
- [ ] Step 3b: Style-dependent fixes (with explicit approval)
- [ ] Step 3c: Manual checks
- [ ] Step 3d: Re-run audit to verify
- [ ] Step 4: Deliver results + offer final reports
```

### Step 1 — Run the audit

If the user did not provide a URL, ask for it before proceeding. The `--base-url` flag requires a full URL with protocol. Normalize the user's input before running:

- `"localhost:3000"` → `http://localhost:3000`
- `"mysite.com"` → `https://mysite.com`
- `"https://example.com"` → use as-is

Before running, inform the user about route scope:

> "If your site has a **sitemap.xml**, I'll scan every page listed in it. If there's no sitemap, I'll crawl links starting from the homepage — up to **10 pages by default**. You can adjust this:
> - **More pages (no sitemap)**: `--max-routes 30` (or set `maxRoutes` in the config for all future runs)
> - **Specific pages only**: `--routes /,/about,/contact`"

If the user adjusts scope, add the corresponding flags. Otherwise, proceed with defaults.

Run the audit with `--skip-reports` by default (faster — only generates the remediation guide the agent needs):

```bash
node scripts/run-audit.mjs --base-url <URL> --skip-reports
```

After the scan completes, ask whether the user wants visual reports:

> "Audit complete — I have the remediation roadmap ready. Would you also like me to generate visual reports?
> - **HTML Dashboard** — interactive web report with severity cards, compliance score, and evidence screenshots.
> - **PDF Executive Summary** — formal A4 document for clients or stakeholders.
> - **Both**
> - **Neither** — just proceed with fixes."

If the user requests reports, generate only the selected ones:

```bash
# HTML only
node scripts/build-report-html.mjs --output audit/report.html --base-url <URL>

# PDF only (requires HTML first)
node scripts/build-report-html.mjs --output audit/report.html --base-url <URL>
node scripts/build-report-pdf.mjs audit/report.html audit/report.pdf

# Both
node scripts/build-report-html.mjs --output audit/report.html --base-url <URL>
node scripts/build-report-pdf.mjs audit/report.html audit/report.pdf
```

After generation, open the requested reports for the user:

```bash
open audit/report.html   # HTML dashboard
open audit/report.pdf    # PDF summary
```

If the script fails (network error, Chromium crash, timeout), report the error to the user and ask whether to retry or adjust the target URL.

### Step 2 — Present findings and request permission

Read `audit/remediation.md` and:

1. Summarize findings by severity (Critical → High → Medium → Low).
2. Propose the specific fixes from the remediation guide.
3. Group by component or page area, explaining _why_ each fix is needed.
4. If visual reports were generated in Step 1, provide their absolute paths as proof.
5. Ask the user how to proceed:

> "I found 12 accessibility issues (3 Critical, 5 High, 4 Medium). How would you like to proceed?
> - **Severity by severity** (recommended) — I'll fix one severity group at a time with a checkpoint after each so you can verify. Safest approach.
> - **Fix all structural** — I'll apply all structural fixes (ARIA, alt text, labels, DOM order) at once. Style changes (colors, font sizes) will still require your approval separately.
> - **Only critical** — fix only Critical severity issues for now."

The default behavior (if the user just says "fix" or "go ahead") is **severity by severity**.

For finding field requirements and deliverable format, see [references/report-standards.md](references/report-standards.md).

If the user declines:

> "Understood. Keep in mind that these 12 issues currently prevent users who rely on screen readers, keyboard navigation, or assistive technology from using parts of your site. Unresolved violations may also expose legal risk under ADA, EAA, or EN 301 549. I can revisit these fixes anytime — just ask."

### Step 3 — Fix

Work through each phase below in order.

> **Style-dependent protection**: Style fixes (color-contrast, font-size, spacing) **always require explicit approval with the exact changes shown** — regardless of what the user chose in Step 2. This prevents unintended visual regressions.

**3a. Structural fixes by severity** (Critical → High → Medium → Low):

These are safe to apply — they don't affect visual appearance (HTML attributes, ARIA roles, DOM order, alt text, labels, lang attributes).

If the user chose **severity by severity** (default):

1. Apply one severity group at a time.
   - Use "Search in" glob patterns and the "Fixes by Component" table to locate and batch edits per file.
   - If a finding has a "Managed Component Warning", verify the element is not rendered by a UI library before applying ARIA fixes.
   - For framework and CMS file locations, see [references/source-patterns.md](references/source-patterns.md).
2. Checkpoint — list every file modified and fix applied, ask the user to verify visually.

   > "Critical fixes applied — 3 files modified (`Header.tsx`, `Nav.astro`, `Footer.tsx`). Please verify visually and confirm when ready to proceed with High severity fixes."

3. Repeat for each remaining severity group.

If the user chose **fix all structural**: apply all severity groups in a single pass, then report all modified files at once.

**3b. Style-dependent fixes** (color-contrast, font-size, spacing):

These can change the site's appearance. **Always show the exact proposed changes and wait for explicit approval**, even if the user previously said "fix all". Never modify visual properties without the user seeing the change first.

Example:

> "I also found 3 style-dependent issues that affect your site's visual design. These require your review:
> - `color-contrast` on `.hero-title`: change `color` from `#999` → `#595959` (contrast ratio 3.2:1 → 7:1)
> - `color-contrast` on `.nav-link`: change `color` from `#aaa` → `#767676`
> - `font-size` on `.fine-print`: change from `10px` → `12px`
>
> Should I apply these? You may want to review them against your design system first."

**3c. Manual checks**:

Process the "WCAG 2.2 Static Code Checks" section from `audit/remediation.md`:

1. Search the project source for each pattern. Skip checks that don't apply.
2. Present confirmed violations as a batch and wait for permission before applying.

**3d. Final Certification Audit**:

```bash
node scripts/run-audit.mjs --base-url <URL> --skip-reports
```

If **new issues or regressions** appear (not previously seen), present them and restart from 3a. Issues the user already declined do not trigger a restart.

### Step 4 — Deliver results

1. Summarize: total issues found, issues resolved, files modified, remaining issues (if any).
2. If all issues are resolved, confirm the site now passes WCAG 2.2 AA automated checks.
3. Present manual verification checks the user must perform. These cannot be automated — list only the ones relevant to the project:

> "The automated audit is complete. These checks require human verification — I can't test them for you:
> - **Keyboard navigation**: Can you Tab through all interactive elements? Is the focus ring visible?
> - **Focus order**: Does the tab sequence follow a logical reading order?
> - **Screen reader**: Do page announcements make sense? (Test with VoiceOver on macOS or NVDA on Windows)
> - **Motion & animation**: Can users who are sensitive to motion use the site comfortably? (Check `prefers-reduced-motion`)
> - **Zoom**: Does the page remain usable at 200% browser zoom?
>
> If you generated the HTML report, it includes an interactive checklist to track these."

4. Offer to generate (or regenerate) visual reports reflecting the final state:

> "Would you like me to generate final reports?
> - **HTML Dashboard** — interactive web report with the updated compliance score.
> - **PDF Executive Summary** — formal document to share with clients or stakeholders.
> - **Both**
> - **No thanks**"

5. If the user requests reports, generate and open them (same commands as Step 1).
6. Recommend next steps: schedule periodic re-audits, test with screen readers, or conduct manual user testing.

Example (complete):

> "All 12 issues resolved across 7 files. Your site now passes WCAG 2.2 AA automated checks. Please verify the 5 manual checks above before considering the audit complete. The final HTML report is open in your browser — it includes an interactive checklist for tracking them. Great work investing in accessibility — this directly improves the experience for users with disabilities and strengthens your legal compliance."

## Edge Cases

### Authentication & Restricted Pages

1. Do not guess credentials or attempt brute-force access.
2. Report the blocker: list routes that returned 401/403 or redirected to login.
3. Ask the user: provide session cookies, test credentials, or skip those routes.
4. If credentials are provided, use them for the audit session only — do not persist to disk.
5. Note skipped routes in the report under "Not Tested — Auth Required."

### Multi-Viewport Testing

1. The auditor uses a single viewport by default. For responsive testing, configure `viewports` in `audit/a11y.config.json`.
2. Only the first entry is used per audit — run separate audits for each viewport.
3. Only flag viewport-specific findings when a violation appears at one breakpoint but not another.

**Troubleshooting**: If a command fails, see [references/troubleshooting.md](references/troubleshooting.md) to self-correct before asking the user.

## CLI vs `a11y.config.json`

**CLI flags** are for per-execution decisions — parameters that change between runs. **`a11y.config.json`** is for per-project decisions — settings that persist across all future runs.

**Config location**: `<project-root>/audit/a11y.config.json`. This file does not exist by default — create it only when the user requests a persistent setting.

| User instruction                 | Action                                         | Why                    |
| -------------------------------- | ---------------------------------------------- | ---------------------- |
| "Audit this site"                | CLI: `--base-url https://...`                  | Changes every run      |
| "Use mobile viewport"            | CLI: `--viewport 375x812`                      | Varies per audit       |
| "This project is Shopify"        | Config: `"framework": "shopify"`               | Permanent project fact |
| "Always ignore color-contrast"   | Config: `"ignoreFindings": ["color-contrast"]` | Persistent decision    |
| "Exclude the third-party widget" | Config: `"excludeSelectors": [".widget"]`      | Persistent exclusion   |

**Decision rule**: If the user's instruction implies "always" or "for this project", edit `audit/a11y.config.json`. If it implies "this time" or is a runtime parameter, use a CLI flag.

### Managing the config

When creating or updating the config:

1. Read the existing file at `audit/a11y.config.json` (it may not exist yet).
2. Merge the new key into the existing object (do not overwrite unrelated keys).
3. Write the updated JSON back to `audit/a11y.config.json`.

Example — user says "Always ignore color-contrast":

```json
// audit/a11y.config.json
{
  "ignoreFindings": ["color-contrast"]
}
```

For the full schema of all keys and their CLI equivalents, see [references/audit-config.md](references/audit-config.md).
