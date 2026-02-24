import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  detectImplicitRole,
  extractSearchHint,
} from "../scripts/analyzer.mjs";

describe("assets/intelligence.json schema", () => {
  let intelligence;
  let ruleMetadata;

  beforeAll(() => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    intelligence = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../assets/intelligence.json"),
        "utf-8",
      ),
    );
    ruleMetadata = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../assets/wcag-reference.json"),
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
