# Manual Checks — WCAG 2.2 Static Code Verification

These criteria are not detectable by axe-core. Search the source code for the patterns below and apply fixes where missing.

---

### 2.4.11 — Focus Appearance (WCAG 2.2 AA)

Operational elements must have a visible focus indicator with sufficient contrast and size when focused via keyboard.

**Verification Steps:**

1. Navigate through the page using the `TAB` key.
2. Ensure every clickable element (links, buttons, inputs) shows a clear border or background change when focused.
3. Verify the contrast of the focus indicator is at least 3:1 against the surrounding background.

**Recommended Fix:**

- If no focus style is defined globally, add: `*:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }` to the global stylesheet.

**Reference:** https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html

---

### 2.5.7 — Dragging Movements (WCAG 2.2 AA)

All drag-and-drop functionality must have a single-pointer alternative (click-to-select + click-to-drop, arrow buttons, etc.).

**Verification Steps:**

1. Identify components that use drag gestures (e.g., sortable lists, sliders).
2. Try to perform the same action using only a keyboard or single mouse clicks.
3. Ensure there is a button or menu-based alternative to complete the task.

**Recommended Fix:**

- If no keyboard alternative exists, add arrow-key support or button controls to the component.

**Reference:** https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html

---

### 2.5.8 — Target Size (Minimum) (WCAG 2.2 AA)

Interactive targets must be at least 24×24 CSS pixels, or have sufficient spacing to offset a smaller size.

**Verification Steps:**

1. Inspect small buttons, checkboxes, and inline links.
2. Measure the clickable area (including padding).
3. Ensure no interactive element is smaller than 24x24px unless it is an inline link within a paragraph.

**Recommended Fix:**

- For icon-only buttons (no text), ensure `padding` is set so the total rendered size is at least 24×24px.

**Reference:** https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

---

### 3.2.6 — Consistent Help (WCAG 2.2 A)

Help mechanisms (support link, chat widget, contact info) must appear in the same relative order on every page where they appear.

**Verification Steps:**

1. Find the 'Support' or 'Help' links in the header/footer.
2. Navigate between at least 3 pages.
3. Confirm these elements reside in the same layout position and visual sequence.

**Recommended Fix:**

- If found on individual pages rather than in a shared layout, move the component to the shared layout to guarantee consistent placement.

**Reference:** https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html

---

### 3.3.7 — Redundant Entry (WCAG 2.2 A)

Information already provided by the user in the same session must not be required again unless essential or for security.

**Verification Steps:**

1. Fill out a multi-step form (e.g., Checkout).
2. In later steps, check if you are asked for information you already entered (e.g., 'Confirm Email').
3. Ensure this information is either auto-filled or available for selection.

**Recommended Fix:**

- If later steps re-render fields already collected (name, address, email), pre-populate them from stored state/context instead of showing empty inputs.

**Reference:** https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html

---

### 3.3.8 — Accessible Authentication (Minimum) (WCAG 2.2 AA)

Authentication processes (login) must not rely on cognitive function tests (memorizing complex passwords, solving puzzles) unless an alternative exists.

**Verification Steps:**

1. Visit the Login page.
2. Check if you can use a password manager (Auto-fill).
3. Check if you can paste into the password field.
4. Verify no 'solve this math problem' type CAPTCHAs are mandatory.

**Recommended Fix:**

- Verify password fields do not have `onPaste` handlers that prevent pasting — remove any such restriction.

**Reference:** https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html
