# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.8.0] — 2026-02-22

### Changed

- Workflow restructured from 4 steps to 6 steps with clearer separation of concerns:
  - Step 1: Page discovery (NEW — was merged into old Step 1)
  - Step 2: Run audit
  - Step 3: Present findings + request permission
  - Step 4: Fix (sub-phases 4a structural, 4b style, 4c code patterns)
  - Step 5: Verification re-audit (promoted from sub-step 3d to mandatory standalone step)
  - Step 6: Deliver results
- Page discovery (Step 1) now asks user to choose between Sitemap and Crawler, with configurable page count (5/10/15/20/All) for crawler mode
- Step 3 fix strategy options replaced: "Fix by severity", "Reports first, then fix by severity", "Other criteria", "Skip fixes" (was: severity by severity, fix all structural, only critical)
- Communication Rules reduced from 7 rules to 2 (tone + message tags) — redundant rules replaced by structured tags
- All user-facing questions now use `[QUESTION]` tag for consistent formatting — prevents agents from merging question options with informational lists
- All pre-written messages now use `[MESSAGE]` tag with verbatim output requirement — agents copy exact text, no rephrasing
- Step 4a checkpoint formalized as `[QUESTION]` ("Looks good" / "Something's wrong")
- Step 4c permission formalized as `[QUESTION]` ("Yes, fix all" / "Let me pick" / "Skip")
- Step 5 (verification re-audit) is now mandatory with explicit skip condition (only if no fixes were applied)
- Step 5 loop capped at 3 re-audit cycles to prevent infinite loops
- Step 6 manual verification checklist converted from numbered list to checkbox format with `[MESSAGE]` tag
- Step 6 closing message includes positive reinforcement ("Great work!" / "Keep it up!")
- "Final Certification Audit" terminology replaced with "comprehensive full-site verification"
- "Audit Progress" renamed to "Progress" — reflects full workflow, not just auditing
- Progress checklist simplified: 6 flat steps instead of 8 with sub-steps (4a-4c remain in detailed instructions only)
- Removed hardcoded "30-50%" statistic — replaced with "cannot catch every barrier"
- Description frontmatter: fixed multi-line YAML parsing issue, wrapped in quotes to prevent colon-space ambiguity
- Anti-skip rule added to workflow intro: agents must follow every step in order, even if user provides info ahead of time
- "Other criteria" in Step 3 now has explicit follow-through: Step 4 respects user's custom prioritization

### Added

- `[QUESTION]` tag system for all user-facing questions (5 total across workflow)
- `[MESSAGE]` tag system for pre-written verbatim messages (4 total: impact reminder, re-audit start, re-audit findings, manual checklist, closing)
- "Skip fixes" option (option 4) in Step 3 — triggers `[MESSAGE]` impact reminder about disability exclusion and legal risk
- Explicit re-audit notification messages: agent informs user before running and explains new findings if discovered

### Fixed

- Mermaid diagram in `docs/scripts-catalog.md` — subgraph had no ID, causing parse error on GitHub. Added `Reports` ID
- Eval step references updated to match new 6-step numbering (02, 03, 05, 06)
- `evals/README.md` model notes updated: "3a-3d" → "4a-4c + Step 5 re-audit"
- `references/troubleshooting.md` verification reference updated: "Step 3d" → "Step 5"

---

## [0.7.0] — 2026-02-22

### Changed

- SKILL.md rewritten following Agent Skills spec (agentskills.io) best practices: 316 → 220 lines
- `description` frontmatter expanded with exhaustive trigger keywords (accessibility, a11y, WCAG, ADA, screen reader, color contrast, alt text, ARIA, etc.)
- Added Resource Map table at top of SKILL.md with "Load when" guidance for progressive disclosure of references
- Added "scripts as black boxes" constraint — agents run scripts with `--help`, never read source
- Added `REMEDIATION_PATH` fallback: if absent in output, read `audit/internal/remediation.md` directly
- Added `pnpm`/`npm` fallback note in Constraints
- Message templates compressed — agents adapt tone and structure, no verbatim copying
- Standardized imperative voice throughout SKILL.md
- CLI Reference table moved from SKILL.md to `references/cli-reference.md` (progressive disclosure)
- Multi-Viewport Testing section moved from SKILL.md Edge Cases to `references/cli-reference.md`
- README compatibility table simplified — single column with install paths only
- `scripts/validate-urls.mjs` — internal maintenance utility removed to clean up distribution and reduce context noise

### Added

- `references/cli-reference.md` — CLI flags table and multi-viewport testing instructions (moved from SKILL.md body)

### Removed

- `references/platform-setup.md` — workflow setup is out of scope; all platforms read `SKILL.md` natively
- `.agent/workflows/a11y.md` — Antigravity workflow file (platform reads from the project directory, not the skill)
- `.cursor/rules/a11y.md` — legacy; Cursor reads `SKILL.md` natively
- `.windsurf/workflows/a11y.md` — Windsurf workflow file (platform reads from the project directory, not the skill)
- `agents/openai.yaml` — legacy; Codex reads `SKILL.md` natively
- `workflows/a11y.md` — duplicate with no consumer
- Initialization section from SKILL.md — workflow setup removed from scope

