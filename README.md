# Web Accessibility Audit Agent Skill

Perform automated accessibility audits that empower AI agents to resolve issues with data-driven precision. This skill generates structured technical data including selectors, code evidence, and remediation logic, allowing AI to identify and patch WCAG 2.2 AA violations directly in your codebase with targeted remediation and minimal manual oversight.

## Key Features

- **Engineered for LLMs** — Generates a remediation guide specifically optimized for AI agents. It groups issues by route to eliminate context-switching, drops heavy markdown tables to save tokens, and injects strict guardrails to prevent agents from editing compiled code.
- **Zero-Config Route Discovery** — Point it at a URL and it crawls. Finds same-origin pages automatically, no sitemap or route list required.
- **Failing Element Screenshots** — Violations with a single, identifiable element automatically get a screenshot captured and embedded in the HTML report.
- **Accessibility Emulation** — Test dark mode, forced colors, and reduced motion via Playwright — the scenarios real users with disabilities rely on.
- **WCAG 2.2 Manual Check Coverage** — Six criteria axe-core can't detect are covered with step-by-step verification instructions built into the report.
- **Multi-Source a11y Intelligence** — Automatically links custom widgets to W3C Patterns (Implementation), Deque Checklists (Verification), A11ySupport.io (Browser Support), and Inclusive Components (Design).

## Installation

To install this skill, provide the following prompt to your AI agent:

> "Install skill https://github.com/diegovelasquezweb/a11y"

## Compatibility & Paths

