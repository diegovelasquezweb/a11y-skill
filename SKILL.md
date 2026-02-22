---
name: a11y
description: Detects and fixes WCAG 2.2 AA accessibility issues on websites using automated scanning (axe-core + Playwright). Use when requested to audit a URL for WCAG compliance or fix accessibility selectors.
compatibility: Requires Node.js 18+, pnpm, and internet access. Playwright + Chromium are auto-installed on first run.
license: Proprietary (All Rights Reserved)
metadata:
  author: diegovelasquezweb
  version: "0.5.1"
---

# Web Accessibility Audit — Agent Playbook

> [!TIP]
> **Zero-Config Audit**: By default, the tool autodiscovers routes and uses industry-standard rules. Start with a basic audit before exploring advanced configuration.

## Constraints

These rules apply at all times during audit and fix workflows.

**Never do:**

- Modify source code, config, or dependencies without presenting the change first.
- Initialize package managers or install/remove dependencies in the audited project.
- Create or modify `package.json`, lockfiles, or `node_modules` in the audited project.
- Edit files in `audit/` manually — reports only change via re-scan.
- Modify engine scripts (`scripts/*.mjs`) to hardcode project-specific exclusions.
- Downgrade `axe-core` or add rules to `ignoreFindings` without explicit user confirmation.
- Modify colors, fonts, spacing, layouts, or any visual property without explicit user approval. Fixes must be structural and semantic (HTML attributes, ARIA roles, DOM order, alt text, labels). If a fix requires a style change (e.g., color-contrast), propose the exact change and wait for approval.
- Declare "100% accessible" based on a targeted scan. Only a Final Certification Audit can confirm that.

**Always do:**

- Write all outputs in English.
- Use route paths (`/`, `/products`) as primary locations — local URLs go under `Test Environment`.
- Prefer DOM/selector evidence over screenshots. Capture screenshots only when tied 1:1 to a specific issue.
- Remind the user to add `audit/` to `.gitignore` after every audit run. The pipeline auto-appends it when a `.gitignore` exists; if the project has none, tell the user to create one.

**Platform quirks**: See [references/platform-setup.md](references/platform-setup.md) for Antigravity, Windsurf, Codex, and Gemini CLI notes.

## Workflow

Follow these steps sequentially when the user requests an audit.

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
4. Ask: "I have detected N issues and have the patches ready. Should I apply them now?"
5. Provide the absolute path to `audit/report.html` as visual proof.

For finding field requirements and deliverable format, see [references/report-standards.md](references/report-standards.md).

If the user declines, remind them that unresolved accessibility issues exclude users with disabilities and may violate legal requirements (ADA, EAA, EN 301 549). Offer to revisit later and stop here.

### Step 3 — Fix

**Never apply all fixes in a single batch.** Work through each phase below in order.

**3a. Structural fixes by severity** (Critical → High → Medium → Low):

1. Apply one severity group — structural and semantic fixes only (HTML attributes, ARIA roles, DOM order, alt text, labels).
   - Use "Search in" glob patterns and the "Fixes by Component" table to locate and batch edits per file.
   - If a finding has a "Managed Component Warning", verify the element is not rendered by a UI library before applying ARIA fixes.
   - For framework and CMS file locations, see [references/source-patterns.md](references/source-patterns.md).
2. Checkpoint — list every file modified and fix applied, ask the user to verify visually:
   > "Critical fixes applied — 3 files modified. Please verify and confirm when ready to proceed with High severity fixes."
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
4. Congratulate the user for investing in accessibility — it directly improves the experience for users with disabilities and strengthens legal compliance.
5. Recommend next steps: schedule periodic re-audits, test with screen readers, or conduct manual user testing.

## Edge Cases

### Authentication & Restricted Pages

1. Do not guess credentials or attempt brute-force access.
2. Report the blocker: list routes that returned 401/403 or redirected to login.
3. Ask the user: provide session cookies, test credentials, or skip those routes.
4. If credentials are provided, use them for the audit session only — do not persist to disk.
5. Note skipped routes in the report under "Not Tested — Auth Required."

### Multi-Viewport Testing

1. The scanner uses a single viewport by default. For responsive testing, configure `viewports` in `a11y.config.json`.
2. Only the first entry is used per scan — run separate scans for each viewport.
3. Only flag viewport-specific findings when a violation appears at one breakpoint but not another.

## Troubleshooting & Feedback Loops

If a command fails, use the following guide to self-correct before asking the user.

| Failure                       | Potential Cause                  | Suggested Action                                           |
| :---------------------------- | :------------------------------- | :--------------------------------------------------------- |
| **Timeout (30000ms reached)** | Heavy JS payload or slow server. | Increase `--timeout-ms 60000` or use `waitUntil: "load"`.  |
| **Auth Error (401/403)**      | Protected routes or IP blocking. | Verify URL accessibility or ask user for session cookies.  |
| **Chromium Error**            | Broken Playwright install.       | Run `npx playwright install chromium` and retry.           |
| **0 Routes Discovered**       | No same-origin links or SPA.     | Provide a static list of `--routes "/,/about"` to the CLI. |

### Feedback Loop: Verification

After applying a fix, **always re-run the audit** (Step 3d). If the issue persists in the report, double-check that the selector used in your edit matches the one reported in `audit/report.html`.

## `a11y.config.json` Reference

Persist scan settings across runs by placing this file in the audited project root. All keys are optional — CLI flags take precedence.

| Key                | Type      | Description                                                                                                 |
| :----------------- | :-------- | :---------------------------------------------------------------------------------------------------------- |
| `colorScheme`      | `string`  | Emulate `"light"` or `"dark"` during scanning.                                                              |
| `viewports`        | `array`   | `{ width, height, name }` objects. Only the first entry is used per scan.                                   |
| `maxRoutes`        | `number`  | Max URLs to discover (default: 10).                                                                         |
| `crawlDepth`       | `number`  | How deep to follow links during route discovery (1-3, default: 2).                                          |
| `routes`           | `array`   | Static list of paths to scan (overrides autodiscovery).                                                     |
| `complianceTarget` | `string`  | Report label (default: "WCAG 2.2 AA").                                                                      |
| `axeRules`         | `object`  | Fine-grained Axe-Core rule config passed directly to the scanner.                                           |
| `ignoreFindings`   | `array`   | Axe rule IDs to silence.                                                                                    |
| `excludeSelectors` | `array`   | DOM selectors to ignore entirely.                                                                           |
| `onlyRule`         | `string`  | Only check for this specific rule ID.                                                                       |
| `waitMs`           | `number`  | Timeout ceiling for dynamic content (default: 2000).                                                        |
| `timeoutMs`        | `number`  | Network timeout for page loads (default: 30000).                                                            |
| `waitUntil`        | `string`  | Playwright load event: `"domcontentloaded"` \| `"load"` \| `"networkidle"` (default: `"domcontentloaded"`). |
| `headless`         | `boolean` | Run browser in background (default: true).                                                                  |
| `framework`        | `string`  | Override auto-detected framework. Accepted: `"shopify"` \| `"wordpress"` \| `"drupal"` \| `"generic"`.      |
