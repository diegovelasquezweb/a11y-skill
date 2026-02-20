# Web Accessibility Audit Agent Skill

Perform automated accessibility audits that empower AI agents to resolve issues with data-driven precision. This skill generates structured technical data including selectors, code evidence, and remediation logic, allowing AI to identify and patch WCAG 2.2 AA violations directly in your codebase with targeted remediation and minimal manual oversight.

## Why this Skill?

Traditional accessibility tools are built for visual browsing or broad metrics. This skill is surgically engineered to automate the **remediation workflow** specifically for AI agents, providing the structured code evidence and interactive guidance needed to achieve WCAG 2.2 AA compliance.

| Feature / Capability            | `a11y`                                                                         | Google Lighthouse                                  | WebAIM WAVE                                  |
| :------------------------------ | :----------------------------------------------------------------------------- | :------------------------------------------------- | :------------------------------------------- |
| **Native AI Agent Integration** | <small>✅ (Surgical DOM selectors & hints)</small>                             | <small>⚠️ (High token cost / Massive JSON)</small> | <small>❌ (Visual GUI only)</small>          |
| **Site-Wide Route Scouting**    | <small>✅ (Automated zero-config crawler)</small>                              | <small>❌ (Single URL per run)</small>             | <small>❌ (Single URL per run)</small>       |
| **Auditor-Grade Risk Analysis** | <small>✅ (Persona impact & Remediation roadmap)</small>                       | <small>❌ (Standard tech report)</small>           | <small>❌ (Visual overlays only)</small>     |
| **Remediation Intelligence**    | <small>✅ (AI-optimized resolution patterns & multi-source blueprints)</small> | <small>⚠️ (Diagnostic hints only)</small>          | <small>⚠️ (Documentation links only)</small> |
| **Guided Manual Verification**  | <small>✅ (Comprehensive DevTools, Keyboard & AT checks)</small>               | <small>❌ (Static link list only)</small>          | <small>⚠️ (Passive visual overlays)</small>  |
| **Depth of Standard**           | <small>WCAG 2.2 AA (Axe-Core 4.10+)</small>                                    | <small>WCAG 2.1 AA (Axe subset)</small>            | <small>WCAG 2.2 AA</small>                   |

## Installation

To install this skill, provide the following prompt to your AI agent:

```bash
"Install skill https://github.com/diegovelasquezweb/a11y"
```

## Compatibility & Paths

