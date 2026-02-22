---
name: a11y
description: Detects and fixes WCAG 2.2 AA accessibility violations on websites using automated scanning (axe-core + Playwright). Use when requested to audit a URL for WCAG compliance or fix accessibility issues. Do not use for performance audits, SEO checks, or non-web platforms.
compatibility: Requires Node.js 18+, pnpm, and internet access. Playwright + Chromium are auto-installed on first run.
license: Proprietary (All Rights Reserved)
metadata:
  author: diegovelasquezweb
  version: "0.7.0"
---

# Web Accessibility Audit — Agent Playbook

## Initialization

Before the first audit, ensure the `/a11y` slash command is available by initializing the project-level workflow. See [references/platform-setup.md](references/platform-setup.md) for full technical specifications for each agent.

**If missing**:

1. Identify your environment (Antigravity, Windsurf, etc.).
2. Create the appropriate workflow directory (e.g., `.agent/workflows/` or `.windsurf/workflows/`).
3. Write the `a11y.md` workflow file using the template defined in [references/platform-setup.md](references/platform-setup.md).

---

## Constraints

These rules apply at all times, independent of any workflow step.

- Never install, remove, or initialize packages in the user's project. The skill has its own `node_modules` — only run `pnpm install` inside the skill directory, never in the audited project.
- All internal pipeline files (scan results, findings JSON, remediation guide, screenshots) are stored inside the skill directory — never in the user's project.
- Visual reports (HTML/PDF) are only created when the user explicitly requests them, at a location the user chooses.
- Never modify engine scripts (`scripts/*.mjs`) to hardcode project-specific exclusions.
- Never declare "100% accessible" based on a targeted audit. Only a Final Certification Audit can confirm that.
- Never modify the user's `.gitignore` without asking first.

**Platform quirks**: See [references/platform-setup.md](references/platform-setup.md) for Antigravity, Windsurf, Codex, and Gemini CLI notes.

## Communication Rules

Follow these rules for every message to the user:

1. **Use closed questions** — prefer yes/no or multiple choice over open-ended questions. This reduces ambiguity and errors. Always present options as a **numbered vertical list** (1, 2, 3…), never as inline bullets.
2. **Be concise and technical** — no filler, no over-explaining. State what you found, what you propose, and ask for a decision.
3. **Always provide options** — never ask "what do you want to do?" without listing concrete choices.
4. **Explain the "why"** — when presenting a fix or a choice, briefly state why it matters (user impact, legal risk, design implications).
5. **One question per message** — don't stack multiple decisions in a single message. Let the user answer one thing at a time.
6. **Always acknowledge the effort** — at the final delivery (Step 4), close with a brief, genuine acknowledgment of the user's investment in accessibility — regardless of whether they fixed every issue. The user may choose to skip style fixes or defer some items, and that's perfectly fine. Example: _"Great work investing in accessibility — this directly improves the experience for users with disabilities."_ Adapt the wording naturally, but never skip it.

Every user-facing message in the workflow below is a template. Follow the tone and structure — adapt the data, keep the format.

## Workflow

Follow these steps sequentially when the user requests an audit. Copy this checklist and track your progress:

```
Audit Progress:
- [ ] Step 1: Check sitemap + run audit
- [ ] Step 2: Present findings and request permission
- [ ] Step 3a: Structural fixes (Critical → High → Medium → Low)
- [ ] Step 3b: Style-dependent fixes (with explicit approval)
- [ ] Step 3c: Manual checks
- [ ] Step 3d: Verification re-audit (automatic)
- [ ] Step 4: Deliver results + offer final reports
```

### Step 1 — Run the audit

If the user did not provide a URL, ask for it before proceeding:

> "What URL should I audit? For example: `https://mysite.com` or `localhost:3000`."

The `--base-url` flag requires a full URL with protocol. Normalize the user's input before running:

