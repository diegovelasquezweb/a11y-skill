import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  detectImplicitRole,
  extractSearchHint,
  classifyFindingOwnership,
  extractFailureInsights,
  collectIncompleteFindings,
} from "../scripts/analyzer.mjs";

describe("assets/intelligence.json schema", () => {
  let intelligence;
  let ruleMetadata;

  beforeAll(() => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    intelligence = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../assets/remediation/intelligence.json"),
        "utf-8",
      ),
    );
    ruleMetadata = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../assets/reporting/wcag-reference.json"),
        "utf-8",
      ),
    );
  });

  it("intelligence.json has required top-level keys", () => {
    expect(intelligence).toHaveProperty("rules");
  });

  it("wcag-reference.json has required top-level keys", () => {
    expect(ruleMetadata).toHaveProperty("wcagCriterionMap");
    expect(ruleMetadata).toHaveProperty("apgPatterns");
    expect(ruleMetadata).toHaveProperty("mdn");
  });

  it("wcagCriterionMap maps known rules to WCAG criterion strings", () => {
    expect(ruleMetadata.wcagCriterionMap["image-alt"]).toBe("1.1.1");
    expect(ruleMetadata.wcagCriterionMap["color-contrast"]).toBe("1.4.3");
    expect(ruleMetadata.wcagCriterionMap["button-name"]).toBe("4.1.2");
    expect(ruleMetadata.wcagCriterionMap["label"]).toBe("4.1.2");
  });

  it("wcagCriterionMap covers all rules defined in intelligence.json", () => {
    const ruleIds = Object.keys(intelligence.rules);
    const missingFromMap = ruleIds.filter(
      (id) => !ruleMetadata.wcagCriterionMap[id],
    );
    expect(missingFromMap).toEqual([]);
  });

  it("apgPatterns has correct mappings", () => {
    expect(ruleMetadata.apgPatterns.dialog).toContain(
      "apg/patterns/dialog-modal",
    );
  });
});

describe("detectImplicitRole", () => {
  it("returns 'button' for <button>", () => {
    expect(detectImplicitRole("button", "<button>")).toBe("button");
  });

  it("returns 'link' for <a>", () => {
    expect(detectImplicitRole("a", "<a href='/home'>")).toBe("link");
  });

  it("returns 'dialog' for <dialog>", () => {
    expect(detectImplicitRole("dialog", "<dialog>")).toBe("dialog");
  });

  it("returns 'listbox' for <select>", () => {
    expect(detectImplicitRole("select", "<select>")).toBe("listbox");
  });

  it("returns 'table' for <table>", () => {
    expect(detectImplicitRole("table", "<table>")).toBe("table");
  });

  it("returns 'checkbox' for <input type='checkbox'>", () => {
    expect(detectImplicitRole("input", '<input type="checkbox">')).toBe(
      "checkbox",
    );
  });

  it("returns 'radio' for <input type='radio'>", () => {
    expect(detectImplicitRole("input", '<input type="radio">')).toBe("radio");
  });

  it("returns 'slider' for <input type='range'>", () => {
    expect(detectImplicitRole("input", '<input type="range">')).toBe("slider");
  });

  it("returns null for <input type='text'>", () => {
    expect(detectImplicitRole("input", '<input type="text">')).toBeNull();
  });

  it("returns null for <input> with no type", () => {
    expect(detectImplicitRole("input", "<input>")).toBeNull();
  });

  it("returns null for <div>", () => {
    expect(detectImplicitRole("div", "<div>")).toBeNull();
  });

  it("returns null when tag is null", () => {
    expect(detectImplicitRole(null, null)).toBeNull();
  });

  it("handles uppercase type attribute (case-insensitive)", () => {
    expect(detectImplicitRole("input", '<input type="CHECKBOX">')).toBe(
      "checkbox",
    );
    expect(detectImplicitRole("input", '<input type="RADIO">')).toBe("radio");
  });

  it("returns 'navigation' for <nav>", () => {
    expect(detectImplicitRole("nav", "<nav>")).toBe("navigation");
  });

  it("returns 'banner' for <header>", () => {
    expect(detectImplicitRole("header", "<header>")).toBe("banner");
  });

  it("returns 'contentinfo' for <footer>", () => {
    expect(detectImplicitRole("footer", "<footer>")).toBe("contentinfo");
  });

  it("returns 'complementary' for <aside>", () => {
    expect(detectImplicitRole("aside", "<aside>")).toBe("complementary");
  });

  it("returns 'heading' for <h1> through <h6>", () => {
    for (const h of ["h1", "h2", "h3", "h4", "h5", "h6"]) {
      expect(detectImplicitRole(h, `<${h}>`)).toBe("heading");
    }
  });

  it("returns 'form' for <form>", () => {
    expect(detectImplicitRole("form", "<form>")).toBe("form");
  });

  it("returns 'group' for <fieldset>", () => {
    expect(detectImplicitRole("fieldset", "<fieldset>")).toBe("group");
  });
});

