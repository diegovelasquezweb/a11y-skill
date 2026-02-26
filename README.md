# a11y - Accessibility Audit & Remediation Skill

This skill executes comprehensive WCAG 2.2 AA audits and provides AI agents with targeted remediation blueprints. Built following [skills best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

## Why this Skill?

This skill transforms accessibility audits into actionable fix roadmaps. It runs a full WCAG 2.2 AA scan, identifies the exact code locations responsible for each violation, and guides the agent through fixes with framework-aware intelligence.

| Capability                  | With a11y                                                                                                              | Without                                                                                          |
| :-------------------------- | :--------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **WCAG 2.2 AA Coverage**    | ✅ Full multi-layer coverage of the WCAG 2.2 AA standard                                                             | ❌ Automated scans limited to the rendered DOM, missing source-level violations                        |
| **Fix Intelligence**        | ✅ Surgical fix blueprints with stack-aware patterns for your specific codebase                                        | ❌ Manual hunting through code with generic DOM feedback and no fix guidance                     |
| **Workflow**                | ✅ Guided session that takes you from raw findings to applied fixes, no guesswork                                      | ❌ Unstructured prompting with inconsistent flow and unpredictable results                        |
| **Token Efficiency**          | ✅ The agent reads a compact structured report, not raw page HTML                                                     | ❌ Entire page HTML fed into context on every scan                                               |

## Installation

Give your AI agent the following prompt:

```bash
"Install skill https://github.com/diegovelasquezweb/a11y"
```

The agent will clone the repository to its skills directory automatically:

| Agent | Install path |
| :---- | :----------- |
| Claude Code | `~/.claude/skills/a11y/` |
| Cursor | `~/.cursor/skills/a11y/` |
| Gemini CLI | `~/.gemini/skills/a11y/` |
| Codex | `~/.agents/skills/a11y/` |
| Windsurf | `~/.codeium/windsurf/skills/a11y/` |
| Antigravity | `~/.gemini/antigravity/skills/a11y/` |

Restart your agent session after installation to ensure the skill is loaded.

## How to Use

Invoke it directly with `/a11y <URL>` or `$a11y <URL>` or start the skill with a natural language prompt like:

```bash
"Audit accessibility localhost:3000"
```

The agent guides the rest of the session as a conversation, running the audit, presenting findings, walking you through fixes, and asking for your input at every decision point. Every action is confirmed before it runs.

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
| **Manual Checklist**  | `.html` | Developers / QA  | Step-by-step guide for the WCAG criteria that automated tools cannot detect, covering all 41 manual checkpoints. |
| **Executive Summary** | `.pdf`  | Stakeholders     | Formal document with compliance score, legal risk summary, and remediation roadmap for non-technical audiences.  |

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
