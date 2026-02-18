---
description: "Run the full Wondersauce Accessibility Audit pipeline automatically."
---

// turbo-all

1. Verify the toolchain and local dependencies.

```bash
node wondersauce-accessibility-audit/scripts/check-toolchain.mjs
```

2. Generate accessibility route checks (discovery and scanning).

```bash
node wondersauce-accessibility-audit/scripts/generate-route-checks.mjs --base-url {{base_url}} --max-routes {{max_routes}}
```

3. Process raw violations into deterministic findings.

```bash
node wondersauce-accessibility-audit/scripts/deterministic-findings.mjs
```

4. Validate the findings against the PDF Coverage Matrix.

```bash
node wondersauce-accessibility-audit/scripts/pdf-coverage-validate.mjs --coverage {{coverage_path}}
```

5. Build the final high-fidelity HTML report.

```bash
node wondersauce-accessibility-audit/scripts/build-audit-html.mjs --title "{{report_title}}"
```
