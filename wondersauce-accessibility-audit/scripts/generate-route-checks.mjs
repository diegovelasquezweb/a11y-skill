#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    baseUrl: "",
    routes: "",
    output: "/tmp/wondersauce-route-checks.json",
    maxRoutes: 20,
    waitMs: 800,
    timeoutMs: 15000,
    headless: true
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--headed") {
      args.headless = false;
      continue;
    }

    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    if (key === "--base-url") args.baseUrl = value;
    if (key === "--routes") args.routes = value;
    if (key === "--output") args.output = value;
    if (key === "--max-routes") args.maxRoutes = Number.parseInt(value, 10);
    if (key === "--wait-ms") args.waitMs = Number.parseInt(value, 10);
    if (key === "--timeout-ms") args.timeoutMs = Number.parseInt(value, 10);
    i += 1;
  }

  if (!args.baseUrl) throw new Error("Missing required --base-url");
  if (!Number.isInteger(args.maxRoutes) || args.maxRoutes <= 0) throw new Error("Invalid --max-routes");
  if (!Number.isInteger(args.waitMs) || args.waitMs < 0) throw new Error("Invalid --wait-ms");
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs <= 0) throw new Error("Invalid --timeout-ms");

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

async function loadPlaywright() {
  try {
    const mod = await import("playwright");
    if (!mod.chromium) throw new Error("playwright.chromium not available");
    return mod;
  } catch {
    throw new Error(
      "Playwright is required for generate-route-checks.mjs. Install it with: pnpm add -D playwright"
    );
  }
}

async function discoverRoutes(page, baseUrl, maxRoutes) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  const origin = new URL(baseUrl).origin;

  const discovered = await page.evaluate(() => {
    const links = [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href") || "")
      .filter(Boolean);
    return links;
  });

  const routes = new Set(["/"]);
  for (const href of discovered) {
    const normalized = normalizePath(href, origin);
    if (!normalized) continue;
    routes.add(normalized);
    if (routes.size >= maxRoutes) break;
  }

  return [...routes];
}

