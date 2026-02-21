# a11y - Accessibility Audit & Remediation Skill

This skill executes comprehensive WCAG 2.2 AA audits and provides AI agents with surgical remediation blueprints including precise DOM selectors and fix patterns to autonomously patch vulnerabilities directly in the source code.

## Why this Skill?

Traditional accessibility tools are built for humans to read reports. This skill is built for AI to take action. It bridges the gap between **knowing** a problem exists and **fixing** it by providing the exact intelligence an agent needs to resolve issues with surgical precision.

| Feature / Capability         | `a11y`                                                          | Google Lighthouse                               | WebAIM WAVE                                  |
| :--------------------------- | :-------------------------------------------------------------- | :---------------------------------------------- | :------------------------------------------- |
| **Autonomous AI Resolution** | <small>✅ (Surgical DOM selectors & fix-ready patterns)</small> | <small>⚠️ (Basic diagnostic hints only)</small> | <small>❌ (Manual inspection only)</small>   |
| **Site-Wide Route Scouting** | <small>✅ (Automated zero-config crawler)</small>               | <small>❌ (Single URL per run)</small>          | <small>❌ (Single URL per run)</small>       |
| **Remediation Intelligence** | <small>✅ (AI-optimized blueprints & W3C APG patterns)</small>  | <small>⚠️ (Diagnostic links only)</small>       | <small>⚠️ (Documentation links only)</small> |
| **Interactive QA Evidence**  | <small>✅ (Premium dashboard for visual verification)</small>   | <small>❌ (Static link list only)</small>       | <small>⚠️ (Passive visual overlays)</small>  |

## Installation

To install this skill, provide the following prompt to your AI agent:

```bash
"Install skill https://github.com/diegovelasquezweb/a11y"
```

## Compatibility & Paths

This skill follows the [Agent Skills standard](https://agentskills.io).

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

While the primary output for the AI agent is the Remediation Guide, the skill generates artifacts for human verification and reporting.

| Deliverable           | Format  | Audience   | Key Value                                                 |
| :-------------------- | :------ | :--------- | :-------------------------------------------------------- |
| Remediation Guide     | `.md`   | AI Agents  | AI-optimized patching guide with surgical selectors.      |
| **Audit Dashboard**   | `.html` | Developers | Visual evidence and interactive verification of findings. |
| **Executive Summary** | `.pdf`  | Clients    | Formal compliance evidence for clients or stakeholders.   |
| **Technical Data**    | `.json` | Systems    | Raw findings in `internal/` for custom integration.       |

## Configuration

You can manage settings through the AI agent using natural language:

```bash
"Ignore the 'color-contrast' rule in the a11y configuration."
```

```bash
"Configure the scanner to use a Mobile viewport (375x812) and dark mode."
```

Changes to `a11y.config.json` are dynamic and automatically applied during the next audit run. For the full CLI flag and JSON key reference, see [CLI Handbook](docs/cli-handbook.md) and [Configuration](docs/configuration.md).

## Audit Engine (CI/CD & Local Validation)

The technical core of the skill is a decoupled audit engine. It is ideal for automated pipelines and local verification where you need rapid diagnostics without spending AI tokens or agent intervention.

Execute the audit script directly from the skill directory:

```bash
# Audit a specific URL with custom limit and visible browser
pnpm audit --base-url http://localhost:3000 --max-routes 20 --headed

# Run ONLY the color-contrast check
pnpm audit --base-url https://mysite.com --only-rule color-contrast
```

## Technical Reference

For a comprehensive understanding of the a11y engine, explore the following technical manuals:

| Resource                                                  | Description                                                                  |
| :-------------------------------------------------------- | :--------------------------------------------------------------------------- |
| 📖 [**CLI Handbook**](docs/cli-handbook.md)               | Advanced guide to every CLI flag, interactions, and edge cases.              |
| ⚙️ [**Configuration**](docs/configuration.md)             | Complete JSON schema reference and default value logic.                      |
| 🧠 [**Engine Intelligence**](docs/engine-intelligence.md) | Rule processing, fix patterns, WCAG criterion map, and manual checks system. |
| 🧮 [**Scoring System**](docs/scoring-system.md)           | Weighted penalty math, severity sorting, and score calculation logic.        |
| 🏗️ [**Architecture**](docs/architecture.md)               | Pipeline breakdown (Scanner → Analyzer → Builder) & Mermaid diagrams.        |
| 🛡️ [**Testing Strategy**](docs/testing.md)                | Unit test coverage documentation for the audit pipeline.                     |

## External Resources

- [WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/)
- [Axe-Core Rules](https://dequeuniversity.com/rules/axe/4.10)
- [Playwright Emulation Guide](https://playwright.dev/docs/emulation)
- [Agent Skills Standard](https://agentskills.io/)
- [Claude Skills](https://docs.anthropic.com/en/docs/claude-code/skills)
- [Antigravity Skills](https://antigravity.google/docs/skills)
- [Codex Skills](https://developers.openai.com/codex/skills/)
- [Cursor Skills](https://cursor.com/docs/context/skills)
- [Gemini CLI Skills](https://geminicli.com/docs/cli/skills/)
- [Windsurf Skills](https://docs.windsurf.com/windsurf/cascade/skills)
