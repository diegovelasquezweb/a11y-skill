---
name: a11y
description: "Audits and fixes website accessibility (WCAG 2.2 AA) using automated scanning (axe-core + Playwright). Use when the user asks to audit a URL for accessibility, check WCAG compliance, fix a11y issues, test screen reader support, verify keyboard navigation, check color contrast, fix ARIA attributes, add alt text, fix heading hierarchy, improve focus management, check ADA/WCAG compliance, or generate an accessibility report. Trigger keywords: accessibility, a11y, WCAG, ADA, screen reader, assistive technology, accessibility audit, color contrast, alt text, ARIA. Do NOT use for performance audits, SEO, Lighthouse scores, or non-web platforms."
compatibility: Requires Node.js 18+, pnpm (npm as fallback), and internet access. Playwright + Chromium are auto-installed on first run.
license: MIT
metadata:
  author: diegovelasquezweb
  version: "0.10.0"
---

# Web Accessibility Audit — Agent Playbook

## Resource Map

Load these files on demand — never preload all at once.

| Resource                          | Load when                                     | Path                                                             |
| --------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| Report & evidence standards       | Step 3 — presenting findings · Step 6 item 1 — console summary | [references/report-standards.md](references/report-standards.md) |
| Source file patterns by framework | Step 4a — locating files to fix               | [references/source-patterns.md](references/source-patterns.md)   |
| CLI flags reference               | Before running audit — need non-default flags | [references/cli-reference.md](references/cli-reference.md)       |
| Quality gates                     | Any phase boundary — verifying gate pass/fail | [references/quality-gates.md](references/quality-gates.md)       |
| Troubleshooting                   | Any script failure                            | [references/troubleshooting.md](references/troubleshooting.md)   |
| Out of scope (manual testing)     | Step 6 item 7 — checklist export             | [references/out-of-scope.md](references/out-of-scope.md)         |
| Source code patterns              | Step 4c — pattern grep + fix                 | [references/code-patterns.md](references/code-patterns.md)       |

## Constraints

These rules apply at all times, independent of any workflow step.

- Never install, remove, or initialize packages in the user's project. Only run `pnpm install` inside the skill directory.
- All pipeline files (scan results, findings, remediation guide, screenshots) stay inside the skill directory — never in the user's project.
- Visual reports (HTML/PDF) are only created in Step 6, after the user explicitly requests them. Never generate reports in any other step.
- Never modify engine scripts (`scripts/*.mjs`) to hardcode project-specific exclusions.
- Never declare "100% accessible" based on a targeted audit. Only a comprehensive full-site verification can confirm that.
- Treat scripts as black boxes: run with `--help` to discover flags. Do not read script source — it consumes context budget for no benefit.
- If `pnpm` is not available, use `npm` as fallback.
- Never add, remove, or modify CLI flags (`--exclude-selectors`, `--timeout-ms`, `--wait-ms`, etc.) without the user explicitly requesting it.
- Only modify frontend files (components, templates, stylesheets). Never propose fixes to server configuration, infrastructure, or backend files (e.g., `wp-config.php`, `.env`, `nginx.conf`). If the root cause of a finding lies outside the frontend, report it to the user without proposing a fix.

## Communication Rules

