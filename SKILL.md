---
name: a11y
description: "Audit and fix website accessibility (WCAG 2.2 AA) using automated scanning (axe-core + Playwright). Use when the user asks to audit a URL for accessibility, check WCAG compliance, fix a11y issues, test screen reader support, verify keyboard navigation, check color contrast, fix ARIA attributes, add alt text, fix heading hierarchy, improve focus management, check ADA/EAA/EN 301 549 compliance, or generate an accessibility report. Trigger keywords: accessibility, a11y, WCAG, ADA, screen reader, assistive technology, accessibility audit, color contrast, alt text, ARIA. Do NOT use for performance audits, SEO, Lighthouse scores, or non-web platforms."
compatibility: Requires Node.js 18+, pnpm (npm as fallback), and internet access. Playwright + Chromium are auto-installed on first run.
license: Proprietary (All Rights Reserved)
metadata:
  author: diegovelasquezweb
  version: "0.8.0"
---

# Web Accessibility Audit — Agent Playbook

## Resource Map

Load these files on demand — never preload all at once.

| Resource                          | Load when                                     | Path                                                             |
| --------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| Report & evidence standards       | Step 3 — presenting findings                  | [references/report-standards.md](references/report-standards.md) |
| Source file patterns by framework | Step 4a — locating files to fix               | [references/source-patterns.md](references/source-patterns.md)   |
| CLI flags reference               | Before running audit — need non-default flags | [references/cli-reference.md](references/cli-reference.md)       |
| Troubleshooting                   | Any script failure                            | [references/troubleshooting.md](references/troubleshooting.md)   |

## Constraints

These rules apply at all times, independent of any workflow step.

- Never install, remove, or initialize packages in the user's project. Only run `pnpm install` inside the skill directory.
- All pipeline files (scan results, findings, remediation guide, screenshots) stay inside the skill directory — never in the user's project.
- Visual reports (HTML/PDF) are only created when explicitly requested, at the user's chosen location.
- Never modify engine scripts (`scripts/*.mjs`) to hardcode project-specific exclusions.
- Never declare "100% accessible" based on a targeted audit. Only a comprehensive full-site verification can confirm that.
- Never modify the user's `.gitignore` without asking first.
- Treat scripts as black boxes: run with `--help` to discover flags. Do not read script source — it consumes context budget for no benefit.
- If `pnpm` is not available, use `npm` as fallback.

## Communication Rules

1. **Tone** — concise and technical. State findings, propose action, ask for a decision.
2. **Message tags** — this playbook uses two tags to mark formatted messages. When you reach a tagged block, present it as a **standalone message** — never merge with informational lists, findings, summaries, or other content.
   - `[QUESTION]` — a user-facing question with numbered options. Adapt tone and structure but keep the same options. **Send one `[QUESTION]` per message. Never present two questions at once. Always wait for the user's answer before showing the next question.** Format: always output the question text on its own line, followed by each option as a numbered item on its own line — never inline, never collapsed to "Yes/No". Example output:
     ```
     How many pages should I crawl?

     1. 5 pages
     2. 10 pages (Recommended)
     3. 15 pages
     ```
   - `[MESSAGE]` — a mandatory pre-written message. **You MUST output the exact text — never skip, rephrase, summarize, or adapt it.** Skipping a `[MESSAGE]` block is not allowed under any circumstance.

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

If no URL provided, ask for one.

Normalize input before passing to `--base-url`:

- `localhost:3000` → `http://localhost:3000`
- `mysite.com` → `https://mysite.com`
- Full URLs → use as-is.

Once the URL is confirmed, ask the discovery method:

`[QUESTION]` **How should I discover the pages to audit?**

1. **Crawler** — let the scanner discover pages automatically from the homepage
2. **Sitemap** — read your `sitemap.xml` and scan every listed page

If the user chooses **Sitemap**: fetch `<URL>/sitemap.xml`. If found, confirm page count and proceed to Step 2. If not found, inform the user and fall back to the Crawler question below.

