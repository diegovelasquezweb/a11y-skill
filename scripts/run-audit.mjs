import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log, loadConfig } from "./a11y-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.dirname(__dirname);

function printUsage() {
  log.info(`Usage:
  node scripts/run-audit.mjs --base-url <url> [options]

Options:
  --base-url <url>      (Required) The target website to audit.
  --max-routes <num>    Max routes to discover and scan (default: 10).
  --routes <csv>        Custom list of paths to scan.
  --output <path>       Final HTML report location (default: audit/index.html).
  --wait-ms <num>       Time to wait after page load (default: 2000).
  --timeout-ms <num>    Network timeout (default: 30000).
  --headless <bool>     Run browser in background (default: true).
  --title <text>        Custom title for the HTML report.
  --environment <text>  Test environment label (e.g., "Staging").
  --target <text>       Compliance target label (default: "WCAG 2.1 AA").
  --no-open             Do not open the report after audit.
  -h, --help            Show this help.
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
  const waitMs = getArgValue("wait-ms") || 2000;
  const timeoutMs = getArgValue("timeout-ms") || 30000;
  const headless = getArgValue("headless") !== "false";
  const coverageInput =
    getArgValue("coverage") ||
    path.join(SKILL_ROOT, "references", "pdf-coverage-template.json");
  const output = getArgValue("output") || path.join("audit", "index.html");

  const title = getArgValue("title");
  const environment = getArgValue("environment");
  const scope = getArgValue("scope");
  const target = getArgValue("target");

  if (!baseUrl) {
    log.error("Missing required argument: --base-url");
    console.log("Usage: node scripts/run-audit.mjs --base-url <url> [options]");
    process.exit(1);
  }

  try {
    log.info("🚀 Starting full WS Accessibility Audit pipeline...");

    await runScript("check-toolchain.mjs");

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
    ];
    if (routes) scanArgs.push("--routes", routes);

    await runScript("generate-route-checks.mjs", scanArgs);

    await runScript("deterministic-findings.mjs");

    // PDF coverage validation removed for streamlined workflow
    // await runScript("pdf-coverage-validate.mjs", ["--coverage", coverageInput]);

    const buildArgs = ["--output", output];
    if (title) buildArgs.push("--title", title);
    if (environment) buildArgs.push("--environment", environment);
    if (scope) buildArgs.push("--scope", scope);
    if (target) buildArgs.push("--target", target);

    await runScript("build-audit-html.mjs", buildArgs);

    log.success(`🎉 Audit complete! View the report at ${output}`);

    if (!argv.includes("--no-open")) {
      const absoluteOutputPath = path.isAbsolute(output)
        ? output
        : path.join(SKILL_ROOT, output);

      log.info(`Opening report: ${absoluteOutputPath}`);
      let command;
      switch (process.platform) {
        case "darwin": // macOS
          command = `open "${absoluteOutputPath}"`;
          break;
        case "win32": // Windows
          command = `start "" "${absoluteOutputPath}"`;
          break;
        default: // Linux/Other
          command = `xdg-open "${absoluteOutputPath}"`;
          break;
      }

      const { exec } = await import("node:child_process");
      exec(command, (err) => {
        if (err) {
          log.error(`Could not open browser automatically: ${err.message}`);
          log.info(`Manual location: ${absoluteOutputPath}`);
        }
      });
    }
  } catch (error) {
    log.error(error.message);
    process.exit(1);
  }
}

main();
