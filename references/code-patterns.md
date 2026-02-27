# Source Code Pattern Audit

> These patterns are not detectable by axe-core at runtime. Use the search regex to grep source files and apply the fixes wherever the pattern is found.
> Apply the framework-specific note that matches the detected project stack.

## Table of Contents

- [`placeholder-only-label` — Critical (WCAG 1.3.1 / 4.1.2 · Level A)](#placeholder-only-label--critical-wcag-131--412--level-a)
- [`focus-outline-suppressed` — Serious (WCAG 2.4.7 · Level AA)](#focus-outline-suppressed--serious-wcag-247--level-aa)
- [`autoplay-media` — Serious (WCAG 1.4.2 · Level A)](#autoplay-media--serious-wcag-142--level-a)
- [`orientation-lock` — Moderate (WCAG 1.3.4 · Level AA)](#orientation-lock--moderate-wcag-134--level-aa)
- [`character-key-shortcut` — Moderate (WCAG 2.1.4 · Level A)](#character-key-shortcut--moderate-wcag-214--level-a)

---

### `placeholder-only-label` — Critical (WCAG 1.3.1 / 4.1.2 · Level A)

An `<input>` uses only `placeholder` text as its visible label. `placeholder` disappears on input, is not reliably announced as the field's accessible name by screen readers, and fails both WCAG 1.3.1 (Info and Relationships) and 4.1.2 (Name, Role, Value). axe-core misses this at runtime when the component renders inside a `<Suspense>` boundary or before client-side hydration completes.

**Search for:** `<input[^/\n>]*\bplaceholder=`
**In files:** `**/*.tsx, **/*.jsx, **/*.html, **/*.vue, **/*.svelte, **/*.astro`

For each match, inspect the same element block. Flag as a violation only if **none** of the following are present on the element: `aria-label`, `aria-labelledby`, `id` (paired with a `<label for>` elsewhere in the file), `title`.

**Fix:** Add a visually hidden `<label>` (preferred — supports voice control) or `aria-label`.
```tsx
// Option 1 — visually hidden label (preferred: voice control users can target by name)
<label htmlFor="search-input" className="sr-only">Search</label>
<input
  id="search-input"
  type="text"
  placeholder="Search"
  ...
/>

// Option 2 — aria-label (acceptable when no visible label fits the design)
<input
  type="text"
  aria-label="Search"
  placeholder="Search"
  ...
/>
```

**Fix Strategy:** regex-match-then-context-validate
**Fallback:** requires_manual_verification

**Preconditions:**
- Confirm no `aria-label`, `aria-labelledby`, `id`+`<label for>`, or `title` exists on the element before adding a new accessible name.
- Do not add `aria-label` if a visible `<label>` is already present — that creates a name mismatch.

**Do Not Apply If:**
- The input is `type="hidden"` — hidden inputs do not need labels.
- The input is `type="submit"` or `type="button"` — use `value` or `aria-label` on those separately.
- A valid accessible name already exists via `aria-labelledby` pointing to visible text.

**Post-Fix Checks:**
- Re-run targeted scan and verify the input is announced with its label in a screen reader.
- Confirm voice control users can target the field by speaking its label text.

**Framework Notes:**
- **React:** Use `htmlFor` (not `for`) on `<label>`. Pair with a unique `id` on the input. For search bars inside `<Suspense>`, the accessible name must be on the `<input>` itself — `aria-label` is the safest option since the Suspense fallback renders before hydration.
- **Vue:** Use standard `for` attribute on `<label>`. In `<Suspense>` slots, same timing caveat applies — prefer `aria-label` on the input.
- **Angular:** Use `[for]="inputId"` or wrap the input inside the label. For dynamically rendered forms, ensure the label is present in the initial server render.
- **Svelte:** The compiler emits `a11y-label-has-associated-control` for unlabelled inputs — treat compiler warnings as violations. Use standard `<label for='id'>` or wrap the input.
- **Astro:** Apply the label in the component island. Cross-island label associations are not supported — both label and input must be in the same component boundary.

---

### `focus-outline-suppressed` — Serious (WCAG 2.4.7 · Level AA)

An interactive element suppresses the focus ring (outline: none or outline: 0) without providing a visible :focus-visible replacement. Keyboard users lose the visual indicator of where they are.

**Search for:** `outline:\s*none|outline:\s*0|focus:outline-none`
**In files:** `**/*.css, **/*.scss, **/*.sass, **/*.tsx, **/*.jsx`

**Fix:** Remove the outline suppression or replace it with a custom :focus-visible style.
```css
/* Replace with a custom focus indicator: */
button:focus-visible {
  outline: 2px solid var(--color-focus, #005fcc);
  outline-offset: 2px;
}

/* Global reset for mouse users: */
*:focus:not(:focus-visible) { outline: none; }
*:focus-visible {
  outline: 2px solid var(--color-focus, #005fcc);
  outline-offset: 2px;
}
```

**Fix Strategy:** regex-match-then-context-validate
**Fallback:** requires_manual_verification

**Preconditions:**
- Confirm the regex match is a real violation in context before applying a patch.
- Apply the smallest change that resolves the pattern while preserving behavior.
- Ensure a visible :focus-visible indicator exists after removing outline suppression.

**Do Not Apply If:**
- Do not patch matches that are already handled by a higher-level accessibility abstraction.
- Do not remove all focus indicators for keyboard users.
- Do not apply style-impacting changes without explicit visual verification.

**Post-Fix Checks:**
- Re-run targeted scan and manually verify affected flow.
- Tab through interactive elements and confirm a visible focus ring.

**Framework Notes:**
- **React:** Tailwind focus:outline-none is common — replace with focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500.
- **Vue:** Check scoped `<style>` blocks and global CSS. Tailwind/UnoCSS users replace focus:outline-none with focus-visible: variants.
- **Angular:** Check component styles and global styles.css. Angular Material suppresses outlines by default in some themes — override in your theme.
- **Svelte:** Check `<style>` blocks in .svelte files and global CSS. Tailwind users replace focus:outline-none with focus-visible: variants.
- **Astro:** Check global CSS in /src/styles/ and component `<style>` blocks. Tailwind users audit all focus:outline-none instances.

---

### `autoplay-media` — Serious (WCAG 1.4.2 · Level A)

An `<audio>` or `<video>` element has the `autoplay` attribute without being muted. Auto-playing audio interferes with screen readers and is disorienting for users with cognitive disabilities.

**Search for:** `<(?:audio|video)[^>\n]*\bautoplay\b(?![^>]*\bmuted\b)`
**In files:** `**/*.html, **/*.tsx, **/*.jsx, **/*.vue, **/*.svelte, **/*.astro`

**Fix:** Remove `autoplay`, or if the video must autoplay, add `muted` and ensure `controls` is present so the user can pause and adjust volume.
```html
<!-- Before — auto-plays with audio, no controls -->
<video autoplay src="intro.mp4"></video>

<!-- After option 1 — no autoplay -->
<video controls src="intro.mp4"></video>

<!-- After option 2 — silent autoplay with controls -->
<video autoplay muted controls src="intro.mp4"></video>
```

**Fix Strategy:** regex-match-then-context-validate
**Fallback:** requires_manual_verification

**Preconditions:**
- Confirm the regex match is a real violation in context before applying a patch.
- Apply the smallest change that resolves the pattern while preserving behavior.
- If autoplay is retained, require muted and user controls.

**Do Not Apply If:**
- Do not patch matches that are already handled by a higher-level accessibility abstraction.
- Do not leave autoplaying audio without an immediate pause/stop path.

**Post-Fix Checks:**
- Re-run targeted scan and manually verify affected flow.
- Confirm media does not auto-play audible sound on load.

**Framework Notes:**
- **React:** Remove the `autoPlay` prop (React uses camelCase). If required, add `muted` and `controls`: `<video autoPlay muted controls src={src} />`.
- **Vue:** Remove `autoplay` from the element. If required, add `muted controls`: `<video autoplay muted controls :src="src" />`.
- **Angular:** Remove the `autoplay` attribute. Only use `[attr.autoplay]` together with `muted` and `controls` bindings.
- **Svelte:** Remove `autoplay` from `<video>` or `<audio>`. If needed: `<video autoplay muted controls {src}>`.
- **Astro:** Remove `autoplay` from media elements in .astro templates. If required, add `muted controls`.

---

### `orientation-lock` — Moderate (WCAG 1.3.4 · Level AA)

The page calls `screen.orientation.lock()` to restrict display to portrait or landscape mode. Users who mount their device in a fixed position (e.g., on a wheelchair) cannot physically rotate it.

**Search for:** `screen\.orientation\.lock\(|lockOrientation\(`
**In files:** `**/*.ts, **/*.js, **/*.tsx, **/*.jsx, **/*.vue, **/*.svelte`

**Fix:** Remove the orientation lock unless it is essential to the content. If essential, show a non-blocking in-UI notice that the user can dismiss.
```ts
// Before — locks to portrait, breaks mounted devices
screen.orientation.lock('portrait');

// After — remove the lock entirely
// Only if truly essential, show a dismissible notice:
if (isEssentiallyLandscapeOnly && !userDismissedNotice) {
  showOrientationNotice(); // non-blocking banner, not a modal
}
```

**Fix Strategy:** regex-match-then-context-validate
**Fallback:** requires_manual_verification

**Preconditions:**
- Confirm the regex match is a real violation in context before applying a patch.
- Apply the smallest change that resolves the pattern while preserving behavior.
- Allow both portrait and landscape unless orientation lock is essential.

**Do Not Apply If:**
- Do not patch matches that are already handled by a higher-level accessibility abstraction.
- Do not block usage when device orientation cannot be changed.

**Post-Fix Checks:**
- Re-run targeted scan and manually verify affected flow.
- Confirm key flows remain usable in both orientations.

**Framework Notes:**
- **React:** Remove `screen.orientation.lock()` calls from `useEffect` hooks. If a native app wrapper (Capacitor, Expo) sets orientation, configure it only for specific screens.
- **Vue:** Remove from `mounted()` hooks or composables. Check Capacitor/Cordova plugins that may enforce orientation globally.
- **Angular:** Remove from `ngOnInit` or service initialization. Check Ionic platform orientation settings if applicable.
- **Svelte:** Remove from `onMount()`. Check any Capacitor/Cordova integration for orientation lock config.
- **Astro:** This is a client-side JS pattern. Remove from any `<script>` blocks or client-side island components.

---

### `character-key-shortcut` — Moderate (WCAG 2.1.4 · Level A)

An `accesskey` attribute creates single-character keyboard shortcuts that conflict with screen reader and browser shortcuts, with no mechanism for users to remap or disable them.

**Search for:** `\baccesskey=`
**In files:** `**/*.html, **/*.tsx, **/*.jsx, **/*.vue, **/*.svelte, **/*.astro`

**Fix:** Remove `accesskey` attributes. If essential keyboard shortcuts are needed, use multi-key combinations (e.g., Alt+Shift+character) and provide a UI panel where users can view or disable them.
```html
<!-- Before — single-character shortcut, no override mechanism -->
<button accesskey="s">Save</button>

<!-- After option 1 — remove accesskey -->
<button type="button">Save</button>

<!-- After option 2 — multi-key shortcut with disclosure -->
<button
  type="button"
  aria-keyshortcuts="Alt+Shift+S"
  title="Save (Alt+Shift+S)">
  Save
</button>
```

**Fix Strategy:** regex-match-then-context-validate
**Fallback:** requires_manual_verification

**Preconditions:**
- Confirm the regex match is a real violation in context before applying a patch.
- Apply the smallest change that resolves the pattern while preserving behavior.
- Prefer removing accesskey or provide remap/disable mechanism for shortcuts.

**Do Not Apply If:**
- Do not patch matches that are already handled by a higher-level accessibility abstraction.
- Do not introduce single-character shortcuts without user override.

**Post-Fix Checks:**
- Re-run targeted scan and manually verify affected flow.
- Confirm no conflicting single-key shortcut remains active.

**Framework Notes:**
- **React:** Remove the `accessKey` prop (React camelCase). For custom shortcuts, implement a `useKeyboardShortcut` hook using modifier keys (Alt+Shift+key).
- **Vue:** Remove `accesskey` from template elements. For custom shortcuts, use `@keydown` with modifier checks (e.g., `Alt+Shift`).
- **Angular:** Remove `accesskey` from templates. For custom shortcuts, use Angular CDK keyboard events with modifier keys.
- **Svelte:** Remove `accesskey` from markup. For custom shortcuts, use `on:keydown` with modifier key guards.
- **Astro:** Remove `accesskey` from .astro template elements and any component files.

---

## Compound Violations

Compound violations occur when two or more axe-core findings share the same code block. Fixing them independently — as if they were unrelated — can delete business logic, create new violations, or produce fixes that are technically correct in isolation but broken in context.

**Rule before applying any fix:** When a finding's flagged element contains event handlers with non-ARIA conditional logic (drag state, position thresholds, gesture flags, numeric offsets, business state variables), those handlers must be preserved. Remove only the invalid ARIA. Never use the presence of bad ARIA as justification for deleting the interaction.

---

### Case 1 — `nested-interactive` + `link-as-button`

**Trigger:** `nested-interactive` fires AND the nested `<a>` calls `e.preventDefault()` and runs a JS action instead of navigating.

**Wrong fix:** Delete `role="option"` / `aria-selected` AND the container `onClick` in one pass.

**Correct fix:**
1. Remove invalid ARIA from the container (`role`, `aria-selected`, `aria-checked`, etc.)
2. Replace with the semantically correct attribute — `aria-current`, `aria-pressed`, or a proper `role="listbox"` parent
3. Preserve all `onClick`/`onKeyDown` handlers that contain non-ARIA conditions
4. Fix the link separately: no navigation → convert to `<button type="button">`; conditional navigation → keep `<a href>` and remove `e.preventDefault()`

```tsx
// Before — two violations sharing one block
<div
  role="option"                              // invalid: no listbox parent
  aria-selected={isCurrent}
  onClick={() => {
    if (!isDragging && Math.abs(dragOffset) < 5) selectProduct(index); // business logic
  }}
>
  <a href="/product" onClick={(e) => {
    if (!isCurrent) { e.preventDefault(); selectProduct(index); } // link-as-button
  }}>...</a>
</div>

// After — ARIA fixed, business logic intact
<div
  aria-current={isCurrent ? "true" : undefined}
  onClick={() => {
    if (!isDragging && Math.abs(dragOffset) < 5) selectProduct(index); // preserved
  }}
>
  <button type="button" onClick={() => { if (!isCurrent) selectProduct(index); }}>
    ...
  </button>
</div>
```

---

### Case 2 — `scrollable-region-focusable` + managed carousel

**Trigger:** `scrollable-region-focusable` fires on a scroll container that is rendered and managed by Swiper, Embla, or Splide.

**Wrong fix:** Add `tabindex="0"` directly to the scroll container element.

**Correct fix:** Enable the library's built-in accessibility configuration. The library owns the focusability of its container — manual `tabindex` will conflict with its internal state management.

```js
// Swiper
new Swiper('.swiper', { a11y: { enabled: true } });

// Embla — focusability is controlled via CSS and the library's scroll snap config
// Add tabindex via the library's options, not inline

// Splide
new Splide('.splide', { accessibility: true });
```

---

### Case 3 — `color-contrast` + CSS custom property

**Trigger:** `color-contrast` fires AND the computed failing color originates from a CSS custom property (`var(--color-something)`).

**Wrong fix:** Inline the hardcoded computed value at the point of use.

**Correct fix:** Trace the variable to its definition point (`:root`, theme file, `tailwind.config.js`, or `@theme` block) and update the value there. Inlining a hardcoded color creates a maintenance split — the token continues to be used elsewhere at its old value.

```css
/* Before — token fails at 3.2:1 */
:root { --color-muted: #8e8a86; }
.subtitle { color: var(--color-muted); }

/* Wrong fix — inline only */
.subtitle { color: #5e5b58; } /* now out of sync with the token */

/* Correct fix — update the token */
:root { --color-muted: #5e5b58; } /* verify ratio ≥4.5:1 before committing */
```

---

### Case 4 — `duplicate-id-aria` + dynamic list

**Trigger:** `duplicate-id-aria` fires and the flagged `id` is inside a `.map()`, `v-for`, `*ngFor`, or `{#each}` block — all iterations share the same static ID.

**Wrong fix:** Change the ID of only the one flagged instance.

**Correct fix:** Make all iterations unique by incorporating the index or a unique item key into the ID.

```tsx
// Before — all items render id="product-desc", all duplicates
{products.map((p) => (
  <div id="product-desc" aria-describedby="product-desc">...</div>
))}

// After — unique per item
{products.map((p, i) => (
  <div id={`product-desc-${p.id ?? i}`} aria-describedby={`product-desc-${p.id ?? i}`}>...</div>
))}
```

---

### Case 5 — `button-name` + existing tooltip or `title`

**Trigger:** `button-name` fires on an icon-only button AND the button already has a `title` attribute or is wrapped by a tooltip component that provides the accessible name.

**Wrong fix:** Add a redundant `aria-label` that duplicates the tooltip text — this creates double-announcement on screen readers.

**Correct fix:** Convert `title` to `aria-label` (title is unreliable for AT), or confirm the tooltip component exposes `aria-labelledby` pointing to its text. One accessible name source is enough.

```tsx
// Before — title ignored by most AT, button-name fires
<button title="Close dialog"><XIcon aria-hidden /></button>

// Wrong fix — double-announces "Close dialog Close dialog"
<button title="Close dialog" aria-label="Close dialog"><XIcon aria-hidden /></button>

// Correct fix — single source
<button aria-label="Close dialog"><XIcon aria-hidden /></button>
```

---

### Case 6 — `aria-required-attr` on a managed component

**Trigger:** `aria-required-attr` fires on a component rendered by Radix, Headless UI, Ariakit, React Aria, shadcn, or another managed library.

**Wrong fix:** Add the missing ARIA attribute directly to the rendered DOM element.

**Correct fix:** The library manages ARIA internally — pass the required value via the component's prop API. Direct DOM ARIA attributes are overwritten by the library at runtime or create conflicts with its internal state.

```tsx
// Before — direct DOM attribute, overwritten by Radix at runtime
<Radix.Switch aria-checked={checked} />

// Correct fix — use the library's controlled prop
<Radix.Switch checked={checked} onCheckedChange={setChecked} />
// Radix sets aria-checked automatically from the `checked` prop
```
