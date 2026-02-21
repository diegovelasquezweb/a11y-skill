#!/usr/bin/env node

/**
 * Validates a Pull Request title against the Conventional Commits standard.
 * Format: <type>(<scope>): <description>
 * Types: feat, fix, chore, refactor, docs, style, test, perf, build, ci
 */

const title = process.argv[2];

if (!title) {
  console.error("Error: No PR title provided.");
  process.exit(1);
}

// Regex for Conventional Commits
const CONVENTIONAL_COMMIT_REGEX =
  /^(feat|fix|chore|refactor|docs|style|test|perf|build|ci)(\([a-z0-9-]+\))?:\s.{5,}$/;

if (CONVENTIONAL_COMMIT_REGEX.test(title)) {
  console.log(`✅ PR title follows standards: "${title}"`);
  process.exit(0);
} else {
  console.error("❌ PR title does NOT follow standard naming conventions.");
  console.error("Expected format: <type>(<optional-scope>): <description>");
  console.error(
    "Allowed types: feat, fix, chore, refactor, docs, style, test, perf, build, ci",
  );
  console.error('Example: "feat: add accessibility audit engine"');
  process.exit(1);
}