1. **Language** — always communicate in English, regardless of the language the user writes in.
2. **Tone** — concise and technical. State findings, propose action, ask for a decision.
3. **Internal steps** — never expose internal step labels, phase codes, or workflow reasoning to the user. This includes codes like "4b", phase names like "Step 4c" or "Source Code Pattern Audit", and internal logic like "not re-offering" or "user declined in 4b". Always describe outcomes in plain language only. **Never pre-announce a sequence of steps** ("first I'll do X, then Y, then Z") — execute immediately and let the output speak for itself.
4. **Recovery** — if the user types `continue`, `resume`, or `where are we`, read the conversation history to determine the current state and resume from the next pending action. If the state cannot be determined, briefly summarize what was completed and ask where to continue from.
5. **Message tags** — this playbook uses two tags to mark formatted messages:
   - `[QUESTION]` — a user-facing question with numbered options. Adapt tone and structure but keep the same options. **Send one `[QUESTION]` per message. Never present two questions at once. Always wait for the user's answer before showing the next question.** Format: always output the question text on its own line, followed by each option as a numbered item on its own line — never inline, never collapsed to "Yes/No". A `[QUESTION]` is the only tag that ends the agent's turn and waits for user input.
   - `[MESSAGE]` — a mandatory pre-written message. **You MUST output the exact text — never skip, rephrase, summarize, or adapt it.** Skipping a `[MESSAGE]` block is not allowed under any circumstance. Output it as a **visually distinct paragraph** — never inline or merged with surrounding content. **A `[MESSAGE]` does NOT end the agent's turn. Do not wait for user input after it. Immediately output whatever comes next in the same response.**
6. **Data-first** — if the user's message already contains the answer to a pending question (URL scheme, discovery method, page count, save path, etc.), skip that question and proceed directly. Never ask for information already provided in the current turn.

---

## Workflow

Follow these steps sequentially — **never skip a step**, even if the user provides information ahead of time. Every step must execute in order. Copy this checklist and track progress:

```
Progress:
- [ ] Step 1: Page discovery
- [ ] Step 2: Run audit
- [ ] Step 3: Present findings + request permission
- [ ] Step 4: Fix (structural → style → code patterns)
- [ ] Step 5: Verification re-audit
- [ ] Step 6: Deliver results
```

### Step 1 — Page discovery

**Hard stop — URL required before anything else.** If no URL is present in the current message, ask: *"What URL should I audit?"* and wait for the answer. Do not ask about pages, sitemap, or any other topic until a URL is confirmed.

Once the user provides a URL, normalize it before passing to `--base-url`:

- `localhost:3000` → `http://localhost:3000`
- `mysite.com` → `https://mysite.com`
- Full URLs → use as-is.

Once the URL is confirmed, silently fetch `<URL>/sitemap.xml`:

- **Found** — inform the user ("Found a sitemap with N pages — using it for the audit") and proceed to Step 2. No question needed.
- **Not found** — proceed silently to the scope question below. Do not mention the sitemap attempt.

If the user mentions "sitemap" at any point, use it directly (Data-first rule) — skip the scope question.

`[QUESTION]` **How many pages should I crawl?**

1. **10 pages** — covers main page types, fast
2. **All reachable pages** — comprehensive, may take several minutes on large sites
3. **Custom** — tell me the exact number

If Custom: ask in plain text — "How many pages?" — and wait for a number. Do not show a new [QUESTION] with options. Store the number and proceed to Step 2.

Store the user's choice. Proceed to Step 2.

### Step 2 — Run the audit

Run the audit with the discovery settings from Step 1:

```bash
# Sitemap detected or user mentioned sitemap
node scripts/audit.mjs --base-url <URL>

# Crawler — 10 pages (default, omit flag)
node scripts/audit.mjs --base-url <URL>

# Crawler — all reachable pages
node scripts/audit.mjs --base-url <URL> --max-routes 999

# Crawler — custom count
node scripts/audit.mjs --base-url <URL> --max-routes <N>
```

For local projects with framework auto-detection, add `--project-dir <path>`. For non-default flags, load [references/cli-reference.md](references/cli-reference.md).

After completion, parse `REMEDIATION_PATH` from script output and read that file. **Fallback**: if `REMEDIATION_PATH` is absent in the output, read `.audit/remediation.md` directly. Do not share internal file paths with the user.

Proceed to Step 3.

If the script fails, consult [references/troubleshooting.md](references/troubleshooting.md) to self-correct before asking the user. If unrecoverable, offer: (1) Retry, (2) Different URL, (3) Skip and troubleshoot manually. After resolving, proceed to Step 3.

