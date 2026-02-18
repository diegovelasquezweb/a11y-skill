---
description: Run a full WCAG 2.1 AA accessibility audit
---

// turbo-all

1. Ask the user for the target URL if not already provided.

// turbo 2. Run the audit pipeline:

```bash
node scripts/run-audit.mjs --base-url <URL>
```

3. After completion, summarize the findings and mention the generated HTML report location.
