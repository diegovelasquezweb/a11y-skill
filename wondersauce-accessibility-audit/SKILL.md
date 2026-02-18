---
name: wondersauce-accessibility-audit
description: Run the Wondersauce WCAG 2.1 AA accessibility audit workflow in read-only mode for websites. Auto-discover same-origin routes when not provided, validate semantic/ARIA/keyboard/contrast/form/media requirements, and return structured outputs (summary, findings table, issue details, remediation plan, retest checklist). Use for accessibility QA, audit-ready issue reporting, and remediation planning.
---

# Web Accessibility Audit

Follow this workflow to audit and report website accessibility issues with consistent quality.

## Operating Guardrails

1. Audit-only behavior.
- Do not modify source code, config, content, or dependencies unless the user explicitly asks for fixes.
- Default behavior is read-only auditing and reporting.

2. Navigation scope.
- Audit URLs/routes provided by the user.
- If the user does not provide routes, auto-discover same-origin routes from the current app (navigation links, key flow links, and core pages).
- Do not open unrelated external sites (for example search engines) during the audit flow.

3. Environment discipline.
- Use the base URL provided by the user when available.
- If no base URL is provided, auto-detect a reachable local app URL using common dev ports (`3000`, `3001`, `4173`, `5173`, `8080`).
- Do not start/stop servers or switch environments unless the user explicitly asks.
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
- Include both automated and manual validation results.
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

Run both automated and manual tests. Do not ship results from automated tools alone.

1. Automated pass (standard tools + pipeline scripts).
- Use established tooling plus the bundled skill scripts:
  - `axe` (`@axe-core/playwright` or axe DevTools).
  - Lighthouse accessibility audit.
  - `eslint-plugin-jsx-a11y` for React/JSX projects.
  - `pa11y` (or axe in CI) for regression runs when available.
- If a tool is unavailable (for example network/registry restrictions), mark it as `SKIPPED` with explicit reason in evidence notes.
- Auto-discover same-origin routes from navigation links when routes are not provided.
- Capture issues as candidate findings, then verify manually before finalizing.

2. Manual pass.
- Keyboard-only walkthrough.
- Screen reader spot-check.
- 200% zoom check (and 400% when requested).
- Text spacing override check (WCAG 1.4.12).
- Reduced motion check.
- High contrast mode check when relevant.

3. Coverage matrix gate (mandatory).
- Complete `references/pdf-coverage-template.json` during each audit run.
- For each category row, set `status` to `PASS`, `FAIL`, or `N/A`.
- `PASS` requires evidence.
- `FAIL` requires evidence and linked `finding_ids`.
- `N/A` requires a reason in `notes`.
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
4. Remediation plan (prioritized by severity and dependency).
5. Retest checklist.

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
1. `Playwright` for route navigation, DOM inspection, and interaction checks.
2. `@axe-core/playwright` or axe DevTools for automated accessibility rule checks.
3. Lighthouse accessibility for secondary signal and regression comparison.
4. `eslint-plugin-jsx-a11y` (when applicable) for static JSX checks.
5. `pa11y` or CI-integrated axe for repeatable automated regression scans.
6. `scripts/generate-route-checks.mjs` for deterministic route-check extraction.
7. `scripts/deterministic-findings.mjs` for stable finding generation from route checks.
8. `scripts/pdf-coverage-validate.mjs` for coverage gate validation.
9. `scripts/build-audit-html.mjs` for final report generation.

Use this pipeline order:
1. `generate-route-checks.mjs`
2. `deterministic-findings.mjs`
3. `pdf-coverage-validate.mjs`
4. `build-audit-html.mjs`


## 10) File Output Behavior (Mandatory)

1. If findings count is greater than 0, write outputs to `audit/` by default:
- `audit/findings.json`
- `audit/coverage-input.json`
- `audit/index.html`
- Do not generate markdown report files in the default flow.
- Do not generate per-issue markdown files in the default flow.
- `audit/index.html` must include the completed PDF coverage matrix with evidence and linked finding IDs.

2. If findings count is 0:
- Still generate `audit/index.html` with a clean summary (`Congratulations, no issues found.`).
- This is allowed only after all baseline domains were checked, automated tool results were reviewed, manual checks were completed, and the PDF coverage matrix gate is fully satisfied.

3. Chat output should summarize results, but file generation is the default source of truth.

## Output Rules

1. Keep issue titles short, specific, and component-oriented.
2. Use plain, implementation-ready language.
3. Include exact selectors/components when known.
4. Distinguish compliance blockers from advisory improvements.
5. If evidence is incomplete, mark assumptions explicitly.
