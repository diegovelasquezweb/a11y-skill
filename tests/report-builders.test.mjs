import { describe, it, expect } from "vitest";
import { normalizeFindings } from "../scripts/renderers/findings.mjs";
import { buildMarkdownSummary } from "../scripts/renderers/md.mjs";
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
    wcag: "1.1.1",
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
    expect(html).toContain("MDN Docs");
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
    const totals = { Critical: 5, Serious: 0, Moderate: 0, Minor: 0 };
    const html = buildPdfRiskSection(totals);
    expect(html).toContain("Severe Risk");
    expect(html).toContain("25");
  });

  it("buildPdfRemediationRoadmap calculates effort hours", () => {
    const rawFindings = [
      { severity: "Critical" },
      { severity: "Serious" },
      { severity: "Moderate" },
      { severity: "Minor" },
    ];
    const findings = normalizeFindings({ findings: rawFindings });
    const html = buildPdfRemediationRoadmap(findings);
    // Weights: C:4, S:2, Mo:1, Mi:0.5 -> Total 7.5 hours -> Rounded to ~8 hours
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
        { id: "A11Y-002", title: "Low contrast", severity: "Moderate", area: "/about" },
      ],
    });
    const html = buildPdfIssueSummaryTable(findings);
    expect(html).toContain("Issue Summary");
    expect(html).toContain("Missing alt");
    expect(html).toContain("Low contrast");
    expect(html).toContain("Critical");
    expect(html).toContain("Moderate");
  });

  it("buildPdfIssueSummaryTable handles empty findings", () => {
    const html = buildPdfIssueSummaryTable([]);
    expect(html).toContain("No accessibility violations");
    expect(html).not.toContain("<tbody>");
  });
});

describe("Markdown Renderer — check.data diagnostic blocks", () => {
  const args = { baseUrl: "http://example.com/" };

  function md(rawFindings, metadata = {}) {
    const findings = normalizeFindings({ findings: rawFindings });
    return buildMarkdownSummary(args, findings, metadata);
  }

  it("renders Contrast Diagnostics table for color-contrast findings with check_data", () => {
    const out = md([{
      id: "A11Y-cc1",
      rule_id: "color-contrast",
      severity: "Serious",
      wcag: "WCAG 2.1 AA",
      actual: "Contrast too low",
      check_data: { fgColor: "#999999", bgColor: "#ffffff", contrastRatio: 3.24, expectedContrastRatio: "4.5:1", fontSize: "14pt", fontWeight: "normal" },
    }]);
    expect(out).toContain("#### Contrast Diagnostics");
    expect(out).toContain("`#999999`");
    expect(out).toContain("`#ffffff`");
    expect(out).toContain("**3.24:1**");
    expect(out).toContain("**4.5:1**");
  });

  it("does not render Contrast Diagnostics when check_data is absent for color-contrast", () => {
    const out = md([{
      id: "A11Y-cc2",
      rule_id: "color-contrast",
      severity: "Serious",
      actual: "Contrast too low",
    }]);
    expect(out).not.toContain("#### Contrast Diagnostics");
  });

  it("renders Viewport Constraint block for meta-viewport with string check_data", () => {
    const out = md([{
      id: "A11Y-mv1",
      rule_id: "meta-viewport",
      severity: "Moderate",
      actual: "user-scalable=no disables zooming",
      check_data: "user-scalable=no",
    }]);
    expect(out).toContain("#### Viewport Constraint Detected");
    expect(out).toContain("`user-scalable=no`");
    expect(out).toContain("user-scalable=yes");
  });

  it("renders Invalid Child Element block for list with {values} check_data", () => {
    const out = md([{
      id: "A11Y-li1",
      rule_id: "list",
      severity: "Moderate",
      actual: "Invalid child in list",
      check_data: { values: "div" },
    }]);
    expect(out).toContain("#### Invalid Child Element");
    expect(out).toContain("`<div>`");
    expect(out).toContain("`<li>`");
  });

  it("does not render check.data blocks for rules without a handler", () => {
    const out = md([{
      id: "A11Y-bn1",
      rule_id: "button-name",
      severity: "Critical",
      actual: "No accessible name",
      check_data: { messageKey: "noAttr" },
    }]);
    expect(out).not.toContain("#### Contrast Diagnostics");
    expect(out).not.toContain("#### Viewport Constraint");
    expect(out).not.toContain("#### Invalid Child Element");
  });
});

describe("Markdown Renderer — incomplete findings section", () => {
  const args = { baseUrl: "http://example.com/" };

  it("renders the Potential Issues section when incomplete_findings exist", () => {
    const findings = normalizeFindings({ findings: [] });
    const metadata = {
      incomplete_findings: [
        { rule_id: "color-contrast", impact: "serious", pages_affected: 10, areas: ["/"], message: "Background cannot be determined" },
      ],
    };
    const out = buildMarkdownSummary(args, findings, metadata);
    expect(out).toContain("## Potential Issues — Manual Review Required");
    expect(out).toContain("`color-contrast`");
    expect(out).toContain("10 pages");
    expect(out).toContain("Background cannot be determined");
  });

  it("shows page count for cross-page incomplete findings", () => {
    const findings = normalizeFindings({ findings: [] });
    const metadata = {
      incomplete_findings: [
        { rule_id: "color-contrast", impact: "serious", pages_affected: 5, areas: ["/", "/about", "/contact", "/shop", "/blog"], message: "Some message" },
      ],
    };
    const out = buildMarkdownSummary(args, findings, metadata);
    expect(out).toContain("5 pages");
    expect(out).not.toContain("`/about`");
  });

  it("shows area path for single-page incomplete findings", () => {
    const findings = normalizeFindings({ findings: [] });
    const metadata = {
      incomplete_findings: [
        { rule_id: "video-caption", impact: "critical", pages_affected: 1, areas: ["/"], message: "Check captions" },
      ],
    };
    const out = buildMarkdownSummary(args, findings, metadata);
    expect(out).toContain("`/`");
  });

  it("appends grep hint for duplicate-id-aria with extractable ID", () => {
    const findings = normalizeFindings({ findings: [] });
    const metadata = {
      incomplete_findings: [
        {
          rule_id: "duplicate-id-aria",
          impact: "critical",
          pages_affected: 3,
          areas: ["/products"],
          message: "Document has multiple elements referenced with ARIA with the same id attribute: input_1_22",
        },
      ],
    };
    const out = buildMarkdownSummary(args, findings, metadata);
    expect(out).toContain('grep: `id="input_1_22"`');
  });

  it("omits the section when incomplete_findings is empty or absent", () => {
    const findings = normalizeFindings({ findings: [] });
    expect(buildMarkdownSummary(args, findings, {})).not.toContain("Potential Issues");
    expect(buildMarkdownSummary(args, findings, { incomplete_findings: [] })).not.toContain("Potential Issues");
  });
});