### Step 3 — Present findings and request permission

Load [references/report-standards.md](references/report-standards.md) for finding field requirements and deliverable format.

Read the remediation guide. The audit pipeline has already handled deduplication, false positive filtering, and computed the Overall Assessment — read these directly from the report.

Apply your own judgment using this decision tree to override severity when the automated classification is inaccurate:

```
Can the user complete the task?
├── No → Is there a workaround?
│        ├── No → CRITICAL
│        └── Yes, but difficult → SERIOUS
└── Yes → Is the experience degraded?
          ├── Significantly → MODERATE
          └── Slightly → MINOR
```

Apply consistently — same issue type = same severity across all findings.

Then summarize and present:

1. State the **Overall Assessment** from the report header. Follow with a count by severity (Critical → Serious → Moderate → Minor).
2. Propose specific fixes from the remediation guide.
3. Group by component or page area, explaining why each fix matters.
4. Ask how to proceed:

`[QUESTION]` **How would you like to proceed?**

1. **Fix by severity** — Critical first, then Serious → Moderate → Minor
2. **Fix by category** — group by issue type (aria · forms · structure · color…)
3. **Other criteria** — tell me how you'd like to prioritize the fixes
4. **Skip fixes** — don't fix anything right now

Default (if user says "fix" or "go ahead") is **Fix by severity**. If the user chooses **Fix by severity**, **Fix by category**, or **Other criteria**, proceed immediately to Step 4.

If the user chooses **Skip fixes** (option 4): present the following message, then proceed to Step 6 immediately.

`[MESSAGE]` Understood. Keep in mind that the unresolved issues affect real users — screen reader users may not be able to navigate key sections, and keyboard-only users could get trapped. Accessibility is also a legal requirement under ADA Title II (US), Section 508 (US Federal), the European Accessibility Act (EU), the UK Equality Act, and the Accessible Canada Act, among others. These findings will remain available if you decide to revisit them later.

**0 issues found** → proceed to Step 6 immediately. Note: automated tools cannot catch every barrier; recommend manual checks.

### Step 4 — Fix

Work through each phase in order: **4a → 4b → 4c**. All three phases must run — never skip a phase because the user declined fixes in a previous one.

- **Fix by severity** (default): process findings Critical → Serious → Moderate → Minor across all categories.
- **Fix by category**: group findings by their `Category` field from the remediation guide. Order groups by the highest severity present within each category. Within each group, still apply the 4a/4b boundary — structural fixes first, then style fixes (with the style approval gate). Present one category at a time.
- **Other criteria**: follow the user's specified prioritization throughout.

> **Category values:** `aria` · `text-alternatives` · `forms` · `keyboard` · `structure` · `semantics` · `name-role-value` · `tables` · `color` · `language` · `parsing` · `sensory`

#### 4a. Structural fixes (Critical → Serious → Moderate → Minor)

Safe to apply — no visual changes (ARIA attributes, alt text, labels, DOM order, lang, heading hierarchy).

> **Scope boundary**: 4a covers only non-visual fixes. Color contrast, font-size, spacing, and any CSS/style property changes are **always** handled in 4b — regardless of their axe severity level. If a Critical or Serious finding involves a color or visual property, set it aside for 4b. Do not apply it here.

If there are no structural findings to fix, skip directly to 4b.

Load [references/source-patterns.md](references/source-patterns.md) to locate source files by detected framework. Use each finding's remediation intelligence (`fix_description`, `fix_code`, framework notes, and evidence) as the source of truth for fixes.

- Use glob patterns and the "Fixes by Component" table from the remediation guide to batch edits per file.
- If a finding has a "Managed Component Warning", verify the element is not rendered by a UI library before applying ARIA fixes.

Present one group at a time — list the findings and proposed changes, then ask. The `[QUESTION]` label depends on the active mode:

