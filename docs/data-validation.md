# Data Validation Guide

**Navigation**: [Home](../README.md) • [Architecture](architecture.md) • [CLI Handbook](cli-handbook.md) • [Intelligence](engine-intelligence.md) • [Scoring](scoring-system.md) • [Scripts](scripts-catalog.md) • [Testing](testing.md)

---

This document describes the process for validating and updating the intelligence data that powers the `a11y` skill. Follow this guide whenever rules are added, `axe-core` is upgraded, or WCAG specifications change.

## Validation Lifecycle

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '#3b5cd9', 'primaryTextColor': '#1e293b', 'primaryBorderColor': '#1e308a', 'lineColor': '#64748b', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#fff', 'mainBkg': '#fff', 'nodeBorder': '#e2e8f0', 'clusterBkg': '#f8fafc', 'clusterBorder': '#cbd5e1' } } }%%
flowchart TD
    Update["Axe-Core/WCAG Update"] --> Detect["Step 1: Detect Gaps<br/>(Automated Tests)"]
    Detect --> Research["Step 2: Source Research<br/>(MDN/WCAG Docs)"]
    Research --> Edit["Step 3: Asset Update<br/>(JSON Assets)"]
    Edit --> Verify["Step 4: Regression Test<br/>(pnpm test)"]
    Verify -->|Pass| Deploy["Ready for Audit"]
    Verify -->|Fail| Research

    classDef default font-family:Inter,sans-serif,font-size:12px;
    classDef core fill:#3b5cd9,color:#fff,stroke:#1e308a;
    classDef storage fill:#f1f5f9,stroke:#cbd5e1;

    class Detect,Verify core;
    class Edit storage;
```

---

## Official Sources (by reliability)

> [!NOTE]
> Always prioritize the WCAG specification as the "Ground Truth". Secondary sources like MDN are excellent for implementation details but may lag behind spec changes.

1.  **WCAG 2.2 Specification** — [w3.org/TR/WCAG22](https://www.w3.org/TR/WCAG22/)
2.  **WCAG Understanding Docs** — [w3.org/WAI/WCAG22/Understanding](https://www.w3.org/WAI/WCAG22/Understanding/)
3.  **axe-core Rule Metadata** — `node_modules/axe-core/axe.js` via `getRules()`
4.  **W3C ARIA APG** — [w3.org/WAI/ARIA/apg](https://www.w3.org/WAI/ARIA/apg/)
5.  **MDN Web Docs** — [developer.mozilla.org](https://developer.mozilla.org)

### Framework & CMS Sources

| Platform  | Official Source                                                                                                                         |
| :-------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| React     | [reactjs.org/docs/accessibility](https://reactjs.org/docs/accessibility.html)                                                           |
| Vue       | [vuejs.org/guide/best-practices/accessibility](https://vuejs.org/guide/best-practices/accessibility)                                    |
| Angular   | [angular.io/guide/accessibility](https://angular.io/guide/accessibility)                                                                |
| Svelte    | [svelte.dev/docs/accessibility-warnings](https://svelte.dev/docs/accessibility-warnings)                                                |
| Astro     | [docs.astro.build/en/guides/accessibility](https://docs.astro.build/en/guides/accessibility/)                                           |
| Shopify   | [shopify.dev/docs/storefronts/themes/accessibility](https://shopify.dev/docs/storefronts/themes/accessibility)                          |
| WordPress | [developer.wordpress.org/advanced-administration/accessibility](https://developer.wordpress.org/advanced-administration/accessibility/) |
| Drupal    | [drupal.org/docs/accessibility](https://www.drupal.org/docs/accessibility)                                                              |

## Files to Validate

| File                        | Technical Scope                                                              |
| :-------------------------- | :--------------------------------------------------------------------------- |
| `assets/rule-metadata.json` | `wcagCriterionMap`, URLs (`mdn`, `apgPatterns`), `impactedUsers`, `expected` |
| `assets/intelligence.json`  | `fix`, `framework_notes`, `cms_notes`, `false_positive_risk`                 |
| `assets/manual-checks.json` | `criterion` mapping, `steps`, `remediation`, `code_example`                  |

---

## Step 1: Detect Gaps (Automated)

The test suite automatically identifies inconsistencies between `axe-core` and our internal intelligence data.

```bash
pnpm test
```

> [!IMPORTANT]
> When `axe-core` is upgraded, look for:
>
> - **New Rules**: Rules added to the engine that lack intelligence mapping.
> - **Changed Mappings**: WCAG tags that have evolved (e.g., A -> AA).
> - **Stale Rules**: Rules deprecated by Axe that should be removed from our assets.

## Step 2: Validate Intelligence Content

Consult the **WCAG Understanding** page for each rule to verify:

1.  **`fix.description`**: Is it technically accurate per the spec?
2.  **`fix.code`**: Does it follow WCAG recommended techniques?
3.  **`framework_notes`**: Valid keys are `react`, `vue`, `angular`, `svelte`, `astro`, `generic`.
4.  **`cms_notes`**: Valid keys are `shopify`, `wordpress`, `drupal`. Must be separate from `framework_notes`.
5.  **`false_positive_risk`**: Does it reflect actual axe-core edge cases?

## Step 3: Regression Testing

After updates, ensure the entire pipeline remains healthy using the automated test suite. Vitest validates:

- **Schema Integrity**: Verifies required fields, data types, and allowed framework/CMS keys.
- **Reciprocity**: Ensures that if Rule A links to Rule B, Rule B links back to Rule A.
- **Criterion Mapping**: Confirms every intelligence entry has a valid WCAG criterion ID and accurate MDN links.
- **Zero Stale Rules**: Prevents unused or deprecated rules from cluttering the assets.
