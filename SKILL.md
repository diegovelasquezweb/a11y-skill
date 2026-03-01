---
name: a11y
description: "Audits and fixes website accessibility (WCAG 2.2 AA) using automated scanning (axe-core + Playwright). Use when the user asks to audit a URL for accessibility, check WCAG compliance, fix a11y issues, test screen reader support, verify keyboard navigation, check color contrast, fix ARIA attributes, add alt text, fix heading hierarchy, improve focus management, check ADA/WCAG compliance, or generate an accessibility report. Trigger keywords: accessibility, a11y, WCAG, ADA, screen reader, assistive technology, accessibility audit, color contrast, alt text, ARIA. Do NOT use for performance audits, SEO, Lighthouse scores, or non-web platforms."
compatibility: Requires Node.js 18+, pnpm (npm as fallback), and internet access. Playwright + Chromium are auto-installed on first run.
license: MIT
metadata:
  author: diegovelasquezweb
  version: "0.11.0"
---

# Web Accessibility Audit — Agent Playbook

## Resource Map

Load these files on demand — never preload all at once.

| Resource                          | Load when                                     | Path                                                             |
| --------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| Report & evidence standards       | Step 3 — presenting findings · Step 6 item 1 — console summary | [references/report-standards.md](references/report-standards.md) |
| CLI flags reference               | Before running audit — need non-default flags | [references/cli-reference.md](references/cli-reference.md)       |
| Quality gates                     | Any phase boundary — verifying gate pass/fail | [references/quality-gates.md](references/quality-gates.md)       |
| Troubleshooting                   | Any script failure                            | [references/troubleshooting.md](references/troubleshooting.md)   |


## Constraints

These rules apply at all times, independent of any workflow step.

- **`remediation.md` is the fix map — do not go outside it.** All findings, fix instructions, source file locations, guardrails, and component map come from the remediation guide generated in Step 2. Never apply a fix or derive a solution from general WCAG knowledge — if it is not in the remediation guide, it is out of scope for this session.
- Never install, remove, or initialize packages in the user's project. The audit script handles dependency installation automatically on first run — do not run `pnpm install` manually before running scripts.
- All pipeline files (scan results, findings, remediation guide, screenshots) stay inside the skill directory — never in the user's project.
- Visual reports (HTML/PDF) are only created in Step 6, after the user explicitly requests them. Never generate reports in any other step.
- Never modify engine scripts (`scripts/*.mjs`) to hardcode project-specific exclusions.
- Never declare "100% accessible" based on a targeted audit. Only a comprehensive full-site verification can confirm that.
- Treat scripts as black boxes: run with `--help` to discover flags. Do not read script source — it consumes context budget for no benefit.
- If `pnpm` is not available, use `npm` as fallback.
- Never add, remove, or modify CLI flags (`--exclude-selectors`, `--timeout-ms`, `--wait-ms`, etc.) without the user explicitly requesting it.
- Only propose fixes inside the primary editable frontend source of truth. If a finding points to backend code, infrastructure, server configuration, plugins, compiled output, or any non-editable area, report it or ask the user before proceeding instead of proposing a direct fix.
- **Never create a new file without explicit approval.** If a fix requires creating a file rather than editing an existing one, show the full proposed file content and ask:

  `[QUESTION]` **This fix requires creating `[path]` — proceed?**

  1. **Yes** — create the file
  2. **No** — skip this fix

  Wait for the answer before creating anything.

## Communication Rules

1. **Language** — always communicate in English, regardless of the language the user writes in.
2. **Tone** — concise and technical. State findings, propose action, ask for a decision.
3. **Internal steps** — never expose internal step labels, phase codes, or workflow reasoning to the user. Always describe outcomes in plain language only. **Never pre-announce a sequence of steps** ("first I'll do X, then Y, then Z") — execute immediately and let the output speak for itself. Example of what NOT to say: "Moving to the style fix phase." Say instead: "Structural fixes done — reviewing color contrast and focus styles."
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
- [ ] Step 4: Fix (structural → style)
- [ ] Step 5: Verification re-audit
- [ ] Step 6: Deliver results
```

### Step 1 — Page discovery

**Hard stop — URL required before anything else.** If no URL is present in the current message, ask: *"What URL should I audit?"* and wait for the answer. Do not ask about pages, sitemap, or any other topic until a URL is confirmed.

Once the user provides a URL, normalize it before passing to `--base-url`:

- `localhost:3000` → `http://localhost:3000`
- `mysite.com` → `https://mysite.com`
- Full URLs → use as-is.

