# Report & Evidence Standards

## Conventions

- Use route paths (`/`, `/products`) as primary locations — local URLs go under `Test Environment`.

## Required Finding Fields

Each finding must include:

1. WCAG criterion and level.
2. Affected route path and component/selector.
3. Reproduction steps and actual vs expected behavior.
4. Impacted users.
5. Severity (Critical, High, Medium, Low).
6. Recommended fix.
7. QA retest notes.
8. Concrete proof (DOM snippet, log, or tool output). Screenshot only if it clearly demonstrates the exact issue.

## Deliverable Order

Always return results in this exact order:

1. Executive summary (including `Test Environment` base URL used during the audit).
2. Findings table (ID, severity, WCAG criterion, impacted area, short impact).
3. Issue details (one section per issue using the fields above).

## File Output

1. **Internal pipeline files** (always stored in the skill's `.audit/` directory):
   - `a11y-scan-results.json` — raw scan data
   - `a11y-findings.json` — enriched findings
   - `remediation.md` — AI-optimized remediation guide
   - `screenshots/` — element evidence screenshots

2. **User-facing reports** (only when requested, at user-chosen location):
   - **Audit Report (HTML)**: interactive dashboard with severity cards and compliance score
   - **Executive Summary (PDF)**: formal A4 document for stakeholders
   - Do not generate dated versions (e.g., `report-2026-01-01.html`) or per-issue markdown files.

3. If findings count is 0: present a clean summary inline in the conversation.

4. Chat output should summarize results. Visual reports are supplementary, not the default source of truth.
