# Wondersauce Accessibility Audit v2.0

Codex skill for enterprise-grade WCAG-focused web accessibility audits. Re-engineered to use **Playwright** and **Axe-Core** for reliable, SPA-ready scanning and premium reporting.

## Key Features

- **Modern Engine**: Uses Playwright for full browser automation and Axe-Core for high-precision detection.
- **SPA Support**: Handles dynamic content and Single Page Applications natively.
- **Isolated Stack**: No global dependencies or project-level pollution. All tools live within the skill.
- **Premium Reports**: Generates professional HTML dashboards with technical evidence and remediation guidance.
- **Autodiscovery**: Automatically finds and scans same-origin routes if none are provided.

## Quick Setup

Clone this skill and run the preparation script once:

```bash
# In the skill directory:
./scripts/setup.sh
```

_This script handles `npm install` and Playwright browser provisioning within the skill folder._

## Agent Usage

Use this skill with **Antigravity**, **Claude/Caluda**, or **OpenAI** agents by calling:

> "Audit `https://example.com` with `$wondersauce-accessibility-audit`"

## CLI Usage

Run directly from your terminal:

```bash
# Basic audit
$wondersauce-accessibility-audit --base-url https://example.com

# Audit with limit and custom output
$wondersauce-accessibility-audit --base-url https://example.com --max-routes 5 --output docs/a11y-report.html
```

## Audit Pipeline

1.  **Preflight**: `check-toolchain.mjs` verifies local dependencies and browsers.
2.  **Scan**: `generate-route-checks.mjs` crawls the site and runs Axe-Core.
3.  **Process**: `deterministic-findings.mjs` transforms raw data into structured findings.
4.  **Validate**: `pdf-coverage-validate.mjs` enforces the Wondersauce coverage gate.
5.  **Build**: `build-audit-html.mjs` generates the final premium HTML report.

## Deliverables

- **Location**: `audit/index.html` (the standalone report).
- **Format**: Executive Summary, PDF Coverage Matrix, Detailed Technical Findings (with DOM evidence).
- **Compliance**: Default target is WCAG 2.1 AA.