Once the URL is confirmed, check if it contains a non-root path (any path other than `/` or empty — e.g. `/contact`, `/about`, `/products/shoes`):

- **Non-root path present** — treat as a 1-page audit automatically. Use the full URL as `--base-url` with `--max-routes 1`. Skip the scope question and proceed to Step 2.

If the URL is root-only, silently fetch `<URL>/sitemap.xml`:

- **Found** — inform the user ("Found a sitemap with N pages — using it for the audit") and proceed to Step 2. No question needed.
- **Not found** — proceed silently to the scope question below. Do not mention the sitemap attempt.

If the user mentions "sitemap" at any point, use it directly (Data-first rule) — skip the scope question.

`[QUESTION]` **How many pages should I crawl?**

1. **1 page** — audit a single specific URL (fastest)
2. **10 pages** — covers main page types, fast
3. **All reachable pages** — comprehensive, may take several minutes on large sites
4. **Custom** — tell me the exact number

If option 1: if the user has not yet specified a path, ask in plain text — "Which path? (e.g. `/`, `/contact`, `/about`)" — and wait for the answer. Then use `--base-url <URL>/<path> --max-routes 1`. If Custom: ask in plain text — "How many pages?" — and wait for a number. **Never use the option number (4) as the page count.** Store the number and proceed to Step 2.

Store the user's choice. Proceed to Step 2.

### Step 2 — Run the audit

Run the audit with the discovery settings from Step 1:

```bash
# Default (sitemap or 10-page crawl — omit --max-routes)
node scripts/audit.mjs --base-url <URL>

# Single page
node scripts/audit.mjs --base-url <URL> --max-routes 1

# All pages or custom count
node scripts/audit.mjs --base-url <URL> --max-routes <N>  # 999 = all
```

Always pass `--project-dir <path>` for local projects. When provided, the source code pattern scanner runs automatically alongside axe — pattern findings appear in the "Source Code Pattern Findings" section of the remediation guide and are part of the unified fix flow. If you can identify the stack from the project files, also pass `--framework <value>` (nextjs|gatsby|react|nuxt|vue|angular|astro|svelte|shopify|wordpress|drupal) — explicit detection is more reliable than auto-detection. For non-default flags, load [references/cli-reference.md](references/cli-reference.md).

After completion, parse `REMEDIATION_PATH` from script output and read that file. **Fallback**: if `REMEDIATION_PATH` is absent in the output, read `.audit/remediation.md` directly. Do not share internal file paths with the user.

Proceed to Step 3.

If the script fails, consult [references/troubleshooting.md](references/troubleshooting.md) to self-correct before asking the user. If unrecoverable, offer: (1) Retry, (2) Different URL, (3) Skip and troubleshoot manually. After resolving, proceed to Step 3.

### Step 3 — Present findings and request permission

Load [references/report-standards.md](references/report-standards.md) for finding field requirements and deliverable format.

Read the remediation guide. The audit pipeline has already handled deduplication, false positive filtering, and computed the Overall Assessment — read these directly from the report.

If a finding is marked with `ownership_status: outside_primary_source` or `ownership_status: unknown`, do not treat it as a normal direct patch. Flag it inline when presenting that specific issue:

> ⚠ This issue may be outside the primary editable source. Confirm whether to ignore it or handle it outside the main remediation flow.

Then ask the user: **Skip this finding or fix it anyway?** — 1. Skip · 2. Fix anyway. Do not ask this question globally before presenting findings.

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

