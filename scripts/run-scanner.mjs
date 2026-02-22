#!/usr/bin/env node

import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { log, DEFAULTS, writeJson, getInternalPath } from "./a11y-utils.mjs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

function printUsage() {
  log.info(`Usage:
  node run-scanner.mjs --base-url <url> [options]

Options:
  --routes <csv|newline>      Optional route list (same-origin paths/urls)
  --output <path>             Output JSON path (default: internal)
  --max-routes <number>       Max routes to analyze (default: 10)
  --wait-ms <number>          Time to wait after load (default: 2000)
  --timeout-ms <number>       Request timeout (default: 30000)
  --headless <boolean>        Run headless (default: true)
  --color-scheme <value>      Emulate color scheme: "light" or "dark" (default: "light")
  --screenshots-dir <path>    Directory to save element screenshots (optional)
  --exclude-selectors <csv>   Selectors to exclude from scan
  --only-rule <id>            Only check for this specific rule ID (ignores tags)
  --crawl-depth <number>      How deep to follow links during discovery (1-3, default: 2)
  --wait-until <value>        Page load strategy: domcontentloaded|load|networkidle (default: domcontentloaded)
  --viewport <WxH>            Viewport dimensions as WIDTHxHEIGHT (e.g., 375x812)
  -h, --help                  Show this help
`);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const args = {
    baseUrl: "",
    routes: "",
    output: getInternalPath("a11y-scan-results.json"),
    maxRoutes: DEFAULTS.maxRoutes,
    waitMs: DEFAULTS.waitMs,
    timeoutMs: DEFAULTS.timeoutMs,
    headless: DEFAULTS.headless,
    waitUntil: DEFAULTS.waitUntil,
    colorScheme: null,
    screenshotsDir: null,
    excludeSelectors: [],
    onlyRule: null,
    crawlDepth: DEFAULTS.crawlDepth,
    viewport: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    if (key === "--base-url") args.baseUrl = value;
    if (key === "--routes") args.routes = value;
    if (key === "--output") args.output = value;
    if (key === "--max-routes") args.maxRoutes = Number.parseInt(value, 10);
    if (key === "--wait-ms") args.waitMs = Number.parseInt(value, 10);
    if (key === "--timeout-ms") args.timeoutMs = Number.parseInt(value, 10);
    if (key === "--headless") args.headless = value !== "false";
    if (key === "--headed") args.headless = false;
    if (key === "--only-rule") args.onlyRule = value;
    if (key === "--crawl-depth") args.crawlDepth = Number.parseInt(value, 10);
    if (key === "--wait-until") args.waitUntil = value;
    if (key === "--exclude-selectors")
      args.excludeSelectors = value.split(",").map((s) => s.trim());
    if (key === "--color-scheme") args.colorScheme = value;
    if (key === "--screenshots-dir") args.screenshotsDir = value;
    if (key === "--viewport") {
      const [w, h] = value.split("x").map(Number);
      if (w && h) args.viewport = { width: w, height: h };
    }
    i += 1;
  }

  args.crawlDepth = Math.min(Math.max(args.crawlDepth, 1), 3);
  if (!args.baseUrl) throw new Error("Missing required --base-url");
  return args;
}

const BLOCKED_EXTENSIONS =
  /\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|css|js|mjs|json|xml|zip|tar|gz|mp4|mp3|woff|woff2|ttf|eot)$/i;

const PAGINATION_PARAMS = /^(page|p|pg|offset|cursor|start|from|skip|limit)$/i;

async function discoverFromSitemap(origin) {
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) =>
      m[1].trim(),
    );
    const routes = new Set();
    for (const loc of locs) {
      const normalized = normalizePath(loc, origin);
      if (normalized && normalized !== "/") routes.add(normalized);
    }
    return [...routes];
  } catch {
    return [];
  }
}

async function fetchDisallowedPaths(origin) {
  const disallowed = new Set();
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return disallowed;
    const text = await res.text();
    let inUserAgentAll = false;
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (/^User-agent:\s*\*/i.test(line)) {
        inUserAgentAll = true;
        continue;
      }
      if (/^User-agent:/i.test(line)) {
        inUserAgentAll = false;
        continue;
      }
      if (inUserAgentAll) {
        const match = line.match(/^Disallow:\s*(.+)/i);
        if (match) {
          const p = match[1].trim();
          if (p) disallowed.add(p);
        }
      }
    }
  } catch {
    // silent — robots.txt is optional
  }
  return disallowed;
}

