import { escapeHtml } from "./utils.mjs";

export const MANUAL_CHECKS = [
  {
    criterion: "2.4.11",
    title: "Focus Appearance",
    level: "AA",
    description:
      "Focus indicators must be clearly visible with a minimum area (perimeter × 2 CSS px) and 3:1 contrast ratio between focused and unfocused states.",
    steps: [
      "Tab through every interactive element on the page",
      "Verify each focused element has a clearly visible outline or indicator",
      "Check the focus indicator has at least 3:1 contrast vs adjacent colors",
      "Confirm the indicator area is at least: component perimeter × 2 CSS pixels",
    ],
    agentTasks: [
      "Search all CSS/SCSS/styled-components for `:focus` and `:focus-visible` — flag any rule that sets `outline: none` or `outline: 0` on interactive elements without a replacement style.",
      "For every button, a, input, select, textarea — verify a `:focus-visible` rule with a visible outline or box-shadow exists.",
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
      "Identify all drag-and-drop interactions: sortable lists, sliders, file upload zones",
      "Verify each can be operated without dragging (arrow keys, click alternatives)",
      "Test using only pointer clicks — no drag gestures allowed as the sole method",
    ],
    agentTasks: [
      "Search for `draggable`, `onDragStart`, `useDraggable`, `Sortable`, `react-dnd`, `@dnd-kit`, `dragula` — list every component that uses drag interactions.",
      "For each drag component, verify an `onKeyDown` handler or a click-based alternative (up/down buttons, select+confirm) exists in the same component.",
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
      "Inspect computed size of small buttons, links, and icon controls",
      "Use DevTools: select element → Computed → check width/height",
      "For targets under 24×24 px, verify at least (24 − size) px of non-interactive spacing surrounds it",
    ],
    agentTasks: [
      "Search CSS for button, a, [role=\"button\"], input[type=\"checkbox\"], input[type=\"radio\"] rules — flag any with explicit `width` or `height` below 24px.",
      "For flagged elements, add `min-width: 24px; min-height: 24px;` or increase padding so the clickable area meets the minimum.",
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
      "Navigate to at least 3 different pages that contain help links or contact info",
      "Verify the help mechanism is always in the same location (e.g., always in the footer)",
      "Check that its order relative to surrounding elements is consistent across pages",
    ],
    agentTasks: [
      "Search for help/support/contact components (e.g., `HelpLink`, `SupportChat`, `ContactInfo`, `IntercomWidget`) — verify they are rendered inside a shared layout component (Header, Footer, Layout) and not duplicated inline per page.",
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
      "Complete multi-step forms that span multiple pages (checkout, registration, surveys)",
      "Verify that data entered earlier (name, address, email) is pre-populated or selectable in later steps",
      "Check that users are never asked to re-type the same information twice",
    ],
    agentTasks: [
      "Search for multi-step form components (wizard, stepper, checkout flow) — verify that data from previous steps is passed as props, state, or hidden inputs to subsequent steps.",
      "If later steps re-render fields already collected (name, address, email), pre-populate them from stored state/context instead of showing empty inputs.",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html",
  },
  {
    criterion: "3.3.8",
    title: "Accessible Authentication (Minimum)",
    level: "AA",
    description:
      "Authentication must not rely solely on cognitive function tests (CAPTCHA, puzzles, memorization) — an accessible alternative must be available.",
    steps: [
      "Test the login and signup flow end-to-end",
      "If a CAPTCHA is present, verify an audio alternative or another accessible option exists",
      "Confirm copy-paste is allowed in password fields",
      "Check whether passkeys or email magic links are offered as alternatives",
    ],
    agentTasks: [
      "Search for `<input type=\"password\">` — verify each has `autocomplete=\"current-password\"` (login) or `autocomplete=\"new-password\"` (signup). Add the attribute if missing.",
      "Search for CAPTCHA implementations (`recaptcha`, `hcaptcha`, `turnstile`) — verify an accessible alternative is offered (audio challenge, email magic link, or passkey).",
      "Verify password fields do not have `onPaste` handlers that prevent pasting — remove any such restriction.",
    ],
    ref: "https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html",
  },
];

export function buildManualCheckCard(check) {
  const id = `manual-${check.criterion.replace(".", "-")}`;
  const steps = check.steps
    .map(
      (s) => `<li class="mb-1.5 text-slate-600 text-sm">${escapeHtml(s)}</li>`,
    )
    .join("");
  return `
<div class="manual-card bg-white rounded-xl border border-amber-200 shadow-sm mb-4 overflow-hidden transition-all duration-200" id="${id}" data-criterion="${escapeHtml(check.criterion)}" data-state="">
  <div class="manual-header flex items-start gap-4 p-5 border-b border-amber-100 bg-gradient-to-r from-amber-50/60 to-white transition-colors">
    <div class="flex-1 min-w-0">
      <div class="flex flex-wrap items-center gap-2 mb-2">
        <span class="manual-badge px-2.5 py-0.5 rounded-full text-xs font-bold border bg-amber-100 text-amber-800 border-amber-200">Manual</span>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 font-mono">${escapeHtml(check.criterion)}</span>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">WCAG 2.2 ${escapeHtml(check.level)}</span>
      </div>
      <h3 class="text-base font-bold text-slate-900">${escapeHtml(check.title)}</h3>
    </div>
    <div class="flex gap-2 flex-shrink-0 mt-0.5">
      <button class="manual-verified-btn px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors whitespace-nowrap" onclick="setManualState('${escapeHtml(check.criterion)}', 'verified')">✓ Verified</button>
      <button class="manual-na-btn px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap" onclick="setManualState('${escapeHtml(check.criterion)}', 'na')">N/A</button>
    </div>
  </div>
  <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">What to verify</h4>
      <p class="text-sm text-slate-600 leading-relaxed">${escapeHtml(check.description)}</p>
    </div>
    <div>
      <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">How to test</h4>
      <ol class="list-decimal list-outside ml-4 space-y-1 marker:text-slate-400 marker:font-medium">
        ${steps}
      </ol>
    </div>
  </div>
  <div class="px-5 pb-4">
    <a href="${escapeHtml(check.ref)}" target="_blank" class="text-xs text-indigo-600 hover:underline font-medium">WCAG 2.2 Understanding — ${escapeHtml(check.criterion)} ${escapeHtml(check.title)} →</a>
  </div>
</div>`;
}

export function buildManualChecksSection() {
  const total = MANUAL_CHECKS.length;
  const cards = MANUAL_CHECKS.map((c) => buildManualCheckCard(c)).join("\n");
  return `
<div class="mt-16 mb-4">
  <div class="flex items-center gap-3 mb-2">
    <h3 class="text-lg font-bold text-slate-900">Manual Verification Required</h3>
    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">${total} checks</span>
  </div>
  <p class="text-sm text-slate-500">These WCAG 2.2 criteria cannot be detected automatically by axe-core. Check each one off as you verify it — progress is saved in your browser.</p>
</div>

<div id="manual-progress-sticky" class="sticky top-14 z-30 bg-white rounded-xl border border-slate-200 p-4 mb-6 flex items-center gap-4 shadow-sm">
  <div class="flex-1">
    <div class="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
      <span>Verification progress</span>
      <span id="manual-progress-label">0 / ${total} verified</span>
    </div>
    <div class="w-full bg-slate-100 rounded-full h-2">
      <div id="manual-progress-bar" class="bg-emerald-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
    </div>
  </div>
  <button onclick="resetManualChecks()" class="text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium whitespace-nowrap">Reset all</button>
</div>

${cards}`;
}

export function buildManualChecksMd() {
  const entries = MANUAL_CHECKS.map((check) => {
    const tasks = check.agentTasks.map((s, i) => `${i + 1}. ${s}`).join("\n");
    return [
      `---`,
      `### ${check.criterion} — ${check.title} (WCAG 2.2 ${check.level})`,
      ``,
      `${check.description}`,
      ``,
      `**Agent tasks:**`,
      tasks,
      ``,
      `**Reference:** ${check.ref}`,
    ].join("\n");
  }).join("\n\n");

  return `## WCAG 2.2 Static Code Checks

> These criteria are not detectable by axe-core. Search the source code for the patterns below and apply fixes where missing.

${entries}
`;
}
