# a11y - Accessibility Audit & Remediation Skill

This skill executes comprehensive WCAG 2.2 AA audits and provides AI agents with targeted remediation blueprints. It is built following [skills best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

## Why this Skill?

This skill transforms accessibility audits into actionable fix roadmaps. It runs a full WCAG 2.2 AA scan, identifies the exact code locations responsible for each violation, and guides the agent through fixes with framework-aware intelligence.

| Capability                  | With a11y                                                                                                              | Without                                                                                          |
| :-------------------------- | :--------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **WCAG 2.2 AA Coverage**    | ✅ Full multi-layer coverage of the WCAG 2.2 AA standard                                                             | ❌ Automated scans are limited to the rendered DOM and miss source-level violations                    |
| **Fix Intelligence**        | ✅ Surgical fix blueprints with stack-aware patterns for your specific codebase                                        | ❌ Manual hunting through code with generic DOM feedback and no fix guidance                     |
| **Workflow**                | ✅ Guided session from findings to applied fixes, with prioritization by severity or issue category                   | ❌ Unstructured prompting with inconsistent flow and unpredictable results                         |
| **Token Efficiency**        | ✅ The agent reads a compact, structured report instead of raw page HTML                                               | ❌ Entire page HTML is fed into context on every scan                                             |

## Installation

Give your AI agent the install prompt, or use your agent's native skill installer.

```bash
"Install skill https://github.com/diegovelasquezweb/a11y"
```

The agent will clone the repository to its skills directory automatically:

| Agent | Install path | Install command |
| :---- | :----------- | :-------------- |
| Antigravity | `~/.gemini/antigravity/skills/a11y/` | `Install skill <repo-url>` |
| Claude Code | `~/.claude/skills/a11y/` | `Install skill <repo-url>` |
| Codex | `~/.codex/skills/a11y/` | `$skill-installer <repo-url>` |
| Cursor | `~/.cursor/skills/a11y/` | `Install skill <repo-url>` |
| Gemini CLI | `~/.gemini/skills/a11y/` | `gemini skills install <repo-url>` |
| Windsurf | `~/.codeium/windsurf/skills/a11y/` | `Install skill <repo-url>` |

Restart your agent session after installation to ensure the skill is loaded.

## How to Use

Give your AI agent the audit prompt, or use your agent's invoke shortcut.

```bash
"Audit accessibility localhost:3000"
```

The agent guides the rest of the session as a conversation, running the audit, presenting findings, walking you through fixes, and asking for your input at every decision point. Every action is confirmed before it runs.

| Agent | Invoke shortcut | Audit command |
| :---- | :------------- | :------------ |
| Antigravity | `/a11y <url>` | `Audit accessibility <url>` |
| Claude Code | `/a11y <url>` | `Audit accessibility <url>` |
| Codex | `$a11y <url>` | `Audit accessibility <url>` |
| Cursor | `/a11y <url>` | `Audit accessibility <url>` |
| Gemini CLI | `--` | `Audit accessibility <url>` |
| Windsurf | `@a11y <url>` | `Audit accessibility <url>` |

## Headless Audit

Run the audit engine directly without an AI agent. Useful for local validation and scripted workflows without consuming AI tokens.

Execute the audit script directly from the skill directory. For the full technical reference of supported options, see the [CLI Handbook](docs/cli-handbook.md).

```bash
pnpm a11y --base-url https://mysite.com
```

## Deliverables

Visual reports on demand. After any audit, you can optionally generate these professional formats:

| Deliverable           | Format  | Audience         | Key Value                                                                                                        |
| :-------------------- | :------ | :--------------- | :--------------------------------------------------------------------------------------------------------------- |
| **Audit Dashboard**   | `.html` | Developers       | Shareable report with severity-grouped findings, DOM evidence, and ready-to-apply fix blueprints per component.  |
| **Executive Summary** | `.pdf`  | Stakeholders     | Formal document with compliance score, legal risk summary, and remediation roadmap for non-technical audiences.  |
| **Manual Checklist**  | `.html` | Developers / QA  | Step-by-step guide for the WCAG criteria that automated tools cannot detect, covering all 41 manual checkpoints. |

## Technical Reference

For a comprehensive understanding of the a11y engine, explore the following technical manuals:

| Resource                                           | Description                                                                                         |
| :------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| [Architecture](docs/architecture.md)               | How the three-stage pipeline transforms a URL into a surgical code fix roadmap.                     |
| [CLI Handbook](docs/cli-handbook.md)               | Every flag, execution path, and agent integration option for running the audit directly.            |
| [Engine Intelligence](docs/engine-intelligence.md) | How violations become actionable patches using the curated framework-aware knowledge base.          |
| [Scoring System](docs/scoring-system.md)           | The Weighted Debt Model that calculates compliance scores based on severity and frequency.          |
| [Engine Manifest](docs/engine-manifest.md)         | Complete inventory of every script, asset, and configuration file in the engine.                   |
| [Testing Strategy](docs/testing.md)                | Test suite structure and coverage across the scanner, analyzer, and intelligence mapping layers.    |

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
