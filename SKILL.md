---
name: a11y-skill
description: Run a WCAG 2.1 AA accessibility audit on a website. Use when the user says "audit [url]", "run an accessibility audit", "check accessibility", or asks to scan a site for a11y issues, WCAG compliance, or screen reader compatibility.
argument-hint: "[url]"
compatibility: Requires Node.js 18+, pnpm, and internet access to the target URL. Playwright + Chromium are installed automatically on first run.
license: MIT
metadata:
  author: diegovelasquezweb
  version: "1.0"
---

# Web Accessibility Audit

Follow this workflow to audit and report website accessibility issues with consistent quality.

## Operating Guardrails

1. **Installation Scope**: Always use `--scope workspace` during installation.
2. **Platform Setup & Installation**: When asked to install, the agent must complete all platform-specific setup beyond copying files:
   - **Antigravity**: Create/Update `.agent/workflows/` files.
   - **Gemini CLI**: Complete the specific **Activation** process required to load instructions into context.
   - **Claude Code/SDK**: Ensure files are in the correct path and enabled via `allowed_tools` if applicable.
   - **Codex**: Follow the installer prompts or ensure detection in `.agents/skills`.
   - **Cursor**: Ensure placement in `.cursor/skills/` for the agent to use it.
     The skill must be **completely ready to run** before reporting success. Do NOT execute the actual audit pipeline until explicitly requested.
3. Audit-only behavior.

- Do not modify source code, config, content, or dependencies unless the user explicitly asks for fixes.
- Do not create, update, or delete editor configuration files (for example `.vscode/settings.json`) during audits.
- Never add or modify `livePreview.defaultPreviewPath`.
- Default behavior is read-only auditing and reporting.
- Never initialize package managers in the audited project (`npm init`, `pnpm init`, `yarn init`).
- Never install or remove dependencies in the audited project (`npm/pnpm/yarn add|install|remove`).
- Never create or modify `package.json`, lockfiles, or `node_modules` in the audited project during audit runs.
- Never install dependencies in any directory during audits (including internal storage such as `audit/internal/`).

4. Navigation scope.

- Audit URLs/routes provided by the user.
- If the user does not provide routes, auto-discover same-origin routes from the current app (navigation links, key flow links, and core pages).
- Do not open unrelated external sites (for example search engines) during the audit flow.

5. Environment discipline.

- Use the base URL provided by the user when available.
- If no base URL is provided in the user's message, ask for it immediately before doing anything else.
- Only if the user explicitly says they don't know the URL or asks you to detect it: search project files for URL traces (for example `localhost`, `127.0.0.1`, preview URLs, environment variables, scripts, README notes).
- Only if no reliable URL trace is found in files: auto-detect a reachable local app URL using common dev ports (`3000`, `3001`, `4173`, `5173`, `8080`).
- Do not apply runtime URL fallbacks or alternate hosts automatically.
- If no reachable target exists after user-requested detection, report the blocker and request a URL.

4. Reporting language.

- Write all outputs in English.

5. Shareable reporting.

- In final findings, use route paths as the primary location (`/`, `/products`, `/account/login`).
- If local URLs are used during testing, place them under a separate `Test Environment` note, not as the canonical issue location.

6. Scope questions.

- Do not ask scope questionnaires by default.
- Start auditing immediately with discovered scope.
- Ask the user only when blocked (no reachable app URL, auth needed, or hard access restrictions).

7. Evidence quality.

- Do not capture generic full-page screenshots by default.
- Use technical evidence first (DOM snippet, selector-level check, tool output).
- Capture screenshots only when they are directly tied 1:1 to a specific issue ID.

## 1) Run Baseline Checks

Mandatory process coverage:

- Execute all baseline domains in this section for every audited route/flow.
- Do not finalize an audit using partial checks.
- Convert every confirmed violation into a finding.

1. Review structure and semantics.

- Validate heading hierarchy and one primary `h1`.
- Validate landmarks (`header`, `nav`, `main`, `footer`, `aside`, `section`).
- Validate correct element choice (`button` for actions, `a` for navigation).

2. Review ARIA usage.

- Prefer native HTML before ARIA.
- Validate accessible names (`aria-label`, `aria-labelledby`) where needed.
- Validate relationships (`aria-describedby`, `aria-controls`).
- Validate state attributes (`aria-expanded`, `aria-current`, `aria-modal`).
- Validate status message announcements for dynamic updates (WCAG 4.1.3) with `role="status"`/`aria-live` and reserve `role="alert"` for urgent errors.
- Reject invalid patterns like `aria-hidden="true"` on focusable content.

3. Review keyboard and focus behavior.

- Confirm all interactive elements are reachable and operable with keyboard only.
- Confirm logical focus order and visible focus styles.
- Confirm no positive `tabindex` values.
- Validate focus management for dialogs and dynamic UI.

4. Review perceivable content requirements.

- Confirm text contrast minimums (4.5:1 normal, 3:1 large).
- Confirm non-text/UI contrast minimum (3:1).
- Confirm non-color-only communication.
- Confirm zoom and text-spacing resilience (WCAG 1.4.12).

5. Review media, motion, and gestures.

- Confirm alt text quality and decorative image handling (`alt=""`).
- Confirm captions/transcripts where applicable.
- Confirm reduced motion behavior with `prefers-reduced-motion`.
- Confirm gesture alternatives for path/multi-point interactions (WCAG 2.5.1).
- Confirm minimum touch target size (44x44 CSS px where applicable).

