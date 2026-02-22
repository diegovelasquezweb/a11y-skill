# a11y - Accessibility Audit & Remediation Skill

This skill executes comprehensive WCAG 2.2 AA audits and provides AI agents with targeted remediation blueprints.

## Why this Skill?

Traditional accessibility tools are built for humans to read reports. This skill is built for AI to take action. It bridges the gap between knowing a problem exists and fixing it by providing the exact intelligence an agent needs to resolve issues with precision.

| Capability               | With this skill                                                                | Without                                                            |
| :----------------------- | :----------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| **Audit scope**          | ✅ Built-in sitemap crawler + multi-page scanning                              | ❌ Agent must script multi-URL loops manually                      |
| **Rule coverage**        | ✅ 100% of axe-core WCAG A/AA + best-practice rules                            | ❌ Lighthouse runs ~67 of ~90 applicable rules                     |
| **Fix intelligence**     | ✅ Surgical fix patterns per file with component batching                      | ❌ Agent relies on general knowledge, no project-specific guidance |
| **Framework detection**  | ✅ Next.js, Nuxt, React, Vue, Angular, Astro, Svelte                           | ❌ Generic HTML suggestions, no framework context                  |
| **CMS support**          | ✅ Shopify (Liquid), WordPress (PHP)                                           | ❌ No CMS-aware file resolution                                    |
| **UI library awareness** | ✅ Radix, Headless UI, Polaris, React Aria, Ariakit, Shadcn, PrimeVue, Vuetify | ❌ No managed component detection                                  |
| **Parallel scanning**    | ✅ 3 concurrent browser tabs, built-in                                         | ❌ Requires external tooling to parallelize                        |
| **Compliance scoring**   | ✅ Custom weighted severity with priority ranking                              | ❌ Basic impact tiers without remediation priority                 |
| **Visual reports**       | ✅ HTML dashboard + PDF executive summary, on demand                           | ❌ Agent must generate reports from scratch                        |
| **Verification**         | ✅ Orchestrated re-audit after each fix phase                                  | ❌ Agent must wire fix-then-revalidate loop                        |

## Installation

To install this skill, provide the following prompt to your AI agent:

```bash
"Install skill https://github.com/diegovelasquezweb/a11y"
```

Restart your CLI-based agent session after installation to ensure the new skill is loaded correctly.

## Compatibility & Paths

This skill follows the [Agent Skills standard](https://agentskills.io) and is aligned with [Claude's Best Practices for Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

| Agent / IDE     | Skill Install Path (Global/User)               |
| :-------------- | :--------------------------------------------- |
| **Claude**      | `~/.claude/skills/a11y/`                       |
| **Cursor**      | `~/.cursor/skills/` (or inherits Claude/Codex) |
| **Codex**       | `~/.codex/skills/a11y/`                        |
| **Antigravity** | `~/.gemini/antigravity/skills/a11y/`           |
| **Windsurf**    | `~/.codeium/windsurf/skills/a11y/`             |
| **Gemini CLI**  | `~/.gemini/skills/a11y/`                       |

## How to Use

This skill is designed for human-like interaction. You don't need to memorize technical CLI flags; simply talk to your AI agent in plain English. The agent understands your intent and orchestrates the engine automatically.

### Audit & Baseline

To discover vulnerabilities and generate a compliance baseline:

```bash
"Check accessibility localhost:3000"
```

### Autonomous Fixes

To trigger repairs using the remediation blueprints:

```bash
"Fix accessibility issues"
```

### Targeted Remediation

```bash
"Fix only critical issues"
```

### Custom Configuration

You can customize the audit using natural language. The agent translates your instructions into the appropriate engine settings:

```bash
"Ignore the 'color-contrast' rule."
```

```bash
"Use a Mobile viewport (375x812) and dark mode."
```

For the full technical reference of supported options, see the [CLI Handbook](docs/cli-handbook.md).

## Audit Engine (CI/CD & Local Validation)

The technical core of the skill is a decoupled audit engine. It is ideal for automated pipelines and local verification where you need rapid diagnostics without spending AI tokens or agent intervention.

Execute the audit script directly from the skill directory:

```bash
# Audit a specific URL with custom limit and visible browser
pnpm a11y --base-url http://localhost:3000 --max-routes 20 --headed

# Run ONLY the color-contrast check
pnpm a11y --base-url https://mysite.com --only-rule color-contrast
```

## Deliverables

By default, the skill operates as a high-speed headless engine for the AI agent. At the end of an audit, the skill will prompt you to generate these optional visual reports:

| Deliverable           | Format  | Audience     | Key Value                                                                   |
| :-------------------- | :------ | :----------- | :-------------------------------------------------------------------------- |
| **Audit Dashboard**   | `.html` | Developers   | Interactive report with persona filtering, DOM telemetry, and verification. |
| **Executive Summary** | `.pdf`  | Stakeholders | Formal compliance evidence and legal risk assessment for stakeholders.      |

## Technical Reference

For a comprehensive understanding of the a11y engine, explore the following technical manuals:

| Resource                                           | Description                                                                   |
| :------------------------------------------------- | :---------------------------------------------------------------------------- |
| [Architecture](docs/architecture.md)               | Pipeline breakdown (Scanner → Analyzer → Builder) & Mermaid diagrams.         |
| [CLI Handbook](docs/cli-handbook.md)               | Advanced guide to every CLI flag, interactions, and edge cases.               |
| [Data Validation](docs/data-validation.md)         | Steps to verify and update intelligence data assets and WCAG mappings.        |
| [Engine Intelligence](docs/engine-intelligence.md) | Rule processing, fix patterns, WCAG criterion map, and manual checks system.  |
| [Scoring System](docs/scoring-system.md)           | Weighted penalty math, severity sorting, and score calculation logic.         |
| [Scripts Catalog](docs/scripts-catalog.md)         | Purpose and execution workflow of all engine automation scripts.              |
| [Skill Evaluations](evals/README.md)               | 10 scenarios for testing skill behavior (Antigravity/Windsurf/Claude/Gemini). |
| [Testing Strategy](docs/testing.md)                | Unit test coverage documentation for the audit pipeline.                      |

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
