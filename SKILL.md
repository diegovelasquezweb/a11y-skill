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
- [ ] Step 1: Run audit (`node scripts/run-audit.mjs --base-url <URL>`)
- [ ] Step 2: Present findings and request permission
- [ ] Step 3a: Structural fixes (Critical → High → Medium → Low)
- [ ] Step 3b: Style-dependent fixes (with explicit approval)
- [ ] Step 3c: Manual checks
- [ ] Step 3d: Re-run audit to verify
- [ ] Step 4: Deliver results
```

### Step 1 — Run the audit

If the user did not provide a URL, ask for it before proceeding.

```bash
node scripts/run-audit.mjs --base-url <URL>
```

If the script fails (network error, Chromium crash, timeout), report the error to the user and ask whether to retry or adjust the target URL.

### Step 2 — Present findings and request permission

Read `audit/remediation.md` and:

1. Summarize findings by severity (Critical → High → Medium → Low).
2. Propose the specific fixes from the remediation guide.
3. Group by component or page area, explaining _why_ each fix is needed.
4. Ask for permission before applying fixes.
5. Provide the absolute path to `audit/report.html` as visual proof.

Example:

> "I found 12 accessibility issues (3 Critical, 5 High, 4 Medium). The full visual report is at `/path/to/audit/report.html`. I have patches ready for all of them — should I apply the fixes?"

For finding field requirements and deliverable format, see [references/report-standards.md](references/report-standards.md).

If the user declines:

> "Understood. Keep in mind that these 12 issues currently prevent users who rely on screen readers, keyboard navigation, or assistive technology from using parts of your site. Unresolved violations may also expose legal risk under ADA, EAA, or EN 301 549. I can revisit these fixes anytime — just ask."

### Step 3 — Fix

**Never apply all fixes in a single batch.** Work through each phase below in order.

**3a. Structural fixes by severity** (Critical → High → Medium → Low):

1. Apply one severity group — structural and semantic fixes only (HTML attributes, ARIA roles, DOM order, alt text, labels).
   - Use "Search in" glob patterns and the "Fixes by Component" table to locate and batch edits per file.
   - If a finding has a "Managed Component Warning", verify the element is not rendered by a UI library before applying ARIA fixes.
   - For framework and CMS file locations, see [references/source-patterns.md](references/source-patterns.md).
2. Checkpoint — list every file modified and fix applied, ask the user to verify visually.

   Example:

   > "Critical fixes applied — 3 files modified (`Header.tsx`, `Nav.astro`, `Footer.tsx`). Please verify visually and confirm when ready to proceed with High severity fixes."

3. Repeat for each remaining severity group.

**3b. Style-dependent fixes** (color-contrast, font-size, spacing):

Present the exact proposed changes as a separate batch and wait for explicit approval before applying. Never modify visual properties without the user seeing the change first.

**3c. Manual checks**:

Process the "WCAG 2.2 Static Code Checks" section from `audit/remediation.md`:

1. Search the project source for each pattern. Skip checks that don't apply.
2. Present confirmed violations as a batch and wait for permission before applying.

**3d. Final Certification Audit**:

```bash
node scripts/run-audit.mjs --base-url <URL>
```

If **new issues or regressions** appear (not previously seen), present them and restart from 3a. Issues the user already declined do not trigger a restart.

### Step 4 — Deliver results

1. Summarize: total issues found, issues resolved, files modified, remaining issues (if any).
2. Provide absolute paths to `audit/report.html` and `audit/remediation.md`.
3. If all issues are resolved, confirm the site now passes WCAG 2.2 AA automated checks.
4. Recommend next steps: schedule periodic re-audits, test with screen readers, or conduct manual user testing.

Example:

> "All 12 issues resolved across 7 files. Your site now passes WCAG 2.2 AA automated checks. Great work investing in accessibility — this directly improves the experience for users with disabilities and strengthens your legal compliance. Next steps: schedule periodic re-audits, and consider testing with a screen reader (VoiceOver, NVDA) for manual coverage."

## Edge Cases

### Authentication & Restricted Pages

1. Do not guess credentials or attempt brute-force access.
2. Report the blocker: list routes that returned 401/403 or redirected to login.
3. Ask the user: provide session cookies, test credentials, or skip those routes.
4. If credentials are provided, use them for the audit session only — do not persist to disk.
5. Note skipped routes in the report under "Not Tested — Auth Required."

### Multi-Viewport Testing

1. The auditor uses a single viewport by default. For responsive testing, configure `viewports` in `a11y.config.json`.
2. Only the first entry is used per audit — run separate audits for each viewport.
3. Only flag viewport-specific findings when a violation appears at one breakpoint but not another.

**Troubleshooting**: If a command fails, see [references/troubleshooting.md](references/troubleshooting.md) to self-correct before asking the user.

## CLI vs `a11y.config.json`

**CLI flags** are for per-execution decisions — parameters that change between runs. **`a11y.config.json`** is for per-project decisions — settings that persist across all future runs.

| User instruction                 | Action                                         | Why                    |
| -------------------------------- | ---------------------------------------------- | ---------------------- |
| "Audit this site"                | CLI: `--base-url https://...`                  | Changes every run      |
| "Use mobile viewport"            | CLI: `--viewport 375x812`                      | Varies per audit       |
| "This project is Shopify"        | Config: `"framework": "shopify"`               | Permanent project fact |
| "Always ignore color-contrast"   | Config: `"ignoreFindings": ["color-contrast"]` | Persistent decision    |
| "Exclude the third-party widget" | Config: `"excludeSelectors": [".widget"]`      | Persistent exclusion   |

**Decision rule**: If the user's instruction implies "always" or "for this project", edit `a11y.config.json`. If it implies "this time" or is a runtime parameter, use a CLI flag.

### `a11y.config.json`

Place this file in the audited project root. All keys are optional — CLI flags take precedence when both are set.

**Project-level keys** (edit via config):

- `framework` — override auto-detected framework (`--framework` CLI equivalent)
- `ignoreFindings` — rule IDs to silence (`--ignore-findings` CLI equivalent)
- `excludeSelectors` — DOM selectors to skip (`--exclude-selectors` CLI equivalent)
- `routes` — static list of paths to audit (`--routes` CLI equivalent)
- `axeRules` — fine-grained axe-core rule config (config-only, no CLI equivalent)

**Execution-level keys** (prefer CLI, config as fallback):

- `maxRoutes`, `waitMs`, `timeoutMs`, `crawlDepth`, `headless`, `colorScheme`, `waitUntil`, `viewports`

For the full schema, see [references/audit-config.md](references/audit-config.md).