If the user chooses **Crawler**: wait for that answer, then ask the scan scope in a new message:

`[QUESTION]` **How many pages should I crawl?**

1. **10 pages (Recommended)** — covers main page types, fast
2. **All reachable pages** — comprehensive, may take several minutes on large sites
3. **Custom** — tell me the exact number

Store the user's choice. Proceed to Step 2.

### Step 2 — Run the audit

Run the audit with the discovery settings from Step 1:

```bash
# Sitemap mode
node scripts/run-audit.mjs --base-url <URL>

# Crawler — 10 pages (option 1, omit flag to use default)
node scripts/run-audit.mjs --base-url <URL>

# Crawler — all reachable pages (option 2)
node scripts/run-audit.mjs --base-url <URL> --max-routes 999

# Crawler — custom count (option 3)
node scripts/run-audit.mjs --base-url <URL> --max-routes <N>
```

For local projects with framework auto-detection, add `--project-dir <path>`. For non-default flags, load [references/cli-reference.md](references/cli-reference.md).

After completion, parse `REMEDIATION_PATH` from script output and read that file. **Fallback**: if `REMEDIATION_PATH` is absent in the output, read `audit/internal/remediation.md` directly. Do not share internal file paths with the user.

If the script fails, consult [references/troubleshooting.md](references/troubleshooting.md) to self-correct before asking the user. If unrecoverable, offer: (1) Retry, (2) Different URL, (3) Skip and troubleshoot manually.

### Step 3 — Present findings and request permission

Load [references/report-standards.md](references/report-standards.md) for finding field requirements and deliverable format.

Read the remediation guide and:

1. Summarize by severity (Critical → High → Medium → Low).
2. Propose specific fixes from the remediation guide.
3. Group by component or page area, explaining why each fix matters.
4. Ask how to proceed:

`[QUESTION]` **How would you like to proceed?**

1. **Fix by severity** — work through Critical → High → Medium → Low, one group at a time with a checkpoint after each
2. **Reports first, then fix by severity** — generate visual reports now, then fix severity by severity
3. **Other criteria** — tell me how you'd like to prioritize the fixes
4. **Skip fixes** — don't fix anything right now

Default (if user says "fix" or "go ahead") is **Fix by severity**.

If the user chooses **Reports first**: the "yes to reports" is already implied — skip the Yes/No question and ask:

`[QUESTION]` **Which format?**

1. **HTML Dashboard** — interactive web report with compliance score
2. **PDF Executive Summary** — formal document for stakeholders
3. **Both**

Then continue: save location → gitignore (only if path is inside the project) → generate → **open each file**. After the reports are open, return here and continue to Step 4 to begin fixes by severity.

If the user chooses **Skip fixes**: present the following message, then skip to Step 6.

`[MESSAGE]` Understood. Keep in mind that the unresolved issues affect real users — screen reader users may not be able to navigate key sections, and keyboard-only users could get trapped. Accessibility is also a legal requirement under ADA (US), the European Accessibility Act (EU), and EN 301 549. These findings will remain available if you decide to revisit them later.

**0 issues found** → skip to Step 6. Note: automated tools cannot catch every barrier; recommend manual checks.

### Step 4 — Fix

Work through each phase in order. If the user chose **Other criteria** in Step 3, follow their specified prioritization instead of the default severity order throughout this step.

#### 4a. Structural fixes (Critical → High → Medium → Low)

Safe to apply — no visual changes (ARIA attributes, alt text, labels, DOM order, lang, heading hierarchy).

> **Scope boundary**: 4a covers only non-visual fixes. Color contrast, font-size, spacing, and any CSS/style property changes are **always** handled in 4b — regardless of their axe severity level. If a Critical or High finding involves a color or visual property, set it aside for 4b. Do not apply it here.

Load [references/source-patterns.md](references/source-patterns.md) to locate source files by detected framework.

