# Contributing

## Setup

```bash
git clone https://github.com/diegovelasquezweb/a11y
cd a11y
pnpm install
```

Playwright browsers install automatically via the `postinstall` hook.

## Running tests

```bash
pnpm test
```

79 unit tests cover the core pipeline functions. All tests must pass before opening a PR.

## Project structure

```
a11y/
├── SKILL.md                  # Agent instructions (the skill entry point)
├── assets/
│   ├── intelligence.json     # ARIA role → W3C APG / A11ySupport / Inclusive Components URLs
│   └── manual-checks.json    # WCAG 2.2 criteria not detectable by axe-core
├── references/
│   ├── baseline-checks.md    # Per-domain WCAG checklist (loaded on demand)
│   ├── manual-checks.md      # Same checks in human-readable form
│   └── platform-setup.md     # Antigravity / Windsurf workflow setup
├── scripts/
│   ├── run-audit.mjs         # Pipeline orchestrator
│   ├── run-scanner.mjs       # Playwright + axe-core scanner
│   ├── run-analyzer.mjs      # Converts scan results to structured findings
│   ├── build-report-html.mjs # Interactive HTML report
│   ├── build-report-md.mjs   # AI-optimized remediation guide
│   ├── build-report-pdf.mjs  # PDF export
│   ├── check-toolchain.mjs   # Preflight dependency check
│   ├── a11y-utils.mjs        # Shared utilities and config loader
│   └── report/               # Report formatting modules
└── tests/                    # Vitest unit tests
```

## Adding a new manual check

1. Add the entry to `assets/manual-checks.json` following the existing schema (`criterion`, `title`, `level`, `description`, `steps`, `remediation`, `ref`).
2. Add the same entry in human-readable form to `references/manual-checks.md`.
3. Run `pnpm test` to confirm nothing broke.

## Adding a new ARIA role to intelligence

Edit `assets/intelligence.json` and add the role key to any of `apgPatterns`, `a11ySupport`, or `inclusiveComponents`. The test in `tests/run-analyzer.test.mjs` validates the schema but not individual entries — verify the URL is live before submitting.

## Submitting a PR

1. Fork the repo and create a branch from `main`.
2. Make your changes and ensure `pnpm test` passes.
3. Update `CHANGELOG.md` under `[Unreleased]`.
4. Open a PR — the template will guide you through the checklist.

## Community & Standards

- **Code of Conduct**: This project adheres to the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.
- **License**: By contributing, you agree that your contributions will be licensed under the [Mozilla Public License 2.0](LICENSE). Note that any modifications to existing skill files must be shared under the same license if distributed.
