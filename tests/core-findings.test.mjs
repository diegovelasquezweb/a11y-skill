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
      expect(score).toBe(90); // 100 - (1 * 10)
    });

    it("calculates complex weighted scores correctly", () => {
      const totals = { Critical: 2, High: 3, Medium: 10, Low: 0 };
      // (2*10) + (3*5) + (10*2) = 20 + 15 + 20 = 55 penalty
      expect(computeComplianceScore(totals)).toBe(45);
    });

    it("does not return negative scores", () => {
      const totals = { Critical: 50, High: 0, Medium: 0, Low: 0 };
      expect(computeComplianceScore(totals)).toBe(0);
    });
  });

  describe("scoreLabel", () => {
    it("returns Excellent for scores >= 95", () => {
      expect(scoreLabel(95)).toBe("Excellent");
    });
    it("returns Poor for scores < 50", () => {
      expect(scoreLabel(49)).toBe("Poor");
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
  });
});
