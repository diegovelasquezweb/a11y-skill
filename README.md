# WS Accessibility Audit

Internal technical skill for auditing projects under the WS Accessibility Process. This skill introduces automated route discovery, WCAG 2.1 AA detection using a real browser, and a consolidated multi-agent workflow (Antigravity, Claude, Codex).

## Key Features

- **Modern Engine**: Uses Playwright for full browser automation and Axe-Core for high-precision detection.
- **SPA Support**: Handles dynamic content and Single Page Applications natively.
- **Isolated Stack**: No global dependencies or project-level pollution. All tools live within the skill.
- **Premium Reports**: Generates professional HTML dashboards with technical evidence and remediation guidance.
- **Autodiscovery**: Automatically finds and scans same-origin routes if none are provided.

## Installation (Recommended)

The best way to install this skill is by asking your AI Agent directly in the chat:

> "Install the skill from https://github.com/diegovelasquezweb/a11y-skill"

This will automatically clone the repository into your project's `.agent/skills/` directory and run the setup script.

## Manual Setup

If you prefer to install it manually:

1. Clone this skill.
2. Run the setup script to prepare the engine and register it globally:

```bash
# In the skill directory:
./scripts/setup.sh
```

_This script handles `npm install`, Playwright provisioning, and creates global symlinks for **Codex**, **Claude**, and **Antigravity/Gemini**._

### Uninstallation

To remove all global symlinks and clean up local build files:

```bash
./scripts/uninstall.sh
```

## How to Use

Depending on where you are working, there are three ways to trigger an audit:

### 1. Conversational (Agent Chat)

When talking to an AI agent (Antigravity, Claude, Codex, etc.), use the skill name to trigger the automated process:

> "Audit `https://example.com` with `$ws-accessibility-audit`"

### 2. Slash Command (Agent Workflow)

For a faster, "no-questions-asked" execution (**Turbo Mode**), use the slash command. This skips all confirmation prompts and runs the audit end-to-end:

```bash
/audit --base-url https://example.com
```

### 3. Terminal CLI (Local Bash/Zsh)

If you want to run it directly from your terminal **without using AI agents or tokens**:

1. Navigate to the skill directory:

   ```bash
   cd .agent/skills/a11y-skill
   ```

2. Run the audit command:

   ```bash
   # Basic audit
   npm run audit -- --base-url https://example.com

   # Audit with custom options
   npm run audit -- --base-url http://localhost:3000 --max-routes 5
   ```

---

## Configuration & Options

| Flag                   | Description                                          | Default                       |
| :--------------------- | :--------------------------------------------------- | :---------------------------- |
| `--base-url <url>`     | **(Required)** The target website to audit.          | -                             |
| `--max-routes <num>`   | Maximum number of routes to discover and scan.       | 10                            |
| `--routes <csv>`       | Custom list of paths to scan (e.g., `/cart,/about`). | Autodiscover                  |
| `--output <path>`      | Final HTML report location.                          | `audit/index.html`            |
| `--wait-ms <num>`      | Time to wait for dynamic content after page load.    | 2000                          |
| `--headless <bool>`    | Run browser in background.                           | `true`                        |
| `--timeout-ms <num>`   | Network timeout for page loads.                      | 30000                         |
| `--title <text>`       | Custom title for the HTML report.                    | "Accessibility Audit Report"  |
| `--environment <text>` | Test environment label (e.g., "Staging", "Local").   | "Live Site"                   |
| `--target <text>`      | Compliance target label.                             | "WCAG 2.1 AA"                 |
| `--no-open`            | Disable auto-opening the HTML report.                | `false` (It opens by default) |

## Audit Pipeline

1.  **Preflight**: `check-toolchain.mjs` verifies local dependencies and browsers.
2.  **Scan**: `generate-route-checks.mjs` crawls the site and runs Axe-Core.
3.  **Process**: `deterministic-findings.mjs` transforms raw data into structured findings.
4.  **Validate**: `pdf-coverage-validate.mjs` enforces the WS coverage gate.
5.  **Build**: `build-audit-html.mjs` generates the final premium HTML report.

## Deliverables

- **Location**: `audit/index.html` (the single standalone live report).
- **Format**: Executive Summary, PDF Coverage Matrix, Detailed Technical Findings (with DOM evidence).
- **Compliance**: Default target is WCAG 2.1 AA.
