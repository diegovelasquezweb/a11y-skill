---
name: ws-accessibility-audit
description: Run the WS WCAG 2.1 AA accessibility audit workflow in read-only mode for websites. Auto-discover same-origin routes when not provided, validate semantic/ARIA/keyboard/contrast/form/media requirements, and return structured outputs (summary, findings table, issue details, and coverage matrix). Use for accessibility QA and audit-ready issue reporting.
---

# Web Accessibility Audit

Follow this workflow to audit and report website accessibility issues with consistent quality.

## Operating Guardrails

1. Audit-only behavior.

- Do not modify source code, config, content, or dependencies unless the user explicitly asks for fixes.
- Do not create, update, or delete editor configuration files (for example `.vscode/settings.json`) during audits.
- Never add or modify `livePreview.defaultPreviewPath`.
- Default behavior is read-only auditing and reporting.
- Never initialize package managers in the audited project (`npm init`, `pnpm init`, `yarn init`).
- Never install or remove dependencies in the audited project (`npm/pnpm/yarn add|install|remove`).
- Never create or modify `package.json`, lockfiles, or `node_modules` in the audited project during audit runs.
- Never install dependencies in any directory during audits (including internal storage such as `audit/internal/`).

2. Navigation scope.

- Audit URLs/routes provided by the user.
- If the user does not provide routes, auto-discover same-origin routes from the current app (navigation links, key flow links, and core pages).
- Do not open unrelated external sites (for example search engines) during the audit flow.

3. Environment discipline.

- Use the base URL provided by the user when available.
- If no base URL is provided, first search project files for URL traces (for example `localhost`, `127.0.0.1`, preview URLs, environment variables, scripts, README notes) and use that URL when it is clearly audit-target related.
- If no reliable URL trace is found in files, auto-detect a reachable local app URL using common dev ports (`3000`, `3001`, `4173`, `5173`, `8080`).
- Do not apply runtime URL fallbacks or alternate hosts automatically.
- If no reachable target exists, report the blocker and request a URL.

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

## 1) Set Audit Scope

1. Confirm target conformance level.

- Use WCAG 2.1 AA by default.
- Adjust scope to WCAG 2.2 or AAA only when explicitly requested.
- Do not ask the user to confirm WCAG level unless they requested a different target.

2. Confirm audit surface.

- If routes are provided, use them directly.
- If routes are not provided, auto-discover routes from same-origin navigation and key flow entry points.
- Include third-party widgets and embeds that appear within audited pages.

3. Confirm expected deliverables.

- Produce issue-level findings with clear severity and remediation guidance.
- Include automated validation results only.
- Persist outputs to files by default (not chat-only) following the file output rules below.

4. Confirm lifecycle checkpoints.

- Plan checks during discovery, design handoff, development, QA, pre-launch audit pass, and post-launch updates.
- If a client auditor exists, align report format and remediation timeline with that vendor.

## 2) Run Baseline Checks

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

## 3) Test and Validate

Run automated tests using the bundled robust scanner (Playwright + Axe-Core).

1. Automated pass (bundled scanner).

- The skill uses `scripts/generate-route-checks.mjs` which launches a headless browser.
- It scans the DOM using Axe-Core for WCAG 2.0/2.1 A/AA compliance.
- It supports SPAs (Single Page Applications) and complex JS-driven UIs.
- Dependencies are isolated in the skill directory; **NO** installation occurs in the target project.
- Auto-discover same-origin routes if not provided.
- Capture issues as candidate findings, then finalize them.

2. Coverage matrix gate (mandatory).

- Complete `references/pdf-coverage-template.json` during each audit run.
- For each category row, set `status` to `PASS`, `FAIL`, or `N/A`.
- `PASS` does not require evidence for automated runs.
- `FAIL` requires evidence and linked `finding_ids`.
- `N/A` does not require notes for automated runs.
- Before closing the audit, verify:
  - Every required row is filled.
  - Every `FAIL` has at least one linked finding.
  - If findings are zero, all applicable rows are `PASS` (or `N/A` with reason).

## 4) Apply Severity and Track Debt

Classify each finding using this scale:

- `Critical/Blocker`: User cannot complete a core task.
- `High`: Core task is significantly impaired.
- `Medium`: Noticeable barrier with workaround.
- `Low`: Minor gap or best-practice issue.

