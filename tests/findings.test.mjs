import { describe, it, expect } from "vitest";
import {
  computeComplianceScore,
  scoreLabel,
  normalizeFindings,
  buildSummary,
  buildPersonaSummary,
} from "../scripts/renderers/findings.mjs";

describe("findings logic", () => {
  describe("computeComplianceScore", () => {
    it("returns 100 when there are no findings", () => {
      const totals = { Critical: 0, Serious: 0, Moderate: 0, Minor: 0 };
      expect(computeComplianceScore(totals)).toBe(100);
    });

    it("penalizes heavily for Critical issues", () => {
      const totals = { Critical: 1, Serious: 0, Moderate: 0, Minor: 0 };
      const score = computeComplianceScore(totals);
      expect(score).toBe(85); // 100 - (1 * 15)
    });

    it("calculates complex weighted scores correctly", () => {
      const totals = { Critical: 2, Serious: 3, Moderate: 10, Minor: 0 };
      // (2*15) + (3*5) + (10*2) = 30 + 15 + 20 = 65 penalty
      expect(computeComplianceScore(totals)).toBe(35);
    });

    it("does not return negative scores", () => {
      const totals = { Critical: 50, Serious: 0, Moderate: 0, Minor: 0 };
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
          { id: "1", severity: "Minor", title: "A" },
          { id: "2", severity: "Critical", title: "B" },
          { id: "3", severity: "Serious", title: "C" },
        ],
      };
      const normalized = normalizeFindings(raw);
      expect(normalized[0].severity).toBe("Critical");
      expect(normalized[1].severity).toBe("Serious");
      expect(normalized[2].severity).toBe("Minor");
    });

    it("passes through falsePositiveRisk, fixDifficultyNotes, frameworkNotes, and guardrails metadata", () => {
      const raw = {
        findings: [
          {
            id: "A11Y-abc123",
            severity: "Serious",
            title: "Test",
            false_positive_risk: "medium",
            fix_difficulty_notes: "Check context before fixing.",
            framework_notes: { react: "Use aria-label prop." },
            guardrails: {
              must: ["Confirm selector and evidence match."],
              must_not: ["Do not overwrite valid accessible names."],
              verify: ["Re-run targeted rule scan."],
            },
            verification_command_fallback: "node scripts/audit.mjs --base-url http://localhost:3000",
          },
        ],
      };
      const [f] = normalizeFindings(raw);
      expect(f.falsePositiveRisk).toBe("medium");
      expect(f.fixDifficultyNotes).toBe("Check context before fixing.");
      expect(f.frameworkNotes).toEqual({ react: "Use aria-label prop." });
      expect(f.guardrails).toEqual({
        must: ["Confirm selector and evidence match."],
        must_not: ["Do not overwrite valid accessible names."],
        verify: ["Re-run targeted rule scan."],
      });
      expect(f.verificationCommandFallback).toBe(
        "node scripts/audit.mjs --base-url http://localhost:3000",
      );
    });

    it("defaults metadata fields to null when absent", () => {
      const raw = {
        findings: [{ id: "A11Y-xyz", severity: "Minor", title: "Test" }],
      };
      const [f] = normalizeFindings(raw);
      expect(f.falsePositiveRisk).toBeNull();
      expect(f.fixDifficultyNotes).toBeNull();
      expect(f.frameworkNotes).toBeNull();
      expect(f.checkData).toBeNull();
    });

    it("passes through check_data as checkData", () => {
      const raw = {
        findings: [
          {
            id: "A11Y-cc1",
            severity: "Serious",
            title: "Low contrast",
            check_data: { fgColor: "#999999", bgColor: "#ffffff", contrastRatio: 3.24, expectedContrastRatio: "4.5:1" },
          },
        ],
      };
      const [f] = normalizeFindings(raw);
      expect(f.checkData).toMatchObject({ fgColor: "#999999", bgColor: "#ffffff", contrastRatio: 3.24 });
    });

    it("defaults relatedRules to [] when absent", () => {
      const raw = {
        findings: [{ id: "A11Y-xyz", severity: "Minor", title: "Test" }],
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

  describe("buildPersonaSummary", () => {
    it("categorizes color-contrast under vision", () => {
      const findings = [
        {
          ruleId: "color-contrast",
          title: "Low contrast",
          impactedUsers: "Vision",
        },
      ];
      const summary = buildPersonaSummary(findings);
      expect(summary.vision).toBe(1);
      expect(summary.screenReader).toBe(0);
    });

    it("categorizes aria-label under screen-reader", () => {
      const findings = [
        {
          ruleId: "button-name",
          title: "Missing label",
          impactedUsers: "Screen reader users",
        },
      ];
      const summary = buildPersonaSummary(findings);
      expect(summary.screenReader).toBe(1);
    });

    it("categorizes tabindex under keyboard", () => {
      const findings = [
        {
          ruleId: "tabindex",
          title: "Invalid tabindex",
          impactedUsers: "Keyboard users",
        },
      ];
      const summary = buildPersonaSummary(findings);
      expect(summary.keyboard).toBe(1);
    });

    it("categorizes heading-order under cognitive", () => {
      const findings = [
        {
          ruleId: "heading-order",
          title: "Wrong order",
          impactedUsers: "Users navigating via hierarchy",
        },
      ];
      const summary = buildPersonaSummary(findings);
      expect(summary.cognitive).toBe(1);
    });

    it("counts unique issues per persona (not instances)", () => {
      const findings = [
        { ruleId: "image-alt", title: "Image 1", impactedUsers: "Vision" },
        { ruleId: "image-alt", title: "Image 1", impactedUsers: "Vision" }, // Same issue
      ];
      const summary = buildPersonaSummary(findings);
      expect(summary.vision).toBe(1);
    });

    it("handles multiple personas for a single finding", () => {
      const findings = [
        {
          ruleId: "nested-interactive",
          title: "Nested",
          impactedUsers: "Screen reader and keyboard users",
        },
      ];
      const summary = buildPersonaSummary(findings);
      expect(summary.screenReader).toBe(1);
      expect(summary.keyboard).toBe(1);
    });
  });
});
