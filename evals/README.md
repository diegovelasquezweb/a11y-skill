# Skill Evaluations

Evaluation scenarios for testing the a11y skill across models and real usage patterns.

Each `.json` file is a self-contained test case. There is no built-in runner — use these manually by loading the skill and running the query against a fresh agent session.

## How to run

1. Start a new session with the a11y skill loaded.
2. Use the `query` as your prompt.
3. Compare agent behavior against `expected_behavior`.
4. Note any deviations in `model_notes`.

| Model / Agent       | Strengths               | Watch for                                              |
| :------------------ | :---------------------- | :----------------------------------------------------- |
| **Antigravity**     | High tool precision     | Verify it uses `.agent/workflows/` properly.           |
| **Windsurf**        | Fast execution          | Check if it respects `.windsurf/workflows/`.           |
| **Sonnet (Claude)** | Best-in-class reasoning | Ensure it follows the full 3a-3d sub-phase cycle.      |
| **Gemini CLI**      | Reliable automation     | Watch for `ReadFile` fallbacks in the skill directory. |

## Scenarios

1.  **[01-basic-audit.json](01-basic-audit.json)**: Core audit and presentation.
2.  **[02-fix-with-checkpoints.json](02-fix-with-checkpoints.json)**: Structured fix workflow.
3.  **[03-user-declines-fixes.json](03-user-declines-fixes.json)**: Graceful stop & education.
4.  **[04-auth-blocked-routes.json](04-auth-blocked-routes.json)**: Security & auth boundaries.
5.  **[05-script-failure.json](05-script-failure.json)**: Error recovery.
6.  **[06-style-fixes-separation.json](06-style-fixes-separation.json)**: Safe visual changes.
7.  **[07-framework-detection.json](07-framework-detection.json)**: Platform-aware file search.
8.  **[08-managed-components.json](08-managed-components.json)**: UI library protection.
9.  **[10-gitignore-proactive.json](10-gitignore-proactive.json)**: Procedural hygiene.
