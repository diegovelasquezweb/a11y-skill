import { SKILL_ROOT, log } from "./a11y-utils.mjs";
import fs from "node:fs";
import path from "node:path";

function printUsage() {
  log.info(`Usage:
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
  try {
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
    fix: "Run './scripts/setup.sh' to initialize the skill dependencies.",
  });

  const pwOk = checkPlaywrightBrowsers();
  checks.push({
    tool: "Playwright installed",
    required: true,
    ok: pwOk,
    fix: "Run './scripts/setup.sh' (browsers should install automatically via postinstall or verify with 'npx playwright install').",
  });

  const blockers = checks.filter((c) => c.required && !c.ok);
  const result = {
    checked_at: new Date().toISOString(),
    checks,
    blockers: blockers.map((b) => ({ tool: b.tool, fix: b.fix })),
    ok: blockers.length === 0,
  };

  if (result.ok) {
    log.success("Toolchain is ready.");
  } else {
    log.error(`Toolchain has ${blockers.length} blockers.`);
    process.exit(1);
  }
}

main().catch((error) => {
  log.error(error.message);
  process.exit(1);
});
