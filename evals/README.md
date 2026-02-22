# Skill Evaluations

Evaluation scenarios for testing the a11y skill across models and real usage patterns.

Each `.json` file is a self-contained test case. There is no built-in runner — use these manually by loading the skill and running the query against a fresh agent session.

## How to run

1. Start a new session with the a11y skill loaded.
2. Use the `query` as your prompt.
3. Compare agent behavior against `expected_behavior`.
4. Note any deviations in `model_notes`.

## Model testing matrix

Test each scenario with all models you plan to support:

| Model | Strengths | Watch for |
|-------|-----------|-----------|
| **Haiku** | Fast, economical | May skip checkpoints or batch all fixes at once. Needs enough guidance. |
| **Sonnet** | Balanced | Should follow the workflow correctly. Check sub-phase ordering (3a → 3b → 3c → 3d). |
| **Opus** | Strong reasoning | May over-explain. Verify it doesn't add unsolicited improvements beyond the fixes. |