describe("extractSearchHint", () => {
  it("extracts ID from selector", () => {
    expect(extractSearchHint("#submit-btn")).toBe('id="submit-btn"');
  });

  it("extracts class from selector", () => {
    expect(extractSearchHint(".nav-link")).toBe(".nav-link");
  });

  it("prefers class over tag in compound selector", () => {
    expect(extractSearchHint("button.primary")).toBe(".primary");
  });

  it("takes the last segment and prefers class over tag", () => {
    expect(extractSearchHint("div > button.cta")).toBe(".cta");
  });

  it("falls back to tag when no ID or class", () => {
    expect(extractSearchHint("div > button")).toBe("<button");
  });

  it("returns N/A unchanged", () => {
    expect(extractSearchHint("N/A")).toBe("N/A");
  });

  it("returns empty string unchanged", () => {
    expect(extractSearchHint("")).toBe("");
  });

  it("prefers ID over class in same segment", () => {
    expect(extractSearchHint("#main.container")).toBe('id="main"');
  });

  it("returns attribute selector as-is when no ID, class, or tag match", () => {
    expect(extractSearchHint('[aria-label="Close"]')).toBe(
      '[aria-label="Close"]',
    );
  });
});

describe("classifyFindingOwnership", () => {
  it("marks WordPress plugin markup as outside the primary source", () => {
    const result = classifyFindingOwnership({
      evidenceHtml: [
        '<div class="wcc-popup-overflow" data-script="/wp-content/plugins/webtoffee-cookie-consent/lite/frontend/js/script.min.js"></div>',
      ],
      selector: ".wcc-popup-overflow",
      pageUrl: "https://example.com",
      fileSearchPattern: "wp-content/themes/**/*.php",
    });

    expect(result.status).toBe("outside_primary_source");
    expect(result.searchStrategy).toBe("verify_ownership_before_search");
  });

  it("marks cross-origin iframes as outside the primary source", () => {
    const result = classifyFindingOwnership({
      evidenceHtml: [
        '<iframe src="https://widgets.example.net/chat" title="Support chat"></iframe>',
      ],
      selector: "iframe",
      pageUrl: "https://example.com/support",
      fileSearchPattern: "src/**/*.tsx",
    });

    expect(result.status).toBe("outside_primary_source");
    expect(result.reason).toContain("cross-origin iframe");
  });

  it("marks findings as unknown when the editable source cannot be resolved", () => {
    const result = classifyFindingOwnership({
      evidenceHtml: ["<button>Submit</button>"],
      selector: "button",
      pageUrl: "https://example.com",
      fileSearchPattern: null,
    });

    expect(result.status).toBe("unknown");
    expect(result.searchStrategy).toBe("verify_ownership_before_search");
  });

  it("marks findings as primary when a source boundary is known and no outside signal is present", () => {
    const result = classifyFindingOwnership({
      evidenceHtml: ['<button class="cta">Buy now</button>'],
      selector: ".cta",
      pageUrl: "https://example.com",
      fileSearchPattern: "src/**/*.tsx, components/**/*.tsx",
    });

    expect(result.status).toBe("primary");
    expect(result.primarySourceScope).toEqual(["src", "components"]);
    expect(result.searchStrategy).toBe("direct_source_patch");
  });
});

