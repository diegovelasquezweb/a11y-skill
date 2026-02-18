import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const SKILL_ROOT = path.join(__dirname, "..");

/**
 * Standardized logging with basic console colors
 */
export const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

/**
 * Load a11y.config.json if it exists
 */
export function loadConfig() {
  const configPath = path.join(SKILL_ROOT, "a11y.config.json");
  const defaults = {
    maxRoutes: 10,
    complianceTarget: "WCAG 2.1 AA",
    excludeSelectors: [],
    axeRules: {},
    outputDir: "audit",
    internalDir: "audit/internal",
  };

  if (fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return { ...defaults, ...userConfig };
    } catch (e) {
      log.warn(
        `Failed to parse a11y.config.json: ${e.message}. Using defaults.`,
      );
    }
  }
  return defaults;
}

/**
 * Simplified file writing with directory creation
 */
export function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Simplified file reading
 */
export function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    log.error(`Failed to read JSON from ${filePath}: ${e.message}`);
    return null;
  }
}

/**
 * Get internal storage path for intermediate results
 */
export function getInternalPath(filename) {
  const config = loadConfig();
  return path.join(SKILL_ROOT, config.internalDir, filename);
}