1. State the **Overall Assessment** from the report header. Then state the **full scan total** — this number must include every finding from the scan: all axe violations (all severities) plus all source patterns. Never show only Critical/Serious as the headline count. Format: "N axe violations (X Critical, Y Serious, Z Moderate, W Minor) + T source pattern types (M locations: P confirmed, Q potential) — N+M total." This total is the baseline used to compute the delta in Step 5.
2. Propose specific fixes from the remediation guide.
3. Group by component or page area, explaining why each fix matters.
4. Ask how to proceed:

`[QUESTION]` **How would you like to proceed?**

1. **Fix by severity** — Critical first, then Serious → Moderate → Minor
2. **Other criteria** — tell me how you'd like to prioritize the fixes
3. **Skip fixes** — don't fix anything right now

Default (if user says "fix" or "go ahead") is **Fix by severity**. If the user chooses **Fix by severity** or **Other criteria**, proceed immediately to Step 4.

If the user chooses **Skip fixes** (option 3): present the following message, then ask the confirmation question below.

`[MESSAGE]` Understood. Keep in mind that the unresolved issues affect real users — screen reader users may not be able to navigate key sections, and keyboard-only users could get trapped. Accessibility is also a legal requirement under ADA Title II (US), Section 508 (US Federal), the European Accessibility Act (EU), the UK Equality Act, and the Accessible Canada Act, among others. These findings will remain available if you decide to revisit them later.

`[QUESTION]` **Are you sure you want to skip all fixes?**

1. **Yes, skip** — proceed to the final summary without applying any fixes
2. **No, let's fix them** — go back and apply the fixes

If **Yes, skip**: proceed to Step 6 immediately. If **No, let's fix them**: return to the `[QUESTION]` **How would you like to proceed?** and treat the answer as **Fix by severity** (option 1).

**0 issues found** → proceed to Step 6 immediately. Note: automated tools cannot catch every barrier; recommend manual checks.

### Step 4 — Fix

Run structural fixes first, then style fixes. Both must run — never skip one because the user declined fixes in the other.

Axe findings and source code pattern findings are treated as a **unified set**. Pattern findings tagged `type: structural` are handled in the structural pass alongside axe structural fixes. Pattern findings tagged `type: style` are handled in the style pass alongside axe style fixes. For a pattern finding, fix in the source file at `file:line` using the `match` and `fix_description` from the report — not in the DOM.

- **Fix by severity** (default): process findings Critical → Serious → Moderate → Minor.
- **Other criteria**: follow the user's specified prioritization throughout.

#### Structural fixes (Critical → Serious → Moderate → Minor)

Safe to apply — no visual changes (ARIA attributes, alt text, labels, DOM order, lang, heading hierarchy). Includes both axe structural findings and source code pattern findings tagged `type: structural`.

> **Scope boundary**: covers only non-visual fixes. Color contrast, font-size, spacing, and any CSS/style property changes are **always** handled in the style pass — regardless of severity. If a finding (axe or pattern) involves a color or visual property, set it aside for the style pass. Do not apply it here.

If there are no structural findings (axe or pattern) to fix, skip directly to the style pass.

Use the **Source File Locations** section of the remediation guide to locate source files by detected framework. For axe findings, use `fix_description`, `fix_code`, framework notes, and evidence as the source of truth. For pattern findings, use `file:line`, `match`, and `fix_description` from the "Source Code Pattern Findings" section of the report.

- Use glob patterns and the "Fixes by Component" table from the remediation guide (if present) to batch edits per file.
- If a finding has a "Managed Component Warning", verify the element is not rendered by a UI library before applying ARIA fixes.

Present one group at a time — list the findings and proposed changes, then ask. Adapt the `[QUESTION]` label to the active mode (e.g. **Apply these Critical fixes?**).

1. **Yes** — apply all proposed changes
2. **Let me pick** — show me the full list, I'll choose by number
3. **No** — skip this group

If **No**: skip to the next group (or the style pass if this was the last). If **Let me pick**: present fixes as a numbered list, ask for numbers (e.g. `1, 3` or `all`) or `back` to return. Apply selected fixes, list changes made. If **Yes** or after **Let me pick** completes: list files changed, then ask:

