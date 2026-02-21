# Engine Intelligence

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

## Reference Links

The engine provides deep-links to industry standards for every finding:

- **WAI-ARIA Patterns (APG)**: Best practices for widget behavior, injected by ARIA role detected in the DOM.
- **MDN Web Docs**: Technical documentation for HTML elements and ARIA attributes.
- **Inclusive Components**: Accessible UI design patterns by Heydon Pickering.
- **a11ySupport**: Browser and assistive technology support data per ARIA role.
