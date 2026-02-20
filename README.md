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

| Feature / Capability               | `a11y`                                 | Google Lighthouse             | WebAIM WAVE            |
| :--------------------------------- | :------------------------------------- | :---------------------------- | :--------------------- |
| **Native AI Agent Integration**    | ✅ (Outputs clean JSON & DOM evidence) | ❌ (Requires complex parsing) | ❌ (Visual only)       |
| **Headless / CI-Ready Execution**  | ✅ (Playwright)                        | ✅ (CLI available)            | ❌ (Browser Extension) |
| **Zero-Config SPA Support**        | ✅ (Waits for network & JS rendering)  | ⚠️ (Requires config)          | ✅ (Manual click)      |
| **Premium Executive Reports**      | ✅ (HTML Dashboard & PDF Export)       | ❌ (Basic HTML/JSON)          | ❌                     |
| **Direct Code Remediation**        | ✅ (AI uses findings to fix code)      | ❌ (Only reports)             | ❌ (Only reports)      |
| **AI Safety (Anti-Hallucination)** | ✅ (Guardrails for CMS & Frameworks)   | ❌                            | ❌                     |
| **Depth of Standard**              | WCAG 2.2 AA (Axe-Core Engine)          | Basic A11y + Web Vitals       | WCAG 2.1 AA            |

## Reference

- [WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/)
- [ADA Title II — DOJ Final Rule (WCAG 2.1 AA)](https://www.ada.gov/resources/2024-04-24-final-rule-title-ii/)
- [Section 508 Standards (US Federal)](https://www.section508.gov/)
- [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [A11ySupport.io (Browser & AT Support Data)](https://a11ysupport.io/)
- [Inclusive Components Pattern Library](https://inclusive-components.design/)
- [The A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Gov.uk Accessibility Dos and Don'ts](https://accessibility.blog.gov.uk/2016/09/02/dos-and-donts-on-designing-for-accessibility/)
- [Axe-Core Rules](https://dequeuniversity.com/rules/axe/4.10)
- [Playwright Emulation Guide](https://playwright.dev/docs/emulation)
- [Agent Skills Standard](https://agentskills.io/)
- [Claude Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/)
- [Antigravity Skills](https://antigravity.google/docs/skills)
- [Codex Skills](https://developers.openai.com/codex/skills/)
- [Cursor Skills](https://cursor.com/docs/context/skills)
- [Gemini CLI Skills](https://geminicli.com/docs/cli/skills/)
- [Windsurf Skills](https://docs.windsurf.com/windsurf/cascade/skills)
