# Engine Manifest

**Navigation**: [Home](../README.md) • [Architecture](architecture.md) • [CLI Handbook](cli-handbook.md) • [Intelligence](engine-intelligence.md) • [Scoring](scoring-system.md) • [Manifest](engine-manifest.md) • [Testing](testing.md)

---

This manifest serves as the **Single Source of Truth** for the a11y skill's technical composition. It unifies logic (scripts), intelligence (assets), and execution standards (references) into a single technical inventory.

## 1. Logic Inventory (Scripts)

The core engine is a three-stage pipeline designed for **Autonomous Remediation**. For deep-dives into execution flow, see [Architecture](architecture.md).

### The Orchestrator

- **`scripts/audit.mjs`**: The master controller. Manages CLI arguments, dependency health, and coordinates the scanner → analyzer → builder flow.

### Core Engine

- **`scripts/scanner.mjs`**: The "Eyes". Powered by Playwright and Axe-core. Handles browser emulation, route discovery (Crawling/Sitemap), and parallel DOM analysis.
- **`scripts/analyzer.mjs`**: The "Brain". Consumes raw results and enriches them with intelligence data to generate surgical fix roadmaps.

### Rendering Engine

- **`scripts/report-html.mjs`**: Generates the interactive audit dashboard.
- **`scripts/report-checklist.mjs`**: Generates the standalone manual testing checklist (`checklist.html`). Reads `assets/reporting/manual-checks.json` directly — no scan input required.
- **`scripts/report-md.mjs`**: Creates the `remediation.md` guide used by AI agents.
- **`scripts/report-pdf.mjs`**: Produces formal executive summaries.
- **`scripts/renderers/`**: Modular rendering logic (`html.mjs`, `md.mjs`, `pdf.mjs`), core data normalization (`findings.mjs`), and shared rendering utilities (`utils.mjs`).

### Infrastructure

- **`scripts/utils.mjs`**: Shared utilities for path resolution, logging, and JSON I/O.
- **`scripts/toolchain.mjs`**: Environment diagnostic utility.

---

## 2. Intelligence Inventory (Assets)

These JSON assets define the "IQ" of the skill. They are read by the **Analyzer** and **Builders** to provide accurate remediation advice.

| Asset                       | Role          | Key Data                                                                             |
| :-------------------------- | :------------ | :----------------------------------------------------------------------------------- |
| **`assets/discovery/stack-detection.json`** | Detection | Framework package detectors, platform structure detectors, and UI library package detectors. |
| **`assets/discovery/source-boundaries.json`** | Source Discovery | Stack-specific editable source boundaries used to suggest safe search locations. |
| **`assets/discovery/crawler-config.json`** | Crawl Rules | Blocked file extensions and pagination query hints used during route discovery. |
| **`assets/remediation/intelligence.json`** | Fix Database | Category, resolution code, framework/CMS notes, guardrails, managed-library flags, and related rules for all 101 axe-core rules. |
| **`assets/remediation/global-remediation-intelligence.json`** | Operating Rules | Shared and platform-specific global instructions injected into the remediation guide. |
| **`assets/scoring/wcag-reference.json`** | Rule Mapping | WCAG criterion links, APG pattern IDs, MDN references, and persona impact tags. |
| **`assets/scoring/compliance-config.json`** | Risk Engine | Severity scoring, grade thresholds, effort multipliers, and jurisdictional data. |
| **`assets/reporting/manual-checks.json`** | Verification | 41 manual audit criteria for WCAG 2.2 areas that automation cannot detect. |

---

## 3. Knowledge Inventory (References)

These Markdown guides define the **Operational Standards** that the AI Agent follows during a live audit.

| Reference                 | Purpose                                                                          |
| :------------------------ | :------------------------------------------------------------------------------- |
| **`cli-reference.md`**    | Targeted Audit command guide (flags, viewports, theme emulation).                |
| **`report-standards.md`** | Internal standards for finding fields, deliverable order, and file storage.      |
| **`source-patterns.md`**  | Framework-specific source file patterns (Next.js, Shopify Liquid, Drupal, etc.) used to locate files during fixing. |
| **`code-patterns.md`**    | Four regex patterns for source-only issues axe-core cannot detect at runtime (focus suppression, autoplay, orientation lock, accesskey). |
| **`quality-gates.md`**    | Pass/fail criteria for each pipeline phase — used to verify gate transitions.    |
| **`out-of-scope.md`**     | WCAG 2.2 AA criteria that require human testing; drives the manual checklist export. |
| **`troubleshooting.md`**  | Self-correction guide for network timeouts, auth errors, and toolchain failures. |