This skill follows the [Agent Skills standard](https://agentskills.io). Below are the supported agents and their default installation paths:

| Agent / IDE     | Skill Install Path (Global/User)                | Config & Rules             | Extended Workflow          |
| :-------------- | :---------------------------------------------- | :------------------------- | :------------------------- |
| **Antigravity** | `~/.gemini/antigravity/skills/a11y/`            | —                          | `.agent/`, `workflows/`    |
| **Codex**       | `~/.codex/skills/a11y/`                         | `agents/openai.yaml`       | `workflows/`               |
| **Claude**      | `~/.claude/skills/a11y/`                        | `CLAUDE.md`, `.claude/`    | `workflows/`               |
| **Cursor**      | `~/.cursor/skills/` (or inherits Claude/Codex)  | `.cursorrules`, `.cursor/` | `workflows/`               |
| **Gemini CLI**  | `~/.gemini/skills/a11y/` (or `.agents/skills/`) | `~/.gemini/settings.json`  | —                          |
| **Windsurf**    | `~/.codeium/windsurf/skills/a11y/`              | —                          | `.windsurf/`, `workflows/` |

## How to Use

Once installed, the skill is available to your agent in any conversation:

```bash
"Audit my local dev server at localhost:3000"
```

```bash
"Check accessibility for https://mysite.com"
```

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
# Example: Audit a specific URL with custom limit and visible browser
pnpm run audit -- --base-url localhost:3000 --max-routes 20 --headed

# Diagnostic: Run ONLY the color-contrast check
pnpm run audit -- --base-url https://mysite.com --only-rule color-contrast
```

### Options

| Flag                        | Description                                           | Default                      |
| :-------------------------- | :---------------------------------------------------- | :--------------------------- |
| `--accent-color <hex>`      | Override report theme color (e.g., `#6366f1`).        | Config hex                   |
| `--base-url <url>`          | The target to audit (Live URL or Localhost).          | Required                     |
| `--color-scheme <value>`    | Emulate `light` or `dark` color scheme.               | `"light"`                    |
| `--company-name <text>`     | Override company branding in the report.              | Config name                  |
| `--exclude-selectors <csv>` | Specific CSS selectors to ignore during scan.         | `[]`                         |
| `-h, --help`                | Show this help message.                               | —                            |
| `--headless <bool>`         | Run browser in background (default: `true`).          | `true`                       |
| `--headed`                  | Run browser in visible mode.                          | `false`                      |
| `--ignore-findings <csv>`   | Comma-separated rule IDs to skip in the report.       | `[]`                         |
| `--max-routes <num>`        | Maximum number of routes to discover and scan.        | `10`                         |
| `--only-rule <id>`          | Targeted Audit: Only check for this specific rule ID. | All standard rules           |
| `--output <path>`           | Final HTML report location.                           | `audit/report.html`          |
| `--routes <csv>`            | Custom list of paths to scan (e.g., `/cart,/about`).  | Autodiscover                 |
| `--target <text>`           | Compliance target label.                              | "WCAG 2.2 AA"                |
| `--timeout-ms <num>`        | Network timeout for page loads.                       | `30000`                      |
| `--title <text>`            | Custom title for the HTML report.                     | "Accessibility Audit Report" |
| `--wait-ms <num>`           | Time to wait for dynamic content after page load.     | `2000`                       |

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
  "axeRules": {},
  "headless": true
}
```

### Common Use Cases

**1. Custom Emulation (Mobile Viewport):**

```json
{
  "colorScheme": "dark",
  "viewports": [{ "width": 375, "height": 812, "name": "Mobile" }]
}
```

**2. Ignore Specific Findings & Selectors:**

```json
{
  "ignoreFindings": ["color-contrast-enhanced"],
  "excludeSelectors": [".third-party-widget"]
}
```

## How to Update Configuration

You can manage the skill's settings through the AI agent using natural language:

```bash
"Ignore the 'color-contrast' rule in the a11y configuration."
```

```bash
"Configure the scanner to use a Mobile viewport (375x812) and dark mode."
```

Changes to `a11y.config.json` are dynamic and automatically applied during the next audit execution.

## Audit Pipeline

All steps are orchestrated by `run-audit.mjs`, which executes them in sequence:

1. **Preflight**: `check-toolchain.mjs` verifies local dependencies and browsers.
2. **Scan**: `run-scanner.mjs` crawls the site and executes automated Axe-Core checks.
3. **Analyze**: `run-analyzer.mjs` processes raw data into normalized, rule-based findings.
4. **Build Reports**:
   - `build-report-html.mjs` generates the interactive dashboard.
   - `build-report-md.mjs` creates the AI-optimized remediation guide.
   - `build-report-pdf.mjs` exports the formal executive summary.

## Testing

```bash
pnpm test
```

39 unit tests covering the core pipeline functions:

| Module                        | What's tested                                                                             |
| :---------------------------- | :---------------------------------------------------------------------------------------- |
| `detectImplicitRole`          | Native HTML → ARIA role mapping (`<button>`, `<a>`, `<input>` variants, case-insensitive) |
| `extractSearchHint`           | CSS selector → source-code search pattern (ID > class > tag > attribute selector)         |
| `normalizeFindings`           | Finding schema normalization and severity sort order                                      |
| `computeComplianceScore`      | Weighted score calculation and clamping                                                   |
| `buildSummary` / `scoreLabel` | Severity totals and grade labels                                                          |
| `escapeHtml` / `linkify`      | HTML escaping and URL linkification                                                       |
| `loadConfig`                  | Config parsing, unknown key warnings, hex color validation                                |

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
