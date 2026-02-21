# Contribution Guidelines

This is a source-available skill maintained by [diegovelasquezweb](https://github.com/diegovelasquezweb). Bug reports and improvement suggestions are welcome. See [LICENSE](LICENSE) for usage terms.

## Development Setup

```bash
git clone https://github.com/diegovelasquezweb/a11y.git
cd a11y
pnpm install
```

## Standards

### 1. Code Quality

- Ensure all tests pass: `pnpm test`.
- New features must include unit tests.
- **pnpm Only**: Use `pnpm` for all dependency management. Do not commit `package-lock.json` or `yarn.lock`.
- Keep implementations concise — avoid unnecessary abstractions.

### 2. Security & Privacy

- **Local-First**: Do not introduce any dependency that transmits data externally.
- **Sensitive Data**: Never commit API keys, personal credentials, or client audit data to the repository.

### 3. Merging Policy

- All changes must go through a Pull Request reviewed before merging to `main`.
- Ensure all tests pass before opening a PR.

### Branch Naming

Use the following prefixes to keep the repository organized:

- `feature/ or feat/` (Features)
- `fix/` (Bugs)
- `refactor/` (Cleanup)
- `docs/` (Documentation)
- `chore/` (Maintenance)

## PR Checklist

- [ ] Tests passing (`pnpm test`).
- [ ] All code follows the existing style.
- [ ] Technical documentation updated (in `docs/`) if behavior changed.
