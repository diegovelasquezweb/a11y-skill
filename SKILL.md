---
name: a11y
description: Detect and autonomously fix WCAG 2.2 AA accessibility issues. Use when the user says "audit [url]", "fix accessibility", "make my site accessible", or asks to scan for compliance. The primary goal is finding vulnerabilities for the AI to patch.
compatibility: Requires Node.js 18+, pnpm, and internet access to the target URL. Playwright + Chromium are installed automatically on first run.
license: Proprietary (All Rights Reserved)
metadata:
  author: diegovelasquezweb
  version: "0.4.0"
---

# Web Accessibility Audit

Follow this workflow to audit and report website accessibility issues with consistent quality.

## Operating Guardrails

1. **Environment Awareness (Gemini CLI)**: This skill relies on autonomous activation. If `ReadFile` fails with "Path not in workspace" when reading resources from the skills directory (`~/.gemini/skills/a11y/`), immediately fall back to a shell command — e.g., `cat ~/.gemini/skills/a11y/SKILL.md` — without asking the user. Do not attempt `ReadFile` again. Use `/skills reload` if the skill name is not recognized at activation time.
2. **Setup Readiness**:
   - **Antigravity**: On first activation in any project, ensure `.agent/workflows/a11y.md` exists to enable the `/a11y` command.
   - **Windsurf**: On first activation in any project, ensure `.windsurf/workflows/a11y.md` exists to enable the `/a11y` command.
   - **General**: Do not execute the actual audit pipeline until explicitly requested by the user.

3. **Tailwind Version Awareness**: When inspecting project color tokens or design variables for contrast analysis, check `package.json` for the `tailwindcss` version first, then locate tokens accordingly:
   - **v3**: tokens are in `tailwind.config.ts` or `tailwind.config.js`.
   - **v4**: primary source is `@theme { … }` blocks in CSS files (e.g. `app/globals.css`, `styles/globals.css`). A `tailwind.config.js` may also exist if the project uses the `@config` directive — check for both. Never report a missing config file as an error in v4 projects.

4. **Audit behavior**:

- **Proactive Fixes**: While you must ask for permission before executing a command that modifies source code, you are encouraged to propose specific, surgical code fixes in the chat immediately after an audit.
- Do not modify source code, config, content, or dependencies silently. Always present the proposed change first.
- Never initialize package managers in the audited project (`npm init`, `pnpm init`, `yarn init`).
- Never install or remove dependencies in the audited project (`npm/pnpm/yarn add|install|remove`).
- Never create or modify `package.json`, lockfiles, or `node_modules` in the audited project during audit runs.
- Never install dependencies in any directory during audits (including internal storage such as `audit/internal/`).

5. **Navigation scope**:

- Audit URLs/routes provided by the user.
- If the user does not provide routes, auto-discover same-origin routes from the current app (navigation links, key flow links, and core pages).
- Do not open unrelated external sites (for example search engines) during the audit flow.

6. **Environment discipline**:

- Use the base URL provided by the user when available.
- If no base URL is provided in the user's message, ask for it immediately before doing anything else.
- Only if the user explicitly says they don't know the URL or asks you to detect it: search project files for URL traces (for example `localhost`, `127.0.0.1`, preview URLs, environment variables, scripts, README notes).
- Only if no reliable URL trace is found in files: auto-detect a reachable local app URL using common dev ports (`3000`, `3001`, `4173`, `5173`, `8080`).
- Do not apply runtime URL fallbacks or alternate hosts automatically.
- If no reachable target exists after user-requested detection, report the blocker and request a URL.

7. **Reporting language**:
   - Write all outputs in English.

8. **Shareable reporting**:

- In final findings, use route paths as the primary location (`/`, `/products`, `/account/login`).
- If local URLs are used during testing, place them under a separate `Test Environment` note, not as the canonical issue location.

9. **Scope questions**:

- Do not ask scope questionnaires by default.
- Start auditing immediately with discovered scope.
- Ask the user only when blocked (no reachable app URL, auth needed, or hard access restrictions).

