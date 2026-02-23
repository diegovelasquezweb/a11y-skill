---
name: a11y
description: "Audit and fix website accessibility (WCAG 2.2 AA) using automated scanning (axe-core + Playwright). Use when the user asks to audit a URL for accessibility, check WCAG compliance, fix a11y issues, test screen reader support, verify keyboard navigation, check color contrast, fix ARIA attributes, add alt text, fix heading hierarchy, improve focus management, check ADA/EAA/EN 301 549 compliance, or generate an accessibility report. Trigger keywords: accessibility, a11y, WCAG, ADA, screen reader, assistive technology, accessibility audit, color contrast, alt text, ARIA. Do NOT use for performance audits, SEO, Lighthouse scores, or non-web platforms."
compatibility: Requires Node.js 18+, pnpm (npm as fallback), and internet access. Playwright + Chromium are auto-installed on first run.
license: Proprietary (All Rights Reserved)
metadata:
  author: diegovelasquezweb
  version: "0.7.0"
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
- Never declare "100% accessible" based on a targeted audit. Only a Final Certification Audit can confirm that.
- Never modify the user's `.gitignore` without asking first.
- Treat scripts as black boxes: run with `--help` to discover flags. Do not read script source — it consumes context budget for no benefit.
- If `pnpm` is not available, use `npm` as fallback.

## Communication Rules

1. **Closed questions only** — yes/no or numbered vertical list (1, 2, 3…). Never inline bullets.
2. **Concise and technical** — state findings, propose action, ask for a decision.
3. **Always provide options** — never ask open-ended "what do you want?"
4. **Explain the "why"** — user impact, legal risk, or design implication.
5. **One question per message** — do not stack multiple decisions.
6. **Acknowledge effort** — at final delivery (Step 6), close with a genuine acknowledgment of the user's accessibility investment, regardless of how many issues were fixed.
7. **Message tags** — this playbook uses tags to mark messages that must follow a specific format. When you reach a tagged block, present it as a **standalone message** — never merge with informational lists, findings, summaries, or other content. Tags:
   - `[QUESTION]` — a user-facing question with numbered options. Adapt tone and structure but keep the same options.
   - `[MESSAGE]` — a pre-written message. **Copy verbatim** — do not rephrase, summarize, or adapt. Output the exact text every time.

---

## Workflow

Follow these steps sequentially. Copy this checklist and track progress:

```
Audit Progress:
- [ ] Step 1: Page discovery
- [ ] Step 2: Run audit
- [ ] Step 3: Present findings + request permission
- [ ] Step 4a: Structural fixes (Critical → High → Medium → Low)
- [ ] Step 4b: Style-dependent fixes (explicit approval)
- [ ] Step 4c: Manual checks
- [ ] Step 5: Verification re-audit (mandatory)
- [ ] Step 6: Deliver results + offer reports
```

### Step 1 — Page discovery

If no URL provided, ask for one.

Normalize input before passing to `--base-url`:

- `localhost:3000` → `http://localhost:3000`
- `mysite.com` → `https://mysite.com`
- Full URLs → use as-is.

Once the URL is confirmed, ask the discovery method:

`[QUESTION]` **How should I discover the pages to audit?**

1. **Sitemap** — read your `sitemap.xml` and scan every listed page
2. **Crawler** — let the scanner discover pages automatically from the homepage

If the user chooses **Sitemap**: fetch `<URL>/sitemap.xml`. If found, confirm page count and proceed to Step 2. If not found, inform the user and fall back to the Crawler question below.

If the user chooses **Crawler**: ask the scan scope:

`[QUESTION]` **How many pages should I crawl?**

1. 5 pages
2. 10 pages (Recommended)
3. 15 pages
4. 20 pages
5. All reachable pages

Store the user's choice. Proceed to Step 2.

### Step 2 — Run the audit

Run the audit with the discovery settings from Step 1:

```bash
# Sitemap mode
node scripts/run-audit.mjs --base-url <URL>

# Crawler mode (example with 10 pages)
node scripts/run-audit.mjs --base-url <URL> --max-routes <N>
```

For "All reachable pages", omit `--max-routes` (the scanner crawls without limit).

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

Default (if user says "fix" or "go ahead") is **Fix by severity**.

If the user chooses **Reports first**: jump to the report generation commands from Step 6, deliver the reports, then return to Step 4 to begin fixes by severity.

**0 issues found** → skip to Step 6. Note: automated tools cannot catch every barrier; recommend manual checks.

**User declines** → present the following message:

`[MESSAGE]` Understood. Keep in mind that the unresolved issues affect real users — screen reader users may not be able to navigate key sections, and keyboard-only users could get trapped. Accessibility is also a legal requirement under ADA (US), the European Accessibility Act (EU), and EN 301 549. These findings will remain available if you decide to revisit them later.

