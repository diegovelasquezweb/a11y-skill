#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILL_ROOT = path.resolve(__dirname, "..");

function printUsage() {
  console.log(`Usage:
  node check-toolchain.mjs [options]

Options:
  --project <path>         Project path (kept for compatibility, unused for dependency check)
  -h, --help               Show this help
`);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }
  return {};
}

function checkNodeModules() {
  const nodeModulesPath = path.join(SKILL_ROOT, "node_modules");
  return fs.existsSync(nodeModulesPath);
}

function checkPlaywrightBrowsers() {
  // Check if playwright browsers are installed by running a lightweight command
  // or checking the cache directory. Ideally we just try to require it or run `npx playwright --version`.
  // Since we are in the skill directory, we can check for the executable or just assume if modules are there, it's likely okay,
  // but better to be safe. We'll rely on the node_modules check primarily,
  // and maybe try to import it to see if it throws.

  try {
    // Attempt to resolve playwright from the skill's node_modules
    const pwPath = path.resolve(SKILL_ROOT, "node_modules", "playwright");
    if (!fs.existsSync(pwPath)) return false;
    return true;
  } catch {
    return false;
  }
}

async function main() {
  parseArgs(process.argv.slice(2));
  const checks = [];

  const modulesOk = checkNodeModules();
  checks.push({
    tool: "Local dependencies (node_modules)",
    required: true,
    ok: modulesOk,
    fix: "Run 'npm install' inside the wondersauce-accessibility-audit directory.",
  });

  const pwOk = checkPlaywrightBrowsers();
  checks.push({
    tool: "Playwright installed",
    required: true,
    ok: pwOk,
    fix: "Run 'npm install' (browsers should install automatically via postinstall or verify with 'npx playwright install').",
  });

  const blockers = checks.filter((c) => c.required && !c.ok);
  const result = {
    checked_at: new Date().toISOString(),
    checks,
    blockers: blockers.map((b) => ({ tool: b.tool, fix: b.fix })),
    ok: blockers.length === 0,
  };

  console.log(JSON.stringify(result, null, 2));

  if (blockers.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