Apply consistent triage behavior:

- Critical/High: treat as release blockers or near-blockers.
- Medium/Low: schedule, track, and retest during related work.

## 5) Report Findings

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

## 6) Use Quick Reference

Use `references/pdf-coverage-matrix.md` as the required completion gate.
Use `references/pdf-coverage-template.json` as the machine-readable category checklist.

## 7) Required Deliverables

Always return results in this exact order:

1. Executive summary (including `Test Environment` base URL used during the audit).
2. Findings table (ID, severity, WCAG criterion, impacted area, short impact).
3. Issue details (one section per issue using the issue template).

## 8) Minimum Evidence Per Issue

Each reported issue must include:

1. Route path (primary canonical location).
2. Exact selector or component identifier when available.
3. Reproducible steps.
4. WCAG criterion and level.
5. Concrete proof (DOM snippet, log, or tool output snippet).
   - Screenshot is optional.
   - Prefer selector-level DOM/tool evidence; include screenshot only if it clearly demonstrates the exact issue.

## 9) Use Standard Toolchain + Bundled Scripts

Use standard tools and bundled scripts for repeatable output:

1. `scripts/check-toolchain.mjs` for preflight diagnostics of local dependencies.
2. `scripts/generate-route-checks.mjs` for robust browser-side scanning with Axe-Core.
3. `scripts/deterministic-findings.mjs` for stable finding generation from scan data.
4. `scripts/pdf-coverage-validate.mjs` for coverage gate validation.
5. `scripts/build-audit-html.mjs` for final premium HTML report generation.

Use this pipeline order:

1. `check-toolchain.mjs`
2. `generate-route-checks.mjs`
3. `deterministic-findings.mjs`
4. `pdf-coverage-validate.mjs`
5. `build-audit-html.mjs`

Execution discipline for the agent:

1. Run the full pipeline directly; do not ask the user to execute script commands manually.
2. Run preflight (`check-toolchain.mjs`) first and stop when required tools are unavailable.
3. Do not require or assume local `node_modules` installation as part of the audit flow.
4. Do not install dependencies to satisfy pipeline runtime requirements.
5. If any pipeline step depends on unavailable local modules, report a blocker and stop (do not mark checks as `PASS`).
6. Run all pipeline steps from the same project working directory.
7. Before coverage validation, verify `audit/internal/a11y-findings.json` exists.
8. If `audit/internal/a11y-findings.json` is missing, re-run route-check and findings steps in the same directory, then continue.
9. If a step fails, stop and report the exact blocker.
10. Do not continue with partial runtime tool execution for required checks.
11. Keep intermediate pipeline artifacts encapsulated; write intermediates to `audit/internal/`.
12. Do not run automatic cleanup commands that delete `audit/internal/` files during the audit flow.
13. When a local dependency or browser is missing, report the `setup.sh` fix and stop.

## 10) File Output Behavior (Mandatory)

1. Write only one final artifact in `audit/`:

- `audit/index.html`
- Do not generate dated versions of the report (e.g., `audit/index-2026-01-01.html`).
- Do not generate markdown report files in the default flow.
- Do not generate per-issue markdown files in the default flow.
- `audit/index.html` must include the completed PDF coverage matrix with evidence and linked finding IDs.
- Follow the WS Accessibility standard for issue severity (Critical, High, Medium, Low).
- Do not keep any JSON files in `audit/`.
- Use `audit/internal/a11y-scan-results.json`, `audit/internal/a11y-findings.json`, and `audit/internal/a11y-coverage.json` for pipeline JSON files.

2. If findings count is 0:

- Still generate `audit/index.html` with a clean summary (`Congratulations, no issues found.`).
- This is allowed only after all baseline domains were checked, automated tool results were reviewed, and the PDF coverage matrix gate is fully satisfied.

3. Keep temporary pipeline files in `audit/internal/`; do not delete them automatically.

4. Chat output should summarize results, but `audit/index.html` is the default source of truth.

## Output Rules

1. Keep issue titles short, specific, and component-oriented.
2. Use plain, implementation-ready language.
3. Include exact selectors/components when known.
4. Distinguish compliance blockers from advisory improvements.
5. If evidence is incomplete, mark assumptions explicitly.
