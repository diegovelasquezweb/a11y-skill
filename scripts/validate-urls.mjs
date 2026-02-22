/**
 * @file validate-urls.mjs
 * @description On-demand URL validator for local intelligence data.
 * This script checks all URLs referenced in `rule-metadata.json` and `manual-checks.json`
 * to ensure they are reachable and not producing broken links or unexpected redirects.
 *
 * Note: This is an internal maintenance utility and not part of the standard audit pipeline.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load intelligence metadata from assets.
 */
const ruleMetadata = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../assets/rule-metadata.json"),
    "utf-8",
  ),
);
const manualChecks = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../assets/manual-checks.json"),
    "utf-8",
  ),
);

/** @type {Map<string, string>} Map of unique URLs to their source identifiers. */
const urls = new Map();

/**
 * Recursively collects URLs from a given metadata object.
 * @param {string} source - Label indicating the origin of the URLs for error reporting.
 * @param {Object} obj - The object to scan for URL strings.
 */
function collect(source, obj) {
  for (const [key, url] of Object.entries(obj)) {
    if (typeof url === "string" && url.startsWith("https://")) {
      urls.set(url, `${source}.${key}`);
    }
  }
}

collect("mdn", ruleMetadata.mdn || {});
collect("apgPatterns", ruleMetadata.apgPatterns || {});

// Collect URLs from manual test criteria references.
for (const check of manualChecks) {
  if (check.ref) {
    urls.set(check.ref, `manual-checks[${check.criterion}]`);
  }
}

console.log(`Validating ${urls.size} unique URLs...\n`);

/** @const {number} Max number of concurrent HTTP requests for validation. */
const CONCURRENCY = 10;
/** @const {number} Request timeout in milliseconds for each URL check. */
const TIMEOUT_MS = 10000;

let ok = 0;
let redirected = 0;
let broken = 0;
/** @type {Array<{url: string, source: string, status: number|string, type: string}>} Array of encountered URL issues. */
const issues = [];

/**
 * Validates a single URL by performing a HEAD request and tracking status.
 * @param {string} url - The absolute URL to validate.
 * @param {string} source - The source location identifier.
 * @returns {Promise<void>} Resolves once validation is complete.
 */
async function checkUrl(url, source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
      headers: { "User-Agent": "a11y-skill-url-validator/1.1" },
    });
    clearTimeout(timer);

    if (res.status >= 200 && res.status < 300) {
      ok++;
    } else if (res.status >= 300 && res.status < 400) {
      redirected++;
      issues.push({ url, source, status: res.status, type: "redirect" });
    } else {
      broken++;
      issues.push({ url, source, status: res.status, type: "broken" });
    }
  } catch (err) {
    clearTimeout(timer);
    broken++;
    issues.push({
      url,
      source,
      status: err.name === "AbortError" ? "TIMEOUT" : err.code || err.message,
      type: "error",
    });
  }
}

/**
 * Orchestrates the batch processing logic for concurrent URL validation.
 * @returns {Promise<void>}
 */
async function runValidation() {
  const entries = [...urls.entries()];
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(([url, source]) => checkUrl(url, source)));
    process.stdout.write(
      `\r  Checked ${Math.min(i + CONCURRENCY, entries.length)}/${entries.length}`,
    );
  }

  console.log("\n");

  // Output final summary and detailed error reporting.
  if (issues.length === 0) {
    console.log(`All ${ok} URLs are valid.`);
  } else {
    if (issues.some((i) => i.type === "broken" || i.type === "error")) {
      console.log("BROKEN / ERROR:");
      for (const i of issues.filter(
        (i) => i.type === "broken" || i.type === "error",
      )) {
        console.log(`  [${i.status}] ${i.source}`);
        console.log(`         ${i.url}`);
      }
      console.log();
    }
    if (issues.some((i) => i.type === "redirect")) {
      console.log("REDIRECTED (may need URL update):");
      for (const i of issues.filter((i) => i.type === "redirect")) {
        console.log(`  [${i.status}] ${i.source}`);
        console.log(`         ${i.url}`);
      }
      console.log();
    }
    console.log(
      `Summary: ${ok} ok, ${redirected} redirected, ${broken} broken/error`,
    );
  }

  process.exit(broken > 0 ? 1 : 0);
}

// Start the validation process.
runValidation().catch((err) => {
  console.error(`Validation Failure: ${err.message}`);
  process.exit(1);
});
