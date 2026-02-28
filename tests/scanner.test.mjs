import { describe, it, expect } from "vitest";
import {
  normalizePath,
  parseRoutesArg,
  discoverRoutes,
} from "../scripts/scanner.mjs";

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

  it("filters .avif images", () => {
    expect(normalizePath("/images/hero.avif", ORIGIN)).toBe("");
  });

  it("filters .map source maps", () => {
    expect(normalizePath("/assets/app.js.map", ORIGIN)).toBe("");
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

function createMockPage(linkMap) {
  let currentPath = "/";
  const navigations = [];
  return {
    navigations,
    url: () => `${ORIGIN}${currentPath}`,
    goto: async (url) => {
      const u = new URL(url);
      currentPath = u.pathname;
      navigations.push(currentPath);
    },
    $$eval: async () => linkMap[currentPath] || [],
  };
}

describe("discoverRoutes (BFS)", () => {
  it("discovers routes from the homepage at depth 1", async () => {
    const page = createMockPage({
      "/": ["/about", "/products"],
    });
    const routes = await discoverRoutes(page, ORIGIN, 10, 1);
    expect(routes).toContain("/");
    expect(routes).toContain("/about");
    expect(routes).toContain("/products");
  });

  it("does NOT follow links from subpages at depth 1", async () => {
    const page = createMockPage({
      "/": ["/about"],
      "/about": ["/about/team"],
    });
    const routes = await discoverRoutes(page, ORIGIN, 10, 1);
    expect(routes).toContain("/about");
    expect(routes).not.toContain("/about/team");
  });

  it("follows links from subpages at depth 2", async () => {
    const page = createMockPage({
      "/": ["/about", "/products"],
      "/about": ["/about/team"],
      "/products": ["/products/shoes"],
    });
    const routes = await discoverRoutes(page, ORIGIN, 10, 2);
    expect(routes).toContain("/about/team");
    expect(routes).toContain("/products/shoes");
  });

  it("respects maxRoutes cap across depths", async () => {
    const page = createMockPage({
      "/": ["/a", "/b", "/c", "/d"],
      "/a": ["/a/1", "/a/2"],
      "/b": ["/b/1", "/b/2"],
    });
    const routes = await discoverRoutes(page, ORIGIN, 4, 2);
    expect(routes.length).toBeLessThanOrEqual(4);
    expect(routes).toContain("/");
  });

  it("does not revisit pages already crawled", async () => {
    const page = createMockPage({
      "/": ["/about", "/products"],
      "/about": ["/", "/products"],
      "/products": ["/about"],
    });
    await discoverRoutes(page, ORIGIN, 10, 3);
    const unique = new Set(page.navigations);
    expect(unique.size).toBe(page.navigations.length);
  });

  it("skips pagination duplicates across depths", async () => {
    const page = createMockPage({
      "/": ["/products"],
      "/products": ["/products?page=2", "/products?page=3", "/new-page"],
    });
    const routes = await discoverRoutes(page, ORIGIN, 10, 2);
    expect(routes).toContain("/products");
    expect(routes).toContain("/new-page");
    expect(routes).not.toContain("/products?page=2");
    expect(routes).not.toContain("/products?page=3");
  });

  it("skips WordPress-style paged duplicates across depths", async () => {
    const page = createMockPage({
      "/": ["/blog"],
      "/blog": ["/blog?paged=2", "/blog?paged=3", "/contact"],
    });
    const routes = await discoverRoutes(page, ORIGIN, 10, 2);
    expect(routes).toContain("/blog");
    expect(routes).toContain("/contact");
    expect(routes).not.toContain("/blog?paged=2");
    expect(routes).not.toContain("/blog?paged=3");
  });

  it("filters external links found on deeper pages", async () => {
    const page = createMockPage({
      "/": ["/about"],
      "/about": ["https://external.com/page", "/contact"],
    });
    const routes = await discoverRoutes(page, ORIGIN, 10, 2);
    expect(routes).toContain("/contact");
    expect(routes).not.toContain("https://external.com/page");
  });

  it("handles navigation errors gracefully", async () => {
    const page = createMockPage({
      "/": ["/about", "/broken"],
      "/about": ["/contact"],
    });
    const originalGoto = page.goto;
    page.goto = async (url) => {
      if (new URL(url).pathname === "/broken")
        throw new Error("Navigation failed");
      return originalGoto(url);
    };
    const routes = await discoverRoutes(page, ORIGIN, 10, 2);
    expect(routes).toContain("/contact");
    expect(routes).toContain("/broken");
  });

  it("handles empty link discovery gracefully", async () => {
    const page = createMockPage({ "/": [] });
    const routes = await discoverRoutes(page, ORIGIN, 10, 1);
    expect(routes).toEqual(["/"]);
  });
});

describe("Scanner Batching (Process Simulation)", () => {
  it("simulates batch execution across multiple tabs", async () => {
    const routes = ["/1", "/2", "/3", "/4", "/5"];
    const results = new Array(routes.length);
    const tabPages = [createMockPage({}), createMockPage({})];

    // Simulate main.mjs batch loop logic
    for (let i = 0; i < routes.length; i += tabPages.length) {
      const batch = [];
      for (let j = 0; j < tabPages.length && i + j < routes.length; j++) {
        const idx = i + j;
        const tabPage = tabPages[j];
        batch.push(
          (async () => {
            await tabPage.goto(`${ORIGIN}${routes[idx]}`);
            results[idx] = { path: routes[idx], status: "done" };
          })(),
        );
      }
      await Promise.all(batch);
    }

    expect(results.length).toBe(5);
    expect(results.every((r) => r.status === "done")).toBe(true);
    // Verify tabs were reused
    expect(tabPages[0].navigations.length).toBe(3); // /1, /3, /5
    expect(tabPages[1].navigations.length).toBe(2); // /2, /4
  });
});
