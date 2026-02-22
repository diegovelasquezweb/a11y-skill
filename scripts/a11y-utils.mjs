import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const SKILL_ROOT = path.join(__dirname, "..");

export const DEFAULTS = {
  maxRoutes: 10,
  crawlDepth: 2,
  complianceTarget: "WCAG 2.2 AA",
  colorScheme: "light",
  viewports: [{ width: 1280, height: 800, name: "Desktop" }],
  headless: true,
  waitMs: 2000,
  timeoutMs: 30000,
  waitUntil: "domcontentloaded",
};

export const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg, hint = "") => {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
    if (hint) {
      console.log(`\x1b[35m[TROUBLESHOOTING]\x1b[0m ${hint}`);
    }
  },
};

export function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    log.error(`Failed to read JSON from ${filePath}: ${e.message}`);
    return null;
  }
}

export function getInternalPath(filename) {
  return path.join(SKILL_ROOT, "audit", "internal", filename);
}