async function collectChecksForRoute(page, baseUrl, routePath, timeoutMs, waitMs) {
  const targetUrl = new URL(routePath, baseUrl).toString();
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  if (waitMs > 0) await page.waitForTimeout(waitMs);

  const checks = await page.evaluate(() => {
    const MAX_ITEMS = 30;
    const FOCUSABLE_SELECTOR = [
      "a[href]",
      "button",
      "input",
      "select",
      "textarea",
      "[tabindex]"
    ].join(",");

    function cssEscape(value) {
      if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
      return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    }

    function selectorFor(el) {
      if (!(el instanceof Element)) return "(unknown)";
      if (el.id) return `#${cssEscape(el.id)}`;
      const parts = [];
      let current = el;
      let depth = 0;
      while (current && current.nodeType === Node.ELEMENT_NODE && depth < 4) {
        const tag = current.tagName.toLowerCase();
        const parent = current.parentElement;
        if (!parent) {
          parts.unshift(tag);
          break;
        }
        const siblings = [...parent.children].filter((node) => node.tagName === current.tagName);
        const idx = siblings.indexOf(current);
        parts.unshift(idx > 0 ? `${tag}:nth-of-type(${idx + 1})` : tag);
        current = parent;
        depth += 1;
      }
      return parts.join(" > ");
    }

    function hasVisibleText(el) {
      return (el.textContent || "").trim().length > 0;
    }

    function hasAccessibleName(el) {
      if (!(el instanceof Element)) return false;
      if (hasVisibleText(el)) return true;
      if ((el.getAttribute("aria-label") || "").trim()) return true;
      if ((el.getAttribute("aria-labelledby") || "").trim()) return true;
      if ((el.getAttribute("title") || "").trim()) return true;
      const imgAlt = [...el.querySelectorAll("img")]
        .map((img) => (img.getAttribute("alt") || "").trim())
        .filter(Boolean);
      return imgAlt.length > 0;
    }

    function isFocusable(el) {
      if (!(el instanceof Element)) return false;
      if (!el.matches(FOCUSABLE_SELECTOR)) return false;
      const tabindex = el.getAttribute("tabindex");
      if (tabindex !== null && Number.parseInt(tabindex, 10) < 0) return false;
      return true;
    }

    function withSelectors(list) {
      return list.slice(0, MAX_ITEMS).map((el) => ({ selector: selectorFor(el) }));
    }

    const mainCount = document.querySelectorAll("main, [role=\"main\"]").length;
    const h1Count = document.querySelectorAll("h1").length;
    const skipLinkCount = document.querySelectorAll(
      'a[href="#main"],a[href="#main-content"],a[href^="#main-"]'
    ).length;

    const unlabeledFormControls = [...document.querySelectorAll("input, select, textarea")]
      .filter((el) => !(el instanceof HTMLInputElement && el.type === "hidden"))
      .filter((el) => {
        const id = el.getAttribute("id") || "";
        const hasForLabel = id ? document.querySelector(`label[for="${cssEscape(id)}"]`) : null;
        const hasWrappingLabel = el.closest("label");
        const hasAria = (el.getAttribute("aria-label") || "").trim() || (el.getAttribute("aria-labelledby") || "").trim();
        return !hasForLabel && !hasWrappingLabel && !hasAria;
      });

    const unnamedButtons = [...document.querySelectorAll("button,[role='button']")]
      .filter((el) => !hasAccessibleName(el));

    const unnamedLinks = [...document.querySelectorAll("a[href]")]
      .filter((el) => !hasAccessibleName(el));

    const ariaHiddenFocusable = [...document.querySelectorAll('[aria-hidden="true"]')]
      .filter((el) => isFocusable(el) || !!el.querySelector(FOCUSABLE_SELECTOR));

    const nonSemanticClickables = [...document.querySelectorAll("div[onclick], span[onclick], div[role='button'], span[role='button']")]
      .filter((el) => !el.matches("button"));

    const passwordAutocompleteOff = [...document.querySelectorAll('input[type="password"]')]
      .filter((el) => (el.getAttribute("autocomplete") || "").trim().toLowerCase() === "off");

    const passwordPasteBlocked = [...document.querySelectorAll('input[type="password"]')]
      .filter((el) => el.hasAttribute("onpaste"));

    return {
      h1Count,
      mainCount,
      skipLinkCount,
      unlabeledFormControls: withSelectors(unlabeledFormControls),
      unnamedButtons: withSelectors(unnamedButtons),
      unnamedLinks: withSelectors(unnamedLinks),
      ariaHiddenFocusable: withSelectors(ariaHiddenFocusable),
      nonSemanticClickables: withSelectors(nonSemanticClickables),
      passwordAutocompleteOff: withSelectors(passwordAutocompleteOff),
      passwordPasteBlocked: withSelectors(passwordPasteBlocked)
    };
  });

  return { path: routePath, url: targetUrl, checks };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pw = await loadPlaywright();
  const browser = await pw.chromium.launch({ headless: args.headless });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    const baseUrl = new URL(args.baseUrl).toString();
    const origin = new URL(baseUrl).origin;

    const providedRoutes = parseRoutesArg(args.routes, origin);
    const routes = providedRoutes.length > 0
      ? providedRoutes.slice(0, args.maxRoutes)
      : await discoverRoutes(page, baseUrl, args.maxRoutes);

    const results = [];
    for (const routePath of routes) {
      const result = await collectChecksForRoute(page, baseUrl, routePath, args.timeoutMs, args.waitMs);
      results.push(result);
    }

    const payload = {
      generated_at: new Date().toISOString(),
      base_url: baseUrl,
      routes: results
    };

    const outputPath = path.resolve(args.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
    console.log(`Route checks written to ${outputPath}`);
    console.log(`Routes analyzed: ${results.length}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