- **Fix by severity**: `[QUESTION]` **Apply these [severity] fixes?**
- **Fix by category**: `[QUESTION]` **Apply these [category] fixes?**
- **Other criteria**: adapt the label to match the user's specified grouping.

1. **Yes** — apply all proposed changes
2. **Let me pick** — show me the full list, I'll choose by number
3. **No** — skip this group

If **No**: skip to the next group (or 4b if this was the last).

If **Let me pick**: present all fixes as a numbered list. Ask the user to type the numbers they want applied (e.g. `1, 3` or `all`), or type `back` to return. If `back`: return to the group question. Otherwise apply the selected fixes, list changes made, then ask the verification question below.

If **Yes** or after **Let me pick** completes: list the files and changes made, then ask:

`[QUESTION]` **Please verify visually — does everything look correct?**

1. **Looks good**
2. **Something's wrong** — tell me what to revert or adjust

If **Looks good**: proceed to the next group, or to 4b if this was the last. If **Something's wrong**: apply corrections, then proceed to the next group (or 4b if last).

#### 4b. Style-dependent fixes (color-contrast, font-size, spacing)

If there are no style-dependent findings (color-contrast, font-size, or spacing), skip directly to 4c.

> **Style-dependent protection — hard stop**: these fixes change the site's appearance. **Never apply any style change before showing the exact proposed diff and receiving an explicit "yes".** This gate applies even if the user previously said "fix all" and even if the finding is Critical severity. No exceptions.

Open with: **"Structural fixes done — reviewing color contrast, font sizes, and spacing. Changes here will affect the visual appearance of your site."** Then show all style changes using this exact format:

```
Root cause: [problem description with actual values and ratios — e.g. "--color-pewter (#8E8A86) renders at 3.22:1 against --color-soft-white (#F8F8F8). Minimum required is 4.5:1 for normal text."]
Affected elements:
[/page-path] — [element descriptions with selector/class]

Proposed change — [file path]:
· --token-name: current value (#hex) → proposed value (#hex)  (X.XX:1 → ~Y.YY:1)

Scope: [explain whether this is a global token or a local change, and what other elements it affects]
```

Then ask:

`[QUESTION]` **Apply these style changes?**

1. **Yes** — apply all proposed changes
2. **Let me pick** — show me the full list, I'll choose by number
3. **No** — skip style fixes

If **No**: your very next action is the first tool call of 4c — reading `references/code-patterns.md`. Do not output any text, transition phrase, or acknowledgment before that tool call. 4c always runs regardless of what happened in 4b. Never skip to Step 5 from 4b.

If **Let me pick**: present all style changes as a numbered list with their diffs. Ask the user to type the numbers they want applied (e.g. `1, 3` or `all`), or type `back` to return. If `back`: return to the `[QUESTION]` **Apply these style changes?** prompt. Otherwise apply the selected changes, list files and exact values modified, then ask the verification question below.

If **Yes** or after **Let me pick** completes: list the files and exact values modified, then ask:

`[QUESTION]` **I've applied the style changes. Please verify visually — does everything look correct?**

1. **Looks good**
2. **Something's wrong** — tell me what to revert or adjust

If **Looks good**: your very next action is the first tool call of 4c — reading `references/code-patterns.md`. No text before it. If **Something's wrong**: apply corrections, then proceed to 4c the same way.

#### 4c. Source code patterns

**This step runs automatically — no user confirmation needed. Do not output any text before scanning.** The very first action is a tool call: read `references/code-patterns.md`. Output begins only after the scan is complete and results are ready to present.

Each entry has a `Search for` regex and `In files` glob — use these to grep the project source. Apply the framework note matching the detected stack:

1. For each pattern, search the project source using the provided regex and file globs. Skip patterns with no matches.
2. Classify confirmed matches into two groups:
   - **Structural** — fixes to HTML attributes, ARIA, JS APIs, or non-visual DOM changes
   - **Style** — fixes that modify a CSS property value (`outline`, `color`, `background`, `font-size`, `pointer-events`, `visibility`, `opacity`, `display`, `border`, `box-shadow`, or any other visual property)

