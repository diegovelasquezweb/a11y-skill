import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { log, loadConfig } from "./a11y-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.dirname(__dirname);

function printUsage() {
  log.info(`Usage:
  pnpm audit --base-url <url> [options]

Targeting & Scope:
  --base-url <url>        (Required) The target website to audit.
  --max-routes <num>      Max routes to discover and scan (default: 10).
  --routes <csv>          Custom list of paths to scan.

Audit Intelligence:
  --target <text>         Compliance target label (default: "WCAG 2.2 AA").
  --only-rule <id>        Only check for this specific rule ID.
  --ignore-findings <csv> Ignore specific rule IDs.
  --exclude-selectors <csv> Exclude CSS selectors from scan.

Execution & Emulation:
  --output <path>         Final HTML report location (default: audit/report.html).
  --color-scheme <val>    Emulate color scheme: "light" or "dark".
  --headed                Run browser in visible mode (overrides headless).
  --wait-ms <num>         Time to wait after page load (default: 2000).
  --timeout-ms <num>      Network timeout (default: 30000).
  -h, --help              Show this help.
`);
}

async function runScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    log.info(`Running: ${scriptName} ${args.join(" ")}`);

    const proc = spawn("node", [scriptPath, ...args], {
      stdio: "inherit",
      cwd: SKILL_ROOT,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script ${scriptName} failed with code ${code}`));
      }
    });
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const config = loadConfig();

  function getArgValue(name) {
    const entry = argv.find((a) => a.startsWith(`--${name}=`));
    if (entry) return entry.split("=")[1];
    const index = argv.indexOf(`--${name}`);
    if (index !== -1 && argv[index + 1]) return argv[index + 1];
    return null;
  }

  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const baseUrl = getArgValue("base-url");
  const maxRoutes = getArgValue("max-routes") || config.maxRoutes || 10;
  const routes = getArgValue("routes");
  const waitMs = getArgValue("wait-ms") || config.waitMs || 2000;
  const timeoutMs = getArgValue("timeout-ms") || config.timeoutMs || 30000;
  const output =
    getArgValue("output") || path.join(process.cwd(), "audit", "report.html");

  const colorScheme = getArgValue("color-scheme");
  const target = getArgValue("target");
  const headless = argv.includes("--headless")
    ? getArgValue("headless") === "true"
    : argv.includes("--headed")
      ? false
      : config.headless;

  const onlyRule = getArgValue("only-rule") || config.onlyRule;
  const ignoreFindings =
    getArgValue("ignore-findings") ||
    (config.ignoreFindings?.length ? config.ignoreFindings.join(",") : null);
  const excludeSelectors =
    getArgValue("exclude-selectors") ||
    (config.excludeSelectors?.length
      ? config.excludeSelectors.join(",")
      : null);

  if (!baseUrl) {
    log.error("Missing required argument: --base-url");
    console.log("Usage: node scripts/run-audit.mjs --base-url <url> [options]");
    process.exit(1);
  }

  try {
    log.info("🚀 Starting full WS Accessibility Audit pipeline...");

    const nodeModulesPath = path.join(SKILL_ROOT, "node_modules");
    if (!fs.existsSync(nodeModulesPath)) {
      log.info(
        "First run detected — installing skill dependencies (one-time setup)...",
      );
      execSync("pnpm install", { cwd: SKILL_ROOT, stdio: "ignore" });
      log.success("Dependencies ready.");
    }

    await runScript("check-toolchain.mjs");

    const absoluteOutputPath = path.isAbsolute(output)
      ? output
      : path.join(process.cwd(), output);
    const screenshotsDir = path.join(
      path.dirname(absoluteOutputPath),
      "screenshots",
    );

    const scanArgs = [
      "--base-url",
      baseUrl,
      "--max-routes",
      maxRoutes.toString(),
      "--wait-ms",
      waitMs.toString(),
      "--timeout-ms",
      timeoutMs.toString(),
      "--headless",
      headless.toString(),
      "--screenshots-dir",
      screenshotsDir,
    ];
    if (!headless) scanArgs.push("--headed");
    if (onlyRule) scanArgs.push("--only-rule", onlyRule);
    if (excludeSelectors)
      scanArgs.push("--exclude-selectors", excludeSelectors);
    if (routes) scanArgs.push("--routes", routes);
    if (colorScheme) scanArgs.push("--color-scheme", colorScheme);

    await runScript("run-scanner.mjs", scanArgs);

    const analyzerArgs = [];
    if (ignoreFindings) analyzerArgs.push("--ignore-findings", ignoreFindings);
    await runScript("run-analyzer.mjs", analyzerArgs);

    const buildArgs = ["--output", output, "--base-url", baseUrl];
    if (target) buildArgs.push("--target", target);

    await runScript("build-report-html.mjs", buildArgs);

    const mdOutput = path.join(
      path.dirname(absoluteOutputPath),
      "remediation.md",
    );
    const mdArgs = ["--output", mdOutput, "--base-url", baseUrl];
    if (target) mdArgs.push("--target", target);
    await runScript("build-report-md.mjs", mdArgs);

    const pdfOutput = output.replace(".html", ".pdf");
    await runScript("build-report-pdf.mjs", [output, pdfOutput]);

    log.success(`🎉 Audit complete!`);
    console.log(`REPORT_PATH=${absoluteOutputPath}`);
  } catch (error) {
    log.error(error.message);
    process.exit(1);
  }
}

main();
