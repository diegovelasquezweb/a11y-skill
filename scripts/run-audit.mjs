import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log, loadConfig } from "./a11y-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.dirname(__dirname);

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

  const baseUrl = getArgValue("base-url");
  const maxRoutes = getArgValue("max-routes") || config.maxRoutes || 10;
  const coverageInput =
    getArgValue("coverage") ||
    path.join(SKILL_ROOT, "references", "pdf-coverage-template.json");

  if (!baseUrl) {
    log.error("Missing required argument: --base-url");
    console.log(
      "Usage: node scripts/run-audit.mjs --base-url <url> [--max-routes <n>]",
    );
    process.exit(1);
  }

  try {
    log.info("🚀 Starting full Wondersauce Accessibility Audit pipeline...");

    // 1. Toolchain Check
    await runScript("check-toolchain.mjs");

    // 2. Generate Scan Results
    await runScript("generate-route-checks.mjs", [
      "--base-url",
      baseUrl,
      "--max-routes",
      maxRoutes.toString(),
    ]);

    // 3. Process Findings
    await runScript("deterministic-findings.mjs");

    // 4. Validate Coverage
    await runScript("pdf-coverage-validate.mjs", ["--coverage", coverageInput]);

    // 5. Build HTML Report
    await runScript("build-audit-html.mjs");

    log.success("🎉 Audit complete! View the report at audit/index.html");
  } catch (error) {
    log.error(error.message);
    process.exit(1);
  }
}

main();
