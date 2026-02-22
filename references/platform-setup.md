# Platform-Specific Installation

## Contents

- [Antigravity Only] Workflow Setup
- [Windsurf Only] Workflow Setup
- [Codex Only] No Local Setup
- [Gemini CLI Only] No Local Setup
- Platform-Specific Runtime Notes

## [Antigravity Only] Workflow Template

> **CRITICAL**: This section applies EXCLUSIVELY to Google Antigravity. Other agents MUST IGNORE this section.

**Workflow Path**: `.agent/workflows/a11y.md`

```markdown
---
description: Run a full WCAG 2.2 AA accessibility audit
---

1. Ask the user for the target URL if not already provided.

// turbo 2. Run the audit pipeline:

\`\`\`bash
node scripts/run-audit.mjs --base-url <URL>
\`\`\`

3. Parse the `REPORT_PATH=<path>` line from the script output to get the absolute report path.

4. Open the report in the browser using the appropriate method for the current environment:
   - macOS: `open "<path>"`
   - Windows: `start "" "<path>"`
   - Linux: `xdg-open "<path>"`
   - If the open command fails or is sandboxed, tell the user the exact absolute path so they can open it manually.

5. Summarize the findings: total issues by severity, top critical/high items, and the report location.
```

---

## [Windsurf Only] Workflow Template

> **CRITICAL**: This section applies EXCLUSIVELY to Windsurf. Other agents MUST IGNORE this section.

**Workflow Path**: `.windsurf/workflows/a11y.md`

```markdown
---
description: Run a full WCAG 2.2 AA accessibility audit on the current project
labels: accessibility, a11y, wcag
---

1. Ask the user for the target URL if not already provided.

2. Run the audit pipeline:

\`\`\`bash
node scripts/run-audit.mjs --base-url <URL>
\`\`\`

3. Parse the `REPORT_PATH=<path>` line from the script output to get the absolute report path.

4. Open the report in the browser using the appropriate method for the current environment:
   - macOS: `open "<path>"`
   - Windows: `start "" "<path>"`
   - Linux: `xdg-open "<path>"`
   - If the open command fails or is sandboxed, tell the user the exact absolute path so they can open it manually.

5. Summarize the findings: total issues by severity, top critical/high items, and the report location.
```

---

## Platform-Specific Runtime Notes

### Gemini CLI — `ReadFile` Fallback

If `ReadFile` fails with "Path not in workspace" when reading resources from the skills directory (`~/.gemini/skills/a11y/`), immediately fall back to a shell command — e.g., `cat ~/.gemini/skills/a11y/SKILL.md` — without asking the user. Do not attempt `ReadFile` again. Use `/skills reload` if the skill name is not recognized at activation time.

### Antigravity / Windsurf — Setup Readiness

Initialize workflow files only when they are missing from the project root. See `Initialization` section in `SKILL.md`.
