# Security Policy

## Reporting a vulnerability

Please do not open a public GitHub issue for security vulnerabilities.

Use [GitHub's private vulnerability reporting](https://github.com/diegovelasquezweb/a11y/security/advisories/new) to submit a report confidentially. Include a description of the issue, steps to reproduce, and potential impact.

If confirmed, a fix will be released as soon as possible and credited to you in the changelog (unless you prefer to remain anonymous).

## Scope

This skill runs locally on the user's machine. It opens a headless browser to audit URLs provided by the user and writes output files to `audit/`. It does not transmit any data externally.

Known limitations:
- The skill executes `node` scripts from the skill directory — only install from trusted sources.
- `a11y.config.json` is read from the skill root without sandboxing — do not commit credentials there.
