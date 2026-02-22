# Testing Strategy

**Navigation**: [Home](../README.md) • [Architecture](architecture.md) • [CLI Handbook](cli-handbook.md) • [Configuration](configuration.md) • [Data Validation](data-validation.md) • [Intelligence](engine-intelligence.md) • [Scoring](scoring-system.md) • [Scripts](scripts-catalog.md) • [Testing](testing.md)

---

## Table of Contents

- [Overview](#overview)
- [Test Categories](#test-categories)
- [Running Tests](#running-tests)
- [Adding a New Rule Test](#adding-a-new-rule-test)

The a11y skill maintains a robust test suite to ensure the **Audit Engine** remains reliable and precise. We prioritize unit tests for engine logic and intelligence mapping.

## Overview

- **Framework**: [Vitest](https://vitest.dev/)
- **Total Tests**: 817
- **Command**: `pnpm test`

## Test Categories

The suite is organized into logical groups that mirror the engine's capacities.

### 1. Scouting & Discovery (`run-scanner.test.mjs`)

Validates that the crawler is smart and safe.

- **URL Normalization**: Ensures `/about#top` and `/about?q=1` are handled correctly.
- **Deduplication**: Prevents scanning the same route multiple times.
- **Filtering**: Verifies that assets like `.pdf`, `.jpg`, and `.svg` are excluded from the HTML scan.
- **BFS Discovery**: Validates multi-level crawling (depth 1, depth 2, maxRoutes cap, no-revisit, pagination dedup, external filtering, error recovery).

### 2. Remediation Intelligence (`run-analyzer.test.mjs`)

The core of our "Fix-First" promise.

- **Implicit ARIA**: Maps ~18 native HTML elements to their ARIA roles (e.g., `<button>` → `button`, `<nav>` → `navigation`, `<h1>`–`<h6>` → `heading`).
- **Surgical Selectors**: Ensures that complex CSS paths are simplified into useful "Search Hints" (prefers ID > Class > Tag).
- **Intelligence Schema**: Validates that `assets/intelligence.json` has all required top-level keys (`axeVersion`, `wcagCriterionMap`, `rules`, `apgPatterns`, etc.) and that `wcagCriterionMap` covers every rule defined in `rules`.

### 3. Compliance & Scoring (`core-findings.test.mjs`)

Ensures math accuracy for stakeholders.

- **Weighted Penalties**: Verifies that Critical issues correctly subtract 15 points and scores are clamped at zero.
- **Grade Labels**: Covers all 5 score buckets (Excellent / Good / Fair / Needs Improvement / Poor).
- **Sorting**: Ensures Critical findings always appear at the top of report data.
- **Field Normalization**: Verifies that `wcagCriterionId`, `falsePositiveRisk`, `fixDifficultyNotes`, `frameworkNotes`, and `relatedRules` are correctly mapped and default safely when absent.

### 4. Utilities & Cleanup (`core-utils.test.mjs` / `a11y-utils.test.mjs`)

- **Sanitization**: Validates HTML escaping and safe character entities.
- **URL Linkification**: Ensures references and MDN links are correctly formatted as anchor tags.
- **Config Management**: Verifies merging logic between user JSON files and defaults.

## Running Tests

To run the full suite:

```bash
pnpm test
```

To run in watch mode (during development):

```bash
pnpm vitest
```

## Adding a New Rule Test

When adding a new rule to `intelligence.json`, the `wcagCriterionMap` coverage test in `run-analyzer.test.mjs` will automatically catch if the new rule is missing from the map — no additional test is required for basic schema health. Add a targeted test only if the rule introduces new logic (e.g., a new selector extraction path or a custom impact override).
