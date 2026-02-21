[← Back to Index](README.md)

# Repository Governance Guide

This guide outlines the mandatory repository settings required to maintain the **a11y** skill at a premium, professional standard.

## Branch Protection (main)

Go to **Settings > Branches > Branch protection rules** and add a rule for `main`:

### 1. Protect Matching Branches

- [x] **Require a pull request before merging**: Prevents direct pushes to the production branch.
- [x] **Require conversation resolution before merging**: Ensures all feedback is addressed.

### 2. Status Checks

- [x] **Require status checks to pass before merging**:
  - `Unit Tests` (GitHub Action)
  - `Validation skill spec` (GitHub Action)
  - `Dependency Audit` (Security Workflow)

## Pull Requests & Merging

Go to **Settings > General > Pull Requests**:

### 1. Merge Configuration

- [ ] **Allow merge commits**: (Optional, but discouraged for clean history).
- [x] **Allow squash merging**: Preferred. Keeps the history flat and readable.
- [ ] **Allow rebase merging**: (Optional).

### 2. PR Management

- [x] **Always suggest updating pull request branches**: Keeps PRs in sync with `main` effortlessly.
- [x] **Automatically delete head branches**: Cleanup after merge.

## Standards Verification

Every Pull Request must undergo the double-verification process:

1. **Automated CI**: Standard unit tests and specifications.
2. **Skill Self-Audit**: Use the `a11y` skill itself to audit any UI changes introduced in the PR.
