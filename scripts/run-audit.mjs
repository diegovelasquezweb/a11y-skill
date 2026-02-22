import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { log, loadConfig, SKILL_ROOT } from "./a11y-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printUsage() {
  log.info(`Usage:
  pnpm a11y --base-url <url> [options]

Targeting & Scope:
  --base-url <url>        (Required) The target website to audit.
  --max-routes <num>      Max routes to discover and scan (default: 10).
  --crawl-depth <num>     How deep to follow links during discovery (1-3, default: 2).
  --routes <csv>          Custom list of paths to scan.

Audit Intelligence:
  --target <text>         Compliance target label (default: "WCAG 2.2 AA").
  --only-rule <id>        Only check for this specific rule ID.
  --ignore-findings <csv> Ignore specific rule IDs.
  --exclude-selectors <csv> Exclude CSS selectors from scan.

Execution & Emulation:
  --output <path>         Final HTML report location (default: audit/report.html).
  --color-scheme <val>    Emulate color scheme: "light" or "dark".
  --wait-until <val>      Page load strategy: domcontentloaded|load|networkidle (default: domcontentloaded).
  --framework <val>       Override auto-detected framework (react|vue|angular|svelte|astro|shopify|wordpress|drupal).
  --viewport <WxH>        Viewport dimensions as WIDTHxHEIGHT (e.g., 375x812 for mobile).
  --headed                Run browser in visible mode (overrides headless).
  --skip-reports          Omit HTML and PDF report generation (Focus on AI resolution).
  --wait-ms <num>         Time to wait after page load (default: 2000).
  --timeout-ms <num>      Network timeout (default: 30000).
  -h, --help              Show this help.
`);
}

const SCRIPT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

async function runScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    log.info(`Running: ${scriptName} ${args.join(" ")}`);

    const proc = spawn("node", [scriptPath, ...args], {
      stdio: "inherit",
      cwd: SKILL_ROOT,
    });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(
        new Error(
          `Script ${scriptName} timed out after ${SCRIPT_TIMEOUT_MS / 1000}s`,
        ),
      );
    }, SCRIPT_TIMEOUT_MS);

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start ${scriptName}: ${err.message}`));
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script ${scriptName} failed with exit code ${code}`));
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
  const crawlDepth = getArgValue("crawl-depth") || config.crawlDepth || 2;
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
  const skipReports =
    argv.includes("--skip-reports") || config.skipReports || false;
  const ignoreFindings =
    getArgValue("ignore-findings") ||
    (config.ignoreFindings?.length ? config.ignoreFindings.join(",") : null);
  const excludeSelectors =
    getArgValue("exclude-selectors") ||
    (config.excludeSelectors?.length
      ? config.excludeSelectors.join(",")
      : null);

  const waitUntil = getArgValue("wait-until") || config.waitUntil || null;
  const framework = getArgValue("framework") || config.framework || null;
  const viewportArg = getArgValue("viewport");
  let viewport = null;
  if (viewportArg) {
    const [w, h] = viewportArg.split("x").map(Number);
    if (w && h) viewport = { width: w, height: h };
  }

  if (!baseUrl) {
    log.error("Missing required argument: --base-url");
    log.info("Usage: node scripts/run-audit.mjs --base-url <url> [options]");
    process.exit(1);
  }

  try {
    new URL(baseUrl);
  } catch {
    log.error(
      `Invalid URL: "${baseUrl}". Provide a full URL including protocol (e.g., https://example.com).`,
    );
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

    const gitignorePath = path.join(process.cwd(), ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, "utf-8");
      if (!/^audit\/?$/m.test(content)) {
        fs.appendFileSync(
          gitignorePath,
          "\n# Generated accessibility reports\naudit/\n",
        );
        log.success(".gitignore updated — added audit/ entry.");
      }
    }

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
      "--crawl-depth",
      crawlDepth.toString(),
    ];
    if (!headless) scanArgs.push("--headed");
    if (onlyRule) scanArgs.push("--only-rule", onlyRule);
    if (excludeSelectors)
      scanArgs.push("--exclude-selectors", excludeSelectors);
    if (routes) scanArgs.push("--routes", routes);
    if (colorScheme) scanArgs.push("--color-scheme", colorScheme);
    if (waitUntil) scanArgs.push("--wait-until", waitUntil);
    if (viewport) {
      scanArgs.push("--viewport", `${viewport.width}x${viewport.height}`);
    }

    await runScript("run-scanner.mjs", scanArgs);

    const analyzerArgs = [];
    if (ignoreFindings) analyzerArgs.push("--ignore-findings", ignoreFindings);
    if (framework) analyzerArgs.push("--framework", framework);
    await runScript("run-analyzer.mjs", analyzerArgs);

    const buildArgs = ["--output", output, "--base-url", baseUrl];
    if (target) buildArgs.push("--target", target);

    const mdOutput = path.join(
      path.dirname(absoluteOutputPath),
      "remediation.md",
    );
    const mdArgs = ["--output", mdOutput, "--base-url", baseUrl];
    if (target) mdArgs.push("--target", target);

    if (skipReports) {
      log.info("Skipping HTML and PDF reports per --skip-reports flag.");
      await runScript("build-report-md.mjs", mdArgs);
    } else {
      await Promise.all([
        runScript("build-report-html.mjs", buildArgs),
        runScript("build-report-md.mjs", mdArgs),
      ]);

      const pdfOutput = output.replace(".html", ".pdf");
      await runScript("build-report-pdf.mjs", [output, pdfOutput]);
    }

    log.success(`🎉 Audit complete! Remediation Roadmap ready.`);
    console.log(`REMEDIATION_PATH=${mdOutput}`);
    if (!skipReports) console.log(`REPORT_PATH=${absoluteOutputPath}`);
    const gitignoreExists = fs.existsSync(gitignorePath);
    if (!gitignoreExists) {
      console.log(
        `GITIGNORE_WARNING=No .gitignore found. Add "audit/" manually to avoid committing generated reports.`,
      );
    }
  } catch (error) {
    log.error(error.message);
    process.exit(1);
  }
}

main();
