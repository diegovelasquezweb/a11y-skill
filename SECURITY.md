# Security Policy

## Reporting a Vulnerability

We take the security and integrity of the a11y skill seriously. Please do not open a public GitHub issue for security vulnerabilities.

Use [GitHub's private vulnerability reporting](https://github.com/diegovelasquezweb/a11y/security/advisories/new) to submit a report confidentially. Include a detailed description of the issue, clear steps to reproduce, and potential impact analysis.

Confirmed vulnerabilities will be addressed with a high-priority patch and credited to the researcher in the changelog (unless anonymity is preferred).

## Execution Scope & Safety

The a11y engine operates under a **local-first** security model:

- **Local Execution**: The skill runs entirely on your local machine. It does not transmit audit data, snapshots, or source code to external servers.
- **Controlled Environment**: Audit output is written exclusively to the `audit/` directory.
- **Sandboxing Notes**:
  - The skill executes `node` scripts from its own directory. Ensure you only install from trusted sources.
  - `a11y.config.json` is used for persistent settings; avoid storing sensitive environment variables or credentials directly in the config file.
