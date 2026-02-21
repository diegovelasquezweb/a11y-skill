import { describe, it, expect } from "vitest";
import {
  computeComplianceScore,
  scoreLabel,
  normalizeFindings,
  buildSummary,
} from "../scripts/report/core-findings.mjs";

describe("core-findings logic", () => {
  describe("computeComplianceScore", () => {
    it("returns 100 when there are no findings", () => {
      const totals = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      expect(computeComplianceScore(totals)).toBe(100);
    });

    it("penalizes heavily for Critical issues", () => {
      const totals = { Critical: 1, High: 0, Medium: 0, Low: 0 };
      const score = computeComplianceScore(totals);
      expect(score).toBe(85); // 100 - (1 * 15)
    });

    it("calculates complex weighted scores correctly", () => {
      const totals = { Critical: 2, High: 3, Medium: 10, Low: 0 };
      // (2*15) + (3*5) + (10*2) = 30 + 15 + 20 = 65 penalty
      expect(computeComplianceScore(totals)).toBe(35);
    });

    it("does not return negative scores", () => {
      const totals = { Critical: 50, High: 0, Medium: 0, Low: 0 };
      expect(computeComplianceScore(totals)).toBe(0);
    });
  });

  describe("scoreLabel", () => {
    it("returns Excellent for scores >= 90", () => {
      expect(scoreLabel(90)).toBe("Excellent");
      expect(scoreLabel(100)).toBe("Excellent");
    });
    it("returns Good for scores 75–89", () => {
      expect(scoreLabel(75)).toBe("Good");
      expect(scoreLabel(89)).toBe("Good");
    });
    it("returns Fair for scores 55–74", () => {
      expect(scoreLabel(55)).toBe("Fair");
      expect(scoreLabel(74)).toBe("Fair");
    });
    it("returns Poor for scores 35–54", () => {
      expect(scoreLabel(35)).toBe("Poor");
      expect(scoreLabel(54)).toBe("Poor");
    });
    it("returns Critical for scores < 35", () => {
      expect(scoreLabel(34)).toBe("Critical");
      expect(scoreLabel(0)).toBe("Critical");
    });
  });

  describe("normalizeFindings", () => {
    it("sorts findings by severity (Critical first)", () => {
      const raw = {
        findings: [
          { id: "1", severity: "Low", title: "A" },
          { id: "2", severity: "Critical", title: "B" },
          { id: "3", severity: "High", title: "C" },
        ],
      };
      const normalized = normalizeFindings(raw);
      expect(normalized[0].severity).toBe("Critical");
      expect(normalized[1].severity).toBe("High");
      expect(normalized[2].severity).toBe("Low");
    });

    it("passes through wcagCriterionId, falsePositiveRisk, fixDifficultyNotes, frameworkNotes", () => {
      const raw = {
        findings: [
          {
            id: "A11Y-abc123",
            severity: "High",
            title: "Test",
            wcag_criterion_id: "4.1.2",
            false_positive_risk: "medium",
            fix_difficulty_notes: "Check context before fixing.",
            framework_notes: { react: "Use aria-label prop." },
          },
        ],
      };
      const [f] = normalizeFindings(raw);
      expect(f.wcagCriterionId).toBe("4.1.2");
      expect(f.falsePositiveRisk).toBe("medium");
      expect(f.fixDifficultyNotes).toBe("Check context before fixing.");
      expect(f.frameworkNotes).toEqual({ react: "Use aria-label prop." });
    });

    it("defaults new fields to null when absent", () => {
      const raw = {
        findings: [{ id: "A11Y-xyz", severity: "Low", title: "Test" }],
      };
      const [f] = normalizeFindings(raw);
      expect(f.wcagCriterionId).toBeNull();
      expect(f.falsePositiveRisk).toBeNull();
      expect(f.fixDifficultyNotes).toBeNull();
      expect(f.frameworkNotes).toBeNull();
    });

    it("defaults relatedRules to [] when absent", () => {
      const raw = {
        findings: [{ id: "A11Y-xyz", severity: "Low", title: "Test" }],
      };
      const [f] = normalizeFindings(raw);
      expect(f.relatedRules).toEqual([]);
    });

    it("throws on invalid payload (null, missing findings array)", () => {
      expect(() => normalizeFindings(null)).toThrow();
      expect(() => normalizeFindings({})).toThrow();
    });

    it("returns empty array for empty findings list", () => {
      expect(normalizeFindings({ findings: [] })).toEqual([]);
    });
  });
});
