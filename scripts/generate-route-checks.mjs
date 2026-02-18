#!/usr/bin/env node

import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { log, loadConfig, writeJson, getInternalPath } from "./a11y-utils.mjs";
import path from "node:path";
import fs from "node:fs";

function printUsage() {
  log.info(`Usage:
  node generate-route-checks.mjs --base-url <url> [options]

Options:
  --routes <csv|newline>   Optional route list (same-origin paths/urls)
  --output <path>          Output JSON path (default: audit/internal/a11y-scan-results.json)
  --max-routes <number>    Max routes to analyze (default: 10)
  --wait-ms <number>       Time to wait after load (default: 2000)
  --timeout-ms <number>    Request timeout (default: 30000)
  --headless <boolean>     Run headless (default: true)
  -h, --help               Show this help
`);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const config = loadConfig();

  const args = {
    baseUrl: "",
    routes: "",
    output: getInternalPath("a11y-scan-results.json"),
    maxRoutes: config.maxRoutes,
    waitMs: 2000,
    timeoutMs: 30000,
    headless: true,
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

async function analyzeRoute(page, routeUrl, waitMs) {
  log.info(`Analyzing ${routeUrl}...`);
  try {
    await page.goto(routeUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(waitMs);

    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

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
    log.error(`Error analyzing ${routeUrl}: ${error.message}`);
    return {
      url: routeUrl,
      error: error.message,
      violations: [],
      metadata: {},
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = new URL(args.baseUrl).toString();
  const origin = new URL(baseUrl).origin;

  log.info(`Starting accessibility audit for ${baseUrl}`);

  const browser = await chromium.launch({ headless: args.headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  let routes = [];
  try {
    await page.goto(baseUrl, {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    });

    const providedRoutes = parseRoutesArg(args.routes, origin);
    if (providedRoutes.length > 0) {
      routes = providedRoutes.slice(0, args.maxRoutes);
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

  const results = [];
  for (const routePath of routes) {
    const targetUrl = new URL(routePath, baseUrl).toString();
    const result = await analyzeRoute(page, targetUrl, args.waitMs);
    results.push({ path: routePath, ...result });
  }

  await browser.close();

  const payload = {
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    routes: results,
  };

  writeJson(args.output, payload);
  log.success(`Routes scan complete. Results saved to ${args.output}`);
}

main().catch((error) => {
  log.error(error.message);
  process.exit(1);
});