---

## 4. Skill Orchestration (The Playbook)

| File           | Role                                                                                                                                                            |
| :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`SKILL.md`** | The **Agent Playbook**. It contains the 6-step workflow, communication rules, and "Verbatim" messages that orchestrate the entire engine during a conversation. |

---

## 5. Step-by-Step Conversation Flow (with files)

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '#3b5cd9', 'primaryTextColor': '#1e293b', 'primaryBorderColor': '#1e308a', 'lineColor': '#64748b', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#fff', 'mainBkg': '#fff', 'nodeBorder': '#e2e8f0' } } }%%
flowchart TD
    S1["Step 1<br/>Page Discovery"] --> S2["Step 2<br/>Run Audit"]
    S2 --> S3["Step 3<br/>Present Findings + Ask Permission"]
    S3 --> S4["Step 4<br/>Fix (4a Structural -> 4b Style -> 4c Source Patterns)"]
    S4 --> S5["Step 5<br/>Verification Re-audit"]
    S5 --> S6["Step 6<br/>Deliver Results"]

    F1["SKILL.md<br/>Workflow + question/message contracts"] -.used in.-> S1
    F2["references/quality-gates.md<br/>Gate 1 (pre-audit)"] -.used in.-> S1
    F3["scripts/audit.mjs"] -.executes.-> S2
    F4[".audit/remediation.md<br/>(or REMEDIATION_PATH)"] -.read after S2.-> S2
    F5["references/troubleshooting.md"] -.fallback on failures.-> S2
    F6["references/report-standards.md"] -.used in.-> S3
    F7["references/source-patterns.md"] -.used in 4a.-> S4
    F8["references/code-patterns.md"] -.used in 4c.-> S4
    F9["references/quality-gates.md<br/>Gate 4 (fix integrity)"] -.used in.-> S4
    F10["scripts/audit.mjs<br/>(same flags as Step 2)"] -.executes.-> S5
    F11["references/quality-gates.md<br/>Gate 5 (delta: resolved/remaining/new)"] -.used in.-> S5
    F12[".audit/a11y-findings.json<br/>passedCriteria"] -.read in.-> S6
    F13["scripts/report-html.mjs / scripts/report-pdf.mjs<br/>(optional, user requested)"] -.optional outputs.-> S6
    F14["scripts/report-checklist.mjs + references/out-of-scope.md<br/>(optional manual checklist)"] -.optional outputs.-> S6

    classDef step fill:#3b5cd9,color:#fff,stroke:#1e308a;
    classDef file fill:#f1f5f9,color:#0f172a,stroke:#cbd5e1,stroke-dasharray: 5 5;

    class S1,S2,S3,S4,S5,S6 step;
    class F1,F2,F3,F4,F5,F6,F7,F8,F9,F10,F11,F12,F13,F14 file;
```

---

## Technical Linkage Map

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '#3b5cd9', 'primaryTextColor': '#1e293b', 'primaryBorderColor': '#1e308a', 'lineColor': '#64748b', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#fff', 'mainBkg': '#fff', 'nodeBorder': '#e2e8f0' } } }%%
flowchart LR
    A[SKILL.md] -- "1. Orchestrates" --> B[audit.mjs]

    subgraph Engine ["Logic Core"]
        B --> C[scanner.mjs]
        C --> D[analyzer.mjs]
        D --> E[Builders]
    end

    subgraph Data ["Intelligence Assets"]
        AS1[discovery/crawler-config.json] -.-> C
        AS2[discovery/stack-detection.json] -.-> C
        AS3[remediation/intelligence.json] -.-> D
        AS4[discovery/source-boundaries.json] -.-> D
        AS5[remediation/global-remediation-intelligence.json] -.-> E
        AS6[scoring/compliance-config.json] -.-> E
    end

    subgraph Knowledge ["Operational References"]
        R1[troubleshooting.md] -.-> A
        R2[source-patterns.md] -.-> A
        R3[cli-reference.md] -.-> A
        R4[report-standards.md] -.-> A
    end

    classDef default font-family:Inter,sans-serif,font-size:12px;
    classDef playbook fill:#1e293b,color:#fff,stroke:#0f172a;
    classDef core fill:#3b5cd9,color:#fff,stroke:#1e308a;
    classDef storage fill:#f1f5f9,stroke:#cbd5e1,stroke-dasharray: 5 5;

    class A playbook;
    class B,C,D,E core;
    class AS1,AS2,AS3,AS4,AS5,AS6,AS7 storage;
```