function isDisallowedPath(routePath, disallowedPaths) {
  for (const rule of disallowedPaths) {
    if (routePath.startsWith(rule)) return true;
  }
  return false;
}

export function normalizePath(rawValue, origin) {
  if (!rawValue) return "";
  try {
    const u = new URL(rawValue, origin);
    if (u.origin !== origin) return "";
    if (BLOCKED_EXTENSIONS.test(u.pathname)) return "";
    const hashless = `${u.pathname || "/"}${u.search || ""}`;
    return hashless === "" ? "/" : hashless;
  } catch {
    return "";
  }
}

export function parseRoutesArg(routesArg, origin) {
  if (!routesArg.trim()) return [];
  const entries = routesArg
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);

  const uniq = new Set();
  for (const value of entries) {
    const normalized = normalizePath(value, origin);
    if (normalized) uniq.add(normalized);
  }
  return [...uniq];
}

export async function discoverRoutes(page, baseUrl, maxRoutes, crawlDepth = 2) {
  const origin = new URL(baseUrl).origin;
  const routes = new Set(["/"]);
  const seenPathnames = new Set(["/"]);
  const visited = new Set();
  let frontier = ["/"];

  function extractLinks(hrefs) {
    const newRoutes = [];
    for (const href of hrefs) {
      if (routes.size >= maxRoutes) break;
      const normalized = normalizePath(href, origin);
      if (!normalized) continue;
      try {
        const u = new URL(normalized, origin);
        const hasPagination = [...new URLSearchParams(u.search).keys()].some(
          (k) => PAGINATION_PARAMS.test(k),
        );
        if (hasPagination && seenPathnames.has(u.pathname)) continue;
        seenPathnames.add(u.pathname);
      } catch {
        // keep non-parseable normalized paths as-is
      }
      if (!routes.has(normalized)) {
        routes.add(normalized);
        newRoutes.push(normalized);
      }
    }
    return newRoutes;
  }

  for (let depth = 0; depth < crawlDepth && frontier.length > 0; depth++) {
    const nextFrontier = [];

    for (const routePath of frontier) {
      if (routes.size >= maxRoutes) break;
      if (visited.has(routePath)) continue;
      visited.add(routePath);

      try {
        const targetUrl = new URL(routePath, origin).toString();
        if (page.url() !== targetUrl) {
          await page.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 10000,
          });
        }

        const hrefs = await page.$$eval("a[href]", (elements) =>
          elements.map((el) => el.getAttribute("href")),
        );
        nextFrontier.push(...extractLinks(hrefs));
      } catch (error) {
        log.warn(`Discovery skip ${routePath}: ${error.message}`);
      }
    }

    frontier = nextFrontier;
    if (routes.size >= maxRoutes) break;
  }

  log.info(
    `Crawl depth ${Math.min(crawlDepth, 3)}: ${routes.size} route(s) discovered (visited ${visited.size} page(s))`,
  );
  return [...routes].slice(0, maxRoutes);
}

async function detectProjectContext(page) {
  const framework = await page.evaluate(() => {
    if (document.getElementById("__next") || window.__NEXT_DATA__)
      return "nextjs";
    if (document.getElementById("__nuxt") || window.__NUXT__) return "nuxt";
    if (document.querySelector("[ng-version]")) return "angular";
    if (document.getElementById("___gatsby")) return "gatsby";
    if (
      document.querySelector("[data-astro-cid]") ||
      document.querySelector("astro-island")
    )
      return "astro";
    if (document.querySelector("[data-reactroot]")) return "react";
    if (
      document.querySelector("[data-v-]") ||
      document.querySelector("[data-server-rendered]")
    )
      return "vue";
    if (window.Shopify || document.querySelector("[data-shopify]"))
      return "shopify";
    if (
      document.querySelector('link[href*="wp-content"]') ||
      document.querySelector('meta[name="generator"][content*="WordPress"]')
    )
      return "wordpress";
    return null;
  });

  const uiLibraries = [];
  try {
    const projectDir = process.env.A11Y_PROJECT_DIR;
    const pkgPath = projectDir
      ? path.join(projectDir, "package.json")
      : null;
    if (pkgPath && fs.existsSync(pkgPath)) {
      const deps = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const allDeps = Object.keys({
        ...deps.dependencies,
        ...deps.devDependencies,
      });
      const LIB_SIGNALS = [
        ["@radix-ui", "radix"],
        ["@headlessui", "headless-ui"],
        ["@chakra-ui", "chakra"],
        ["@mantine", "mantine"],
        ["@mui", "material-ui"],
        ["antd", "ant-design"],
      ];
      for (const [prefix, name] of LIB_SIGNALS) {
        if (allDeps.some((d) => d === prefix || d.startsWith(`${prefix}/`))) {
          uiLibraries.push(name);
        }
      }
    }
  } catch {
    // package.json not available — running against remote URL
  }

  if (framework) log.info(`Detected framework: ${framework}`);
  if (uiLibraries.length)
    log.info(`Detected UI libraries: ${uiLibraries.join(", ")}`);

  return { framework, uiLibraries };
}

