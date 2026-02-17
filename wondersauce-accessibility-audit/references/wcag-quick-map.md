# WCAG Quick Map

Use this map as a rapid checklist while auditing.

## Baseline

- Target default: WCAG 2.1 AA.
- Track WCAG 2.2 criteria when requested or when client references it.
- If an external auditing vendor is involved, align issue format and remediation timeline.

## Structure and Semantics

- One logical `h1`; no broken heading hierarchy.
- Landmarks present and meaningful (`header`, `nav`, `main`, `footer`).
- Native elements used correctly (`button` vs `a`).
- Lists and tables use semantic elements.

## ARIA and Dynamic Content

- Use ARIA only when native semantics are insufficient.
- Interactive states communicated (`aria-expanded`, `aria-current`, `aria-modal`).
- Status updates announced without focus hijacking (WCAG 4.1.3).
- Avoid `role="alert"` for routine updates.

## Keyboard and Focus

- Full keyboard operability.
- Logical tab order; no positive `tabindex`.
- Visible focus states.
- Modal focus trap + focus return.

## Visual and Readability

- Text contrast: 4.5:1 (normal), 3:1 (large).
- UI/non-text contrast: 3:1.
- Information not conveyed by color alone.
- Zoom at 200% remains usable.
- Text spacing override (WCAG 1.4.12) does not break layout.

## Media and Motion

- Informative images have meaningful alt text; decorative images use `alt=""`.
- Video has captions; audio has transcript.
- Motion respects `prefers-reduced-motion`.
- No flashing content above safe thresholds.

## Touch and Gestures

- Path/multi-point gestures have single-pointer alternatives (WCAG 2.5.1).
- Mobile targets are at least 44x44 CSS px where required.

## Forms and Authentication

- Inputs have programmatically associated labels.
- Errors are specific, associated, and announced.
- Required fields are clear beyond color.
- Password manager workflows are supported.
- Avoid redundant re-entry in multi-step processes (WCAG 3.3.7).
- Avoid cognitive-only authentication barriers; provide accessible alternatives (WCAG 3.3.8).

## Predictability and Cognitive Accessibility

- Repeated navigation order stays consistent (WCAG 3.2.3).
- Same action uses same labels and patterns (WCAG 3.2.4).

## Component Patterns

- Skip link exists and is first focusable element.
- Menus, tabs, accordions, carousels follow expected keyboard patterns.
- Carousels are controllable and pausable.
- Modal dialogs trap focus, support Escape, and return focus to trigger.

## Third-Party Integrations

- Audit embeds/widgets explicitly.
- Document known accessibility risks and fallback paths.

## Testing Mix

- Automated checks for regressions.
- Manual checks for real usability and assistive tech behavior.

## Pattern to WCAG Mapping

| Pattern | Typical WCAG Criteria |
|---|---|
| Missing form label | 1.3.1, 3.3.2, 4.1.2 |
| Broken modal focus trap | 2.1.2, 2.4.3 |
| Missing visible focus indicator | 2.4.7 |
| Low text contrast | 1.4.3 |
| Missing non-text contrast on controls | 1.4.11 |
| Missing status message announcement | 4.1.3 |
| Keyboard-inaccessible custom control | 2.1.1 |
| No skip link to main content | 2.4.1 |