If 0 matches were found in both groups, proceed automatically to Step 5. Open with: **"Scanned source code — no additional patterns found."**

`[MESSAGE]` These findings were detected via source code analysis using an expert-curated pattern database. They are not part of the axe-core scan and will not appear in the visual report.

**Structural patterns** — open with: **"Scanned source code — found [N] pattern(s) not detectable by the browser scanner."** Then present as a batch using this exact format:

```
Pattern: [pattern name]
WCAG: [criterion] ([level A/AA]) · Severity: [severity]

Findings:
  1. `[file path]` · line [line] · [element tag / selector]
     Before: [current code]
     After:  [proposed code]
  2. `[file path]` · line [line] · [element tag / selector]
     Before: [current code]
     After:  [proposed code]
```

Present each matched pattern as a separate block (one block per pattern name). Keep findings numbered within each block. After presenting all blocks, ask — **options are always 1/2/3 regardless of finding count**:

`[QUESTION]` **I found [N] structural issue(s) in your source code that axe-core cannot detect at runtime — HTML attributes, ARIA, and JS APIs invisible to the browser scanner. Apply fixes?**

1. **Yes, fix all** — apply all proposed changes
2. **Let me pick** — show me the full list, I'll choose by number
3. **Skip** — don't apply any of these fixes

If **Let me pick**: present all matches as a numbered list. Ask the user to type the numbers (e.g. `1, 3` or `all`), or `back` to return. Apply selected fixes, list changes made, then ask the verification question below.

If **Yes, fix all** or after **Let me pick** completes: list the files and changes made, then ask:

`[QUESTION]` **Please verify visually — does everything look correct?**

1. **Looks good**
2. **Something's wrong** — tell me what to revert or adjust

If **Looks good**: proceed to style patterns below (or Step 5 if none). If **Something's wrong**: apply corrections, then proceed.

If **Skip**: mark structural as skipped. Proceed to style patterns (or Step 5 if none).

**Style patterns** — show each match using this exact format before applying anything:

> **Style-dependent protection — hard stop**: same rule as style-dependent fixes — **never apply before showing the exact proposed diff and receiving an explicit "yes".**

```
Pattern: [pattern name]
WCAG: [criterion] ([level A/AA]) · Severity: [severity]

Findings:
  1. `[file path]` · line [line] · [element tag / selector]
     Before: [current CSS value]
     After:  [proposed CSS value]
  2. `[file path]` · line [line] · [element tag / selector]
     Before: [current CSS value]
     After:  [proposed CSS value]
```

Then ask:

`[QUESTION]` **I found [N] CSS pattern(s) in your source code that suppress or break accessible visual states — these are invisible to the browser scanner but affect real users. Apply fixes?**

1. **Yes** — apply all proposed changes
2. **Let me pick** — show me the full list, I'll choose by number
3. **Skip** — don't apply any of these fixes

If **Let me pick**: present all style pattern matches as a numbered list with their diffs. Apply selected, list changes, then ask the verification question below.

If **Yes** or after **Let me pick** completes: list the files and exact values modified, then ask:

`[QUESTION]` **Please verify visually — does everything look correct?**

1. **Looks good**
2. **Something's wrong** — tell me what to revert or adjust

If **Looks good**: proceed to Step 5. If **Something's wrong**: apply corrections, then proceed to Step 5.

**End of 4c:** Proceed directly to Step 5. Do not output any text, summary, or transition phrase — regardless of what happened in 4c. The very next action is running the audit script in Step 5.

### Step 5 — Verification re-audit (mandatory)

This step is **mandatory** — always run it after fixes, no exceptions. Do not skip, do not ask the user whether to run it. If no fixes were applied in Step 4 (user skipped all sub-steps), skip this step and proceed to Step 6.

