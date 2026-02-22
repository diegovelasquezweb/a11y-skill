# a11y - Accessibility Audit & Remediation Skill

This skill executes comprehensive WCAG 2.2 AA audits and provides AI agents with targeted remediation blueprints including precise DOM selectors and fix patterns to autonomously patch vulnerabilities directly in the source code. It follows [Claude's Best Practices for Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) for reliable agent interaction.

## Why this Skill?

Traditional accessibility tools are built for humans to read reports. This skill is built for AI to take action. It bridges the gap between **knowing** a problem exists and **fixing** it by providing the exact intelligence an agent needs to resolve issues with precision.

| Feature / Capability          | `a11y`                                                                | Google Lighthouse                               | WebAIM WAVE                                 |
| :---------------------------- | :-------------------------------------------------------------------- | :---------------------------------------------- | :------------------------------------------ |
| **Targeted AI Remediation**   | <small>✅ (Actionable fix patterns & precise DOM selectors)</small>   | <small>⚠️ (Basic diagnostic hints only)</small> | <small>❌ (Manual inspection only)</small>  |
| **Rule Coverage**             | <small>✅ (100% of axe-core WCAG A/AA + best-practice)</small>        | <small>⚠️ (Curated subset)</small>              | <small>⚠️ (Proprietary engine)</small>      |
| **Automated Route Discovery** | <small>✅ (Multi-page crawler with sitemap & link discovery)</small>  | <small>❌ (Single URL per run)</small>          | <small>❌ (Single URL per run)</small>      |
| **Verified Audit Evidence**   | <small>✅ (Interactive HTML dashboard & Executive PDF report)</small> | <small>❌ (Static link list only)</small>       | <small>⚠️ (Passive visual overlays)</small> |

## Installation

To install this skill, provide the following prompt to your AI agent:

```bash
"Install skill https://github.com/diegovelasquezweb/a11y"
```

Restart your CLI-based agent session after installation to ensure the new skill is loaded correctly.

## Compatibility & Paths

This skill follows the [Agent Skills standard](https://agentskills.io) and is aligned with [Claude's Best Practices for Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

| Agent / IDE     | Skill Install Path (Global/User)                | Config & Rules            | Extended Workflow          |
| :-------------- | :---------------------------------------------- | :------------------------ | :------------------------- |
| **Antigravity** | `~/.gemini/antigravity/skills/a11y/`            | —                         | `.agent/`, `workflows/`    |
| **Codex**       | `~/.codex/skills/a11y/`                         | `agents/openai.yaml`      | `workflows/`               |
| **Claude**      | `~/.claude/skills/a11y/`                        | `CLAUDE.md`, `.claude/`   | `workflows/`               |
| **Cursor**      | `~/.cursor/skills/` (or inherits Claude/Codex)  | `.cursor/rules/`          | `workflows/`               |
| **Gemini CLI**  | `~/.gemini/skills/a11y/` (or `.agents/skills/`) | `~/.gemini/settings.json` | —                          |
| **Windsurf**    | `~/.codeium/windsurf/skills/a11y/`              | —                         | `.windsurf/`, `workflows/` |

## How to Audit

Initialize a scan to discover vulnerabilities and generate a compliance baseline:

```bash
"Audit my local dev server"
```

```bash
"Check accessibility localhost:3000"
```

## How to Fix

Trigger autonomous repairs using the remediation blueprints from the roadmap:

```bash
"Fix accessibility issues"
```

```bash
"Fix only critical issues"
```

## Deliverables

While the primary output for the AI agent is the Remediation Guide, the skill generates artifacts for human verification and reporting.

| Deliverable           | Format  | Audience   | Key Value                                                 |
| :-------------------- | :------ | :--------- | :-------------------------------------------------------- |
| Remediation Guide     | `.md`   | AI Agents  | AI-optimized patching guide with full fix intelligence.   |
| **Audit Dashboard**   | `.html` | Developers | Visual evidence and interactive verification of findings. |
| **Executive Summary** | `.pdf`  | Clients    | Formal compliance evidence for clients or stakeholders.   |
| **Technical Data**    | `.json` | Systems    | Enriched findings for custom integrations.                |

## Configuration

You can manage settings through the AI agent using natural language:

```bash
"Ignore the 'color-contrast' rule in the a11y configuration."
```

```bash
"Configure the scanner to use a Mobile viewport (375x812) and dark mode."
```

The agent creates `audit/a11y.config.json` in your project when you request a persistent setting. Changes are automatically applied on the next audit run. For the full CLI flag and JSON key reference, see [CLI Handbook](docs/cli-handbook.md) and [Configuration](docs/configuration.md).

## Audit Engine (CI/CD & Local Validation)

The technical core of the skill is a decoupled audit engine. It is ideal for automated pipelines and local verification where you need rapid diagnostics without spending AI tokens or agent intervention.

Execute the audit script directly from the skill directory:

```bash
# Audit a specific URL with custom limit and visible browser
pnpm a11y --base-url http://localhost:3000 --max-routes 20 --headed

# Run ONLY the color-contrast check
pnpm a11y --base-url https://mysite.com --only-rule color-contrast
```

## Technical Reference

For a comprehensive understanding of the a11y engine, explore the following technical manuals:

| Resource                                               | Description                                                                   |
| :----------------------------------------------------- | :---------------------------------------------------------------------------- |
| [**Architecture**](docs/architecture.md)               | Pipeline breakdown (Scanner → Analyzer → Builder) & Mermaid diagrams.         |
| [**CLI Handbook**](docs/cli-handbook.md)               | Advanced guide to every CLI flag, interactions, and edge cases.               |
| [**Configuration**](docs/configuration.md)             | Complete JSON schema reference and default value logic.                       |
| [**Data Validation**](docs/data-validation.md)         | Steps to verify and update intelligence data assets and WCAG mappings.        |
| [**Engine Intelligence**](docs/engine-intelligence.md) | Rule processing, fix patterns, WCAG criterion map, and manual checks system.  |
| [**Scoring System**](docs/scoring-system.md)           | Weighted penalty math, severity sorting, and score calculation logic.         |
| [**Scripts Catalog**](docs/scripts-catalog.md)         | Purpose and execution workflow of all engine automation scripts.              |
| [**Skill Evaluations**](evals/README.md)               | 10 scenarios for testing skill behavior (Antigravity/Windsurf/Claude/Gemini). |
| [**Testing Strategy**](docs/testing.md)                | Unit test coverage documentation for the audit pipeline.                      |

## External Resources

- [WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/)
- [Axe-Core Rules](https://dequeuniversity.com/rules/axe/4.11)
- [Playwright Emulation Guide](https://playwright.dev/docs/emulation)
- [Agent Skills Standard](https://agentskills.io/)
- [Claude Skills](https://docs.anthropic.com/en/docs/claude-code/skills)
- [Antigravity Skills](https://antigravity.google/docs/skills)
- [Codex Skills](https://developers.openai.com/codex/skills/)
- [Cursor Skills](https://cursor.com/docs/context/skills)
- [Gemini CLI Skills](https://geminicli.com/docs/cli/skills/)
- [Windsurf Skills](https://docs.windsurf.com/windsurf/cascade/skills)
