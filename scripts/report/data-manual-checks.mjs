export const MANUAL_CHECKS = [
  {
    criterion: "2.4.11",
    title: "Focus Appearance",
    level: "AA",
    description:
      "Operational elements must have a visible focus indicator with sufficient contrast and size when focused via keyboard.",
    steps: [
      "Navigate through the page using the `TAB` key.",
      "Ensure every clickable element (links, buttons, inputs) shows a clear border or background change when focused.",
      "Verify the contrast of the focus indicator is at least 3:1 against the surrounding background.",
    ],
    remediation: [
      "If no focus style is defined globally, add: `*:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }` to the global stylesheet.",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html",
  },
  {
    criterion: "2.5.7",
    title: "Dragging Movements",
    level: "AA",
    description:
      "All drag-and-drop functionality must have a single-pointer alternative (click-to-select + click-to-drop, arrow buttons, etc.).",
    steps: [
      "Identify components that use drag gestures (e.g., sortable lists, sliders).",
      "Try to perform the same action using only a keyboard or single mouse clicks.",
      "Ensure there is a button or menu-based alternative to complete the task.",
    ],
    remediation: [
      "If no keyboard alternative exists, add arrow-key support or button controls to the component.",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html",
  },
  {
    criterion: "2.5.8",
    title: "Target Size (Minimum)",
    level: "AA",
    description:
      "Interactive targets must be at least 24×24 CSS pixels, or have sufficient spacing to offset a smaller size.",
    steps: [
      "Inspect small buttons, checkboxes, and inline links.",
      "Measure the clickable area (including padding).",
      "Ensure no interactive element is smaller than 24x24px unless it is an inline link within a paragraph.",
    ],
    remediation: [
      "For icon-only buttons (no text), ensure `padding` is set so the total rendered size is at least 24×24px.",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html",
  },
  {
    criterion: "3.2.6",
    title: "Consistent Help",
    level: "A",
    description:
      "Help mechanisms (support link, chat widget, contact info) must appear in the same relative order on every page where they appear.",
    steps: [
      "Find the 'Support' or 'Help' links in the header/footer.",
      "Navigate between at least 3 pages.",
      "Confirm these elements reside in the same layout position and visual sequence.",
    ],
    remediation: [
      "If found on individual pages rather than in a shared layout, move the component to the shared layout to guarantee consistent placement.",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html",
  },
  {
    criterion: "3.3.7",
    title: "Redundant Entry",
    level: "A",
    description:
      "Information already provided by the user in the same session must not be required again unless essential or for security.",
    steps: [
      "Fill out a multi-step form (e.g., Checkout).",
      "In later steps, check if you are asked for information you already entered (e.g., 'Confirm Email').",
      "Ensure this information is either auto-filled or available for selection.",
    ],
    remediation: [
      "If later steps re-render fields already collected (name, address, email), pre-populate them from stored state/context instead of showing empty inputs.",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html",
  },
  {
    criterion: "3.3.8",
    title: "Accessible Authentication (Minimum)",
    level: "AA",
    description:
      "Authentication processes (login) must not rely on cognitive function tests (memorizing complex passwords, solving puzzles) unless an alternative exists.",
    steps: [
      "Visit the Login page.",
      "Check if you can use a password manager (Auto-fill).",
      "Check if you can paste into the password field.",
      "Verify no 'solve this math problem' type CAPTCHAs are mandatory.",
    ],
    remediation: [
      "Verify password fields do not have `onPaste` handlers that prevent pasting — remove any such restriction.",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html",
  },
];
