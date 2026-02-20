#!/usr/bin/env node

import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { log, loadConfig, writeJson, getInternalPath } from "./a11y-utils.mjs";
import path from "node:path";
import fs from "node:fs";

function printUsage() {
  log.info(`Usage:
  node run-scanner.mjs --base-url <url> [options]

Options:
  --routes <csv|newline>      Optional route list (same-origin paths/urls)
  --output <path>             Output JSON path (default: audit/internal/a11y-scan-results.json)
  --max-routes <number>       Max routes to analyze (default: 10)
  --wait-ms <number>          Time to wait after load (default: 2000)
  --timeout-ms <number>       Request timeout (default: 30000)
  --headless <boolean>        Run headless (default: true)
  --color-scheme <value>      Emulate color scheme: "light" or "dark" (default: "light")
  --screenshots-dir <path>    Directory to save element screenshots (optional)
  --exclude-selectors <csv>   Selectors to exclude (overrides config)
  --only-rule <id>            Only check for this specific rule ID (ignores tags)
  -h, --help                  Show this help
`);
}

function parseArgs(argv, config) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const args = {
    baseUrl: "",
    routes: "",
    output: getInternalPath("a11y-scan-results.json"),
    maxRoutes: config.maxRoutes || 10,
    waitMs: config.waitMs || 2000,
    timeoutMs: config.timeoutMs || 30000,
    headless: config.headless !== undefined ? config.headless : true,
    colorScheme: null,
    screenshotsDir: null,
    excludeSelectors: config.excludeSelectors || [],
    onlyRule: config.onlyRule || null,
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
    if (key === "--exclude-selectors")
      args.excludeSelectors = value.split(",").map((s) => s.trim());
    if (key === "--color-scheme") args.colorScheme = value;
    if (key === "--screenshots-dir") args.screenshotsDir = value;
    i += 1;
  }

  if (!args.baseUrl) throw new Error("Missing required --base-url");
  return args;
}

function normalizePath(rawValue, origin) {
  if (!rawValue) return "";
  try {
    const u = new URL(rawValue, origin);
    if (u.origin !== origin) return "";
    const hashless = `${u.pathname || "/"}${u.search || ""}`;
    return hashless === "" ? "/" : hashless;
  } catch {
    return "";
  }
}

function parseRoutesArg(routesArg, origin) {
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

async function discoverRoutes(page, baseUrl, maxRoutes) {
  const origin = new URL(baseUrl).origin;
  const routes = new Set(["/"]);

  try {
    const hrefs = await page.$$eval("a[href]", (elements) =>
      elements.map((el) => el.getAttribute("href")),
    );
    for (const href of hrefs) {
      const normalized = normalizePath(href, origin);
      if (normalized) routes.add(normalized);
      if (routes.size >= maxRoutes) break;
    }
  } catch (error) {
    log.warn(`Autodiscovery failed on ${baseUrl}: ${error.message}`);
  }

  return [...routes];
}

async function analyzeRoute(
  page,
  routeUrl,
  waitMs,
  axeRules,
  excludeSelectors,
  onlyRule,
  timeoutMs = 30000,
  maxRetries = 2,
) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      await page.goto(routeUrl, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      });
      await page.waitForTimeout(waitMs);

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

      if (
        axeRules &&
        typeof axeRules === "object" &&
        Object.keys(axeRules).length > 0
      ) {
        builder.options({ rules: axeRules });
      }

      const axeResults = await builder.analyze();

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
  const config = loadConfig();
  const args = parseArgs(process.argv.slice(2), config);
  const baseUrl = new URL(args.baseUrl).toString();
  const origin = new URL(baseUrl).origin;

  log.info(`Starting accessibility audit for ${baseUrl}`);

  const pwConfig = config.playwright || {};
  // Determine primary viewport from config or fallback
  const primaryViewport =
    Array.isArray(config.viewports) && config.viewports[0]
      ? { width: config.viewports[0].width, height: config.viewports[0].height }
      : pwConfig.viewport || { width: 1280, height: 720 };

  const browser = await chromium.launch({
    headless: args.headless,
  });
  const context = await browser.newContext({
    viewport: primaryViewport,
    reducedMotion: pwConfig.reducedMotion || "no-preference",
    colorScheme:
      args.colorScheme || config.colorScheme || pwConfig.colorScheme || "light",
    forcedColors: pwConfig.forcedColors || "none",
    locale: pwConfig.locale || "en-US",
  });
  const page = await context.newPage();

  let routes = [];
  try {
    await page.goto(baseUrl, {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    });

    const cliRoutes = parseRoutesArg(args.routes, origin);
    const configRoutes =
      Array.isArray(config.routes) && config.routes.length > 0
        ? config.routes.map((r) => normalizePath(r, origin)).filter(Boolean)
        : [];
    const providedRoutes = cliRoutes.length > 0 ? cliRoutes : configRoutes;

    if (providedRoutes.length > 0) {
      routes = providedRoutes.slice(0, args.maxRoutes);
    } else if (baseUrl.startsWith("file://")) {
      // For local files, if no routes provided, just skip discovery and use the file itself
      routes = [""];
    } else {
      log.info("Autodiscovering routes...");
      routes = await discoverRoutes(page, baseUrl, args.maxRoutes);
    }
  } catch (err) {
    log.error(`Fatal: Could not load base URL ${baseUrl}: ${err.message}`);
    await browser.close();
    process.exit(1);
  }

  log.info(`Targeting ${routes.length} routes: ${routes.join(", ")}`);

  const SKIP_SELECTORS = new Set(["html", "body", "head", ":root", "document"]);

  async function captureElementScreenshot(violation, routeIndex) {
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
      await page
        .locator(selector)
        .first()
        .screenshot({ path: screenshotPath, timeout: 3000 });
      violation.screenshot_path = `screenshots/${filename}`;
    } catch {
      // skip silently — element may be hidden or off-screen
    }
  }

  const results = [];
  const total = routes.length;
  for (let i = 0; i < total; i++) {
    const routePath = routes[i];
    log.info(`[${i + 1}/${total}] Scanning: ${routePath}`);
    const targetUrl = new URL(routePath, baseUrl).toString();
    const result = await analyzeRoute(
      page,
      targetUrl,
      args.waitMs,
      config.axeRules,
      config.excludeSelectors,
      args.onlyRule,
      args.timeoutMs,
    );
    if (args.screenshotsDir && result.violations) {
      for (const violation of result.violations) {
        await captureElementScreenshot(violation, i);
      }
    }
    results.push({ path: routePath, ...result });
  }

  await browser.close();

  const payload = {
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    onlyRule: args.onlyRule || null,
    routes: results,
  };

  writeJson(args.output, payload);
  log.success(`Routes scan complete. Results saved to ${args.output}`);
}

main().catch((error) => {
  log.error(error.message);
  process.exit(1);
});
