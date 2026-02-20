# Web Accessibility Audit Agent Skill

Perform automated accessibility audits that empower AI agents to resolve issues with data-driven precision. This skill generates structured technical data including selectors, code evidence, and remediation logic, allowing AI to identify and patch WCAG 2.2 AA violations directly in your codebase with targeted remediation and minimal manual oversight.

## Key Features

- **Engineered for LLMs (`remediation.md`)** — Unlike traditional tools built for human eyeballs, this skill generates an AI-optimized markdown file engineered to prevent agent hallucinations and context window bloat:
  - **Zero Context-Switching**: Violations are grouped by Route/Page (e.g., `## Page: /cart`), allowing the agent to fix all errors in one sweep without constantly reopening files.
  - **Embedded Guardrails**: Injects hardcoded system prompts (`🤖 SYSTEM: Agent Instructions`) to actively forbid the agent from recklessly editing compiled `dist/` or `.next/` outputs.
  - **Token Efficiency**: Replaces heavy markdown tables with flat key-value lists, saving hundreds of context tokens per issue.
  - **Targeted Evidence**: Provides exact DOM snippets and selectors, allowing the agent to confidently `grep` the precise component.
- **Zero-Config Route Discovery** — Point it at a URL and it crawls. Finds same-origin pages automatically, no sitemap or route list required.
- **Failing Element Screenshots** — Violations with a single, identifiable element automatically get a screenshot captured and embedded in the HTML report.
- **Accessibility Emulation** — Test dark mode, forced colors, and reduced motion via Playwright — the scenarios real users with disabilities rely on.
- **WCAG 2.2 Manual Check Coverage** — Six criteria axe-core can't detect are covered with step-by-step verification instructions built into the report.
- **Runs Without an Agent** — Drop it into CI/CD directly. `pnpm run audit -- --base-url <url>` runs the full pipeline, no AI tokens required.

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

## Deliverables

- **Location**: All reports are generated in the `audit/` directory.

### For Clients & Stakeholders

- `report.pdf`: A professional, formal document designed for offline sharing and compliance evidence.

### For Developers & PMs

- `report.html`: A premium, interactive React-like dashboard that features:
  - Persona impact mapping (Screen Readers, Cognitive, Motor) to help prioritize UX improvements.
  - Critical issue isolation with ready-to-use code solutions for fast remediation.

### For AI Agents & Automation

- `remediation.md`: Actionable remediation guide for AI agents — contains selectors, HTML evidence, code fix templates, and agent instructions for resolving each issue.
- `internal/`: Raw technical assets for data ingestion.
  - `a11y-findings.json`: Final normalized findings (Cleaned).
  - `a11y-scan-results.json`: Raw automated scan data (Full).

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
| `--max-routes <num>`     | Maximum number of routes to discover and scan.       | `10`                         |
| `--routes <csv>`         | Custom list of paths to scan (e.g., `/cart,/about`). | Autodiscover                 |
| `--output <path>`        | Final HTML report location.                          | `audit/report.html`          |
| `--wait-ms <num>`        | Time to wait for dynamic content after page load.    | `2000`                       |
| `--headless <bool>`      | Run browser in background.                           | `true`                       |
| `--timeout-ms <num>`     | Network timeout for page loads.                      | `30000`                      |
| `--color-scheme <value>` | Emulate `light` or `dark` color scheme.              | `"light"`                    |
| `--title <text>`         | Custom title for the HTML report.                    | "Accessibility Audit Report" |
| `--environment <text>`   | Test environment label (e.g., "Staging", "Local").   | "Live Site"                  |
| `--target <text>`        | Compliance target label.                             | "WCAG 2.2 AA"                |
| `--scope <text>`         | Custom scope label for the HTML report.              | Optional                     |

## Audit Pipeline

All steps are orchestrated by `run-audit.mjs`, which executes them in sequence:

1. **Preflight**: `check-toolchain.mjs` verifies local dependencies and browsers.
2. **Scan**: `generate-route-checks.mjs` crawls the site and runs Axe-Core.
3. **Process**: `deterministic-findings.mjs` transforms raw data into structured findings.
4. **Build**: `build-audit-html.mjs` generates the final detailed HTML report.
5. **Export**: `generate-pdf.mjs` creates a portable PDF version of the report.

## Advanced Configuration

Customize the audit by editing `a11y.config.json` in the skill root.

### Full Reference

```json
{
  "maxRoutes": 10,
  "complianceTarget": "WCAG 2.2 AA",
  "routes": [],
  "ignoreFindings": [],
  "excludeSelectors": [],
  "outputDir": "audit",
  "internalDir": "audit/internal",
  "axeRules": {},
  "playwright": {}
}
```

### Common Use Cases

**1. Ignore Third-Party Widgets:**

```json
{
  "excludeSelectors": [".google-map-embed"]
}
```

**2. Disable Specific Rules:**

```json
{
  "axeRules": {
    "color-contrast": { "enabled": false }
  }
}
```

**3. Configure Playwright Options:**

```json
{
  "playwright": {
    "viewport": { "width": 375, "height": 812 },
    "colorScheme": "dark",
    "reducedMotion": "reduce"
  }
}
```

## Feature Comparison

While traditional tools are excellent for visual learning or broad metrics, this skill is purpose-built to automate the remediation workflow using AI agents.

| Feature / Capability              | `a11y`                                 | Google Lighthouse             | WebAIM WAVE            |
| :-------------------------------- | :------------------------------------- | :---------------------------- | :--------------------- |
| **Native AI Agent Integration**   | ✅ (Outputs clean JSON & DOM evidence) | ❌ (Requires complex parsing) | ❌ (Visual only)       |
| **Headless / CI-Ready Execution** | ✅ (Playwright)                        | ✅ (CLI available)            | ❌ (Browser Extension) |
| **Zero-Config SPA Support**       | ✅ (Waits for network & JS rendering)  | ⚠️ (Requires config)          | ✅ (Manual click)      |
| **Premium Executive Reports**     | ✅ (HTML Dashboard & PDF Export)       | ❌ (Basic HTML/JSON)          | ❌                     |
| **Direct Code Remediation**       | ✅ (AI uses findings to fix code)      | ❌ (Only reports)             | ❌ (Only reports)      |
| **Depth of Standard**             | WCAG 2.2 AA (Axe-Core Engine)          | Basic A11y + Web Vitals       | WCAG 2.1 AA            |

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
