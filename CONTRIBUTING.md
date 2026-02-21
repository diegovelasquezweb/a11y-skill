# Internal Contribution Guidelines

This project is proprietary and internal to diegovelasquezweb. Contributions are restricted to authorized personnel.

## Development Setup

```bash
git clone path-to-private-repo/a11y
cd a11y
pnpm install
```

## Internal Standards

### 1. Code Quality

- Ensure all tests pass: `pnpm test`.
- New features must include unit tests.
- Follow the premium design tokens for any UI changes.

### 2. Security & Privacy

- **Local-First**: Do not introduce any dependency that transmits data externally.
- **Sensitive Data**: Never commit API keys, personal credentials, or client audit data to the repository. Use environmental variables or local config overrides.

### 3. Merging Policy

- All changes must go through a Pull Request or direct commit to main.
- Ensure all tests pass before pushing.

## PR Checklist

- [ ] Tests and Security Audit passing.
- [ ] All code follows the internal style guide.
- [ ] Technical documentation updated (in `docs/`).