**Never generate reports in this step.** Reports are exclusively handled in Step 6. Do not offer to generate reports here, even if issues are resolved.

**Immediately run the script — do not output any message before running it.** Running the script IS the first action of this step:

```bash
# Same flags as Step 2
node scripts/audit.mjs --base-url <URL> [--max-routes <N>]
```

If the script fails: verify the site is reachable (`curl -s -o /dev/null -w "%{http_code}" <URL>`) before retrying. If it returns a non-200 status, stop and report the error to the user — do not retry with modified flags. If the site is reachable and the script fails a second time, stop and report the error.

After the script completes, immediately parse ALL findings and present results — do not pause or wait for user input. Do not output any text before the script finishes executing.

- **All clear (0 issues)** → proceed to Step 6.
- **Issues found (any kind)** → follow this sequence:

  1. Present the delta summary first in this fixed format: **"`{resolved}` resolved / `{remaining}` remaining / `{new}` new"** — always include all three values, even when zero. If `{new} > 0`, append inline: *"New issues are expected after fixing parent violations — axe-core evaluates child elements for the first time once the parent is resolved."* Then present all findings grouped by severity (same format as Step 3).
  2. **Always ask immediately after presenting findings** — never stop or pause here, even if all remaining issues were previously declined:

     `[QUESTION]` **The re-audit shows [N] issue(s) remaining. How would you like to proceed?**

     1. **Keep fixing** — address the remaining issues
     2. **Move on** — accept the remaining issues and proceed to the final summary

  3. If **Keep fixing**: apply fixes following Step 4 procedures (4a → structural, 4b approval gate → style, 4c → source patterns). When Step 4 is complete, your very next action is running the audit script again — no text before it. Then return to step 1 of this sequence with the new results.
  4. If **Move on**: proceed to Step 6 immediately. Do not stop or wait for user input.

Repeat fix+re-audit up to a maximum of **3 cycles total**. If issues persist after 3 cycles, list remaining issues and proceed to Step 6 without asking. Previously declined style changes do not restart the cycle.

**Do not proceed to Step 6 until either: the re-audit is clean, the user explicitly chooses to move on, or 3 cycles are exhausted.**

### Step 6 — Deliver results

**All items in this step are mandatory and must execute in order (1 → 7). Never stop after the summary — complete the full step.**

> **File-open rule** — applies to all generated files in this step: verify the file exists on disk before reporting success. Attempt to open with `open` (macOS), `xdg-open` (Linux), or `start` (Windows) only when a GUI session is available. In headless/sandbox environments or if auto-open fails, share the absolute path so the user can open it manually.

1. **Summarize**: load [references/report-standards.md](references/report-standards.md) and present the **Console Summary Template**, filling in values from the remediation guide. Overall Assessment values: `Pass` (0 issues remaining), `Conditional Pass` (only Minor issues remain), `Fail` (any Critical or Serious remain unresolved). Append the context note only when `remaining > 0`. If Overall Assessment is `Pass`, also confirm the site passes WCAG 2.2 AA automated checks. If any remaining issues were explicitly skipped by the user during Step 4, append: *"Note: [N] of these finding(s) were intentionally skipped in this session — the assessment reflects the current state of the site. They remain available in the remediation guide."*
2. **Passed Criteria**: read `passedCriteria` from `.audit/a11y-findings.json` and present as a table — resolve criterion names from your knowledge of the WCAG 2.2 specification.

   | Criterion | Name | Level |
   |-----------|------|-------|
   | 1.1.1     | Non-text Content | A |
   | …         | …    | …     |
3. Ask about reports. Wait for the answer before continuing:

`[QUESTION]` **Would you like a visual report?**

1. **Yes**
2. **No thanks**