- `"localhost:3000"` → `http://localhost:3000`
- `"mysite.com"` → `https://mysite.com`
- `"https://example.com"` → use as-is

**Sitemap pre-check**: Before running the audit, check if the site has a sitemap by fetching `<URL>/sitemap.xml`. Adapt the message based on the result:

If sitemap **found**:

> "Found `sitemap.xml` — I'll scan all pages listed in it. Starting the audit now."

If sitemap **not found**:

> "No `sitemap.xml` found. I'll crawl links starting from the homepage — up to **10 pages** by default. If you want more, tell me the number (e.g. 30) or give me specific routes (e.g. `/,/about,/contact`)."

If the user adjusts scope, add the corresponding `--max-routes` or `--routes` flags. Otherwise, proceed with defaults.

Run the audit:

```bash
node scripts/run-audit.mjs --base-url <URL>
```

If the user's project is local and you want framework/library auto-detection to work, add `--project-dir`:

```bash
node scripts/run-audit.mjs --base-url <URL> --project-dir <path-to-project>
```

After the scan completes, parse `REMEDIATION_PATH` from the script output and read that file. This is the internal remediation guide — use it for context when presenting findings and suggesting fixes. **Do not share the internal file path with the user.**

Present findings inline in the conversation (Step 2). No files are created in the user's project at this point.

If the script fails (network error, Chromium crash, timeout):

> "The audit failed: `[error message]`. This could be a network issue, the site may be down, or the URL may be incorrect. Would you like me to:
>
> 1. **Retry** the same URL
> 2. **Try a different URL**
> 3. **Skip** and troubleshoot manually"

### Step 2 — Present findings and request permission

Read the remediation guide (from `REMEDIATION_PATH`) and:

1. Summarize findings by severity (Critical → High → Medium → Low).
2. Propose the specific fixes from the remediation guide.
3. Group by component or page area, explaining _why_ each fix is needed.
4. Ask the user how to proceed:

> "I found 12 accessibility issues (3 Critical, 5 High, 4 Medium). How would you like to proceed?
>
> 1. **Severity by severity** (recommended) — I'll fix one severity group at a time with a checkpoint after each so you can verify. Safest approach.
> 2. **Fix all structural** — I'll apply all structural fixes (ARIA, alt text, labels, DOM order) at once. Style changes (colors, font sizes) will still require your approval separately.
> 3. **Only critical** — fix only Critical severity issues for now."

The default behavior (if the user just says "fix" or "go ahead") is **severity by severity**.

For finding field requirements and deliverable format, see [references/report-standards.md](references/report-standards.md).

If the audit found **0 automated issues**, skip Step 3 and go directly to Step 4:

> "No automated accessibility issues detected — your site passes WCAG 2.2 AA automated checks. Keep in mind that automated tools catch roughly 30–50% of accessibility barriers. I recommend verifying the manual checks I'll list next."

If the user declines:

> "Understood. Keep in mind that these 12 issues currently prevent users who rely on screen readers, keyboard navigation, or assistive technology from using parts of your site. Unresolved violations may also expose legal risk under ADA, EAA, or EN 301 549. I can revisit these fixes anytime — just ask."

### Step 3 — Fix

Work through each phase below in order.

> **Style-dependent protection**: Style fixes (color-contrast, font-size, spacing) **always require explicit approval with the exact changes shown** — regardless of what the user chose in Step 2. This prevents unintended visual regressions.

**3a. Structural fixes by severity** (Critical → High → Medium → Low):

These are safe to apply — they don't affect visual appearance (HTML attributes, ARIA roles, DOM order, alt text, labels, lang attributes).

If the user chose **severity by severity** (default):

1. Apply one severity group at a time.
   - Use "Search in" glob patterns and the "Fixes by Component" table to locate and batch edits per file.
   - If a finding has a "Managed Component Warning", verify the element is not rendered by a UI library before applying ARIA fixes.
   - For framework and CMS file locations, see [references/source-patterns.md](references/source-patterns.md).