### Step 4 — Fix

Work through each phase in order.

#### 4a. Structural fixes (Critical → High → Medium → Low)

Safe to apply — no visual changes (ARIA attributes, alt text, labels, DOM order, lang, heading hierarchy).

Load [references/source-patterns.md](references/source-patterns.md) to locate source files by detected framework.

- Use glob patterns and the "Fixes by Component" table from the remediation guide to batch edits per file.
- If a finding has a "Managed Component Warning", verify the element is not rendered by a UI library before applying ARIA fixes.

Apply one severity group at a time (Critical → High → Medium → Low). After each group: checkpoint (list files + fixes applied) → ask user to verify visually → proceed to next group.

#### 4b. Style-dependent fixes (color-contrast, font-size, spacing)

> **Style-dependent protection**: these fixes change the site's appearance. Always show exact proposed changes and wait for explicit approval — even if the user previously said "fix all". Never modify visual properties without the user seeing the change first.

Show: property, current value → proposed value, contrast ratio change (for color). Then ask:

`[QUESTION]` **Apply these style changes?**

1. **Yes** — apply all proposed changes
2. **No** — skip style fixes
3. **Let me pick** — I'll choose which ones to apply

#### 4c. Manual checks

Process the "WCAG 2.2 Static Code Checks" section from the remediation guide:

1. Search the project source for each pattern. Skip non-applicable checks.
2. Present confirmed violations as a batch and wait for permission before applying.

Common patterns: `<div onClick>` without keyboard support, untrapped focus in modals, missing skip links, decorative images without `aria-hidden`.

### Step 5 — Verification re-audit (mandatory)

This step is **mandatory** — always run it after fixes, no exceptions. Do not skip, do not ask the user whether to run it.

Inform the user before running:

`[MESSAGE]` Running a verification re-audit to make sure all fixes are clean and no new issues were introduced.

```bash
node scripts/run-audit.mjs --base-url <URL>
```

After completion, parse the results:

- **Clean (0 new issues)** → proceed to Step 6.
- **New issues found** → inform the user with the following message, then fix and re-audit again:

`[MESSAGE]` The verification re-audit found new issues that were not present in the initial scan. This is expected — some issues only surface after earlier fixes change the DOM structure. Here are the new findings:

Present the new issues using the same format as Step 3 (grouped by severity). Fix them following Step 4 procedures, then run this Step 5 again. Repeat until clean. Previously declined issues do not trigger a restart.

### Step 6 — Deliver results

1. **Summarize**: total found, resolved, files modified, remaining (if any).
2. If all resolved, confirm the site passes WCAG 2.2 AA automated checks.
3. Ask about reports:

`[QUESTION]` **Would you like a visual report?**

1. **HTML Dashboard** — interactive web report with compliance score
2. **PDF Executive Summary** — formal document for stakeholders
3. **Both**
4. **No thanks**

4. If reports requested, ask save location (first time only — reuse afterward). Ask about `.gitignore` (first time only).

   ```bash
   # HTML
   node scripts/build-report-html.mjs --output <path>/report.html --base-url <URL>
   open <path>/report.html

   # PDF (requires HTML first)
   node scripts/build-report-html.mjs --output <path>/report.html --base-url <URL>
   node scripts/build-report-pdf.mjs <path>/report.html <path>/report.pdf
   open <path>/report.pdf
   ```

5. Present the manual verification checklist:

`[MESSAGE]` Automated tools cannot catch every accessibility barrier. The following checks require human judgment and cannot be automated — please verify them manually:

- [ ] **Keyboard navigation** — Tab through all interactive elements; verify visible focus ring.
- [ ] **Focus order** — logical reading sequence when tabbing.
- [ ] **Screen reader** — test with VoiceOver (macOS) or NVDA (Windows); verify announcements make sense.
- [ ] **Motion** — verify `prefers-reduced-motion` is respected.
- [ ] **Zoom** — page usable at 200% browser zoom (WCAG 1.4.4).

6. Close with the following message:

`[MESSAGE]` Great work! By investing in accessibility, you're making your site usable for everyone — including people who rely on screen readers, keyboard navigation, and assistive technology. That commitment matters and sets your project apart. Accessibility isn't a one-time task, so consider scheduling periodic re-audits as your site evolves. Keep it up!

---

## Edge Cases

### Authentication & Restricted Pages

1. Do not guess credentials or attempt brute-force access.
2. Report blocked routes (401/403 or login redirect).
3. Ask the user: provide session cookies, test credentials, or skip those routes.
4. Use credentials for the audit session only — do not persist to disk.
5. Note skipped routes as "Not Tested — Auth Required."