`[QUESTION]` **Please verify visually — does everything look correct?**

1. **Looks good**
2. **Something's wrong** — tell me what to revert or adjust

If **Looks good**: proceed to the next group or style pass. If **Something's wrong**: apply corrections, then proceed.

#### Style fixes (color contrast, font size, spacing, focus styles)

Includes axe style findings (color-contrast, font-size, spacing) and source code pattern findings tagged `type: style` (e.g. suppressed focus outlines). If there are no style-dependent findings of either kind, skip directly to Step 5.

> **Hard stop before any style change**: these fixes change the site's appearance. **Never apply any style change before showing the exact proposed diff and receiving an explicit "yes".** This gate applies even if the user previously said "fix all" and even if the finding is Critical severity. No exceptions.

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

If **No**: proceed to Step 5. If **Let me pick**: present changes as a numbered list with diffs, ask for numbers or `back`. If **Yes** or after **Let me pick** completes: list files and exact values modified, then ask:

`[QUESTION]` **Please verify visually — does everything look correct?**

1. **Looks good**
2. **Something's wrong** — tell me what to revert or adjust

If **Looks good**: proceed to Step 5. If **Something's wrong**: apply corrections, then proceed to Step 5.

### Step 5 — Verification re-audit (mandatory)

This step is **mandatory** — always run it after fixes, no exceptions. Do not skip, do not ask the user whether to run it. If no fixes were applied in Step 4 (user skipped all sub-steps), skip this step and proceed to Step 6.

**Never generate reports in this step.** Reports are exclusively handled in Step 6. Do not offer to generate reports here, even if issues are resolved.

**Immediately run the script — do not output any message before running it.** Running the script IS the first action of this step:

```bash
# Exact same flags as Step 2 — do not change any values
node scripts/audit.mjs --base-url <URL> --max-routes <N>
```

> **Flag parity is mandatory.** Use the exact same `--base-url`, `--max-routes`, `--project-dir`, `--framework`, and any other flags from Step 2. Never reduce `--max-routes` or omit flags — a smaller crawl produces an incomplete delta and makes resolved counts unreliable.

If the script fails: verify the site is reachable (`curl -s -o /dev/null -w "%{http_code}" <URL>`) before retrying. If it returns a non-200 status, stop and report the error to the user — do not retry with modified flags. If the site is reachable and the script fails a second time, stop and report the error.

After the script completes, immediately parse ALL findings and present results — do not pause or wait for user input. Do not output any text before the script finishes executing.

- **All clear (0 issues)** → proceed to Step 6.
- **Issues found (any kind)** → follow this sequence:

  1. Present the delta summary first in this fixed format: **"`{resolved}` resolved / `{remaining}` remaining / `{new}` new"** — always include all three values, even when zero. If `{new} > 0`, append inline: *"New issues are expected after fixing parent violations — axe-core evaluates child elements for the first time once the parent is resolved."* Immediately after the delta line, append a one-line breakdown of what `{remaining}` contains — e.g. *"Includes: 8 axe violations (8 Serious) + 14 Moderate (not addressed) + 42 source patterns."* This prevents the user from being confused when the remaining count includes issues that were intentionally skipped or not in scope for this session. Then present all remaining findings grouped by severity: Critical first, then Serious → Moderate → Minor. For each finding show: severity label, rule name, affected route, and a one-line description of what needs to be fixed.
  2. **Always ask immediately after presenting findings** — never stop or pause here, even if all remaining issues were previously declined:

     `[QUESTION]` **The re-audit shows [N] issue(s) remaining. How would you like to proceed?**

     1. **Keep fixing** — address all remaining issues
     2. **Let me pick** — show me the list, I'll choose which to fix
     3. **Move on** — accept the remaining issues and proceed to the final summary

  3. If **Keep fixing**: apply fixes following Step 4 procedures (structural fixes first, then style fixes with explicit approval gate; pattern findings included in both passes). When Step 4 is complete, your very next action is running the audit script again — no text before it. Then return to step 1 of this sequence with the new results.
  4. If **Let me pick**: present all remaining issues as a numbered list. Ask the user to type the numbers they want fixed (e.g. `1, 3` or `all`), or type `back` to return. Apply only the selected fixes following Step 4 procedures, then run the audit script again and return to step 1 of this sequence.
  5. If **Move on**: proceed to Step 6 immediately. Do not stop or wait for user input.

