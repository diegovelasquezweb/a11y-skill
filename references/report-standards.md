# Report & Evidence Standards

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

1. Write three final artifacts in `audit/`:

- **Audit Report (HTML)**: `audit/report.html`
- **Remediation Guide (MD)**: `audit/remediation.md`
- **Executive Summary (PDF)**: `audit/report.pdf`
- Do not generate dated versions (e.g., `audit/index-2026-01-01.html`) or per-issue markdown files.
- Keep JSON pipeline files in `audit/internal/` only (`a11y-scan-results.json`, `a11y-findings.json`).

2. If findings count is 0: still generate `audit/report.html` with a clean summary (`Congratulations, no issues found.`).

3. Keep temporary pipeline files in `audit/internal/`; do not delete them automatically.

4. Chat output should summarize results, but `audit/report.html` is the default source of truth.
