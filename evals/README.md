# Skill Evaluations

Evaluation scenarios for testing the a11y skill across models and real usage patterns.

Each `.json` file is a self-contained test case. There is no built-in runner — use these manually by loading the skill and running the query against a fresh agent session.

## How to run

1. Start a new session with the a11y skill loaded.
2. Use the `query` as your prompt.
3. Compare agent behavior against `expected_behavior`.
4. Note any deviations in `model_notes`.

| Model / Agent       | Strengths               | Watch for                                                                                          |
| :------------------ | :---------------------- | :------------------------------------------------------------------------------------------------- |
| **Antigravity**     | High tool precision     | Verify it follows the Resource Map for progressive loading.                                        |
| **Windsurf**        | Fast execution          | Verify it follows the Resource Map for progressive loading.                                        |
| **Opus (Claude)**   | Deep reasoning          | May over-explain findings — verify it stays concise and outputs `[MESSAGE]` tags verbatim.         |
| **Sonnet (Claude)** | Best-in-class reasoning | Ensure it follows the full 4a-4c sub-phase cycle + Step 5 re-audit.                               |
| **Haiku (Claude)**  | Fast, economical        | May skip steps or merge questions — verify each `[QUESTION]` is sent separately and Step 5 runs.  |
| **Gemini CLI**      | Reliable automation     | Watch for `ReadFile` fallbacks in the skill directory.                                             |

## Scenarios

**Core workflow:**
1.  **[01-basic-audit.json](01-basic-audit.json)**: Core audit and presentation.
2.  **[02-fix-with-checkpoints.json](02-fix-with-checkpoints.json)**: Structured fix workflow.
3.  **[03-user-declines-fixes.json](03-user-declines-fixes.json)**: Graceful stop & education.
4.  **[06-style-fixes-separation.json](06-style-fixes-separation.json)**: Safe visual changes.
5.  **[09-checklist-export.json](09-checklist-export.json)**: Manual testing checklist export.
6.  **[10-gitignore-proactive.json](10-gitignore-proactive.json)**: Procedural hygiene.

**Edge cases & recovery:**
7.  **[04-auth-blocked-routes.json](04-auth-blocked-routes.json)**: Security & auth boundaries.
8.  **[05-script-failure.json](05-script-failure.json)**: Error recovery.

**Framework & platform coverage:**
9.  **[07-framework-detection.json](07-framework-detection.json)**: Platform-aware file search (Shopify).
10. **[08-managed-components.json](08-managed-components.json)**: UI library protection (Radix UI).
11. **[11-spa-dynamic-routes.json](11-spa-dynamic-routes.json)**: SPA with client-side routing (Next.js).
12. **[12-i18n-multilingual.json](12-i18n-multilingual.json)**: Multilingual site with locale-prefixed routes.
13. **[13-static-site.json](13-static-site.json)**: Plain HTML site — no framework, no JS.