This skill follows the [Agent Skills standard](https://agentskills.io). Below are the supported agents and their default installation paths:

| Agent / IDE     | Skill install path (Global/User)               | Extended Workflow      | Agent Config         |
| :-------------- | :--------------------------------------------- | :--------------------- | :------------------- |
| **Antigravity** | `~/.gemini/antigravity/skills/a11y/`           | `.agent/workflows/`    | —                    |
| **Codex**       | `~/.codex/skills/a11y/`                        | —                      | `agents/openai.yaml` |
| **Claude**      | `~/.claude/skills/a11y/`                       | —                      | —                    |
| **Cursor**      | `~/.cursor/skills/` (or inherits Claude/Codex) | —                      | —                    |
| **Gemini CLI**  | `~/.gemini/skills/a11y/`                       | —                      | —                    |
| **Windsurf**    | `~/.codeium/windsurf/skills/a11y/`             | `.windsurf/workflows/` | —                    |

## How to Use

Once installed, the skill is available to your agent in any conversation. Simply ask:

> "Audit my local dev server at `http://localhost:3000`"

> "Check accessibility for `https://mysite.com`"

## How to Update Configuration

You can manage the skill's settings through the AI agent using natural language:

- _"Change the company name to 'MyCompany' in the a11y config."_
- _"Set the report title to 'Accessibility Audit' and use #6366f1 as the accent color."_
- _"Update the config to ignore the 'color-contrast-enhanced' rule."_
- _"Configure the scanner to use a Mobile viewport (375x812) and dark mode."_

Changes to `a11y.config.json` are dynamic and automatically applied during the next audit execution.

## Deliverables

All generated assets are stored in the `audit/` directory.

| Deliverable           | Format           | Audience   | Key Value                                                  |
| :-------------------- | :--------------- | :--------- | :--------------------------------------------------------- |
| **Audit Dashboard**   | `.html`          | Developers | Premium interactive UI with code fixes & persona mapping.  |
| **Executive Summary** | `.pdf`           | Clients    | Formal, document-style compliance and risk evidence.       |
| **Remediation Guide** | `remediation.md` | AI Agents  | Token-optimized guide with selectors for automated fixes.  |
| **Technical Data**    | `.json`          | Systems    | Raw findings in `internal/` for CI/CD or custom ingestion. |

## Standalone CLI

**Best for:** CI/CD pipelines and local automation without spending AI tokens or agent intervention.

Execute the audit script directly from the skill directory:

```bash
# Local dev server
pnpm run audit -- --base-url http://localhost:3000

# Live site
pnpm run audit -- --base-url https://mysite.com
```

### Options

| Flag                     | Description                                          | Default                      |
| :----------------------- | :--------------------------------------------------- | :--------------------------- |
| `--base-url <url>`       | The target to audit (Live URL or Localhost).         | Required                     |
| `--color-scheme <value>` | Emulate `light` or `dark` color scheme.              | `"light"`                    |
| `--environment <text>`   | Test environment label (e.g., "Staging", "Local").   | "Live Site"                  |
| `-h, --help`             | Show this help message.                              | —                            |
| `--headless <bool>`      | Run browser in background.                           | `true`                       |
| `--max-routes <num>`     | Maximum number of routes to discover and scan.       | `10`                         |
| `--no-open`              | Do not open the report automatically after audit.    | `false`                      |
| `--output <path>`        | Final HTML report location.                          | `audit/report.html`          |
| `--routes <csv>`         | Custom list of paths to scan (e.g., `/cart,/about`). | Autodiscover                 |
| `--scope <text>`         | Custom scope label for the HTML report.              | Optional                     |
| `--target <text>`        | Compliance target label.                             | "WCAG 2.2 AA"                |
| `--timeout-ms <num>`     | Network timeout for page loads.                      | `30000`                      |
| `--title <text>`         | Custom title for the HTML report.                    | "Accessibility Audit Report" |
| `--wait-ms <num>`        | Time to wait for dynamic content after page load.    | `2000`                       |

## Audit Pipeline

All steps are orchestrated by `run-audit.mjs`, which executes them in sequence:

1. **Preflight**: `check-toolchain.mjs` verifies local dependencies and browsers.
2. **Scan**: `run-scanner.mjs` crawls the site and executes automated Axe-Core checks.
3. **Analyze**: `run-analyzer.mjs` processes raw data into normalized, rule-based findings.
4. **Build Reports**:
   - `build-report-html.mjs` generates the interactive dashboard.
   - `build-report-md.mjs` creates the AI-optimized remediation guide.
   - `build-report-pdf.mjs` exports the formal executive summary.

## Advanced Configuration

Customize the audit by editing `a11y.config.json` in the skill root.

### Full Reference

```json
{
  "reportTitle": "Accessibility Audit Report",
  "companyName": "a11y",
  "accentColor": "#6366f1",
  "colorScheme": "light",
  "viewports": [{ "width": 1280, "height": 800, "name": "Desktop" }],
  "maxRoutes": 10,
  "complianceTarget": "WCAG 2.2 AA",
  "ignoreFindings": [],
  "excludeSelectors": [],
  "outputDir": "audit",
  "axeRules": {}
}
```

### Common Use Cases

**1. Project Branding:**

```json
{
  "reportTitle": "Company Accessibility Audit",
  "companyName": "MyCompany",
  "accentColor": "#6366f1"
}
```

**2. Custom Emulation (Mobile Viewport):**

```json
{
  "colorScheme": "dark",
  "viewports": [{ "width": 375, "height": 812, "name": "Mobile" }]
}
```

**3. Ignore Specific Findings & Selectors:**

```json
{
  "ignoreFindings": ["color-contrast-enhanced"],
  "excludeSelectors": [".third-party-widget"]
}
```

## Feature Comparison

While traditional tools are excellent for visual learning or broad metrics, this skill is purpose-built to automate the remediation workflow using AI agents.

| Feature / Capability              | `a11y`                                                | Google Lighthouse                            | WebAIM WAVE                           |
| :-------------------------------- | :---------------------------------------------------- | :------------------------------------------- | :------------------------------------ |
| **Native AI Agent Integration**   | <small>✅ (Outputs clean JSON & DOM evidence)</small> | <small>❌ (Requires complex parsing)</small> | <small>❌ (Visual only)</small>       |
| **Headless / CI-Ready Execution** | <small>✅ (Playwright)</small>                        | <small>✅ (CLI available)</small>            | <small>❌ (Browser Extension)</small> |
| **Zero-Config SPA Support**       | <small>✅ (Waits for network & JS rendering)</small>  | <small>⚠️ (Requires config)</small>          | <small>✅ (Manual click)</small>      |
| **Premium Executive Reports**     | <small>✅ (HTML Dashboard & PDF Export)</small>       | <small>❌ (Basic HTML/JSON)</small>          | <small>❌</small>                     |
| **Direct Code Remediation**       | <small>✅ (AI uses findings to fix code)</small>      | <small>❌ (Only reports)</small>             | <small>❌ (Only reports)</small>      |
| **Depth of Standard**             | <small>WCAG 2.2 AA (Axe-Core Engine)</small>          | <small>Basic A11y + Web Vitals</small>       | <small>WCAG 2.1 AA</small>            |

## Reference

- [WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/)
- [Axe-Core Rules](https://dequeuniversity.com/rules/axe/4.10)
- [Playwright Emulation Guide](https://playwright.dev/docs/emulation)
- [Agent Skills Standard](https://agentskills.io/)
- [Claude Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/)
- [Antigravity Skills](https://antigravity.google/docs/skills)
- [Codex Skills](https://developers.openai.com/codex/skills/)
- [Cursor Skills](https://cursor.com/docs/context/skills)
- [Gemini CLI Skills](https://geminicli.com/docs/cli/skills/)
- [Windsurf Skills](https://docs.windsurf.com/windsurf/cascade/skills)
