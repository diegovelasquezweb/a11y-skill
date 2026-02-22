---
name: a11y
description:
  Audit and fix website accessibility (WCAG 2.2 AA) using automated scanning
  (axe-core + Playwright). Use when the user asks to: audit a URL for
  accessibility, check WCAG compliance, fix a11y issues, test screen reader
  support, verify keyboard navigation, check color contrast, fix ARIA
  attributes, add alt text, fix heading hierarchy, improve focus management,
  check ADA/EAA/EN 301 549 compliance, or generate an accessibility report.
  Trigger keywords: "accessibility", "a11y", "WCAG", "ADA", "screen reader",
  "assistive technology", "accessibility audit", "color contrast", "alt text",
  "ARIA". Do NOT use for performance audits, SEO, Lighthouse scores, or
  non-web platforms.
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
| Report & evidence standards       | Step 2 — presenting findings                  | [references/report-standards.md](references/report-standards.md) |
| Source file patterns by framework | Step 3a — locating files to fix               | [references/source-patterns.md](references/source-patterns.md)   |
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
6. **Acknowledge effort** — at final delivery (Step 4), close with a genuine acknowledgment of the user's accessibility investment, regardless of how many issues were fixed.

Adapt the message templates below in tone and structure — do not copy verbatim.

---

## Workflow

Follow these steps sequentially. Copy this checklist and track progress:

```
Audit Progress:
- [ ] Step 1: Sitemap check + run audit
- [ ] Step 2: Present findings + request permission
- [ ] Step 3a: Structural fixes (Critical → High → Medium → Low)
- [ ] Step 3b: Style-dependent fixes (explicit approval)
- [ ] Step 3c: Manual checks
- [ ] Step 3d: Verification re-audit (automatic)
- [ ] Step 4: Deliver results + offer reports
```

### Step 1 — Run the audit

If no URL provided, ask for one.

Normalize input before passing to `--base-url`:

- `localhost:3000` → `http://localhost:3000`
- `mysite.com` → `https://mysite.com`
- Full URLs → use as-is.

**Sitemap check**: Fetch `<URL>/sitemap.xml`.

- **Found** → inform the user, scan all listed pages.
- **Not found** → crawl from homepage (default: 10 pages). Offer `--max-routes` or `--routes` to adjust scope.

Run the audit:

```bash
node scripts/run-audit.mjs --base-url <URL>
```

For local projects with framework auto-detection, add `--project-dir <path>`. For non-default flags, load [references/cli-reference.md](references/cli-reference.md).

After completion, parse `REMEDIATION_PATH` from script output and read that file. **Fallback**: if `REMEDIATION_PATH` is absent in the output, read `audit/internal/remediation.md` directly. Do not share internal file paths with the user.

If the script fails, consult [references/troubleshooting.md](references/troubleshooting.md) to self-correct before asking the user. If unrecoverable, offer: (1) Retry, (2) Different URL, (3) Skip and troubleshoot manually.

### Step 2 — Present findings and request permission

Load [references/report-standards.md](references/report-standards.md) for finding field requirements and deliverable format.

Read the remediation guide and:

1. Summarize by severity (Critical → High → Medium → Low).
2. Propose specific fixes from the remediation guide.
3. Group by component or page area, explaining why each fix matters.
4. Ask how to proceed:
   1. **Severity by severity** (default) — fix one group at a time with a checkpoint after each.
   2. **Fix all structural** — apply all structural fixes at once. Style changes still require separate approval.
   3. **Only critical** — fix Critical severity only.

Default (if user says "fix" or "go ahead") is **severity by severity**.

**0 issues found** → skip to Step 4. Note: automated tools catch ~30–50% of barriers; recommend manual checks.

**User declines** → state impact (assistive tech users affected, legal risk under ADA/EAA/EN 301 549) and offer to revisit later.

### Step 3 — Fix

Work through each phase in order.

#### 3a. Structural fixes (Critical → High → Medium → Low)

Safe to apply — no visual changes (ARIA attributes, alt text, labels, DOM order, lang, heading hierarchy).

Load [references/source-patterns.md](references/source-patterns.md) to locate source files by detected framework.

- Use glob patterns and the "Fixes by Component" table from the remediation guide to batch edits per file.
- If a finding has a "Managed Component Warning", verify the element is not rendered by a UI library before applying ARIA fixes.

**Severity by severity** (default): apply one group → checkpoint (list files + fixes applied) → ask user to verify visually → repeat for each remaining group.

**Fix all structural**: apply all groups → single checkpoint with complete file list → ask to verify.

#### 3b. Style-dependent fixes (color-contrast, font-size, spacing)

> **Style-dependent protection**: these fixes change the site's appearance. Always show exact proposed changes and wait for explicit approval — even if the user previously said "fix all". Never modify visual properties without the user seeing the change first.

Show: property, current value → proposed value, contrast ratio change (for color). Ask: yes / no / let me pick which ones.

#### 3c. Manual checks

Process the "WCAG 2.2 Static Code Checks" section from the remediation guide:

1. Search the project source for each pattern. Skip non-applicable checks.
2. Present confirmed violations as a batch and wait for permission before applying.

Common patterns: `<div onClick>` without keyboard support, untrapped focus in modals, missing skip links, decorative images without `aria-hidden`.

#### 3d. Verification re-audit (automatic)

Re-run the audit to confirm fixes are clean:

```bash
node scripts/run-audit.mjs --base-url <URL>
```

- **Clean** → proceed to Step 4.
- **New issues** (regressions from fixes) → present them, fix, and re-verify. Previously declined issues do not trigger a restart.

### Step 4 — Deliver results

1. **Summarize**: total found, resolved, files modified, remaining (if any).
2. If all resolved, confirm the site passes WCAG 2.2 AA automated checks.
3. **Manual verification checks** — present only project-relevant ones:

   > Automated tools catch 30–50% of barriers. These require human judgment:
   >
   > 1. **Keyboard navigation** — Tab through all interactive elements; verify visible focus ring.
   > 2. **Focus order** — logical reading sequence when tabbing.
   > 3. **Screen reader** — test with VoiceOver (macOS) or NVDA (Windows); verify announcements make sense.
   > 4. **Motion** — verify `prefers-reduced-motion` is respected.
   > 5. **Zoom** — page usable at 200% browser zoom (WCAG 1.4.4).

4. **Offer visual reports**:
   1. HTML Dashboard — interactive web report with compliance score.
   2. PDF Executive Summary — formal document for stakeholders.
   3. Both.
   4. No thanks.

5. If reports requested, ask save location (first time only — reuse afterward). Ask about `.gitignore` (first time only).

   ```bash
   # HTML
   node scripts/build-report-html.mjs --output <path>/report.html --base-url <URL>
   open <path>/report.html

   # PDF (requires HTML first)
   node scripts/build-report-html.mjs --output <path>/report.html --base-url <URL>
   node scripts/build-report-pdf.mjs <path>/report.html <path>/report.pdf
   open <path>/report.pdf
   ```

6. Recommend next steps: periodic re-audits, screen reader testing, manual user testing.
7. Close with an accessibility acknowledgment.

---

## Edge Cases

### Authentication & Restricted Pages

1. Do not guess credentials or attempt brute-force access.
2. Report blocked routes (401/403 or login redirect).
3. Ask the user: provide session cookies, test credentials, or skip those routes.
4. Use credentials for the audit session only — do not persist to disk.
5. Note skipped routes as "Not Tested — Auth Required."
