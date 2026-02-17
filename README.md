# wondersauce-accessibility-audit

Codex skill for WCAG-focused web accessibility audits, based on the Wondersauce internal accessibility process, producing actionable findings and remediation-ready outputs.

By default, the skill starts auditing immediately (read-only) and auto-discovers same-origin routes if you do not provide them.

This skill is audit-only by default (read-only): it should not modify project code unless explicitly requested.

## Installation

```bash
export CODEX_HOME="$HOME/.codex"
mkdir -p "$CODEX_HOME/skills"
cp -R wondersauce-accessibility-audit "$CODEX_HOME/skills/"
```

Reload/restart Codex after copying the skill.

## Use

```text
Use $wondersauce-accessibility-audit to audit these URLs at WCAG 2.1 AA and return: summary, findings table, issue details, remediation plan, retest checklist.
```

## Minimum evidence per issue

- Route path (canonical location, for example `/products`)
- Selector or component
- Reproduction steps
- WCAG criterion and level
- Concrete evidence (DOM snippet, log, or tool output)
- Screenshot is optional and only useful when tied 1:1 to a specific issue
