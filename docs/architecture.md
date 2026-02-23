# Audit Engine Architecture

**Navigation**: [Home](../README.md) • [Architecture](architecture.md) • [CLI Handbook](cli-handbook.md) • [Intelligence](engine-intelligence.md) • [Scoring](scoring-system.md) • [Manifest](engine-manifest.md) • [Testing](testing.md)

---

## Table of Contents

- [High-Level Pipeline](#high-level-pipeline)
- [Internal Component Roles](#internal-component-roles)
- [Data Flow Diagram](#data-flow-diagram)

The a11y skill operates as a three-stage pipeline designed for **Autonomous Remediation**. It transforms a URL into a surgical roadmap of code fixes, prioritizing action over passive reporting.

## High-Level Pipeline

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '#3b5cd9', 'primaryTextColor': '#1e293b', 'primaryBorderColor': '#1e308a', 'lineColor': '#64748b', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#fff', 'mainBkg': '#fff', 'nodeBorder': '#e2e8f0', 'clusterBkg': '#f8fafc', 'clusterBorder': '#cbd5e1' } } }%%
flowchart TD
    subgraph P1 ["Phase 1: Scouting"]
        direction TB
        B["<b>1. Scanner</b><br/>(Playwright + Axe)"]
        B1["Route Discovery"]
        B2["WCAG 2.2 AA Scan"]
        B3["DOM Snapshot"]
        B --> B1 & B2 & B3
    end

    subgraph P2 ["Phase 2: Intelligence"]
        direction TB
        C["<b>2. Analyzer</b><br/>(Fix Intelligence)"]
        C1["Rule Mapping"]
        C2["Surgical Selector Extraction"]
        C3["Patch Generation"]
        C --> C1 & C2 & C3
    end

    subgraph P3 ["Phase 3: Delivery"]
        direction TB
        D["<b>3. Builder</b><br/>(Parallel Rendering)"]
        D1["AI Roadmap (MD)"]
        D2["Visual Evidence (HTML)"]
        D3["Executive Summary (PDF)"]
        D4["Internal Data (JSON)"]
        D --- D1 & D2 & D3 & D4
    end

    A(["Target URL / Project"]) --> P1
    P1 --> P2
    P2 --> P3

    linkStyle default stroke:#64748b,stroke-width:2px;
    classDef default font-family:Inter,sans-serif,font-size:12px;
    classDef phase font-weight:bold,fill:#f8fafc,stroke:#cbd5e1;
    classDef core fill:#3b5cd9,color:#fff,stroke:#1e308a,stroke-width:2px;
    classDef target fill:#1e293b,color:#fff,stroke:#0f172a;

    class P1,P2,P3 phase;
    class B,C,D core;
    class A target;
```

## Internal Component Roles

### 1. The Scanner (`run-scanner.mjs`)

- **Engine**: Uses Playwright to emulate a real user environment (Light/Dark mode, Viewport).
- **Compliance**: Injects `axe-core` to run 106 accessibility rules (100% of axe-core WCAG A/AA + best-practice coverage).
- **Discovery**: If the site has a `sitemap.xml`, all listed URLs are scanned. Otherwise, BFS multi-level crawl starting from `base-url`, configurable via `--crawl-depth` (1-3, default: 2), capped at `maxRoutes` (default: 10).
- **Parallel Scanning**: Routes are scanned across 3 concurrent browser tabs for ~2-3x faster throughput.
- **Smart Wait**: Uses `networkidle` signal instead of a fixed delay — proceeds as soon as the page is ready, with `waitMs` as the timeout ceiling.
- **Project Context Detection**: Auto-detects the project's framework (Next.js, Nuxt, React, Vue, Angular, Astro, Svelte, Shopify, WordPress) from DOM signals, and UI component libraries (Radix, Headless UI, Chakra, Mantine, Material UI) from `package.json`.
- **Output**: Generates a raw `a11y-scan-results.json` containing every violation found in the DOM plus the detected `projectContext`.

### 2. The Analyzer (`run-analyzer.mjs`)

- **Brain**: Consumes the raw scan results and enriches them using `assets/intelligence.json`.
- **Fix Logic**: Generates the `fixCode`, `fixDescription`, `wcag_criterion_id`, and `framework_notes` for each finding.
- **Precision**: Extracts the **Surgical Selector** (prioritizing ID > Short Path) and generates the "Search Hint" to help AI agents find the code in the source files.
- **Fix Acceleration**: Uses the detected `projectContext` to generate per-finding:
  - `file_search_pattern` — framework-specific glob patterns (e.g., `app/**/*.tsx` for Next.js) so agents search the right directories.
  - `managed_by_library` — warns when an ARIA rule violation may be on a component managed by a UI library (Radix, Headless UI, etc.).
  - `component_hint` — extracts the likely component name from the CSS selector (e.g., `.product-card__title` → `product-card`) for batch fixing.
  - `verification_command` — a targeted re-scan command (`--routes` + `--only-rule`) for quick post-fix verification.
- **Triage**: Maps axe-core impact levels to severity tiers (Critical / High / Medium / Low). Compliance score calculation happens downstream in `core-findings.mjs`.

### 3. The Builder (`run-audit.mjs` orchestrator)

- **Assembly**: Coordinates the execution of the Scanner and Analyzer.
- **Formatting**: Triggers the report builders (HTML dashboard, Markdown remediation guide, PDF summary).
- **Persistence**: Stores all pipeline artifacts in the skill's internal directory.

### 4. The Remediation Guide (internal `remediation.md`)

The Markdown report is the primary interface between the audit engine and the AI agent fixing issues. It includes:

- **Fixes by Component** table — groups findings by extracted component name so the agent can batch edits per file.
- **Search in** — framework-specific glob patterns per finding, derived from the detected project context.
- **Managed Component Warning** — alerts the agent when a finding's ARIA rule may be handled by a UI library.
- **Quick verify** — a targeted re-scan command per finding for post-fix verification in seconds instead of minutes.
- **Framework-aware guardrails** — uses the detected framework (not just URL heuristics) to generate project-specific instructions.

## Data Flow Diagram

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '#3b5cd9', 'primaryTextColor': '#1e293b', 'primaryBorderColor': '#1e308a', 'lineColor': '#64748b', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#fff', 'mainBkg': '#fff', 'nodeBorder': '#e2e8f0', 'clusterBkg': '#f8fafc', 'clusterBorder': '#cbd5e1' } } }%%
flowchart LR
    Start([CLI Trigger]) --> S[Scanner]
    S --> Raw[(Raw Scan<br/>JSON)]

    Raw --> A[Analyzer]
    A --> Logic{Enrichment<br/>Logic}
    Intel[(Intelligence<br/>Database)] --> Logic

    Logic --> Findings[(Final Findings<br/>JSON)]
    Findings --> B[Builder]

    B --> HTML([HTML Report])
    B --> MD([AI Roadmap])
    B --> PDF([PDF Summary])

    classDef default font-family:Inter,sans-serif,font-size:12px;
    classDef core fill:#3b5cd9,color:#fff,stroke:#1e308a,stroke-width:2px;
    classDef storage fill:#f1f5f9,stroke:#cbd5e1,stroke-dasharray: 5 5;
    classDef trigger fill:#1e293b,color:#fff,stroke:#0f172a;

    class S,A,B core;
    class Raw,Intel,Findings storage;
    class Start,HTML,MD,PDF trigger;
```
