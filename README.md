# Web Accessibility Audit (WCAG 2.1 AA)

Professional technical skill for auditing websites and local development projects. It provides automated route discovery, WCAG 2.1 AA detection using a real browser, and a consistent multi-agent workflow.

## Key Features

- **Modern Engine**: Uses Playwright for full browser automation and Axe-Core for high-precision detection.
- **SPA Support**: Handles dynamic content and Single Page Applications natively.
- **Isolated Stack**: No global dependencies or project-level pollution. All tools live within the skill.
- **Premium Reports**: Generates professional HTML dashboards with technical evidence and remediation guidance.
- **Autodiscovery**: Automatically finds and scans same-origin routes if none are provided.

## Compatibility

This skill follows the open [Agent Skills standard](https://agentskills.io) supported by a growing number of AI agents and IDEs:

| Agent / IDE        | Reads `SKILL.md`? | Conversational Audit | Standalone Audit |
| :----------------- | :---------------: | :------------------: | :--------------: |
| **Antigravity**    |        ✅         |          ✅          |        ✅        |
| **Gemini CLI**     |        ✅         |          ✅          |        ✅        |
| **Claude (Code)**  |        ✅         |          ✅          |        ✅        |
| **Cursor**         |        ✅         |          ✅          |        ✅        |
| **Codex (OpenAI)** |        ✅         |          ✅          |        ✅        |
| **Any terminal**   |         —         |          —           |        ✅        |

## Installation

Copy and paste this into your agent's chat:

> "Install skill https://github.com/diegovelasquezweb/a11y-skill"

The skill installs to a per-agent directory. Installation paths by agent:

| Agent / IDE        | Skill install path                          |
| :----------------- | :------------------------------------------ |
| **Claude (Code)**  | `~/.claude/skills/a11y-skill/`              |
| **Cursor**         | `~/.cursor/skills/a11y-skill/`              |
| **Gemini CLI**     | `~/.gemini/skills/a11y-skill/`              |
| **Codex (OpenAI)** | `~/.agents/skills/a11y-skill/`              |
| **Antigravity**    | `~/.gemini/antigravity/skills/a11y-skill/`  |

## How to Use

Once installed, the skill is available to your agent in any conversation. Simply ask:

> "Run an accessibility audit for `http://localhost:3000`"

> "Run an accessibility audit for `https://example.com`"

## Deliverables

- **Location**: `audit/` folder.
  - `index.html`: The premium standalone live report (Primary).
  - `summary.md`: A concise markdown summary (Ideal for PRs or tickets).
- **Format**: Executive Summary, Detailed Technical Findings (with DOM evidence).
- **Compliance**: Validates **WCAG 2.1 AA** standards via automated Axe-Core checks.

## Standalone CLI

**Best for:** CI/CD pipelines and local automation without spending AI tokens.

Execute the audit script directly from the skill directory:

```bash
# Audit local development server
pnpm run audit -- --base-url http://localhost:3000

# Audit live site
pnpm run audit -- --base-url https://example.com
```

### Options

| Flag                   | Description                                          | Default                      |
| :--------------------- | :--------------------------------------------------- | :--------------------------- |
| `--base-url <url>`     | The target to audit (Live URL or Localhost).         | Required                     |
| `--max-routes <num>`   | Maximum number of routes to discover and scan.       | 10                           |
| `--routes <csv>`       | Custom list of paths to scan (e.g., `/cart,/about`). | Autodiscover                 |
| `--output <path>`      | Final HTML report location.                          | `audit/index.html`           |
| `--wait-ms <num>`      | Time to wait for dynamic content after page load.    | 2000                         |
| `--headless <bool>`    | Run browser in background.                           | `true`                       |
| `--timeout-ms <num>`   | Network timeout for page loads.                      | 30000                        |
| `--title <text>`       | Custom title for the HTML report.                    | "Accessibility Audit Report" |
| `--environment <text>` | Test environment label (e.g., "Staging", "Local").   | "Live Site"                  |
| `--target <text>`      | Compliance target label.                             | "WCAG 2.1 AA"                |

## Audit Pipeline

All steps are orchestrated by `run-audit.mjs`, which executes them in sequence:

1. **Preflight**: `check-toolchain.mjs` verifies local dependencies and browsers.
2. **Scan**: `generate-route-checks.mjs` crawls the site and runs Axe-Core.
3. **Process**: `deterministic-findings.mjs` transforms raw data into structured findings.
4. **Build**: `build-audit-html.mjs` generates the final premium HTML report.

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

- [Agent Skills Standard](https://agentskills.io/) — the open format this skill follows
- [Axe-Core Rules](https://dequeuniversity.com/rules/axe/4.10)
- [Playwright Emulation Guide](https://playwright.dev/docs/emulation)
- [Claude Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/)
- [Antigravity Skills](https://antigravity.google/docs/skills)
- [Codex Skills](https://developers.openai.com/codex/skills/)
- [Cursor Skills](https://cursor.com/docs/context/skills)
- [Gemini CLI Skills](https://geminicli.com/docs/cli/skills/)