2. Checkpoint — list every file modified and fix applied, ask the user to verify visually.

   > "Critical fixes applied — 3 files modified (`Header.tsx`, `Nav.astro`, `Footer.tsx`). Please verify visually. Ready to proceed with High severity fixes? (yes/no)"

3. Repeat for each remaining severity group.

If the user chose **fix all structural**: apply all severity groups in a single pass, then report all modified files at once:

> "All structural fixes applied — 8 files modified across 12 issues. Here's the full list:
>
> 1. `Header.tsx`: added `aria-label` to nav, fixed heading hierarchy
> 2. `Footer.astro`: added `role="contentinfo"`, missing `lang` attribute
> 3. `Card.tsx`: added `alt` text to images
> 4. _(etc.)_
>
> Please verify visually. Ready to continue with style-dependent fixes? (yes/no)"

**3b. Style-dependent fixes** (color-contrast, font-size, spacing):

These can change the site's appearance. **Always show the exact proposed changes and wait for explicit approval**, even if the user previously said "fix all". Never modify visual properties without the user seeing the change first.

Example:

> "I found 3 style-dependent issues that affect your site's visual design. These require your review:
>
> 1. `color-contrast` on `.hero-title`: change `color` from `#999` → `#595959` (contrast ratio 3.2:1 → 7:1)
> 2. `color-contrast` on `.nav-link`: change `color` from `#aaa` → `#767676`
> 3. `font-size` on `.fine-print`: change from `10px` → `12px`
>
> Should I apply these changes? (yes / no / let me pick which ones)"

**3c. Manual checks**:

Process the "WCAG 2.2 Static Code Checks" section from the remediation guide:

1. Search the project source for each pattern. Skip checks that don't apply.
2. Present confirmed violations as a batch and wait for permission before applying:

> "I found 2 additional issues from static code analysis that the automated scanner can't detect:
>
> 1. `ProductCard.tsx:45` — `<div onClick={...}>` used as a button without keyboard support. Should be a `<button>` or add `role="button"`, `tabIndex={0}`, and `onKeyDown`.
> 2. `Modal.tsx:12` — focus is not trapped inside the modal when open. Users can Tab to elements behind the overlay.
>
> Should I fix these? (yes / no / let me pick which ones)"

**3d. Verification re-audit** (automatic — no user input needed):

Re-run the audit to confirm all fixes are clean:

```bash
node scripts/run-audit.mjs --base-url <URL>
```

If the audit is clean, proceed to Step 4. If **new issues or regressions** appear (not previously seen), present them and restart from 3a. Issues the user already declined do not trigger a restart.

> "The verification re-audit found 2 new issues that weren't in the original scan — likely caused by the fixes we applied:
>
> 1. `heading-order` on `/about`: the `<h2>` we added created a gap in heading hierarchy (missing `<h3>`).
> 2. `aria-required-attr` on `SearchForm.tsx`: the `role="combobox"` we added requires `aria-expanded`.
>
> I'll fix these now and re-verify."

### Step 4 — Deliver results

1. Summarize: total issues found, issues resolved, files modified, remaining issues (if any).
2. If all issues are resolved, confirm the site now passes WCAG 2.2 AA automated checks.
3. Present manual verification checks the user must perform. These cannot be automated — list only the ones relevant to the project. **Include a brief introduction explaining why these checks matter:**

> "The automated audit is complete. However, automated tools can only catch **30–50% of real accessibility barriers**. The remaining issues require human judgment — things like whether a screen reader announcement actually makes sense, or whether the tab order feels logical. These checks are critical because they reflect how real users with disabilities experience your site:
>
> 1. **Keyboard navigation**: Can you Tab through all interactive elements? Is the focus ring visible? _(~15% of users rely on keyboard-only navigation)_
> 2. **Focus order**: Does the tab sequence follow a logical reading order? _(Disorienting order is one of the most common usability complaints from assistive tech users)_
> 3. **Screen reader**: Do page announcements make sense? (Test with VoiceOver on macOS or NVDA on Windows) _(The only way to verify that your semantic HTML actually communicates intent)_
> 4. **Motion & animation**: Can users who are sensitive to motion use the site comfortably? (Check `prefers-reduced-motion`) _(Affects users with vestibular disorders — can trigger nausea or seizures)_
> 5. **Zoom**: Does the page remain usable at 200% browser zoom? _(Required by WCAG 1.4.4 — affects users with low vision)_"

