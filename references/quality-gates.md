# Quality Gates

Mandatory pass/fail checks at each phase boundary. If a gate fails, stop and resolve before proceeding to the next step.

## Gate 1 — Pre-audit (before Step 2)

- [ ] URL is normalized and has a scheme (`http://` or `https://`)
- [ ] Discovery method confirmed (Crawler or Sitemap)
- [ ] If Sitemap: `sitemap.xml` successfully fetched and page count confirmed with the user

**Fail action**: if URL is unreachable or scheme is missing, correct before running the scanner.

## Gate 2 — Post-audit (before Step 3)

- [ ] `REMEDIATION_PATH` parsed from script output, or `.audit/remediation.md` fallback used
- [ ] `pages_scanned > 0` in report metadata — at least one route was audited
- [ ] Report file exists on disk and is readable

**Fail action**: if `pages_scanned = 0`, stop — do not present empty findings. Consult [troubleshooting.md](troubleshooting.md).

## Gate 3 — Findings integrity (before presenting Step 3)

- [ ] Every finding has: `rule_id`, `severity`, and either a `wcag_criterion_id` or a `wcag_classification` label (Best Practice / AAA)
- [ ] Overall Assessment (`Pass` / `Conditional Pass` / `Fail`) is present in the report header
- [ ] Finding count matches severity breakdown (Critical + Serious + Moderate + Minor = total WCAG findings)

**Fail action**: present findings as-is, note any missing fields explicitly. Never fabricate `rule_id`, WCAG criterion, or severity.

## Gate 4 — Fix integrity (after each 4a / 4b / 4c batch)

- [ ] Files modified are only those listed in the proposed change set
- [ ] Phase 4a changes contain no CSS property modifications (colors, fonts, spacing belong in 4b)
- [ ] Phase 4b changes were not applied before receiving explicit user approval

**Fail action**: if an unintended file was modified, revert it immediately before asking for visual verification.

## Gate 5 — Re-audit delta (Step 5)

- [ ] Count total findings before fixes (`N_before`) from the Step 3 report
- [ ] Count total findings after re-audit (`N_after`) from the Step 5 report
- [ ] Present delta explicitly: **"X of Y findings resolved. Z remaining."**
- [ ] If `N_after > N_before`: new regressions detected → output the `[MESSAGE]` about child element evaluation before listing new findings

**Fail action**: never present re-audit results without the resolved/remaining delta. If the delta cannot be computed, state the counts separately.