Repeat fix+re-audit up to a maximum of **3 cycles total**. If issues persist after 3 cycles, list remaining issues and proceed to Step 6 without asking. Previously declined style changes do not restart the cycle.

**Do not proceed to Step 6 until either: the re-audit is clean, the user explicitly chooses to move on, or 3 cycles are exhausted.**

### Step 6 — Deliver results

**All items in this step are mandatory and must execute in order (1 → 7). Never stop after the summary — complete the full step.**

> **File-open rule** — applies to all generated files in this step: verify the file exists on disk before reporting success. Attempt to open with `open` (macOS), `xdg-open` (Linux), or `start` (Windows) only when a GUI session is available. In headless/sandbox environments or if auto-open fails, share the absolute path so the user can open it manually.

1. **Summarize**: load [references/report-standards.md](references/report-standards.md) and present the **Console Summary Template**. All metric values (`total`, `resolved`, `remaining`, `files modified`) must come from the **Step 5 re-audit results** — never recompute them manually or carry over values from the original Step 2 scan. `resolved` = Step 2 total − Step 5 remaining. `remaining` = issue count in the Step 5 re-audit output. If Step 4 was skipped entirely, use Step 2 values with `resolved = 0`. Overall Assessment values: `Pass` (0 issues remaining), `Conditional Pass` (only Minor issues remain), `Fail` (any Critical or Serious remain unresolved). Append the context note only when `remaining > 0`. If Overall Assessment is `Pass`, also confirm the site passes WCAG 2.2 AA automated checks. If any remaining issues were explicitly skipped by the user during Step 4, append: *"Note: [N] of these finding(s) were intentionally skipped in this session — the assessment reflects the current state of the site. They remain available in the remediation guide."*
2. **Passed Criteria**: read the `## Passed WCAG 2.2 Criteria` section from the remediation guide and present it as-is. Do not read `a11y-findings.json` or recompute this table manually.
3. Ask about reports. Wait for the answer before continuing:

`[QUESTION]` **Would you like a visual report?**

1. **Yes**
2. **No thanks**

If **No thanks**: skip to item 6.

   If **Yes**, wait for that answer, then ask which format in a new message:

   `[QUESTION]` **Which report?**

   1. **WCAG 2.2 AA Audit Dashboard** — interactive HTML with full findings, severity filters, and fix guidance
   2. **WCAG 2.2 AA Compliance Report** — formal PDF for stakeholders, clients, and legal review
   3. **Both**
   4. **Back** — change your report preference

4. If reports requested, wait for the format answer above, then ask save location. Skip this question if a path was already set earlier in this session — reuse that path silently:

`[QUESTION]` **Where should I save the reports?**

1. **Desktop** — `~/Desktop/`
2. **Documents** — `~/Documents/`
3. **Custom path** — tell me the exact folder path
4. **Back** — change the report format

5. **Execute** the following commands — do not describe or summarize them, run them:

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

If **Yes**: if a save path was already established in item 4 above, reuse it silently — do not ask again. If no path was set yet (user declined reports in item 3), ask:

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

1. **Yes** — start a new audit
2. **No, goodbye**

If **Yes**: discard all session state (URL, findings, fix history) and restart the full workflow from Step 1 as if this were a new session. If **No, goodbye**: the workflow is complete.

---

## Edge Cases

### Authentication & Restricted Pages

1. Do not guess credentials or attempt brute-force access.
2. Report blocked routes (401/403 or login redirect).
3. Ask the user: provide session cookies, test credentials, or skip those routes.
4. Use credentials for the audit session only. Do not persist to disk.
5. Note skipped routes as "Not Tested — Auth Required."
