---
name: web-accessibility-audit
description: Create and run a practical WCAG-based accessibility audit workflow for websites, including lifecycle checks, semantic/ARIA/keyboard/contrast/reflow/form/media review, manual and automated testing, severity triage, and remediation tracking. Use when a user asks for accessibility QA, accessibility issue reports, WCAG 2.1 AA baseline reviews, audit-ready bug tickets, or process guidance aligned with agency delivery.
---

# Web Accessibility Audit

Follow this workflow to audit and report website accessibility issues with consistent quality.

## 1) Set Audit Scope

1. Confirm target conformance level.
- Default to WCAG 2.1 AA when the user does not specify a level.
- Adjust scope to WCAG 2.2 or AAA only when explicitly requested.

2. Confirm audit surface.
- Identify page types, key user flows, and critical components.
- Include third-party widgets and embeds in scope.

3. Confirm expected deliverables.
- Produce issue-level findings with clear severity and remediation guidance.
- Include both automated and manual validation results.

4. Confirm lifecycle checkpoints.
- Plan checks during discovery, design handoff, development, QA, pre-launch audit pass, and post-launch updates.
- If a client auditor exists, align report format and remediation timeline with that vendor.

## 2) Run Baseline Checks

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

## 3) Test and Validate

Run both automated and manual tests. Do not ship results from automated tools alone.

1. Automated pass.
- Use browser audits and linting where available.
- Capture issues as candidate findings, then verify manually.

2. Manual pass.
- Keyboard-only walkthrough.
- Screen reader spot-check.
- 200% zoom check (and 400% when requested).
- Text spacing override check (WCAG 1.4.12).
- Reduced motion check.
- High contrast mode check when relevant.

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

For each issue, use the template in `references/issue-template.md`.

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

Use `references/wcag-quick-map.md` as a fast checklist during audits.

## 7) Required Deliverables

Always return results in this exact order:
1. Executive summary.
2. Findings table (ID, severity, WCAG criterion, impacted area, short impact).
3. Issue details (one section per issue using the issue template).
4. Remediation plan (prioritized by severity and dependency).
5. Retest checklist.

## 8) Minimum Evidence Per Issue

Each reported issue must include:
1. Exact URL.
2. Exact selector or component identifier when available.
3. Reproducible steps.
4. WCAG criterion and level.
5. Concrete proof (screenshot, log, or tool output snippet).

## 9) Use Bundled Scripts

Use scripts for repeatable outputs and consistency:
1. `scripts/a11y_report_scaffold.py`
- Generate a report with required sections from findings JSON.
- Output: a markdown report in `reports/`.

2. `scripts/issue_from_template.py`
- Generate issue files in consistent format from CLI arguments.
- Output: one issue markdown file in `issues/`.

3. `scripts/severity_guard.py`
- Validate issue severity consistency using lightweight guardrails.
- Output: pass/fail checks for issue files.

## Output Rules

1. Keep issue titles short, specific, and component-oriented.
2. Use plain, implementation-ready language.
3. Include exact selectors/components when known.
4. Distinguish compliance blockers from advisory improvements.
5. If evidence is incomplete, mark assumptions explicitly.
