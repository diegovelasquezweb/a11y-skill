# web-accessibility-audit

Codex skill for WCAG-focused web accessibility audits, based on the Wondersauce internal accessibility process, producing actionable findings and remediation-ready outputs.

## Installation

```bash
cp -R web-accessibility-audit "$CODEX_HOME/skills/"
```

Reload/restart Codex after copying the skill.

## Use

```text
Use $web-accessibility-audit to audit these URLs at WCAG 2.1 AA and return: summary, findings table, issue details, remediation plan, retest checklist.
```

## Minimum evidence per issue

- Exact URL
- Selector or component
- Reproduction steps
- WCAG criterion and level
- Concrete evidence (screenshot, log, or tool output)