---

## [0.6.0] — 2026-02-22

### Added

- Communication Rules section in SKILL.md — 5 rules for agent-to-user messaging (closed questions, concise tone, always provide options, explain "why", one question per message)
- 15 example messages covering every user-facing moment in the workflow (URL request, route scope, gitignore, reports, findings, 0 issues, decline, severity checkpoint, fix-all checkpoint, style approval, manual checks, regressions, manual verification reminder, final reports offer, congratulations)
- Per-project config: `audit/a11y.config.json` is now read from the audited project's `audit/` folder (created on demand by the agent), replacing the previous shared config in the skill root
- Config management instructions in SKILL.md: tells the agent how to create, read, merge, and write the config file
- Gitignore question: agent now asks the user before adding `audit/` to `.gitignore` instead of modifying it automatically
- Step 2 fix strategy options: user can choose between "severity by severity" (default), "fix all structural", or "only critical"
- Style-dependent protection rule: style fixes always require explicit approval with exact changes shown, even under a "fix all" instruction
- Step 4 manual verification checklist: agent presents human-only checks (keyboard nav, focus order, screen reader, motion, zoom) before delivering results
- Visual reports are now opt-in: audit runs with `--skip-reports` by default, agent asks which reports to generate (HTML / PDF / Both / Neither) after scan and again after fixes
- Auto-open for generated reports: agent opens requested reports (`open audit/report.html`, `open audit/report.pdf`) after generation
- Route scope notification in Step 1: agent informs user about sitemap vs crawl behavior and how to adjust
- URL normalization rules in Step 1: `localhost:3000` → `http://`, `mysite.com` → `https://`

### Changed

- Sitemap discovery now scans all URLs in `sitemap.xml` without `maxRoutes` cap — `maxRoutes` only applies to BFS crawl fallback when no sitemap is found
- Verification re-audit (Step 3d) is now automatic — agent runs it without asking, only surfaces regressions if found
- All user-facing questions converted to closed format: yes/no or multiple choice with explicit options
- `.gitignore` auto-append removed from `run-audit.mjs` — replaced with warning signals for the agent to ask the user

### Removed

- `a11y.config.json` from skill root (was an empty `{}` placeholder)
- `.gitignore` auto-modification from `run-audit.mjs` pipeline
- `manual_test` field from all 106 rules in `intelligence.json` — per-rule manual testing steps were only rendered in the HTML report, never surfaced to agents via `remediation.md`. General manual checks (`assets/manual-checks.json`) remain and power the Step 3c WCAG static code checks workflow

---

## [0.5.1] — 2026-02-21

### Changed

- SKILL.md optimized for Claude Skills best practices checklist (21/21):
  - Description: "selectors" → "violations/issues" for clearer skill discovery
  - Added copy-paste audit progress checklist for agent workflow tracking
  - Removed redundant constraints already covered by workflow steps (3 removed)
  - Trimmed obvious constraints Claude already knows ("Write in English", "Prefer DOM evidence")
  - Unified terminology: "scan/scanner" → "audit/auditor" throughout
  - Constraints clarified: skill vs. audited project boundaries for `node_modules` and `.gitignore`
  - `.gitignore` constraint elevated to pre-audit precondition (was post-delivery reminder)
  - Removed `> [!TIP]` callout (GitHub-only rendering, no value to agents)
- Troubleshooting table moved to `references/troubleshooting.md` (progressive disclosure)
- `a11y.config.json` reference table moved to `references/audit-config.md` (progressive disclosure)
- Report route path convention moved to `references/report-standards.md`
- Analyzer: `recommended_fix` simplified from up to 3 links (APG + a11ySupport + Inclusive Components) to a single reference link (APG preferred, helpUrl fallback) — reduces noise for both HTML report and agent remediation guide
- Removed unused `A11Y_SUPPORT` and `INCLUSIVE_COMPONENTS` constants from `run-analyzer.mjs`
- Terminology consistency: "scan" → "audit" in evals (`01-basic-audit.json`, `evals/README.md`)
- Analyzer: `framework_notes` and `cms_notes` now filtered to only the detected framework — agent receives 1 relevant note per finding instead of 5-7
- Added `filterNotes()` with `FRAMEWORK_TO_INTEL_KEY` and `FRAMEWORK_TO_CMS_KEY` mappings in `run-analyzer.mjs`
- Remediation guide (MD): removed `reproduction` steps — agents cannot open a browser, and the selector + search pattern already provide location context
- Remediation guide (MD): removed redundant "Context & Patterns" block — was duplicating `recommended_fix` (generic link) when intelligence-sourced `fixDescription`/`fixCode` already provided a superior solution

### Added

- Complete `framework_notes` coverage: added 5-key notes (react, vue, angular, svelte, astro) to `focus-appearance`, `input-image-alt`, `object-alt`, `target-size` in `intelligence.json`
- Added missing `angular` key to `consistent-help` framework_notes
- Inline communication examples in SKILL.md for proposal, decline, checkpoint, and delivery moments
- Common `a11y.config.json` keys documented inline in SKILL.md with link to full schema