- Use glob patterns and the "Fixes by Component" table from the remediation guide to batch edits per file.
- If a finding has a "Managed Component Warning", verify the element is not rendered by a UI library before applying ARIA fixes.

Apply one severity group at a time (Critical → High → Medium → Low). **Apply all fixes in the group first — do not ask for permission before applying.** After applying, list the files and changes made, then ask:

`[QUESTION]` **I've applied all [severity] fixes. Please verify visually — does everything look correct?**

1. **Looks good** — proceed to next severity group
2. **Something's wrong** — tell me what to revert or adjust

#### 4b. Style-dependent fixes (color-contrast, font-size, spacing)

> **Style-dependent protection — hard stop**: these fixes change the site's appearance. **Never apply any style change before showing the exact proposed diff and receiving an explicit "yes".** This gate applies even if the user previously said "fix all" and even if the finding is Critical severity. No exceptions.

Show: property, current value → proposed value, contrast ratio change (for color). Then ask:

`[QUESTION]` **Apply these style changes?**

1. **Yes** — apply all proposed changes
2. **No** — skip style fixes
3. **Let me pick** — I'll choose which ones to apply

If the user chooses **Yes** or **Let me pick**: apply the changes, list the files and exact values modified, then ask:

`[QUESTION]` **I've applied the style changes. Please verify visually — does everything look correct?**

1. **Looks good** — proceed to 4c
2. **Something's wrong** — tell me what to revert or adjust

#### 4c. Manual checks

Process the "WCAG 2.2 Static Code Checks" section from the remediation guide:

1. Search the project source for each pattern. Skip non-applicable checks.
2. Present confirmed violations as a batch, then ask:

`[QUESTION]` **I found [N] code patterns that need manual fixes. Apply them?**

1. **Yes, fix all** — apply all proposed changes
2. **Let me pick** — I'll choose which ones to apply
3. **Skip** — don't apply any manual fixes

If the user chooses **Yes, fix all** or **Let me pick**: apply the fixes, list the files and changes made, then ask:

`[QUESTION]` **I've applied the manual fixes. Please verify visually — does everything look correct?**

1. **Looks good** — proceed to Step 5
2. **Something's wrong** — tell me what to revert or adjust

If the user chooses **Skip**, show the following message before proceeding to Step 5:

`[MESSAGE]` Skipping manual fixes is fine for now, but keep in mind these patterns affect real users — missing keyboard support can trap keyboard-only users, and absent skip links force screen reader users to navigate through every repeated element on every page. These findings will remain in the remediation guide if you decide to revisit them.

If 0 violations were found, proceed automatically to Step 5 without showing the message.

Common patterns: `<div onClick>` without keyboard support, untrapped focus in modals, missing skip links, decorative images without `aria-hidden`.

### Step 5 — Verification re-audit (mandatory)

This step is **mandatory** — always run it after fixes, no exceptions. Do not skip, do not ask the user whether to run it. If no fixes were applied in Step 4 (user skipped all sub-steps), skip this step and proceed to Step 6.

Inform the user before running, then **immediately** execute the script without waiting for user input:

`[MESSAGE]` Running a verification re-audit to make sure all fixes are clean and no new issues were introduced.

```bash
node scripts/run-audit.mjs --base-url <URL>
```

After completion, parse ALL findings — new regressions and unresolved originals:

- **All clear (0 issues)** → proceed to Step 6.
- **Issues found (any kind)** → follow this sequence:

  1. If the issues are new regressions (not seen before the fixes), inform the user first:

     `[MESSAGE]` The verification re-audit found new issues that were not present in the initial scan. This is expected — some issues only surface after earlier fixes change the DOM structure. Here are the new findings:

  2. Present all findings using the same format as Step 3 (grouped by severity).
  3. Fix them following Step 4 procedures (4a for structural, 4b approval gate for style). Do not skip to Step 6.
  4. Run the re-audit again.
  5. If issues **still persist after fixing**, ask:

     `[QUESTION]` **The re-audit still shows [N] issue(s) after attempting fixes. How would you like to proceed?**

     1. **Keep fixing** — continue working through the remaining issues
     2. **Move on** — proceed to delivery with known remaining issues documented

  6. If the user chooses **Move on**, proceed to Step 6. If they choose **Keep fixing**, repeat from step 3.

