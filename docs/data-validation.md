# Data Validation Guide

**Navigation**: [Home](../README.md) • [Architecture](architecture.md) • [CLI Handbook](cli-handbook.md) • [Configuration](configuration.md) • [Intelligence](engine-intelligence.md) • [Scoring](scoring-system.md) • [Scripts](scripts-catalog.md) • [Testing](testing.md)

---

## Official Sources (by reliability)

1. **WCAG 2.2 spec** — https://www.w3.org/TR/WCAG22/
2. **WCAG Understanding docs** — https://www.w3.org/WAI/WCAG22/Understanding/
3. **axe-core rule metadata** — `node_modules/axe-core/axe.js` via `getRules()` + https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
4. **W3C ARIA APG** — https://www.w3.org/WAI/ARIA/apg/
5. **MDN Web Docs** — https://developer.mozilla.org

## Files to Validate

| File                        | What to validate                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `assets/rule-metadata.json` | `wcagCriterionMap` (106 mappings), URLs (`mdn`, `apgPatterns`, `a11ySupport`, `inclusiveComponents`), `impactedUsers`, `expected` |
| `assets/intelligence.json`  | `fix.description`, `fix.code`, `framework_notes`, `false_positive_risk`, `manual_test`, `related_rules`                           |
| `assets/manual-checks.json` | `criterion` mapping, `steps`, `remediation`, `code_example`, `ref` URLs                                                           |

## Step 1 — Validate `wcagCriterionMap` against axe-core (automated)

Already covered by `tests/intelligence.test.mjs` — the test imports axe-core, extracts WCAG tags from each rule, and compares against `rule-metadata.json`. Run:

```bash
pnpm test
```

If axe-core was upgraded, check for:

- New rules added to axe-core that are missing from `intelligence.json`
- Changed WCAG tag mappings on existing rules
- Deprecated or removed rules

## Step 2 — Validate URLs (semi-automated)

Run HTTP HEAD requests against every URL in `rule-metadata.json` and `manual-checks.json`:

- `mdn.*` — MDN documentation links
- `apgPatterns.*` — W3C ARIA APG pattern links
- `a11ySupport.*` — a11ysupport.io role links
- `inclusiveComponents.*` — Inclusive Components article links
- `manual-checks[].ref` — WCAG Understanding doc links

Flag any URL returning status other than 200 (broken or redirected). MDN URLs change frequently — prioritize fixing these.

## Step 3 — Validate `intelligence.json` content against WCAG Understanding docs

For each rule, consult the corresponding WCAG Understanding page and verify:

1. **`fix.description`** — Technically correct per the spec?
2. **`fix.code`** — Follows WCAG recommended techniques?
3. **`framework_notes`** — Current for React 19+, Vue 3+, Angular 17+?
4. **`false_positive_risk`** — Coherent with axe-core failure conditions?
5. **`expected`** (in `rule-metadata.json`) — Matches the official success criterion?
6. **`impactedUsers`** (in `rule-metadata.json`) — Covers user groups mentioned in Understanding docs?

Process in batches by WCAG principle:

- Batch 1: **Perceivable** (1.x)
- Batch 2: **Operable** (2.x)
- Batch 3: **Understandable** (3.x)
- Batch 4: **Robust** (4.x)

## Step 4 — Validate `manual-checks.json` against WCAG 2.2

For each manual check:

1. `criterion` ID is correct
2. `title` matches the official criterion name
3. `level` (A/AA) is correct
4. `steps` are technically complete
5. `code_example` follows best practices
6. `ref` URL is correct and active
7. Identify missing WCAG 2.2 AA criteria that should have manual checks

## Step 5 — Verify coverage against axe-core

Compare `intelligence.json` rules against the full `axe.getRules()` catalog filtered by WCAG A/AA + best-practice tags. Identify:

- axe-core rules we don't cover (should be 0 for 100% coverage)
- Rules in our data that axe-core removed (stale rules)

This is automated by the "has no stale rules" test in `intelligence.test.mjs`.

## Step 6 — Apply corrections

Edit the 3 asset JSON files with all corrections found. Ensure `related_rules` remain reciprocal (if A references B, B must reference A).

## Step 7 — Run tests

```bash
pnpm test
```

All 593+ tests must pass. The test suite validates:

- Schema integrity (required fields, valid values)
- Internal integrity (reciprocal related_rules, no self-references)
- axe-core alignment (no stale rules, WCAG tag matching)
- Cross-file consistency (every intelligence rule has rule-metadata entries)
