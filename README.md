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
| **Token efficiency**     | ✅ Local analysis + AI-optimized blueprints                                    | ❌ Context-heavy raw HTML parsing & trial-and-error edits          |

## Installation

To install this skill, provide the following prompt to your AI agent:

```bash
"Install skill https://github.com/diegovelasquezweb/a11y"
```

Restart your CLI-based agent session after installation to ensure the new skill is loaded correctly.

## How to Use

This skill is designed for human-like interaction. The agent understands your intent and orchestrates the engine automatically.

### Audit

To discover vulnerabilities and generate a compliance baseline:

```bash
"Audit accessibility localhost:3000"
```

### Fix

To trigger repairs using the remediation blueprints:

```bash
"Fix accessibility issues"
```

### Custom Configuration

The agent translates your instructions into the appropriate engine settings:

```bash
"Ignore the 'color-contrast' rule."
```

## Audit Engine (CI/CD & Local Validation)

Audit core for CI/CD pipelines and rapid local verification without consuming AI tokens

Execute the audit script directly from the skill directory. For the full technical reference of supported options, see the [CLI Handbook](docs/cli-handbook.md).

```bash
pnpm a11y --base-url https://mysite.com --only-rule color-contrast
```

## Deliverables

Visual reports on demand. After any audit, you can optionally generate these professional formats:

| Deliverable           | Format  | Audience     | Key Value                                                                   |
| :-------------------- | :------ | :----------- | :-------------------------------------------------------------------------- |
| **Audit Dashboard**   | `.html` | Developers   | Interactive report with persona filtering, DOM telemetry, and verification. |
| **Executive Summary** | `.pdf`  | Stakeholders | Formal compliance evidence and legal risk assessment for stakeholders.      |

## Technical Reference

For a comprehensive understanding of the a11y engine, explore the following technical manuals:

| Resource                                           | Description                                                                  |
| :------------------------------------------------- | :--------------------------------------------------------------------------- |
| [Architecture](docs/architecture.md)               | Pipeline breakdown (Scanner → Analyzer → Builder) & Mermaid diagrams.        |
| [CLI Handbook](docs/cli-handbook.md)               | Advanced guide to every CLI flag, interactions, and edge cases.              |
| [Engine Intelligence](docs/engine-intelligence.md) | Rule processing, fix patterns, WCAG criterion map, and manual checks system. |
| [Scoring System](docs/scoring-system.md)           | Weighted penalty math, severity sorting, and score calculation logic.        |
| [Engine Manifest](docs/engine-manifest.md)         | Technical inventory of all engine scripts, JSON assets, and references.      |
| [Testing Strategy](docs/testing.md)                | Unit test coverage documentation for the audit pipeline.                     |

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
