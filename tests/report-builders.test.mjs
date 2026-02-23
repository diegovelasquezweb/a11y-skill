import { describe, it, expect } from "vitest";
import { normalizeFindings } from "../scripts/renderers/findings.mjs";
import {
  buildIssueCard,
  buildPageGroupedSection,
} from "../scripts/renderers/html.mjs";
import {
  scoreMetrics,
  buildPdfRiskSection,
  buildPdfRemediationRoadmap,
  buildPdfCoverPage,
  buildPdfIssueSummaryTable,
} from "../scripts/renderers/pdf.mjs";

describe("HTML Report Builder Components", () => {
  const rawFinding = {
    id: "A11Y-001",
    rule_id: "image-alt",
    title: "Images must have alternate text",
    severity: "Critical",
    wcag_criterion_id: "1.1.1",
    area: "HomePage",
    selector: "img",
    impacted_users: "Users with visual impairments",
    actual: "<img>",
    expected: '<img alt="...">',
    fix_description: "Add alt",
    fix_code: '<img alt="test">',
    mdn: "https://developer.mozilla.org/test",
  };

  const [mockFinding] = normalizeFindings({ findings: [rawFinding] });

  it("buildIssueCard generates HTML for a finding", () => {
    const html = buildIssueCard(mockFinding);
    expect(html).toContain("image-alt");
    expect(html).toContain("Critical");
    expect(html).toContain("1.1.1");
  });

  it("buildIssueCard handles MDN links correctly", () => {
    const html = buildIssueCard(mockFinding);
    expect(html).toContain("Technical Docs (MDN)");
    expect(html).toContain("https://developer.mozilla.org/test");
  });

  it("buildPageGroupedSection groups findings by area", () => {
    const rawFindings = [
      { area: "Home", rule_id: "A" },
      { area: "Home", rule_id: "B" },
      { area: "About", rule_id: "C" },
    ];
    const findings = normalizeFindings({ findings: rawFindings });
    const html = buildPageGroupedSection(findings);
    expect(html).toContain('data-page="Home"');
    expect(html).toContain('data-page="About"');
    expect(html).toContain('rule-id="A"');
    expect(html).toContain('rule-id="B"');
    expect(html).toContain('rule-id="C"');
  });
});

describe("PDF Report Builder Components", () => {
  it("scoreMetrics returns correct label and risk", () => {
    const metrics = scoreMetrics(100);
    expect(metrics.label).toBe("Excellent");
    expect(metrics.risk).toBe("Minimal Risk");
  });

  it("buildPdfRiskSection generates risk assessment HTML", () => {
    // 5 Critical issues = 75 penalty -> 25 score (< 35 is Severe)
    const totals = { Critical: 5, High: 0, Medium: 0, Low: 0 };
    const html = buildPdfRiskSection(totals);
    expect(html).toContain("Severe Risk");
    expect(html).toContain("25");
  });

  it("buildPdfRemediationRoadmap calculates effort hours", () => {
    const rawFindings = [
      { severity: "Critical" },
      { severity: "High" },
      { severity: "Medium" },
      { severity: "Low" },
    ];
    const findings = normalizeFindings({ findings: rawFindings });
    const html = buildPdfRemediationRoadmap(findings);
    // Weights: C:4, H:2, M:1, L:0.5 -> Total 7.5 hours -> Rounded to ~8 hours
    expect(html).toContain("~8 hours");
  });

  it("buildPdfCoverPage renders cover with score and metadata", () => {
    const html = buildPdfCoverPage({
      siteHostname: "example.com",
      target: "WCAG 2.2 AA",
      score: 72,
      coverDate: "February 22, 2026",
    });
    expect(html).toContain("example.com");
    expect(html).toContain("WCAG 2.2 AA");
    expect(html).toContain("72");
    expect(html).toContain("February 22, 2026");
    expect(html).toContain("cover-page");
  });

  it("buildPdfIssueSummaryTable renders table with findings", () => {
    const findings = normalizeFindings({
      findings: [
        { id: "A11Y-001", title: "Missing alt", severity: "Critical", area: "/home" },
        { id: "A11Y-002", title: "Low contrast", severity: "Medium", area: "/about" },
      ],
    });
    const html = buildPdfIssueSummaryTable(findings);
    expect(html).toContain("Issue Summary");
    expect(html).toContain("Missing alt");
    expect(html).toContain("Low contrast");
    expect(html).toContain("Critical");
    expect(html).toContain("Medium");
  });

  it("buildPdfIssueSummaryTable handles empty findings", () => {
    const html = buildPdfIssueSummaryTable([]);
    expect(html).toContain("No accessibility violations");
    expect(html).not.toContain("<tbody>");
  });
});
