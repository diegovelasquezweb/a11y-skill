---
name: a11y
description: Detect and autonomously fix WCAG 2.2 AA accessibility issues. Build for resolution, not just reporting. The primary goal is generating and applying surgical code patches to resolve compliance vulnerabilities.
compatibility: Requires Node.js 18+, pnpm, and internet access to the target URL. Playwright + Chromium are installed automatically on first run.
license: Proprietary (All Rights Reserved)
metadata:
  author: diegovelasquezweb
  version: "0.4.0"
---

# Web Accessibility Audit — Agent Playbook

Resolution is the core objective. Reports are evidence, not the goal.

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
- Use `--skip-reports` for all intermediate verifications (Surgery Mode).
- Generate reports only at Discovery (start) and Certification (end).
- Prefer DOM/selector evidence over screenshots. Capture screenshots only when tied 1:1 to a specific issue.
- Remind the user to add `audit/` to `.gitignore` after every audit run. The pipeline auto-appends it when a `.gitignore` exists; if the project has none, tell the user to create one.

**Platform quirks**: See [references/platform-setup.md](references/platform-setup.md) for Antigravity, Windsurf, Codex, and Gemini CLI notes.

## Audit Workflow

Follow these steps sequentially when the user requests an audit.

### Step 1 — Get the target URL

- Use the URL provided by the user.
- If none is provided, ask immediately before doing anything else.
- Only if the user explicitly asks you to detect it: search project files for URL traces, then fall back to common dev ports (`3000`, `3001`, `4173`, `5173`, `8080`).
- If no reachable target exists, report the blocker and stop.

### Step 2 — Run the pipeline

```bash
node scripts/run-audit.mjs --base-url <URL>
```

This orchestrator runs all pipeline steps in order: preflight → scan → analyze → reports. If any step fails, it stops and reports the blocker.

- Auto-discovers same-origin routes if the user did not provide `--routes`.
- If a dependency or browser is missing, report `pnpm install` as the fix and stop.

### Step 3 — Present findings (Fix-First)

Do not just link the report. Read `audit/remediation.md` and:

1. Summarize findings by severity (Critical → High → Medium → Low).
2. Propose the specific fixes from the remediation guide immediately in the chat.
3. Use the exact selectors and "Search Hints" from the analyzer to locate code.
4. Group fixes by component or page area.
5. Briefly explain _why_ each fix is needed.

### Step 4 — Request permission

> "I have detected N issues and have the patches ready. Should I apply them now?"

### Step 5 — Provide report evidence

Only after proposing fixes, provide the absolute path to `audit/report.html` as visual proof.

### Reference material

- **Baseline checks** (8 domains to audit per route): [references/baseline-checks.md](references/baseline-checks.md)
- **Report & evidence standards** (finding fields, deliverable order, file output): [references/report-standards.md](references/report-standards.md)

## Fix Workflow

When the user grants permission, follow this protocol. **Never apply all fixes in a single batch.**

### Step 1 — Group by severity

Organize all fixes before touching any file: Critical → High → Medium → Low.

### Step 2 — Locate source files

- Use "Search in" glob patterns from each finding.
- Use the "Fixes by Component" table (if present) to batch edits per file.
- If a finding has a "Managed Component Warning", verify the element is not rendered by a UI library (Radix, Headless UI, etc.) before applying ARIA fixes.
- **Tailwind**: When fixing color-contrast or visual issues, check `package.json` for the `tailwindcss` version first. v3 uses `tailwind.config.*`; v4 uses `@theme { … }` blocks in CSS files. Never report a missing config as an error in v4 projects.

### Step 3 — Apply one severity group

Starting with Critical. One group at a time — never mix groups.

### Step 4 — Checkpoint

Stop, list every file modified and fix applied, and ask the user to verify:

> "Critical fixes applied — 3 files modified. Please verify and confirm when ready to proceed with High severity fixes."

### Step 5 — Verify

Run a targeted re-scan:

```bash
pnpm a11y --base-url <URL> --routes <route> --only-rule <rule-id> --max-routes 1 --skip-reports
```

- **State Loss**: Targeted scans overwrite `a11y-findings.json` with a filtered list.
- Do NOT tell the user "all errors are gone" based on a targeted scan — only confirm the specific rule(s) you just fixed.
- Maintain an internal tracker of which issues from the original audit are still pending.

### Step 6 — Wait for confirmation

Never auto-advance to the next severity group. If any fix fails, stop immediately and ask the user how to proceed.

### Step 7 — Repeat Steps 3-6

For each remaining severity group (High → Medium → Low).

### Step 8 — Final Certification Audit

Once all automated fixes are applied and verified:

```bash
node scripts/run-audit.mjs --base-url <URL>
```

This generates the final clean report (0 issues) for delivery.

## Manual Checks

After all automated fixes are applied, process the "WCAG 2.2 Static Code Checks" section from `audit/remediation.md`.

1. Read each manual check — it includes a pattern, verification steps, and before/after code.
2. Search the project source code for the pattern. Determine if the project is affected.
3. Skip checks that don't apply (e.g., no `<video>` elements → skip media caption checks).
4. Group all confirmed violations and present them as a batch: _"I found N additional issues from manual WCAG checks. Here are the proposed fixes."_
5. Wait for user permission before applying. Follow the same checkpoint protocol as the Fix Workflow.

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

## `a11y.config.json` Reference

Persist scan settings across runs by placing this file in the audited project root. All keys are optional — CLI flags take precedence.

| Key                | Type      | Description                                                                                                     |
| :----------------- | :-------- | :-------------------------------------------------------------------------------------------------------------- |
| `colorScheme`      | `string`  | Emulate `"light"` or `"dark"` during scanning.                                                                  |
| `viewports`        | `array`   | `{ width, height, name }` objects. Only the first entry is used per scan.                                       |
| `maxRoutes`        | `number`  | Max URLs to discover (default: 10).                                                                             |
| `crawlDepth`       | `number`  | How deep to follow links during route discovery (1-3, default: 2).                                              |
| `routes`           | `array`   | Static list of paths to scan (overrides autodiscovery).                                                         |
| `complianceTarget` | `string`  | Report label (default: "WCAG 2.2 AA").                                                                          |
| `axeRules`         | `object`  | Fine-grained Axe-Core rule config passed directly to the scanner.                                               |
| `ignoreFindings`   | `array`   | Axe rule IDs to silence.                                                                                        |
| `excludeSelectors` | `array`   | DOM selectors to ignore entirely.                                                                               |
| `onlyRule`         | `string`  | Only check for this specific rule ID.                                                                           |
| `waitMs`           | `number`  | Timeout ceiling for dynamic content (default: 2000).                                                            |
| `timeoutMs`        | `number`  | Network timeout for page loads (default: 30000).                                                                |
| `waitUntil`        | `string`  | Playwright load event: `"domcontentloaded"` \| `"load"` \| `"networkidle"` (default: `"domcontentloaded"`).     |
| `headless`         | `boolean` | Run browser in background (default: true).                                                                      |
| `framework`        | `string`  | Override auto-detected framework. Accepted: `"shopify"` \| `"wordpress"` \| `"drupal"` \| `"generic"`.         |