10. **Evidence quality**:

- Do not capture generic full-page screenshots by default.
- Use technical evidence first (DOM snippet, selector-level check, tool output).
- Capture screenshots only when they are directly tied 1:1 to a specific issue ID.

## 1) Run Baseline Checks

Execute all 8 baseline domains for every audited route. Do not finalize an audit with partial checks. Convert every confirmed violation into a finding.

Domains: structure & semantics, ARIA usage, keyboard & focus, perceivable content, media & gestures, forms & authentication, common component patterns, third-party integrations.

See [references/baseline-checks.md](references/baseline-checks.md) for the full per-domain checklist.

## 2) Test and Validate

Run automated tests using the bundled robust scanner (Playwright + Axe-Core).

- The skill uses `scripts/run-scanner.mjs` which launches a headless browser.
- It scans the DOM using Axe-Core for WCAG 2.2 A/AA compliance.
- It supports SPAs (Single Page Applications) and complex JS-driven UIs.
- Dependencies are isolated in the skill directory; **NO** installation occurs in the target project.
- Auto-discover same-origin routes if not provided.
- Capture issues as candidate findings, then finalize them.

## 3) Severity Triage & Debt Tracking

Classify each finding using this scale:

- `Critical`: User cannot complete a core task — treat as a release blocker.
- `High`: Core task is significantly impaired.
- `Medium`: Noticeable barrier with workaround.
- `Low`: Minor gap or best-practice issue.

Apply consistent triage behavior:

- Critical/High: treat as release blockers or near-blockers.
- Medium/Low: schedule, track, and retest during related work.

## 4) Reporting Requirements

- Treat reported issues as candidate findings, then finalize them.
- For each issue, include the required issue fields in the HTML report.

Each finding must include:

1. WCAG criterion and level.
2. Affected page/component.
3. Reproduction steps.
4. Actual vs expected behavior.
5. Impacted users.
6. Severity.
7. Recommended fix.
8. QA retest notes.

## 5) Required Deliverables

Always return results in this exact order:

1. Executive summary (including `Test Environment` base URL used during the audit).
2. Findings table (ID, severity, WCAG criterion, impacted area, short impact).
3. Issue details (one section per issue using the issue template).

## 6) Minimum Evidence Standards

Each reported issue must include:

1. Route path (primary canonical location).
2. Exact selector or component identifier when available.
3. Reproducible steps.
4. WCAG criterion and level.
5. Concrete proof (DOM snippet, log, or tool output snippet).
   - Screenshot is optional.
   - Prefer selector-level DOM/tool evidence; include screenshot only if it clearly demonstrates the exact issue.

## 7) Use Standard Toolchain + Bundled Scripts

Use standard tools and bundled scripts for repeatable output:

1. `scripts/check-toolchain.mjs` for preflight diagnostics of local dependencies.
2. `scripts/run-scanner.mjs` for robust browser-side scanning with Axe-Core.
3. `scripts/run-analyzer.mjs` for stable finding generation from scan data.
4. `scripts/build-report-html.mjs` for the interactive HTML dashboard.
5. `scripts/build-report-md.mjs` for the AI-optimized remediation guide.
6. `scripts/build-report-pdf.mjs` for the formal PDF export.

Use this pipeline order:

1. `check-toolchain.mjs`
2. `run-scanner.mjs`
3. `run-analyzer.mjs`
4. `build-report-html.mjs`
5. `build-report-md.mjs`
6. `build-report-pdf.mjs`

Execution discipline for the agent:

