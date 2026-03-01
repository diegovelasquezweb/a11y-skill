# Report & Evidence Standards

## Conventions

- Use route paths (`/`, `/products`) as primary locations — local URLs go under `Test Environment`.
- When a finding appears on multiple pages, present: `Found on {pages_affected} pages — {affected_urls}`

## Finding Template

Present each finding using this exact field order. Do not omit or reorder fields.

```
### [A11Y-xxxxxx] <short title>

- **Severity**: Critical | Serious | Moderate | Minor
- **Category**: <aria | text-alternatives | forms | keyboard | structure | semantics | name-role-value | tables | color | language | parsing | sensory>
- **WCAG**: <criterion ID> — <criterion name> (Level A | AA)
- **Route**: <path>
- **Evidence**: <DOM snippet from Evidence from DOM — use to locate the element in source>
- **Impact**: <one sentence — which users are affected and how>
- **Reproduction**: <numbered steps>
- **Actual**: <what happens>
- **Expected**: <what should happen>
- **Fix**: <specific code change or action required>
- **Retest**: <pass condition — what to verify after the fix>
- **Proof**: <DOM snippet, tool output, or screenshot reference>
```


## Console Summary Template

Present this block verbatim in Step 6 item 1. Fill in values from the remediation guide and session data.

```
## Accessibility Audit — Final Summary

**Overall Assessment**: Pass | Conditional Pass | Fail
**URL**: https://...
**Pages scanned**: N

| Metric         | Count |
|----------------|-------|
| Total findings |     N |
| Resolved       |     N |
| Remaining      |     N |
| Files modified |     N |
```

Append a context note only when `remaining > 0`:

- **Conditional Pass**: `> N remaining finding(s) are Minor — no Critical or Serious issues unresolved.`
- **Fail**: `> N finding(s) remain unresolved — includes Critical or Serious issues requiring attention.`

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
