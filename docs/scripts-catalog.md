# Scripts Catalog & Workflow

**Navigation**: [Home](../README.md) • [Architecture](architecture.md) • [CLI Handbook](cli-handbook.md) • [Intelligence](engine-intelligence.md) • [Scoring](scoring-system.md) • [Scripts](scripts-catalog.md) • [Testing](testing.md)

---

This document provides a technical overview of all scripts in the `scripts/` directory, organized by their role and execution sequence.

## Execution Workflow

When you trigger an audit (e.g., `pnpm a11y`), the engine follows a three-stage linear pipeline with a parallel reporting finale:

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '#3b5cd9', 'primaryTextColor': '#1e293b', 'primaryBorderColor': '#1e308a', 'lineColor': '#64748b', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#fff', 'mainBkg': '#fff', 'nodeBorder': '#e2e8f0' } } }%%
flowchart TD
    A[run-audit.mjs] -- 1. Setup & Discovery --> C[run-scanner.mjs]
    C -- Raw JSON --> D[run-analyzer.mjs]

    subgraph P ["Parallel Rendering"]
    E[build-report-html.mjs]
    G[build-report-pdf.mjs]
    F[build-report-md.mjs]
    end

    D -- Analyzed JSON --> P

    classDef default font-family:Inter,sans-serif,font-size:12px;
    classDef core fill:#3b5cd9,color:#fff,stroke:#1e308a;
    classDef orchestrator fill:#1e293b,color:#fff,stroke:#0f172a;

    class A orchestrator;
    class C,D,E,F,G core;
```

---

## Script Details

### 1. The Orchestrator

- **`run-audit.mjs`**: The main entry point. Coordinates the lifecycle: dependency installation, toolchain verification, scanner execution, and parallel report building.

### 2. Core Scanners

- **`run-scanner.mjs`**: The "Eyes". Powered by Playwright and Axe-core. Performs browser emulation (Viewport, Dark Mode), BFS crawling (or Sitemap discovery), and parallel route scanning.
- **`run-analyzer.mjs`**: The "Intelligence". Enriches raw results with `assets/intelligence.json`. It calculates severity tiers, generates "Surgical Selectors", and provides framework-aware fix hints.

### 3. Builders & Rendering Engine

These scripts transform analyzed findings into user-facing formats. They rely on the modular logic in `scripts/report/`.

- **`build-report-html.mjs`**: Generates the interactive dashboard using `format-html.mjs`.
- **`build-report-md.mjs`**: Creates the `remediation.md` guide for AI agents using `format-md.mjs`.
- **`build-report-pdf.mjs`**: Produces high-fidelity summaries using Puppeteer-based rendering and `format-pdf.mjs`.

### 4. Infrastructure & Utilities

- **`a11y-utils.mjs`**: Shared logic for logging, path resolution (`getInternalPath`), JSON I/O, and global configuration defaults.
- **`check-toolchain.mjs`**: Diagnostic script that verifies Node.js versions, Playwright availability, and project-level dependencies.
- **`scripts/report/`**: Contains core normalization logic (`core-findings.mjs`) and shared formatting utilities (`core-utils.mjs`) used across all report formats.
