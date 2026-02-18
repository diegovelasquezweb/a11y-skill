# Wondersauce Accessibility Audit v2.0

Internal technical skill for auditing projects under the Wondersauce Accessibility Process. Built with Playwright and Axe-Core to automate route discovery, WCAG detection, and high-fidelity reporting. Designed to integrate directly with our team's multi-agent workflow (Antigravity, Claude, Codex).

## Key Features

- **Modern Engine**: Uses Playwright for full browser automation and Axe-Core for high-precision detection.
- **SPA Support**: Handles dynamic content and Single Page Applications natively.
- **Isolated Stack**: No global dependencies or project-level pollution. All tools live within the skill.
- **Premium Reports**: Generates professional HTML dashboards with technical evidence and remediation guidance.
- **Autodiscovery**: Automatically finds and scans same-origin routes if none are provided.

## Quick Setup

Clone this skill and run the setup script to prepare the engine and register it globally for your agents:

```bash
# In the skill directory:
./scripts/setup.sh
```

_This script handles `npm install`, Playwright provisioning, and creates global symlinks for **Codex**, **Claude**, and **Antigravity/Gemini**._

Use this skill with **Antigravity**, **Claude/Caluda**, or **OpenAI** agents by calling:

> "Audit `https://example.com` with `$wondersauce-accessibility-audit`"  
> "Audit `http://localhost:3000` with `$wondersauce-accessibility-audit`"

## Automated Workflow (Turbo Mode)

The skill includes a pre-configured workflow that automates the entire 5-step pipeline without requiring constant user approval for each command.

### How to use it:

Simply call the `/audit` command via any supporting agent:

```bash
/audit --base-url https://example.com
```

### Why use Turbo Mode?

- **Zero Interruptions**: Uses the `// turbo-all` instruction to skip manual confirmation for internal file operations.
- **End-to-End**: Automatically chains Toolchain Check → Scan → Processing → Validation → Report Generation.
- **Smart Defaults**: Pre-configures the standard Wondersauce reporting parameters automatically.

---

## CLI Usage

### Options

| Flag                 | Description                                          | Default            |
| :------------------- | :--------------------------------------------------- | :----------------- |
| `--base-url <url>`   | **(Required)** The target website to audit.          | -                  |
| `--max-routes <num>` | Maximum number of routes to discover and scan.       | 10                 |
| `--routes <csv>`     | Custom list of paths to scan (e.g., `/cart,/about`). | Autodiscover       |
| `--output <path>`    | Final HTML report location.                          | `audit/index.html` |
| `--wait-ms <num>`    | Time to wait for dynamic content after page load.    | 2000               |
| `--headless <bool>`  | Run browser in background.                           | `true`             |
| `--timeout-ms <num>` | Network timeout for page loads.                      | 30000              |

## Audit Pipeline

1.  **Preflight**: `check-toolchain.mjs` verifies local dependencies and browsers.
2.  **Scan**: `generate-route-checks.mjs` crawls the site and runs Axe-Core.
3.  **Process**: `deterministic-findings.mjs` transforms raw data into structured findings.
4.  **Validate**: `pdf-coverage-validate.mjs` enforces the Wondersauce coverage gate.
5.  **Build**: `build-audit-html.mjs` generates the final premium HTML report.

## Deliverables

- **Location**: `audit/index.html` (the single standalone live report).
- **Format**: Executive Summary, PDF Coverage Matrix, Detailed Technical Findings (with DOM evidence).
- **Compliance**: Default target is WCAG 2.1 AA.
