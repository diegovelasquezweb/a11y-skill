# Source Code Pattern Audit

> These patterns are not detectable by axe-core at runtime. Use the search regex to grep source files and apply the fixes wherever the pattern is found.
> Apply the framework-specific note that matches the detected project stack.

## Table of Contents

- [`focus-outline-suppressed` — Serious (WCAG 2.4.7 · Level AA)](#focus-outline-suppressed--serious-wcag-247--level-aa)
- [`autoplay-media` — Serious (WCAG 1.4.2 · Level A)](#autoplay-media--serious-wcag-142--level-a)
- [`orientation-lock` — Moderate (WCAG 1.3.4 · Level AA)](#orientation-lock--moderate-wcag-134--level-aa)
- [`character-key-shortcut` — Moderate (WCAG 2.1.4 · Level A)](#character-key-shortcut--moderate-wcag-214--level-a)

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
