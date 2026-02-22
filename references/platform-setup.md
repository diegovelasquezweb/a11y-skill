# Platform-Specific Installation

## Contents
- [Antigravity Only] Workflow Setup
- [Windsurf Only] Workflow Setup
- [Codex Only] No Local Setup
- [Gemini CLI Only] No Local Setup
- Platform-Specific Runtime Notes

## [Antigravity Only] Workflow Setup

> **CRITICAL**: This section applies EXCLUSIVELY to Google Antigravity. Other agents (Gemini CLI, Claude, Cursor, Windsurf) MUST IGNORE this section.

When running in **Antigravity**, the agent ensures the `/a11y` slash command is available by checking the project's local workspace:

1. Check if `.agent/workflows/a11y.md` exists in the current project root.
2. **If missing**: Create the `.agent/workflows/` directory and write the `a11y.md` workflow file with the following content:

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

3. **If present**: Do nothing.
4. **Other Agents**: Never attempt to list or create `.agent/workflows/` files if you are not Antigravity.

---

## [Windsurf Only] Workflow Setup

> **CRITICAL**: This section applies EXCLUSIVELY to Windsurf. Other agents (Gemini CLI, Claude, Cursor, Antigravity) MUST IGNORE this section.

When running in **Windsurf**, the agent ensures the `/a11y` slash command is available by checking the project's local workspace:

1. Check if `.windsurf/workflows/a11y.md` exists in the current project root.
2. **If missing**: Create the `.windsurf/workflows/` directory and write the `a11y.md` workflow file with the following content:

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

3. **If present**: Do nothing.
4. **Other Agents**: Never attempt to list or create `.windsurf/workflows/` files if you are not Windsurf.

---

## [Codex Only] No Local Setup

Codex activates the skill automatically via `agents/openai.yaml` and `workflows/a11y.md`, both bundled inside the skill installation at `~/.codex/skills/a11y/`. No project-level files are required or allowed to be created by the agent during Codex sessions.

---

## [Gemini CLI Only] No Local Setup

Gemini CLI utilizes autonomous activation based on `SKILL.md`. No project-level files or workflows are required or allowed to be created by the agent during Gemini CLI sessions. After activation, the agent should suggest the user to refresh the skills registry by running `/skills reload` if the skill is not immediately available.

---

## Platform-Specific Runtime Notes

### Gemini CLI — `ReadFile` Fallback

If `ReadFile` fails with "Path not in workspace" when reading resources from the skills directory (`~/.gemini/skills/a11y/`), immediately fall back to a shell command — e.g., `cat ~/.gemini/skills/a11y/SKILL.md` — without asking the user. Do not attempt `ReadFile` again. Use `/skills reload` if the skill name is not recognized at activation time.

### Antigravity / Windsurf — Setup Readiness

Ensure the `/a11y` command is enabled via project-specific workflow files (see sections above).
