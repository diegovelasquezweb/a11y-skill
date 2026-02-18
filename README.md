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

The agent will clone the repository into your project and install its dependencies.

## Manual Setup

If you prefer to install it manually:

1. Clone this skill into your project:

```bash
mkdir -p .agent && git clone https://github.com/diegovelasquezweb/a11y-skill .agent/a11y-skill
```

2. Run the setup script to install dependencies and Playwright browsers:

```bash
cd .agent/a11y-skill
./scripts/setup.sh
```

_This script only installs local dependencies (`npm install`) and provisions the Playwright browser engine. It does **not** touch any global agent configuration._

### Optional: Global Registration

If you want to use this skill across **all your projects** (not just this one), run the registration script manually:

```bash
./scripts/register.sh
```

_This creates symlinks in `~/.gemini/antigravity/skills`, `~/.codex/skills`, and `~/.claude/skills` so agents can find the skill from any project._

### Uninstallation

To remove all global symlinks (registered via `register.sh`) and clean up local build artifacts:

```bash
./scripts/uninstall.sh
```

## How to Use

Depending on where you are working, there are three ways to trigger an audit:

### 1. Conversational (Agent Chat)

When talking to an AI agent (Antigravity, Claude, Codex, etc.), use the skill name to trigger the automated process:

> "Audit `https://example.com` with `$ws-accessibility-audit`"

### 2. Slash Command (Agent Workflow)

If your project has the `/audit` workflow configured, you can trigger the full pipeline directly:

```bash
/audit --base-url https://example.com
```

### 3. Terminal CLI (Local Bash/Zsh)

If you want to run it directly from your terminal **without using AI agents or tokens**:

1. Navigate to the skill directory:

   ```bash
   cd .agent/a11y-skill
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

| Flag                   | Description                                          | Default                      |
| :--------------------- | :--------------------------------------------------- | :--------------------------- |
| `--base-url <url>`     | **(Required)** The target website to audit.          | -                            |
| `--max-routes <num>`   | Maximum number of routes to discover and scan.       | 10                           |
| `--routes <csv>`       | Custom list of paths to scan (e.g., `/cart,/about`). | Autodiscover                 |
| `--output <path>`      | Final HTML report location.                          | `audit/index.html`           |
| `--wait-ms <num>`      | Time to wait for dynamic content after page load.    | 2000                         |
| `--headless <bool>`    | Run browser in background.                           | `true`                       |
| `--timeout-ms <num>`   | Network timeout for page loads.                      | 30000                        |
| `--title <text>`       | Custom title for the HTML report.                    | "Accessibility Audit Report" |
| `--environment <text>` | Test environment label (e.g., "Staging", "Local").   | "Live Site"                  |
| `--target <text>`      | Compliance target label.                             | "WCAG 2.1 AA"                |
| `--no-open`            | Prevent the report from opening automatically.       | Report opens by default      |

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

## Advanced Configuration

You can customize the audit behavior by editing `a11y.config.json` in the skill root. This file is optional; defaults are used if it's missing.

### Common Use Cases

**1. Ignore Third-Party Widgets (e.g., Chat, Maps):**

```json
{
  "excludeSelectors": ["#intercom-container", ".google-map-embed"]
}
```

**2. Test Mobile Viewports:**

```json
{
  "playwright": {
    "viewport": { "width": 375, "height": 667 },
    "isMobile": true
  }
}
```

**3. Disable Specific Rules (Use with Caution):**

```json
{
  "axeRules": {
    "color-contrast": { "enabled": false },
    "image-alt": { "enabled": true }
  }
}
```

**4. Test Dark Mode:**

```json
{
  "playwright": {
    "colorScheme": "dark"
  }
}
```
