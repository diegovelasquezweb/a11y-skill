# Engine Intelligence

The "Intelligence" of the a11y skill revolves around **Autonomous Remediation**. It transforms a diagnostic finding into an actionable code patch.

## The Intelligence Database (`assets/intelligence.json`)

The skill ships with a curated knowledge base that map common accessibility violations to specific remediation patterns for modern frameworks (**Shopify**, **React**, **Next.js**, **Vue**, **Angular**).

### Core Intelligence Fields

For every rule (e.g., `image-alt`), the engine provides:

- **`fix.description`**: A human-friendly explanation of _what_ to do.
- **`fix.code`**: A "surgical" code snippet (HTML/JSX/Liquid) that demonstrates the fix.
- **`framework_notes`**: Platform-specific advice (e.g., where to place a `<main>` tag in Next.js).
- **`effort`**: Estimated time to resolve (Low/Medium/High).
- **`impacted_users`**: Who benefits from this specific fix.

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

- **WAI-ARIA Patterns (APG)**: Best practices for widget behavior.
- **MDN Web Docs**: Technical documentation for HTML elements.
- **Inclusive Components**: Design patterns for accessible UI.