If **No thanks**: skip to item 6.

   If **Yes**, wait for that answer, then ask which format in a new message:

   `[QUESTION]` **Which format?**

   1. **HTML Dashboard** — interactive web report with compliance score
   2. **PDF Executive Summary** — formal document for stakeholders
   3. **Both**
   4. **Back** — change your report preference

4. If reports requested, wait for the format answer above, then ask save location. Skip this question if a path was already set earlier in this session — reuse that path silently:

`[QUESTION]` **Where should I save the reports?**

1. **Desktop** — `~/Desktop/`
2. **Documents** — `~/Documents/`
3. **Custom path** — tell me the exact folder path
4. **Back** — change the report format

5. After all questions are answered, **execute** the following commands — do not describe or summarize them, run them:

   ```bash
   # HTML (run if HTML or Both was selected)
   node scripts/report-html.mjs --output <path>/report.html --base-url <URL>

   # PDF (run if PDF or Both was selected)
   node scripts/report-pdf.mjs --output <path>/report.pdf --base-url <URL>
   ```

   Apply the file-open rule to each generated file. **Then immediately continue to item 6 — do not wait for user input.**

6. Output the manual testing reminder and checklist offer in the same response — **only if at least one fix was applied during this session**. If the user skipped all fixes in Step 3 or declined every sub-phase in Step 4, skip this item entirely and proceed to item 7.

`[MESSAGE]` Automated tools cannot catch every accessibility barrier. The following are the most critical checks that require human judgment — please verify them manually.

- [ ] **Keyboard navigation** — Tab through all interactive elements; verify visible focus ring and no keyboard traps.
- [ ] **Screen reader** — Test with VoiceOver (macOS) or NVDA (Windows); verify headings, landmarks, forms, and modals are announced correctly.
- [ ] **Media** — Prerecorded video has accurate captions and an audio description track; audio-only content has a text transcript.
- [ ] **Motion & timing** — `prefers-reduced-motion` is respected; no content flashes >3×/sec; auto-playing content has a pause control.
- [ ] **Forms & errors** — Error messages give specific correction guidance; financial/legal submissions have a confirmation step.

`[QUESTION]` **Would you like to export the manual testing checklist?**

1. **Yes** — generate `checklist.html` with all 41 checks and step-by-step instructions
2. **No thanks**

If **Yes**: load [references/out-of-scope.md](references/out-of-scope.md) and present it as context, then if a save path was already established in item 4 above, reuse it silently — do not ask again. If no path was set yet (user declined reports in item 3), ask:

`[QUESTION]` **Where should I save the checklist?**

1. **Desktop** — `~/Desktop/`
2. **Documents** — `~/Documents/`
3. **Custom path** — tell me the exact folder path
4. **Back** — go back to the checklist export question

Then:

```bash
node scripts/report-checklist.mjs --output <path>/checklist.html --base-url <URL>
```

Apply the file-open rule. **Then immediately continue to item 7 — do not wait for user input.**

7. Output the closing message and follow-up question in the same response. If the user skipped all fixes in Step 3 or declined every sub-phase in Step 4, skip the `[MESSAGE]` and go directly to the `[QUESTION]`.

`[MESSAGE]` Great work! By investing in accessibility, you're making your site usable for everyone — including people who rely on screen readers, keyboard navigation, and assistive technology. That commitment matters and sets your project apart. Accessibility isn't a one-time task, so consider scheduling periodic re-audits as your site evolves. Keep it up!

`[QUESTION]` **Is there anything else I can help you with?**

1. **Yes** — tell me what you need
2. **No, we're done**

If **Yes**: help the user with their request, then ask this question again. If **No, we're done**: the workflow is complete.

---

## Edge Cases

### Authentication & Restricted Pages

1. Do not guess credentials or attempt brute-force access.
2. Report blocked routes (401/403 or login redirect).
3. Ask the user: provide session cookies, test credentials, or skip those routes.
4. Use credentials for the audit session only. Do not persist to disk.
5. Note skipped routes as "Not Tested — Auth Required."