Repeat fix+re-audit up to a maximum of **3 cycles total**. If issues persist after 3 cycles, list remaining issues and proceed to Step 6 without asking. Previously declined style changes do not restart the cycle.

**Do not proceed to Step 6 until either: the re-audit is clean, the user explicitly chooses to move on, or 3 cycles are exhausted.**

### Step 6 — Deliver results

1. **Summarize**: total found, resolved, files modified, remaining (if any).
2. If all resolved, confirm the site passes WCAG 2.2 AA automated checks.
3. Ask about reports. Wait for the answer before continuing:

`[QUESTION]` **Would you like a visual report?**

1. **Yes**
2. **No thanks**

   If **Yes**, wait for that answer, then ask which format in a new message:

   `[QUESTION]` **Which format?**

   1. **HTML Dashboard** — interactive web report with compliance score
   2. **PDF Executive Summary** — formal document for stakeholders
   3. **Both**

4. If reports requested, wait for the format answer above, then ask save location (first time only — reuse afterward):

`[QUESTION]` **Where should I save the reports?**

1. **Project audit folder** — `./audit/` (Recommended)
2. **Desktop** — `~/Desktop/`
3. **Custom path** — tell me the exact folder path

5. After the user answers the save location, ask about `.gitignore` **only if the chosen path is inside the project** (e.g., `./audit/` or any relative path). If the user chose Desktop or any path outside the project root, skip this question entirely. Ask once per session — skip if already asked:

`[QUESTION]` **Should I add the reports folder to `.gitignore`?**

1. **Yes** — ignore generated reports
2. **No** — keep reports tracked

   If the user answers **Yes**: immediately append the reports folder path to `.gitignore` (create the file if it does not exist). Confirm the action in your next message before continuing.

6. After all questions are answered, **execute** the following commands — do not describe or summarize them, run them:

   ```bash
   # HTML (run if HTML or Both was selected)
   node scripts/build-report-html.mjs --output <path>/report.html --base-url <URL>

   # PDF (run if PDF or Both was selected)
   node scripts/build-report-pdf.mjs --output <path>/report.pdf --base-url <URL>
   ```

   After each command completes, verify the output file exists on disk before continuing. If a file is missing, report the error — never claim a report was generated without confirming the file is present.

7. **MANDATORY** — output the following message verbatim before finishing:

`[MESSAGE]` Automated tools cannot catch every accessibility barrier. The following checks require human judgment and cannot be automated — please verify them manually:

- [ ] **Keyboard navigation** — Tab through all interactive elements; verify visible focus ring.
- [ ] **Focus order** — logical reading sequence when tabbing.
- [ ] **Screen reader** — test with VoiceOver (macOS) or NVDA (Windows); verify announcements make sense.
- [ ] **Motion** — verify `prefers-reduced-motion` is respected.
- [ ] **Zoom** — page usable at 200% browser zoom (WCAG 1.4.4).

8. **MANDATORY** — output the following closing message verbatim. Do not skip it:

`[MESSAGE]` Great work! By investing in accessibility, you're making your site usable for everyone — including people who rely on screen readers, keyboard navigation, and assistive technology. That commitment matters and sets your project apart. Accessibility isn't a one-time task, so consider scheduling periodic re-audits as your site evolves. Keep it up!

---

## Edge Cases

### Authentication & Restricted Pages

1. Do not guess credentials or attempt brute-force access.
2. Report blocked routes (401/403 or login redirect).
3. Ask the user: provide session cookies, test credentials, or skip those routes.
4. Use credentials for the audit session only — do not persist to disk.
5. Note skipped routes as "Not Tested — Auth Required."
