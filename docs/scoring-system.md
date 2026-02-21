# Scoring System

The a11y skill uses a **Weighted Debt Model** to calculate the Compliance Score. Instead of a simple percentage of passed rules, it penalizes the score based on the severity and frequency of issues.

## Penalty Weights

Each accessibility finding subtracts points from a perfect starting score of **100**.

| Severity     | Penalty    | Description                                         |
| :----------- | :--------- | :-------------------------------------------------- |
| **Critical** | `-15 pts`  | Blockers that prevent users from completing a task. |
| **High**     | `-5 pts`   | Significant barriers that impair the experience.    |
| **Medium**   | `-2 pts`   | Noticeable barriers with available workarounds.     |
| **Low**      | `-0.5 pts` | Best practices or minor inconsistencies.            |

## The Formula

The engine calculates the total penalty across all unique findings and clamps the final score between **0** and **100**.

```text
Final Score = Max(0, 100 - Total_Penalties)
```

> [!NOTE]
> Even if a page has multiple "Low" severity findings, the score will not drop unless higher-severity issues are introduced.

## Grade Thresholds

The score is mapped to a letter grade for quick stakeholder communication:

| Score        | Grade                 | Technical Health               |
| :----------- | :-------------------- | :----------------------------- |
| **95 - 100** | **Excellent**         | Compliance Target Met          |
| **85 - 94**  | **Good**              | Minor remediation needed       |
| **70 - 84**  | **Fair**              | Noticeable barriers present    |
| **50 - 69**  | **Needs Improvement** | Significant accessibility debt |
| **0 - 49**   | **Poor**              | Critical blockers detected     |

## Calculation Logic (`scripts/report/core-findings.mjs`)

1. **Deduplication**: Multiple instances of the same rule violation on the same element are treated as a single finding.
2. **Weighting**: Each unique finding's severity is matched against the penalty table.
3. **Subtraction**: The cumulative penalty is subtracted from 100.
4. **Clamping**: Total penalties are subtracted and the result is clamped between 0 and 100.
