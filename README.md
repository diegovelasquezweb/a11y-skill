# WS Accessibility Audit

Internal technical skill for auditing websites and local development projects under the WS Accessibility Process. This skill introduces automated route discovery, WCAG 2.1 AA detection using a real browser, and a consolidated multi-agent workflow.

## Key Features

- **Modern Engine**: Uses Playwright for full browser automation and Axe-Core for high-precision detection.
- **SPA Support**: Handles dynamic content and Single Page Applications natively.
- **Isolated Stack**: No global dependencies or project-level pollution. All tools live within the skill.
- **Premium Reports**: Generates professional HTML dashboards with technical evidence and remediation guidance.
- **Autodiscovery**: Automatically finds and scans same-origin routes if none are provided.

## Installation

The recommended way to use this skill is to install it specifically within your project. This ensures the tool is version-controlled with your code and available to all team members.

### 1. Automated Setup (Agent Chat)

Ask your AI Agent directly in the chat:

> "Install the skill from https://github.com/diegovelasquezweb/a11y-skill"

_The agent will clone it into `.agent/skills/ws-accessibility-audit` and initialize it automatically._

### 2. Manual Setup

If you prefer manual control:

```bash
git clone https://github.com/diegovelasquezweb/a11y-skill
cd a11y-skill
./scripts/setup.sh
```

### Uninstallation

To remove the skill and its local artifacts:

```bash
./scripts/uninstall.sh
```

## How to Use

Depending on where you are working, there are three ways to trigger an audit:

### 1. Conversational (Agent Chat)

When talking to an AI agent (Antigravity, Claude, Codex, etc.), use the skill name to trigger the automated process:

> "Audit `http://localhost:3000` with `$ws-accessibility-audit`"

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
    # Audit local development server
    npm run audit -- --base-url http://localhost:3000 --max-routes 5

    # Audit live site
    npm run audit -- --base-url https://example.com
   ```

### Local Environment Support

The skill is optimized for local development:

- **Auto-Discovery**: If no `--base-url` is provided, the agent will attempt to detect a running local server (on ports like 3000, 5173, 8080) and audit it automatically.
- **Port Resilience**: Works with any reachable local or remote URL.
- **Preload Validation**: Perfect for catching a11y regressions before committing code.

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
- **Compliance**: Validates against **WCAG 2.1 AA** standards via automated checks and enforces the **WS Coverage Matrix** (PDF requirements).

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

## Reference

- **Axe-Core Rules**: [Rule Descriptions](https://dequeuniversity.com/rules/axe/4.10)
- **Playwright**: [Emulation Guide](https://playwright.dev/docs/emulation)
- **Claude Skills**: [Agent Skills Overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/)
- **Antigravity Skills**: [Google Antigravity Documentation](https://antigravity.google/docs/skills)
- **Codex Skills**: [OpenAI Codex Skills](https://developers.openai.com/codex/skills/)
- **Cursor Skills**: [Cursor Skills Documentation](https://cursor.com/docs/context/skills)
- **Gemini CLI Skills**: [Gemini CLI Documentation](https://geminicli.com/docs/cli/skills/)