async function analyzeRoute(
  page,
  routeUrl,
  waitMs,
  excludeSelectors,
  onlyRule,
  timeoutMs = 30000,
  maxRetries = 2,
  waitUntil = "domcontentloaded",
) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      await page.goto(routeUrl, {
        waitUntil,
        timeout: timeoutMs,
      });
      await page
        .waitForLoadState("networkidle", { timeout: waitMs })
        .catch(() => {});

      const builder = new AxeBuilder({ page });

      if (onlyRule) {
        log.info(`Targeted Audit: Only checking rule "${onlyRule}"`);
        builder.withRules([onlyRule]);
      } else {
        builder.withTags([
          "wcag2a",
          "wcag2aa",
          "wcag21a",
          "wcag21aa",
          "wcag22a",
          "wcag22aa",
          "best-practice",
        ]);
      }

      if (Array.isArray(excludeSelectors)) {
        for (const selector of excludeSelectors) {
          builder.exclude(selector);
        }
      }

      const axeResults = await builder.analyze();

      if (!Array.isArray(axeResults?.violations)) {
        throw new Error(
          "axe-core returned an unexpected response — violations array missing.",
        );
      }

      const metadata = await page.evaluate(() => {
        return {
          h1Count: document.querySelectorAll("h1").length,
          mainCount: document.querySelectorAll('main, [role="main"]').length,
          title: document.title,
        };
      });

      return {
        url: routeUrl,
        violations: axeResults.violations,
        metadata,
      };
    } catch (error) {
      lastError = error;
      if (attempt <= maxRetries) {
        log.warn(
          `[attempt ${attempt}/${maxRetries + 1}] Retrying ${routeUrl}: ${error.message}`,
        );
        await page.waitForTimeout(1000 * attempt);
      }
    }
  }

  log.error(
    `Failed to analyze ${routeUrl} after ${maxRetries + 1} attempts: ${lastError.message}`,
  );
  return {
    url: routeUrl,
    error: lastError.message,
    violations: [],
    metadata: {},
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = new URL(args.baseUrl).toString();
  const origin = new URL(baseUrl).origin;

  log.info(`Starting accessibility audit for ${baseUrl}`);

  const primaryViewport =
    args.viewport || { width: DEFAULTS.viewports[0].width, height: DEFAULTS.viewports[0].height };

  const browser = await chromium.launch({
    headless: args.headless,
  });
  const context = await browser.newContext({
    viewport: primaryViewport,
    reducedMotion: "no-preference",
    colorScheme: args.colorScheme || DEFAULTS.colorScheme,
    forcedColors: "none",
    locale: "en-US",
  });
  const page = await context.newPage();

  let routes = [];
  let projectContext = { framework: null, uiLibraries: [] };
  try {
    await page.goto(baseUrl, {
      waitUntil: args.waitUntil,
      timeout: args.timeoutMs,
    });

    projectContext = await detectProjectContext(page);

    const cliRoutes = parseRoutesArg(args.routes, origin);

    if (cliRoutes.length > 0) {
      routes = cliRoutes.slice(0, args.maxRoutes);
    } else if (baseUrl.startsWith("file://")) {
      routes = [""];
    } else {
      log.info("Autodiscovering routes...");
      const sitemapRoutes = await discoverFromSitemap(origin);
      if (sitemapRoutes.length > 0) {
        routes = [...new Set(["/", ...sitemapRoutes])];
        log.info(
          `Sitemap: ${routes.length} route(s) discovered from /sitemap.xml`,
        );
      } else {
        const crawled = await discoverRoutes(
          page,
          baseUrl,
          args.maxRoutes,
          args.crawlDepth,
        );
        routes = [...crawled];
      }
      if (routes.length === 0) routes = ["/"];
    }
  } catch (err) {
    log.error(`Fatal: Could not load base URL ${baseUrl}: ${err.message}`);
    await browser.close();
    process.exit(1);
  }

  const SKIP_SELECTORS = new Set(["html", "body", "head", ":root", "document"]);

  async function captureElementScreenshot(tabPage, violation, routeIndex) {
    if (!args.screenshotsDir) return;
    const firstNode = violation.nodes?.[0];
    if (!firstNode || firstNode.target.length > 1) return;
    const selector = firstNode.target[0];
    if (!selector || SKIP_SELECTORS.has(selector.toLowerCase())) return;
    try {
      fs.mkdirSync(args.screenshotsDir, { recursive: true });
      const safeRuleId = violation.id.replace(/[^a-z0-9-]/g, "-");
      const filename = `${routeIndex}-${safeRuleId}.png`;
      const screenshotPath = path.join(args.screenshotsDir, filename);
      await tabPage
        .locator(selector)
        .first()
        .scrollIntoViewIfNeeded({ timeout: 3000 });
      await tabPage.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const overlay = document.createElement("div");
        overlay.id = "__a11y_highlight__";
        Object.assign(overlay.style, {
          position: "fixed",
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width || 40}px`,
          height: `${rect.height || 20}px`,
          outline: "3px solid #ef4444",
          outlineOffset: "2px",
          backgroundColor: "rgba(239,68,68,0.12)",
          zIndex: "2147483647",
          pointerEvents: "none",
          boxSizing: "border-box",
        });
        document.body.appendChild(overlay);
      }, selector);
      await tabPage.screenshot({ path: screenshotPath });
      violation.screenshot_path = `screenshots/${filename}`;
      await tabPage.evaluate(() =>
        document.getElementById("__a11y_highlight__")?.remove(),
      );
    } catch (err) {
      log.warn(
        `Screenshot skipped for "${violation.id}" (${selector}): ${err.message}`,
      );
      await tabPage
        .evaluate(() => document.getElementById("__a11y_highlight__")?.remove())
        .catch(() => {});
    }
  }

  const TAB_CONCURRENCY = 3;
  const results = new Array(routes.length);
  const total = routes.length;

  try {
    const disallowed = await fetchDisallowedPaths(origin);
    if (disallowed.size > 0) {
      const before = routes.length;
      routes = routes.filter((r) => !isDisallowedPath(r, disallowed));
      const skipped = before - routes.length;
      if (skipped > 0)
        log.info(`robots.txt: ${skipped} route(s) excluded (Disallow rules)`);
    }

    log.info(
      `Targeting ${routes.length} routes (${Math.min(TAB_CONCURRENCY, routes.length)} parallel tabs): ${routes.join(", ")}`,
    );

    const tabPages = [page];
    for (let t = 1; t < Math.min(TAB_CONCURRENCY, routes.length); t++) {
      tabPages.push(await context.newPage());
    }

    for (let i = 0; i < routes.length; i += tabPages.length) {
      const batch = [];
      for (let j = 0; j < tabPages.length && i + j < routes.length; j++) {
        const idx = i + j;
        const tabPage = tabPages[j];
        batch.push(
          (async () => {
            const routePath = routes[idx];
            log.info(`[${idx + 1}/${total}] Scanning: ${routePath}`);
            const targetUrl = new URL(routePath, baseUrl).toString();
            const result = await analyzeRoute(
              tabPage,
              targetUrl,
              args.waitMs,
              args.excludeSelectors,
              args.onlyRule,
              args.timeoutMs,
              2,
              args.waitUntil,
            );
            if (args.screenshotsDir && result.violations) {
              for (const violation of result.violations) {
                await captureElementScreenshot(tabPage, violation, idx);
              }
            }
            results[idx] = { path: routePath, ...result };
          })(),
        );
      }
      await Promise.all(batch);
    }
  } finally {
    await browser.close();
  }

  const payload = {
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    onlyRule: args.onlyRule || null,
    projectContext,
    routes: results,
  };

  writeJson(args.output, payload);
  log.success(`Routes scan complete. Results saved to ${args.output}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    log.error(error.message);
    process.exit(1);
  });
}