1. Run the full pipeline directly; do not ask the user to execute script commands manually.
2. Run preflight (`check-toolchain.mjs`) first and stop when required tools are unavailable.
3. Do not require or assume local `node_modules` installation as part of the audit flow.
4. Do not install dependencies to satisfy pipeline runtime requirements.
5. If any pipeline step depends on unavailable local modules, report a blocker and stop (do not mark checks as `PASS`).
6. Run all pipeline steps from the same project working directory.
7. If `audit/internal/a11y-findings.json` is missing, re-run route-check and findings steps in the same directory, then continue.
8. If a step fails, stop and report the exact blocker.
9. Do not continue with partial runtime tool execution for required checks.
10. Keep intermediate pipeline artifacts encapsulated; write intermediates to `audit/internal/`.
11. Do not run automatic cleanup commands that delete `audit/internal/` files during the audit flow.
12. When a local dependency or browser is missing, report the `pnpm install` fix and stop.

## 8) File Output Behavior (Mandatory)

1. Write three final artifacts in `audit/`:

- **Audit Report (HTML)**: `audit/report.html`
- **Remediation Guide (MD)**: `audit/remediation.md`
- **Executive Summary (PDF)**: `audit/report.pdf`
- Do not generate dated versions of the report (e.g., `audit/index-2026-01-01.html`).
- Do not generate per-issue markdown files.
- `audit/report.html` must include the completed findings with evidence and linked finding IDs.
- Use the severity scale defined in Section 3 (Critical, High, Medium, Low).
- Do not keep any JSON files in `audit/`.
- Use `audit/internal/a11y-scan-results.json` and `audit/internal/a11y-findings.json` for pipeline JSON files.

2. If findings count is 0:

- Still generate `audit/report.html` with a clean summary (`Congratulations, no issues found.`).
- This is allowed only after all baseline domains were checked, automated tool results were reviewed.

3. Keep temporary pipeline files in `audit/internal/`; do not delete them automatically.

4. Chat output should summarize results, but `audit/report.html` is the default source of truth.

## 9) Fix-First Output Rules

1. **Evidence First**: When an audit completes, open the HTML report immediately as visual evidence.
2. **The Resolution is the Goal**: In the chat, prioritize the **Remediation Roadmap**. Do not just say "here is the report"; instead, say "The report is open as evidence, here are the fixes I am ready to apply."
3. **Surgical Precision**: Use the exact selectors and "Search Hints" provided by the analyzer to locate code.
4. **Group by Component**: Present fixes grouped by component or page area to make review easier for the user.
5. **Clear Impact**: Briefly explain _why_ the fix is needed (e.g., "Fixes screen reader access for the main nav").

## 10) Platform-Specific Installation

For Antigravity, Windsurf, Codex, and Gemini CLI setup instructions, see [references/platform-setup.md](references/platform-setup.md).

## 11) Execution Workflow

Follow these steps in order when executing an audit:

1. **Get the target URL.** If not provided in the user's message, ask for it immediately before proceeding. Do not auto-detect unless the user explicitly asks you to.

2. **Run the audit pipeline** using the bundled orchestrator script from the skill directory:

   ```bash
   node scripts/run-audit.mjs --base-url <URL>
   ```

   This runs the full pipeline: toolchain check → route scanning → findings processing → HTML report. Dependencies install automatically on first run.

3. **Parse the report path** from the `REPORT_PATH=<path>` line in the script output.

4. **Open the report** in the browser using the appropriate method for the current environment:
   - macOS: `open "<path>"`
   - Windows: `start "" "<path>"`
   - Linux: `xdg-open "<path>"`
   - If the open command fails or is sandboxed, tell the user the exact absolute path so they can open it manually.

5. **Summarize and Propose Fixes**:
   - Report the location and total issues by severity.
   - **MANDATORY**: Present a list of "Proposed Fixes" with the specific code changes found in `audit/remediation.md`.
   - Ask for explicit permission to apply the fixes: "Should I apply these patches for you?"

6. **Suggest `.gitignore` update**: **MANDATORY — always do this, no exceptions.** After every audit, tell the user to add `audit/` to the project's `.gitignore` to avoid committing generated reports. Do not check whether the entry already exists — just always surface the reminder. Do not edit `.gitignore` automatically.

## 12) Fix Application Workflow

When the user grants permission to apply fixes, follow this strict sequential protocol. **Never apply all fixes in a single batch.**

