# Security Policy

## Reporting a Vulnerability

We take the security and integrity of the a11y-skill seriously. Please do not open a public GitHub issue for security vulnerabilities.

Use [GitHub's private vulnerability reporting](https://github.com/diegovelasquezweb/a11y-skill/security/advisories/new) to submit a report confidentially. Include a detailed description of the issue, clear steps to reproduce, and potential impact analysis.

Confirmed vulnerabilities will be addressed with a high-priority patch and credited to the researcher in the changelog (unless anonymity is preferred).

## Execution Scope & Safety

The a11y-skill operates under a **local-first** security model:

- **Local Execution**: The skill runs entirely on your local machine. It does not transmit audit data, snapshots, or source code to external servers.
- **Controlled Environment**: Internal pipeline files are stored in the skill's own directory. User-facing reports are only generated on demand at a user-chosen location.
- **Sandboxing Notes**:
  - The skill uses `@diegovelasquezweb/a11y-engine` as its audit engine. Ensure you only install from trusted sources.
