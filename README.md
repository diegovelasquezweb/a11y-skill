# a11y - Accessibility Audit & Remediation Skill

This skill executes comprehensive WCAG 2.2 AA audits and provides AI agents with targeted remediation blueprints. Built following [skills best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

## Why this Skill?

This skill transforms accessibility audits into actionable fix roadmaps. It runs a full WCAG 2.2 AA scan, identifies the exact code locations responsible for each violation, and guides the agent through fixes with framework-aware intelligence.

| Capability             | With a11y                                                                          | Without                                                                        |
| :--------------------- | :--------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **Remediation IQ**     | ✅ Surgical fix blueprints with exact selectors, ready-to-apply code fixes, and an automated re-audit loop | ❌ Manual hunting through code with no fix guidance or verification loop        |
| **WCAG 2.2 AA Coverage** | ✅ Full multi-layer coverage: runtime DOM scan, grep-based source code audit, and manual verification checklist | ❌ Partial automated scans miss violations that only exist in source code |
| **Stack Awareness**    | ✅ Guardrails and fix patterns tailored to major frameworks, CMSs, and UI libraries | ❌ Generic DOM feedback with no awareness of your stack or components          |
| **Workflow**           | ✅ Guided, repeatable audit process with the same checkpoints and decisions on every run | ❌ Ad-hoc conversations with inconsistent flow and unpredictable results  |
| **Token Economy**      | ✅ Audit runs outside the AI context so the agent reads only a structured fix roadmap | ❌ Entire page HTML fed into context on every scan                           |
| **Scale & Speed**      | ✅ Automatic route discovery via sitemap and concurrent parallel tabs              | ❌ Manual one-page scans with no route discovery                               |

## Installation

Give your AI agent the following prompt:

```
Install skill https://github.com/diegovelasquezweb/a11y
```

The agent will clone the repository and run `node install.mjs`, which auto-detects installed agents and copies the skill to the correct path on any platform (macOS, Linux, Windows):

| Agent | Install path |
| :---- | :----------- |
| Claude Code | `~/.claude/skills/a11y/` |
| Cursor | `~/.cursor/skills/a11y/` |
| Gemini CLI | `~/.gemini/skills/a11y/` |
| Codex | `~/.agents/skills/a11y/` |
| Windsurf | `~/.codeium/windsurf/skills/a11y/` |
| Antigravity | `~/.gemini/antigravity/skills/a11y/` |

To uninstall, ask your agent: `"Uninstall skill a11y"`

Restart your agent session after installation to ensure the skill is loaded.

## How to Use

Start the skill with a single prompt, for example:

```bash
"Audit accessibility localhost:3000"
```

The agent guides the rest of the session, running the audit, presenting findings, walking you through fixes, and asking whether to generate reports. Every action is confirmed before it runs.

## Headless Audit

Run the audit engine directly without an AI agent. Ideal for CI/CD pipelines, pre-commit hooks, and rapid local validation without consuming AI tokens.

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
