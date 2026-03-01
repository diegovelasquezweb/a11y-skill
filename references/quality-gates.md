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

- [ ] Every finding has: `rule_id`, `severity`, and a `wcag` label (e.g., "WCAG 2.1 AA") plus a `wcag_classification` value (`null` for standard AA findings, `"Best Practice"`, or `"AAA"`)
- [ ] Overall Assessment (`Pass` / `Conditional Pass` / `Fail`) is present in the report header
- [ ] Severity counts sum to total: `critical + serious + moderate + minor == total_wcag_findings` (WCAG AA-level only — excludes Best Practice and AAA findings) — if the sum does not match, flag the discrepancy explicitly before presenting

**Fail action**: present findings as-is, note any missing fields or count mismatches explicitly. Never fabricate `rule_id`, WCAG criterion, or severity.

## Gate 4 — Fix integrity (after each fix batch)

- [ ] Files modified are only those listed in the proposed change set
- [ ] Structural fixes contain no CSS property modifications (colors, fonts, spacing belong in the style pass)
- [ ] Style fixes were not applied before receiving explicit user approval

**Fail action**: if an unintended file was modified, revert it immediately before asking for visual verification.

## Gate 5 — Re-audit delta (Step 5)

- [ ] Count total findings before fixes (`N_before`) from the Step 3 report
- [ ] Count total findings after re-audit (`N_after`) from the Step 5 report
- [ ] Compute the three delta values:
  - `resolved` = findings present in N_before but gone in N_after
  - `remaining` = findings present in both N_before and N_after
  - `new` = findings in N_after not seen in N_before (regressions)
- [ ] Present delta using this fixed format: **"`{resolved}` resolved / `{remaining}` remaining / `{new}` new"** — always include all three values, even when zero
- [ ] If `new > 0`: output the `[MESSAGE]` about child element evaluation before listing new findings

**Fail action**: never present re-audit results without the full three-part delta. If delta cannot be computed, state N_before and N_after counts separately and explain why comparison failed.