---

## [0.5.0] — 2026-02-21

### Added

- BFS multi-level route discovery with configurable `crawlDepth` (1-3, default: 2) — replaces single-level link scraping
- `--crawl-depth` CLI flag for scanner and orchestrator
- Sitemap + crawl supplementation: if sitemap doesn't fill `maxRoutes`, BFS crawl supplements remaining budget
- `references/source-patterns.md` — framework & CMS file location patterns (Next.js, Nuxt, React, Vue, Angular, Astro, Gatsby, Svelte, Shopify, WordPress) and Tailwind v3/v4 design token paths
- `.gitignore` auto-append: pipeline adds `audit/` to `.gitignore` automatically when the file exists; warns user to create one if absent
- Guardrail: style/visual changes (colors, fonts, spacing, layouts) require explicit user approval — fixes must be structural/semantic unless approved
- Error recovery instructions: audit script failure handling (Step 1) and certification regression loop (Step 3d)
- Step 4 — Deliver results: summary, report paths, accessibility encouragement, and next steps
- Evaluation scenarios (`evals/`): 10 test cases covering basic audit, fix checkpoints, user decline, auth routes, script failure, style separation, framework detection, managed components, config customization, and gitignore behavior
- Model testing matrix in `evals/README.md` for Antigravity, Windsurf, Sonnet, and Gemini CLI

### Changed

- SKILL.md rewritten as a sequential 4-step playbook following Claude Skills best practices
- Workflow restructured: Audit Workflow + Fix Workflow + Manual Checks → single `## Workflow` with Steps 1-4
- Fix workflow split into sub-phases: 3a (structural by severity), 3b (style-dependent with approval gate), 3c (manual checks), 3d (certification audit)
- Description rewritten: includes trigger context ("Use when...") and toolchain details, removed philosophy statements
- Dead instructions removed: `--skip-reports` / Surgery Mode references (no intermediate scans exist)
- Certification loop guard: only new issues/regressions trigger restart — user-declined issues do not loop
- `references/platform-setup.md` now includes a table of contents (>100 lines best practice)
- `crawlDepth` added to `a11y.config.json` schema and config reference table
- Test suite expanded from 764 to 772 tests (8 BFS discovery tests)

### Removed

- `references/baseline-checks.md` — redundant with axe-core automated checks
- `references/manual-checks.md` — duplicate of `assets/manual-checks.json` (generated dynamically into `remediation.md`)
- Philosophy line from SKILL.md intro ("Resolution is the core objective...")

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
- Project context detection: auto-detects framework (Next.js, Nuxt, React, Vue, Angular, Astro, Svelte, Shopify, WordPress) from DOM and UI libraries (Radix, Headless UI, Chakra, Mantine, Material UI) from `package.json`
- Per-finding fix acceleration: `file_search_pattern`, `managed_by_library`, `component_hint`, `verification_command`
- "Fixes by Component" table in `remediation.md` for batch fixing by component
- `scripts/validate-urls.mjs` — on-demand URL validator for data files
- `manual-checks.json` schema tests (WCAG + AT checks) in test suite
- `docs/data-validation.md` — maintenance guide for intelligence data

### Changed

- Score labeling logic and compliance metrics updated in reports
- Code language detection improved for fix code snippets
- Accessibility rules and references refactored for clarity and structure
- Audit script reliability enhanced with timeouts, URL validation, and improved error handling
- `SKILL_ROOT` constant refactored for consistency
- Renamed `assets/references.json` → `assets/rule-metadata.json` to eliminate naming confusion with `references/` folder
- Renamed `pnpm audit` → `pnpm a11y` to avoid collision with pnpm built-in audit command
- Variable naming consistency: `refs`/`references` → `ruleMetadata` across analyzer and tests
- Grade thresholds in `docs/scoring-system.md` aligned with code (90/75/55/35)
- Scanner: replaced fixed `waitMs` delay with `networkidle` signal for faster route scanning
- Scanner: parallel tab pool (3 concurrent tabs) for route scanning (~2-3x faster)
- PDF generation: replaced fixed 1s font settle with `document.fonts.ready`
- Report generation: HTML + Markdown reports now build in parallel
- Moved `data-validation.md` from `references/` to `docs/` (maintenance doc, not agent-facing)
- Fix workflow in SKILL.md updated: agents now use component grouping, file search patterns, managed component checks, and targeted re-scans
- Remediation guide uses detected framework for guardrails instead of URL heuristics
- Test suite expanded from 79 to 764 tests

### Fixed

- `localStorage` key escaping corrected in HTML report
- README: grammar fix ("skill are" → "skill is"), missing closing quote on example command
- README: deliverables table corrected ("Raw findings" → "Enriched findings", "surgical selectors" → "full fix intelligence")
- README: comparison table accuracy (Lighthouse "Curated subset", WAVE "Proprietary engine")

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