4. Offer to generate visual reports reflecting the final state:

> "Would you like me to generate visual reports?
>
> 1. **HTML Dashboard** — interactive web report with the updated compliance score.
> 2. **PDF Executive Summary** — formal document to share with clients or stakeholders.
> 3. **Both**
> 4. **No thanks**"

5. If the user requests reports, ask where to save them (**first time only** — reuse the choice on subsequent requests):

> "Where should I save the reports?
>
> 1. `./audit/` (default)
> 2. Custom path"

Then ask about `.gitignore` (first time only):

> "Should I add that folder to your `.gitignore`? (yes/no)"

Generate and open the requested reports:

```bash
# HTML only
node scripts/build-report-html.mjs --output <user-path>/report.html --base-url <URL>
open <user-path>/report.html

# PDF (requires HTML first)
node scripts/build-report-html.mjs --output <user-path>/report.html --base-url <URL>
node scripts/build-report-pdf.mjs <user-path>/report.html <user-path>/report.pdf
open <user-path>/report.pdf

# Both
node scripts/build-report-html.mjs --output <user-path>/report.html --base-url <URL>
node scripts/build-report-pdf.mjs <user-path>/report.html <user-path>/report.pdf
open <user-path>/report.html
open <user-path>/report.pdf
```

6. Recommend next steps: schedule periodic re-audits, test with screen readers, or conduct manual user testing.

Example (complete):

> "All 12 issues resolved across 7 files. Your site now passes WCAG 2.2 AA automated checks. Please verify the 5 manual checks above before considering the audit complete. Great work investing in accessibility — this directly improves the experience for users with disabilities and strengthens your legal compliance."

## Edge Cases

### Authentication & Restricted Pages

1. Do not guess credentials or attempt brute-force access.
2. Report the blocker: list routes that returned 401/403 or redirected to login.
3. Ask the user: provide session cookies, test credentials, or skip those routes.
4. If credentials are provided, use them for the audit session only — do not persist to disk.
5. Note skipped routes in the report under "Not Tested — Auth Required."

### Multi-Viewport Testing

1. The auditor uses a single viewport by default. For responsive testing, use `--viewport 375x812` (WIDTHxHEIGHT).
2. Only the first viewport is used per audit — run separate audits for each viewport.
3. Only flag viewport-specific findings when a violation appears at one breakpoint but not another.

**Troubleshooting**: If a command fails, see [references/troubleshooting.md](references/troubleshooting.md) to self-correct before asking the user.

## CLI Reference

All configuration is passed via CLI flags. Run `node scripts/run-audit.mjs --help` for the full list.

Common flags:

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--base-url <url>` | Target website (required) | — |
| `--project-dir <path>` | User's project path (for auto-detection) | — |
| `--max-routes <num>` | Max routes to crawl | `10` |
| `--crawl-depth <num>` | Link crawl depth (1-3) | `2` |
| `--routes <csv>` | Specific paths to scan | — |
| `--framework <val>` | Override detected framework | auto |
| `--ignore-findings <csv>` | Axe rule IDs to silence | — |
| `--exclude-selectors <csv>` | CSS selectors to skip | — |
| `--viewport <WxH>` | Viewport dimensions | `1280x800` |
| `--color-scheme <val>` | `light` or `dark` | `light` |
| `--headed` | Show browser window | headless |
| `--only-rule <id>` | Check one specific rule | — |
