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

### 1. Automated Setup (Recommended)

Ask your AI Agent directly in the chat:

> "Install the accessibility skill from https://github.com/diegovelasquezweb/a11y-skill"

_The agent will clone it into `.agent/skills/ws-accessibility-audit` and initialize it automatically._

### 2. Manual Setup

If you prefer manual control:

```bash
git clone https://github.com/diegovelasquezweb/a11y-skill
cd a11y-skill
pnpm install  # This installs dependencies AND the audit browser
```

### Uninstallation

To remove the skill, simply delete the directory:

```bash
rm -rf a11y-skill
```

You can trigger an audit in three ways, depending on your need for speed and AI guidance:

### 1. AI-Guided (Conversational)

**Best for:** Getting AI-powered analysis and summaries directly in your chat.

- **Pros:** natural language interface; the agent handles the entire pipeline and explains findings.
- **Cons:** Consumes AI tokens/credits.

Simply ask your agent:

> "Run an accessibility audit for `http://localhost:3000`"

### 2. Slash Command (High-Speed Turbo)

**Best for:** Zero-click execution directly from your editor/terminal.

- **Pros:** Maximum speed via `// turbo-all`; no confirmation needed; instant start.
- **Cons:** Less conversational flexibility; specific to Gemini-compatible agents.

In your editor or terminal, simply type:

> `/audit --base-url http://localhost:3000`

### 3. Standalone (Non-Conversational)

**Best for:** Continuous usage and local CI/CD without spending AI tokens.

- **Pros:** Zero token cost; direct control over execution; works offline/without agent.
- **Cons:** Manual command execution; no AI summary in the chat (HTML report only).

1. Navigate to the skill directory:

   ```bash
    cd a11y-skill
   ```

2. Run the audit command:

   ```bash
    # Audit local development server
    pnpm run audit -- --base-url http://localhost:3000 --max-routes 5

    # Audit live site
    pnpm run audit -- --base-url https://example.com
   ```

---

## Configuration & Options

| Flag                   | Description                                          | Default                      |
| :--------------------- | :--------------------------------------------------- | :--------------------------- |
| `--base-url <url>`     | The target to audit (Live URL or Localhost).         | Autodetect (local)           |
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

- **Location**: `audit/` folder.
  - `index.html`: The premium standalone live report (Primary).
  - `summary.md`: A concise markdown summary (Ideal for PRs or tickets).
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