6. Review forms and authentication.

- Confirm labels and required-state announcements.
- Confirm error association and announcement.
- Confirm grouped controls use `fieldset`/`legend` when needed.
- Confirm password managers are supported (never block paste, avoid `autocomplete="off"` on login).
- Confirm redundant-entry avoidance for multi-step flows (WCAG 3.3.7).
- Confirm authentication does not rely only on cognitive tests and supports assistive flows (WCAG 3.3.8).
- Confirm CAPTCHAs provide accessible alternatives when used.

7. Review common component patterns.

- Modals/dialogs: focus trap, Escape close, focus return, inert background.
- Menus and disclosures: keyboard support, state attributes, consistent navigation order.
- Tabs: `tablist/tab/tabpanel`, arrow-key behavior, correct `tabindex` handling.
- Accordions: button trigger, `aria-expanded`, `aria-controls`.
- Carousels: pause control, keyboardable prev/next, slide position announcement, swipe alternatives.
- Skip link: first focusable element points to main content.

8. Review third-party content and integrations.

- Audit embedded forms, consent banners, chat widgets, and external overlays in scope.
- If an inaccessible third-party component is required, create findings and document constraints/ownership.

## 2) Test and Validate

Run automated tests using the bundled robust scanner (Playwright + Axe-Core).

1. Automated pass (bundled scanner).

- The skill uses `scripts/generate-route-checks.mjs` which launches a headless browser.
- It scans the DOM using Axe-Core for WCAG 2.0/2.1 A/AA compliance.
- It supports SPAs (Single Page Applications) and complex JS-driven UIs.
- Dependencies are isolated in the skill directory; **NO** installation occurs in the target project.
- Auto-discover same-origin routes if not provided.
- Capture issues as candidate findings, then finalize them.

## 3) Apply Severity and Track Debt

Classify each finding using this scale:

- `Critical/Blocker`: User cannot complete a core task.
- `High`: Core task is significantly impaired.
- `Medium`: Noticeable barrier with workaround.
- `Low`: Minor gap or best-practice issue.

Apply consistent triage behavior:

- Critical/High: treat as release blockers or near-blockers.
- Medium/Low: schedule, track, and retest during related work.

## 4) Report Findings

For each issue, include the required issue fields in the HTML issue details section.

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

## 6) Minimum Evidence Per Issue

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
2. `scripts/generate-route-checks.mjs` for robust browser-side scanning with Axe-Core.
3. `scripts/deterministic-findings.mjs` for stable finding generation from scan data.
4. `scripts/build-audit-html.mjs` for final premium HTML report generation.

Use this pipeline order:

1. `check-toolchain.mjs`
2. `generate-route-checks.mjs`
3. `deterministic-findings.mjs`
4. `build-audit-html.mjs`

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

1. Write two final artifacts in `audit/`:

- `audit/index.html` — full HTML report (primary deliverable).
- `audit/summary.md` — concise markdown summary (ideal for PRs and tickets).
- Do not generate dated versions of the report (e.g., `audit/index-2026-01-01.html`).
- Do not generate per-issue markdown files.
- `audit/index.html` must include the completed findings with evidence and linked finding IDs.
- Follow the WS Accessibility standard for issue severity (Critical, High, Medium, Low).
- Do not keep any JSON files in `audit/`.
- Use `audit/internal/a11y-scan-results.json` and `audit/internal/a11y-findings.json` for pipeline JSON files.

2. If findings count is 0:

- Still generate `audit/index.html` with a clean summary (`Congratulations, no issues found.`).
- This is allowed only after all baseline domains were checked, automated tool results were reviewed.

3. Keep temporary pipeline files in `audit/internal/`; do not delete them automatically.

4. Chat output should summarize results, but `audit/index.html` is the default source of truth.

## Output Rules

1. Keep issue titles short, specific, and component-oriented.
2. Use plain, implementation-ready language.
3. Include exact selectors/components when known.
4. Distinguish compliance blockers from advisory improvements.
5. If evidence is incomplete, mark assumptions explicitly.

## Antigravity Workspace Setup

> This section applies only to Google Antigravity.

Workflows in Antigravity are workspace-scoped. On first activation in any project, check whether `.agent/workflows/audit.md` exists in the project root.

**If the file does not exist:**

1. Create `.agent/workflows/` in the project root if it doesn't already exist.
2. Write the following content to `.agent/workflows/audit.md`:

````markdown
---
description: Run a full WCAG 2.1 AA accessibility audit
---

1. Ask the user for the target URL if not already provided.

// turbo 2. Run the audit pipeline:

\```bash
node scripts/run-audit.mjs --base-url <URL>
\```

3. Parse the `REPORT_PATH=<path>` line from the script output to get the absolute report path.

4. Open the report in the browser using the appropriate method for the current environment:
   - VS Code / Cursor / any IDE with shell access: run `open "<path>"` (macOS), `start "" "<path>"` (Windows), or `xdg-open "<path>"` (Linux)
   - If the shell open command fails or is sandboxed, tell the user the exact absolute path so they can open it manually.

5. Summarize the findings: total issues by severity, top critical/high items, and the report location.
````

3. Tell the user: "I've set up the `/audit` workflow for this project. You can now invoke it directly with `/audit`."

**If the file already exists:** skip this step and proceed directly to the audit.

## Workflow

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

5. **Summarize the findings**: total issues by severity (Critical / High / Medium / Low), top Critical and High items with route and fix, and the report location.
