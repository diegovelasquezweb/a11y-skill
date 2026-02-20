# Baseline Checks — WCAG 2.2 AA

Execute all domains below for every audited route. Do not finalize an audit with partial checks. Convert every confirmed violation into a finding.

## 1. Structure and Semantics

- Validate heading hierarchy and one primary `h1`.
- Validate landmarks (`header`, `nav`, `main`, `footer`, `aside`, `section`).
- Validate correct element choice (`button` for actions, `a` for navigation).

## 2. ARIA Usage

- Prefer native HTML before ARIA.
- Validate accessible names (`aria-label`, `aria-labelledby`) where needed.
- Validate relationships (`aria-describedby`, `aria-controls`).
- Validate state attributes (`aria-expanded`, `aria-current`, `aria-modal`).
- Validate status message announcements for dynamic updates (WCAG 4.1.3) with `role="status"`/`aria-live` and reserve `role="alert"` for urgent errors.
- Reject invalid patterns like `aria-hidden="true"` on focusable content.

## 3. Keyboard and Focus Behavior

- Confirm all interactive elements are reachable and operable with keyboard only.
- Confirm logical focus order and visible focus styles.
- Confirm no positive `tabindex` values.
- Validate focus management for dialogs and dynamic UI.
- Confirm focus indicators meet minimum appearance: minimum area of perimeter × 2 CSS px and 3:1 contrast ratio between focused and unfocused states (WCAG 2.4.11).

## 4. Perceivable Content

- Confirm text contrast minimums (4.5:1 normal, 3:1 large).
- Confirm non-text/UI contrast minimum (3:1).
- Confirm non-color-only communication.
- Confirm zoom and text-spacing resilience (WCAG 1.4.12).

## 5. Media, Motion, and Gestures

- Confirm alt text quality and decorative image handling (`alt=""`).
- Confirm captions/transcripts where applicable.
- Confirm reduced motion behavior with `prefers-reduced-motion`.
- Confirm gesture alternatives for path/multi-point interactions (WCAG 2.5.1).
- Confirm drag-and-drop functionality has a single-pointer alternative (WCAG 2.5.7).
- Confirm minimum touch target size: 24×24 CSS px minimum (WCAG 2.5.8 AA); 44×44 CSS px recommended for touch-primary interfaces.

## 6. Forms and Authentication

- Confirm labels and required-state announcements.
- Confirm error association and announcement.
- Confirm grouped controls use `fieldset`/`legend` when needed.
- Confirm password managers are supported (never block paste, avoid `autocomplete="off"` on login).
- Confirm redundant-entry avoidance for multi-step flows (WCAG 3.3.7).
- Confirm authentication does not rely only on cognitive tests and supports assistive flows (WCAG 3.3.8).
- Confirm CAPTCHAs provide accessible alternatives when used.
- Confirm help mechanisms (support links, chat, contact info) appear in the same relative order on every page where they are present (WCAG 3.2.6).

## 7. Common Component Patterns

- **Modals/dialogs**: focus trap, Escape close, focus return, inert background.
- **Menus and disclosures**: keyboard support, state attributes, consistent navigation order.
- **Tabs**: `tablist/tab/tabpanel`, arrow-key behavior, correct `tabindex` handling.
- **Accordions**: button trigger, `aria-expanded`, `aria-controls`.
- **Carousels**: pause control, keyboardable prev/next, slide position announcement, swipe alternatives.
- **Skip link**: first focusable element points to main content.

## 8. Third-Party Content and Integrations

- Audit embedded forms, consent banners, chat widgets, and external overlays in scope.
- If an inaccessible third-party component is required, create findings and document constraints/ownership.
