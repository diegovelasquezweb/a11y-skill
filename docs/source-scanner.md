# Source Scanner

**Navigation**: [Home](../README.md) • [Architecture](architecture.md) • [CLI Handbook](cli-handbook.md) • [Intelligence](engine-intelligence.md) • [Source Scanner](source-scanner.md) • [Scoring](scoring-system.md) • [Manifest](engine-manifest.md) • [Testing](testing.md)

---

## Table of Contents

- [Why a Source Scanner](#why-a-source-scanner)
- [How It Works](#how-it-works)
- [Code Patterns](#code-patterns)
- [Pattern Fields](#pattern-fields)
- [Adding a Pattern](#adding-a-pattern)

## Why a Source Scanner

axe-core runs against the **rendered DOM** — it can only evaluate what the browser produces at scan time. Several WCAG issues are invisible to DOM inspection:

| Issue | Why axe misses it |
| :---- | :---------------- |
| Input with `placeholder` but no label | axe accepts `placeholder` as a valid accessible name since v4.1 |
| `onMouseOver` without `onFocus` | Events are not reflected in the DOM |
| `target="_blank"` without warning text | The link renders correctly — the missing context is semantic |
| SPA navigation without `document.title` update | axe scans the initial DOM, not post-navigation state |
| `focus:outline-none` without `:focus-visible` replacement | Computed styles are not audited by axe-core |

The source scanner fills these gaps by running **regex patterns** against the project's source files before the agent begins fixing.

## How It Works

1. The agent runs `scripts/engine/source-scanner.mjs --project-dir <path>` (Step 6 of the workflow, optional).
2. Each pattern's `regex` is matched against all files matching its `globs`.
3. For each match, the scanner checks a `context_window` of surrounding lines for a `context_reject_regex`. If the reject pattern is found nearby, the finding is marked **potential** (likely already handled). Otherwise it is **confirmed**.
4. Results are written to `.audit/a11y-pattern-findings.json` and injected into `remediation.md` under a separate "Source Code Pattern Findings" section.

Unlike the DOM scan, the source scanner always checks **all matching files in the project** regardless of how many pages were audited.

## Code Patterns

### Critical

| ID | Title | WCAG | Detects |
| :- | :---- | :--- | :------ |
| `placeholder-only-label` | Input uses placeholder as its only label | 1.3.1 / 4.1.2 A | `placeholder=` with no `aria-label`, `aria-labelledby`, `for`, `htmlFor`, or `<label` within 6 lines |

### Serious

| ID | Title | WCAG | Detects |
| :- | :---- | :--- | :------ |
| `mouseover-without-focus` | Hover handler has no keyboard focus equivalent | 2.1.1 A | `onMouseOver=` / `onMouseEnter=` with no `onFocus` within 10 lines |
| `new-window-no-warning` | Link opens in new tab without warning | 3.2.2 A | `target="_blank"` with no "new tab/window" text or `sr-only` within 5 lines |
| `spa-route-title` | SPA navigation does not update document.title | 2.4.2 A | `router.push(` / `router.replace(` / `navigate(` with no `document.title` within 20 lines |
| `focus-outline-suppressed` | Focus outline suppressed without replacement | 2.4.7 AA | `outline: none` / `outline: 0` / `focus:outline-none` with no `:focus-visible` within 5 lines |

### Moderate

| ID | Title | WCAG | Detects |
| :- | :---- | :--- | :------ |
| `orientation-lock` | Screen orientation locked programmatically | 1.3.4 AA | `screen.orientation.lock(` / `lockOrientation(` |
| `character-key-shortcut` | Single-character accesskey shortcut | 2.1.4 A | `accesskey=` attribute |

## Pattern Fields

Each pattern in `assets/remediation/code-patterns.json` has these fields:

| Field | Type | Description |
| :---- | :--- | :---------- |
| `id` | string | Unique pattern identifier |
| `title` | string | Human-readable name shown in reports |
| `severity` | `Critical` \| `Serious` \| `Moderate` \| `Minor` | Reported severity |
| `wcag` | string | WCAG criterion label (display only) |
| `wcag_criterion` | string | Criterion number for rule mapping (e.g. `"2.4.7"`) |
| `wcag_level` | `A` \| `AA` | Conformance level |
| `type` | `structural` \| `style` | Determines fix phase in Step 4 |
| `fix_description` | string | Markdown fix guidance shown in `remediation.md` |
| `requires_manual_verification` | boolean | If `true`, the finding is flagged for human review before fixing |
| `regex` | string | Pattern matched against source file content |
| `globs` | string[] | File glob patterns to search (e.g. `**/*.tsx`) |
| `context_reject_regex` | string \| null | If matched within `context_window` lines of a hit, the finding is marked **potential** instead of **confirmed** |
| `context_window` | number | Lines above and below the match to search for the reject pattern. `0` disables context checking |

## Adding a Pattern

1. Add a new entry to `assets/remediation/code-patterns.json` — no code changes required.
2. The source scanner reads the file at runtime.
3. Set `context_reject_regex` and `context_window` to reduce false positives. A reject pattern found near the match means a mitigation is likely already in place.
4. Set `requires_manual_verification: true` for any pattern where the regex cannot confirm intent (e.g. `placeholder=` — the presence of a label elsewhere in the file satisfies the rule but may not be caught by the reject pattern).
