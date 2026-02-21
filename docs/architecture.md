# Audit Engine Architecture

The a11y skill operates as a three-stage pipeline designed for **Autonomous Remediation**. It transforms a URL into a surgical roadmap of code fixes.

## High-Level Pipeline

```mermaid
graph TD
    A["Target URL / Project"] --> B["1. Scanner (Playwright + Axe)"]
    B --> C["2. Analyzer (Fix Intelligence)"]
    C --> D["3. Builder (Multi-format Reports)"]

    subgraph "Phase 1: Scouting"
        B1["Route Discovery"]
        B2["WCAG 2.2 AA Scan"]
        B3["DOM Snapshot"]
    end

    subgraph "Phase 2: Intelligence"
        C1["Rule Mapping"]
        C2["Surgical Selector Extraction"]
        C3["Patch Generation (Liquid/JSX/HTML)"]
    end

    subgraph "Phase 3: Delivery"
        D1["AI Roadmap (Markdown)"]
        D2["Client Report (HTML)"]
        D3["System Data (JSON)"]
    end
```

## Internal Component Roles

### 1. The Scanner (`run-scanner.mjs`)

- **Engine**: Uses Playwright to emulate a real user environment (Light/Dark mode, Viewport).
- **Compliance**: Injects `axe-core` to run 90+ accessibility rules.
- **Discovery**: Crawls the site starting from the `base-url` up to `max-routes`.
- **Output**: Generates a raw `a11y-scan-results.json` containing every violation found in the DOM.

### 2. The Analyzer (`run-analyzer.mjs`)

- **Brain**: Consumes the raw scan results and enriches them using `assets/intelligence.json`.
- **Fix Logic**: Generates the `fixCode` and `fixDescription` for each finding.
- **Precision**: Extracts the "Search Hint" (ID, Class, or Tag) to help AI agents find the code in the source files.
- **Triage**: Calculates weighted scores and severity levels.

### 3. The Builder (`run-audit.mjs` orchestrator)

- **Assembly**: Coordinates the execution of the Scanner and Analyzer.
- **Formatting**: Triggers the report builders (`build-report-html.mjs` and `build-report-md.mjs`).
- **Persistence**: Ensures the `audit/` folder is updated with the latest findings.

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant CLI as pnpm audit
    participant S as Scanner
    participant A as Analyzer
    participant B as Builder
    participant FS as Local Filesystem

    CLI->>S: base-url + options
    S->>FS: Save Raw Scan (JSON)
    S-->>A: Trigger Analysis
    A->>FS: Load intelligence.json
    A->>A: Generate Patch Logic
    A->>FS: Save Findings (JSON)
    A-->>B: Trigger Formatting
    B->>FS: Generate HTML & MD Reports
    B-->>CLI: Final Success Output
```
