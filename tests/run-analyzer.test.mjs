import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  detectImplicitRole,
  extractSearchHint,
} from "../scripts/run-analyzer.mjs";

describe("assets/intelligence.json schema", () => {
  it("has required top-level keys and critical mappings", () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const intelligence = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../assets/intelligence.json"), "utf-8"),
    );
    expect(intelligence).toHaveProperty("apgPatterns");
    expect(intelligence).toHaveProperty("a11ySupport");
    expect(intelligence).toHaveProperty("inclusiveComponents");
    expect(intelligence.apgPatterns.dialog).toContain("apg/patterns/dialogmodal");
    expect(intelligence.inclusiveComponents.tab).toContain("tabbed-interfaces");
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
    expect(detectImplicitRole("input", '<input type="checkbox">')).toBe("checkbox");
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
});
