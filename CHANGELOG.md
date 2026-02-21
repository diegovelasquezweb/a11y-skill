# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.4.0] — 2026-02-21

### Added
- `assets/rule-metadata.json` — WCAG criterion mapping, MDN links, impacted users, and expected behavior per rule
- Visual overlay on screenshots for accessibility violations
- Manual checks for WCAG 2.2 static code violations after automated fixes
- `intelligence.json` schema validation with comprehensive tests (`tests/intelligence.test.mjs`)
- GitHub Actions workflow for PR title and project integrity validation (`pr-standards.yml`)
- 48 new intelligence rules: 29 WCAG A/AA + 19 best-practice — achieving 100% axe-core coverage (106 total rules)
- Reciprocal `related_rules` links across all 106 rules for bidirectional navigation

### Changed
- Score labeling logic and compliance metrics updated in reports
- Code language detection improved for fix code snippets
- Accessibility rules and references refactored for clarity and structure
- Audit script reliability enhanced with timeouts, URL validation, and improved error handling
- `SKILL_ROOT` constant refactored for consistency
- Test suite expanded from 79 to 593 tests (514 in intelligence validation alone)

### Fixed
- `localStorage` key escaping corrected in HTML report

---

## [0.3.0] — 2026-02-20

### Removed
- `reportTitle`, `companyName`, and `accentColor` configuration keys — report branding is now static and no longer configurable via `a11y.config.json`
- `a11y.config.json.example` reference file — superseded by the full schema documented in `docs/configuration.md`

### Fixed
- PDF generation now uses `waitUntil: "load"` instead of `"networkidle"` — faster and more reliable for local `file://` URLs
- `parseArgs` in `check-toolchain.mjs` no longer returns a dead empty object

### Tests
- Added case-insensitive input type tests for `detectImplicitRole` (e.g. `type="CHECKBOX"`)
- Added attribute selector fallback test for `extractSearchHint` (e.g. `[aria-label="Close"]`)

---

## [0.2.1] — 2026-02-20

### Added
- `a11y.config.json` supports `colorScheme` and `viewports` for scan emulation configuration
- Vitest unit tests covering `core-findings`, `a11y-utils`, `core-utils`, and `run-analyzer` (39 tests)
- `detectImplicitRole()` — resolves implicit ARIA roles for native HTML elements (`<button>`, `<a>`, `<input>`, etc.)
- `extractSearchHint()` — converts CSS selectors into source-code search patterns for AI agent reproduction steps
- Asset loading guards: missing `intelligence.json` or `manual-checks.json` now produce actionable error messages
- `references/` directory with progressive disclosure files: `baseline-checks.md`, `manual-checks.md`, `platform-setup.md`

### Changed
- `data-manual-checks.mjs` extracted to `assets/manual-checks.json` (machine-readable static asset)
- APG patterns, A11y Support, and Inclusive Components mappings extracted to `assets/intelligence.json`
- `SKILL.md` reduced from 373 to 233 lines — detailed content moved to `references/`
- `escapeHtml` import in `format-pdf.mjs` corrected to `core-utils.mjs`

### Fixed
- Manual findings for h1/main no longer trigger false positives when route metadata is absent
- `impactedUsers` fallback corrected — no longer inherits `impact` description field
- `getInternalPath` missing import in `build-report-md.mjs` (was a runtime `ReferenceError`)
- Section numbering in `SKILL.md` was non-sequential — corrected to 1–11

---

## [0.2.0] — 2026-02-19

### Added
- Multi-source a11y intelligence: automatic links to W3C APG patterns, A11ySupport.io, and Inclusive Components per finding
- US regulatory context (18F, Section 508) rendered once in the report footer via `metadata` object
- `total_instances` count per finding with evidence label showing "showing N of M instances"
- Reproduction steps are now source-file oriented with semantic search hints
- WCAG 2.2 manual checks section in both HTML and Markdown reports

### Changed
- Pipeline refactored into dedicated modules: `format-md.mjs`, `format-html.mjs`, `format-pdf.mjs`, `core-findings.mjs`, `core-utils.mjs`
- `run-audit.mjs` orchestrates the full pipeline: scanner → analyzer → HTML → MD → PDF
- Report artifacts: `audit/report.html`, `audit/remediation.md`, `audit/report.pdf`
- Finding IDs are now deterministic SHA256-based hashes

### Fixed
- Compliance score `computeComplianceScore()` clamped to `[0, 100]`
- `fixBlock` separator between implementation text and code fence

---

## [0.1.0] — 2026-01-15

### Added
- Initial release: Playwright + axe-core scanner (`run-scanner.mjs`)
- WCAG 2.1/2.2 A/AA/best-practice tag coverage
- Route auto-discovery from same-origin `<a href>` links
- Interactive HTML report with issue cards, search, severity filters, and page filters
- Markdown remediation guide optimized for AI agents
- PDF export via Playwright
- `a11y.config.json` for `maxRoutes`, `complianceTarget`, `ignoreFindings`, `excludeSelectors`, `axeRules`
- Support for Claude, Cursor, Codex, Gemini CLI, and Antigravity via [Agent Skills standard](https://agentskills.io)
- Windsurf and Antigravity extended workflow setup via `SKILL.md`
- `postinstall` hook for automatic Playwright Chromium browser installation