describe("extractFailureInsights", () => {
  it("extracts a primary failure mode and deduplicated checks from axe node checks", () => {
    const result = extractFailureInsights(
      {
        any: [
          {
            id: "button-has-visible-text",
            message:
              "Element does not have inner text that is visible to screen readers.",
            relatedNodes: [],
          },
          {
            id: "aria-label",
            message: "aria-label attribute does not exist or is empty.",
            relatedNodes: [],
          },
        ],
        all: [],
        none: [],
      },
      {
        preferredRelationshipChecks: ["aria-label"],
      },
    );

    expect(result.primaryFailureMode).toBe("missing_visible_text");
    expect(result.relationshipHint).toBe("control_has_no_accessible_name_source");
    expect(result.failureChecks).toEqual([
      "Element does not have inner text that is visible to screen readers",
      "aria-label attribute does not exist or is empty",
    ]);
    expect(result.relatedContext).toEqual([]);
  });

  it("includes related context when axe provides related nodes", () => {
    const result = extractFailureInsights(
      {
        any: [
          {
            id: "explicit-label",
            message: "Element does not have an explicit <label>",
            relatedNodes: [{ html: '<label for="email">Email</label>' }],
          },
        ],
        all: [],
        none: [],
      },
      {
        preferredRelationshipChecks: ["explicit-label"],
      },
    );

    expect(result.primaryFailureMode).toBe("missing_accessible_label");
    expect(result.relationshipHint).toBe("label_not_associated_with_control");
    expect(result.relatedContext).toEqual([
      '<label for="email">Email</label>',
    ]);
  });

  it("extracts check.data from the primary failing check", () => {
    const result = extractFailureInsights({
      any: [
        {
          id: "color-contrast",
          message: "Element has insufficient color contrast of 3.24",
          data: {
            fgColor: "#999999",
            bgColor: "#ffffff",
            contrastRatio: 3.24,
            fontSize: "14.0pt (18.67px)",
            fontWeight: "normal",
            expectedContrastRatio: "4.5:1",
          },
          relatedNodes: [],
        },
      ],
      all: [],
      none: [],
    });

    expect(result.checkData).toMatchObject({
      fgColor: "#999999",
      bgColor: "#ffffff",
      contrastRatio: 3.24,
    });
    expect(result.relationshipHint).toBeNull();
  });

  it("returns null checkData when check has no data field", () => {
    const result = extractFailureInsights({
      any: [{ id: "button-has-visible-text", message: "No visible text", relatedNodes: [] }],
      all: [],
      none: [],
    });

    expect(result.checkData).toBeNull();
    expect(result.relationshipHint).toBeNull();
  });

  it("prefers aria relationship hints when aria references are the failing source", () => {
    const result = extractFailureInsights(
      {
        any: [
          {
            id: "aria-labelledby",
            message:
              "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty.",
            relatedNodes: [{ html: '<span id="missing-label"></span>' }],
          },
        ],
        all: [],
        none: [],
      },
      {
        preferredRelationshipChecks: ["aria-labelledby", "aria-label"],
      },
    );

    expect(result.primaryFailureMode).toBe("missing_or_invalid_aria_labelledby");
    expect(result.relationshipHint).toBe(
      "aria_labelledby_references_missing_or_invalid_target",
    );
    expect(result.relatedContext).toEqual(['<span id="missing-label"></span>']);
  });

  it("prefers explicit label relationships over wrapped-label hints when both are present", () => {
    const result = extractFailureInsights(
      {
        any: [
          {
            id: "implicit-label",
            message: "Element does not have an implicit (wrapped) <label>",
            relatedNodes: [],
          },
          {
            id: "explicit-label",
            message: "Element does not have an explicit <label>",
            relatedNodes: [{ html: '<label for="country">Country</label>' }],
          },
        ],
        all: [],
        none: [],
      },
      {
        preferredRelationshipChecks: ["explicit-label", "implicit-label"],
      },
    );

    expect(result.primaryFailureMode).toBe("missing_accessible_label");
    expect(result.relationshipHint).toBe("label_not_associated_with_control");
    expect(result.relatedContext).toEqual(['<label for="country">Country</label>']);
  });

  it("filters out {isIframe: false} check.data as non-actionable", () => {
    const result = extractFailureInsights({
      any: [
        {
          id: "region",
          message: "Some content is not contained in a landmark region",
          data: { isIframe: false },
          relatedNodes: [],
        },
      ],
      all: [],
      none: [],
    });
    expect(result.checkData).toBeNull();
  });

  it("filters out {isIframe: true} check.data as non-actionable", () => {
    const result = extractFailureInsights({
      any: [
        {
          id: "region",
          message: "Some content is not contained in a landmark region",
          data: { isIframe: true },
          relatedNodes: [],
        },
      ],
      all: [],
      none: [],
    });
    expect(result.checkData).toBeNull();
  });
});