1. **Group fixes by severity** before touching any file: Critical → High → Medium → Low.
2. **Use the "Fixes by Component" table** (if present) to batch edits per component — fix all issues in the same file before moving to the next.
3. **Use "Search in"** glob patterns from each finding to locate the correct source file. Do not grep the entire project blindly.
4. **If a finding has a "Managed Component Warning"**, verify the element is not rendered by a UI library (Radix, Headless UI, etc.) before applying ARIA fixes.
5. **Apply one severity group at a time**, starting with Critical.
6. **Checkpoint after each group**: stop, list every file modified and every fix applied, then ask the user to test and confirm before continuing. Example prompt: _"Critical fixes applied — 3 files modified. Please verify and confirm when ready to proceed with High severity fixes."_
7. **Verify each group** using the targeted re-scan command from the finding instead of re-running the full audit: `pnpm a11y --base-url <URL> --routes <route> --only-rule <rule-id> --max-routes 1`
8. **Wait for explicit user confirmation** before moving to the next severity group. Never auto-advance.
9. **If any fix fails**: stop immediately, report the exact error and the file/line affected, and ask the user how to proceed. Do not skip ahead.
10. **Never mix severity groups** in a single application step.

## 13) Manual Checks — Source Code Scan

After all automated fixes are applied and confirmed, process the "WCAG 2.2 Static Code Checks" section from `audit/remediation.md`. These are violations that axe-core cannot detect automatically.

1. **Read the manual checks** from the remediation guide — each check includes a pattern to search for, verification steps, and a before/after code example.
2. **Search the project source code** for the pattern described in each check. Use the verification steps to determine if the project is affected.
3. **Skip checks that don't apply** — if the codebase has no `<video>` elements, skip the media caption checks. Do not report false findings.
4. **For each confirmed violation**, propose the fix using the before/after code example from the check. Group all manual check findings together and present them to the user as a separate batch: _"I found N additional issues from manual WCAG checks that axe-core cannot detect. Here are the proposed fixes."_
5. **Wait for user permission** before applying. Follow the same checkpoint protocol as Section 12.

### `a11y.config.json` Reference

Persist scan settings across runs by placing this file in the audited project root. All keys are optional — the engine merges with internal defaults. CLI flags always take precedence.

| Key                | Type      | Description                                                                                                                      |
| :----------------- | :-------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `colorScheme`      | `string`  | Emulate `"light"` or `"dark"` during scanning.                                                                                   |
| `viewports`        | `array`   | List of `{ width, height, name }` objects. Only the first entry is used for scanning. To change viewport, update `viewports[0]`. |
| `maxRoutes`        | `number`  | Max URLs to discover (default: 10).                                                                                              |
| `routes`           | `array`   | Static list of paths to scan (overrides autodiscovery).                                                                          |
| `complianceTarget` | `string`  | Report label (default: "WCAG 2.2 AA").                                                                                           |
| `axeRules`         | `object`  | Fine-grained Axe-Core rule configuration passed directly to the scanner.                                                         |
| `ignoreFindings`   | `array`   | Axe rule IDs to silence.                                                                                                         |
| `excludeSelectors` | `array`   | DOM selectors to ignore entirely.                                                                                                |
| `onlyRule`         | `string`  | Targeted Audit: Only check for this specific rule ID.                                                                            |
| `waitMs`           | `number`  | Time to wait for dynamic content (default: 2000).                                                                                |
| `timeoutMs`        | `number`  | Network timeout for page loads (default: 30000).                                                                                 |
| `waitUntil`        | `string`  | Playwright page load event: `"domcontentloaded"` \| `"load"` \| `"networkidle"` (default: `"domcontentloaded"`).                |
| `headless`         | `boolean` | Run browser in background (default: true).                                                                                       |
| `framework`        | `string`  | Override auto-detected framework for guardrail context in the remediation guide. Accepted: `"shopify"` \| `"wordpress"` \| `"drupal"` \| `"generic"`. |
