import { describe, it, expect } from "vitest";
import { normalizePath, parseRoutesArg } from "../scripts/run-scanner.mjs";

const ORIGIN = "https://example.com";

describe("normalizePath", () => {
  it("returns '/' for the homepage", () => {
    expect(normalizePath("/", ORIGIN)).toBe("/");
  });

  it("preserves pathname", () => {
    expect(normalizePath("/about", ORIGIN)).toBe("/about");
  });

  it("preserves query string", () => {
    expect(normalizePath("/search?q=wcag", ORIGIN)).toBe("/search?q=wcag");
  });

  it("strips hash fragments", () => {
    expect(normalizePath("/about#section", ORIGIN)).toBe("/about");
  });

  it("filters external origin URLs", () => {
    expect(normalizePath("https://other.com/page", ORIGIN)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(normalizePath("", ORIGIN)).toBe("");
  });

  it("returns empty string for javascript: protocol links", () => {
    expect(normalizePath("javascript:void(0)", ORIGIN)).toBe("");
  });

  it("handles absolute same-origin URLs", () => {
    expect(normalizePath("https://example.com/products", ORIGIN)).toBe(
      "/products",
    );
  });

  it("filters .pdf extension", () => {
    expect(normalizePath("/docs/file.pdf", ORIGIN)).toBe("");
  });

  it("filters .jpg extension", () => {
    expect(normalizePath("/images/photo.jpg", ORIGIN)).toBe("");
  });

  it("filters .svg extension", () => {
    expect(normalizePath("/icons/logo.svg", ORIGIN)).toBe("");
  });

  it("filters .js extension", () => {
    expect(normalizePath("/bundle.js", ORIGIN)).toBe("");
  });

  it("filters .css extension", () => {
    expect(normalizePath("/styles/main.css", ORIGIN)).toBe("");
  });

  it("filters .woff2 font files", () => {
    expect(normalizePath("/fonts/inter.woff2", ORIGIN)).toBe("");
  });

  it("does NOT filter paths that merely contain a blocked extension word", () => {
    expect(normalizePath("/blog/css-grid-tutorial", ORIGIN)).toBe(
      "/blog/css-grid-tutorial",
    );
  });
});

describe("parseRoutesArg", () => {
  it("parses comma-separated routes", () => {
    const result = parseRoutesArg("/about, /contact", ORIGIN);
    expect(result).toContain("/about");
    expect(result).toContain("/contact");
  });

  it("parses newline-separated routes", () => {
    const result = parseRoutesArg("/about\n/contact", ORIGIN);
    expect(result).toContain("/about");
    expect(result).toContain("/contact");
  });

  it("deduplicates identical routes", () => {
    const result = parseRoutesArg("/about, /about", ORIGIN);
    expect(result.filter((r) => r === "/about").length).toBe(1);
  });

  it("filters external URLs", () => {
    const result = parseRoutesArg("/about, https://other.com/page", ORIGIN);
    expect(result).toContain("/about");
    expect(result).not.toContain("https://other.com/page");
  });

  it("returns empty array for blank input", () => {
    expect(parseRoutesArg("", ORIGIN)).toEqual([]);
    expect(parseRoutesArg("   ", ORIGIN)).toEqual([]);
  });

  it("filters non-HTML extensions", () => {
    const result = parseRoutesArg("/about, /file.pdf", ORIGIN);
    expect(result).toContain("/about");
    expect(result).not.toContain("/file.pdf");
  });
});
