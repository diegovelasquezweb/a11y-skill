# Engine Intelligence

**Navigation**: [Architecture](architecture.md) • [CLI Handbook](cli-handbook.md) • [Configuration](configuration.md) • [Intelligence](engine-intelligence.md) • [Scoring](scoring-system.md) • [Testing](testing.md)

---

## Table of Contents

- [The Intelligence Database](#the-intelligence-database-assetsintelligencejson)
- [Surgical Patch Generation](#surgical-patch-generation)
- [Manual Checks](#manual-checks-assetsmanual-checksjson)

The "Intelligence" of the a11y skill revolves around **Autonomous Remediation**. It transforms a diagnostic finding into an actionable code patch.

## The Intelligence Database (`assets/intelligence.json`)

The skill ships with a curated knowledge base that map common accessibility violations to specific remediation patterns for modern frameworks (**Shopify**, **React**, **Next.js**, **Vue**, **Angular**).

### Core Intelligence Fields

For every rule (e.g., `image-alt`), the engine provides:

- **`fix.description`**: A human-friendly explanation of _what_ to do.
- **`fix.code`**: A "surgical" code snippet (HTML/JSX/Liquid) that demonstrates the fix.
- **`framework_notes`**: Platform-specific advice for React, Vue, and Angular.
- **`effort`**: Estimated implementation effort (`low` / `medium` / `high`).
- **`impacted_users`**: Who benefits from this specific fix.
- **`false_positive_risk`**: Calibrated confidence level (`low` / `medium` / `high`). Medium/high triggers a warning badge in the report so agents verify before applying a fix.
- **`fix_difficulty_notes`**: Edge cases and caveats beyond the obvious fix (e.g., label-vs-placeholder tradeoffs, voice control conflicts).
- **`related_rules`**: Linked rule IDs commonly resolved together, with the reason why (e.g., `label` → `autocomplete-valid`).
- **`wcag_techniques`**: Official W3C technique IDs (e.g., `H37`, `ARIA14`) referenced per rule.
- **`affected_at`**: Assistive technologies impacted (JAWS, NVDA, VoiceOver, TalkBack, Voice Control, etc.).
- **`manual_test`**: Steps for verifying findings that axe-core cannot fully automate.
- **`mdn`**: Direct MDN Web Docs link for the relevant HTML element or ARIA attribute.

### WCAG Criterion Map (`wcagCriterionMap`)

A top-level lookup in `intelligence.json` that maps every rule ID to its WCAG criterion number (e.g., `"image-alt" → "1.1.1"`). The analyzer injects `wcag_criterion_id` into every finding using this map — no per-rule duplication required.

## Surgical Patch Generation

When a violation is found, the Analyzer does more than just report it:

1. **Context Analysis**: It looks at the tag name and attributes of the failing element.
2. **Selector Extraction**: It simplifies the complex CSS selector into a **Search Hint** (e.g., `id="submit-btn"` or `.nav-link`).
3. **Intelligence Mapping**: It matches the `axe-rule-id` with the corresponding entry in `intelligence.json`.
4. **Output Generation**: It combines these into the **AI Remediation Roadmap**, allowing an AI agent to find and fix the file in seconds.

## Example: The "Fix-First" Flow

If an image is missing alt text:

- **Scanner**: Detects `img` missing `alt`.
- **Analyzer**:
  - Identifies `ruleId: image-alt`.
  - Extracts selector: `div.hero > img`.
  - Generates search hint: `<img`.
  - Fetches patch from Intelligence: `<img src="..." alt="Description">`.
- **Roadmap**: Tells the AI: _"Search for `<img` inside the Hero component and add an `alt` attribute."_

## Manual Checks (`assets/manual-checks.json`)

axe-core is an automated tool — it cannot verify criteria that require human judgment or live assistive technology interaction. The skill ships a second knowledge base, `assets/manual-checks.json`, with **24 checks** covering WCAG 2.2 AA criteria and screen reader behavior that automation cannot assess.

These checks are appended as a dedicated section — **"WCAG 2.2 Static Code Checks"** — at the end of every `remediation.md` report.

### What each check contains

| Field          | Description                                                                            |
| :------------- | :------------------------------------------------------------------------------------- |
| `criterion`    | WCAG 2.2 criterion number (e.g., `"2.4.11"`) or screen reader test ID (e.g., `"AT-1"`) |
| `title`        | Human-readable criterion name                                                          |
| `level`        | WCAG conformance level (`A` or `AA`)                                                   |
| `description`  | What the criterion requires and why it matters                                         |
| `steps`        | Step-by-step verification instructions for a human or agent                            |
| `remediation`  | Recommended fix patterns if a violation is found                                       |
| `code_example` | Optional before/after code snippet (`lang`, `before`, `after`)                         |
| `ref`          | Canonical W3C understanding document URL                                               |

### Coverage breakdown

**WCAG 2.2 New Criteria (AA):** Focus Appearance (2.4.11), Dragging Movements (2.5.7), Target Size Minimum (2.5.8), Consistent Help (3.2.6), Redundant Entry (3.3.7), Accessible Authentication (3.3.8)

**Interactive Behavior (axe blind spots):** Keyboard Access (2.1.1), No Keyboard Trap (2.1.2), Focus Order (2.4.3), Content on Hover or Focus (1.4.13), Animation from Interactions (2.3.3)

**Perception:** Use of Color (1.4.1), Reflow (1.4.10), Non-text Contrast (1.4.11), Text Spacing (1.4.12), Error Identification (3.3.1)

**Screen Reader (AT-1 → AT-8):** Heading navigation, landmark navigation, form labels, interactive element activation, live region announcements, modal dialog behavior, table reading, form error announcement

### How to add a new manual check

Add an entry to `assets/manual-checks.json`. No code changes required — `build-report-md.mjs` reads the file at build time and injects all checks automatically.

## Reference Links

The engine provides deep-links to industry standards for every finding:

- **WAI-ARIA Patterns (APG)**: Best practices for widget behavior, injected by ARIA role detected in the DOM.
- **MDN Web Docs**: Technical documentation for HTML elements and ARIA attributes.
- **Inclusive Components**: Accessible UI design patterns by Heydon Pickering.
- **a11ySupport**: Browser and assistive technology support data per ARIA role.