describe("collectIncompleteFindings", () => {
  it("deduplicates violations with the same rule and message across pages", () => {
    const routes = [
      {
        path: "/",
        url: "http://example.com/",
        incomplete: [
          {
            id: "color-contrast",
            help: "Color contrast",
            description: "Ensures contrast...",
            impact: "serious",
            nodes: [{ any: [{ message: "Background cannot be determined" }], all: [], none: [], target: ["p"] }],
          },
        ],
      },
      {
        path: "/about",
        url: "http://example.com/about",
        incomplete: [
          {
            id: "color-contrast",
            help: "Color contrast",
            description: "Ensures contrast...",
            impact: "serious",
            nodes: [{ any: [{ message: "Background cannot be determined" }], all: [], none: [], target: ["p"] }],
          },
        ],
      },
    ];
    const result = collectIncompleteFindings(routes);
    expect(result).toHaveLength(1);
    expect(result[0].pages_affected).toBe(2);
    expect(result[0].areas).toEqual(["/", "/about"]);
  });

  it("keeps violations with the same rule but different messages as separate entries", () => {
    const routes = [
      {
        path: "/",
        url: "http://example.com/",
        incomplete: [
          {
            id: "color-contrast",
            help: "CC",
            description: "",
            impact: "serious",
            nodes: [{ any: [{ message: "Message A" }], all: [], none: [], target: ["p"] }],
          },
          {
            id: "color-contrast",
            help: "CC",
            description: "",
            impact: "serious",
            nodes: [{ any: [{ message: "Message B" }], all: [], none: [], target: ["div"] }],
          },
        ],
      },
    ];
    const result = collectIncompleteFindings(routes);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when routes have no incomplete violations", () => {
    const routes = [{ path: "/", url: "http://example.com/", incomplete: [] }];
    expect(collectIncompleteFindings(routes)).toEqual([]);
  });

  it("sets pages_affected to 1 for single-page violations", () => {
    const routes = [
      {
        path: "/",
        url: "http://example.com/",
        incomplete: [
          {
            id: "video-caption",
            help: "Videos must have captions",
            description: "",
            impact: "critical",
            nodes: [{ any: [{ message: "Check that captions are available" }], all: [], none: [], target: ["video"] }],
          },
        ],
      },
    ];
    const result = collectIncompleteFindings(routes);
    expect(result[0].pages_affected).toBe(1);
    expect(result[0].areas).toEqual(["/"]);
  });
});
