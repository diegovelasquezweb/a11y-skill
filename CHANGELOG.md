# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] - 2026-03-16

### Added

- Initial release of `a11y-skill` — fork of `a11y` powered by `@diegovelasquezweb/a11y-engine@0.9.0`.
- Multi-engine scanning pipeline: axe-core + Chrome DevTools Protocol (CDP) + pa11y (HTML CodeSniffer).
- Full WCAG 2.2 AA audit workflow with 6-step agent playbook.
- Report generation: HTML dashboard, PDF compliance report, Markdown remediation guide, manual testing checklist.
- Source code pattern scanning for issues undetectable at runtime.
- Stack-aware remediation intelligence with framework-specific fix guidance.
- 13 evaluation scenarios covering the full workflow spectrum.
- Reference documents: CLI reference, report standards, quality gates, troubleshooting guide.
- CI/CD workflows: unit tests, PR standards validation, daily security audit.
