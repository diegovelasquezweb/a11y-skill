import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  formatMultiline,
  linkify,
} from "../scripts/renderers/utils.mjs";

describe("renderers/utils HTML utilities", () => {
  describe("escapeHtml", () => {
    it("escapes special HTML characters", () => {
      const input = '<div class="test"> & \' </div>';
      const output = escapeHtml(input);
      expect(output).toContain("&lt;div");
      expect(output).toContain("&quot;test&quot;");
      expect(output).toContain("&amp;");
      expect(output).toContain("&#39;");
      expect(output).toContain("&gt;");
    });

    it("handles null/undefined gracefully", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
    });
  });

  describe("formatMultiline", () => {
    it("converts newlines to <br> tags and escapes content", () => {
      const input = "Line 1\nLine 2 <tag>";
      const output = formatMultiline(input);
      expect(output).toBe("Line 1<br>Line 2 &lt;tag&gt;");
    });
  });

  describe("linkify", () => {
    it("converts https URLs to anchor tags", () => {
      const input = "Visit https://example.com for more.";
      const output = linkify(input);
      expect(output).toContain('<a href="https://example.com"');
      expect(output).toContain('target="_blank"');
      expect(output).toContain("example.com</a>");
    });

    it("does not touch non-URL text", () => {
      const input = "Normal text without links.";
      expect(linkify(input)).toBe(input);
    });
  });
});
