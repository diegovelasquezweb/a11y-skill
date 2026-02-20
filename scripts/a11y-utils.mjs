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

const CONFIG_SCHEMA = {
  maxRoutes: { type: "number" },
  complianceTarget: { type: "string" },
  routes: { type: "array" },
  excludeSelectors: { type: "array" },
  ignoreFindings: { type: "array" },
  axeRules: { type: "object" },
  outputDir: { type: "string" },
  internalDir: { type: "string" },
  playwright: { type: "object" },
  // Branding
  reportTitle: { type: "string" },
  companyName: { type: "string" },
  accentColor: { type: "string" },
  // Emulation
  colorScheme: { type: "string" },
  viewports: { type: "array" },
  // Timing & Performance
  waitMs: { type: "number" },
  timeoutMs: { type: "number" },
  onlyRule: { type: "string" },
  headless: { type: "boolean" },
};

function validateConfig(userConfig) {
  for (const key of Object.keys(userConfig)) {
    if (!CONFIG_SCHEMA[key]) {
      const closest = Object.keys(CONFIG_SCHEMA).find(
        (k) => k.toLowerCase() === key.toLowerCase(),
      );
      const hint = closest ? ` Did you mean "${closest}"?` : "";
      log.warn(`a11y.config.json: unknown key "${key}".${hint}`);
      continue;
    }
    const expected = CONFIG_SCHEMA[key].type;
    const actual = Array.isArray(userConfig[key])
      ? "array"
      : typeof userConfig[key];
    if (actual !== expected) {
      log.warn(
        `a11y.config.json: "${key}" should be a ${expected}, got ${actual}. Using default.`,
      );
    }
  }
}

/**
 * Load a11y.config.json if it exists
 */
export function loadConfig() {
  const configPath = path.join(SKILL_ROOT, "a11y.config.json");
  const defaults = {
    maxRoutes: 10,
    complianceTarget: "WCAG 2.2 AA",
    excludeSelectors: [],
    axeRules: {},
    outputDir: "audit",
    internalDir: "audit/internal",
    reportTitle: "Accessibility Audit Report",
    companyName: "",
    accentColor: "#6366f1", // Indigo-500
    colorScheme: "light",
    viewports: [{ width: 1280, height: 800, name: "Desktop" }],
    // Visibility Defaults
    headless: true,
  };

  if (fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      validateConfig(userConfig);
      const merged = { ...defaults, ...userConfig };
      const hexColorRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
      if (merged.accentColor && !hexColorRe.test(merged.accentColor)) {
        log.warn(
          `a11y.config.json: invalid accentColor "${merged.accentColor}" — must be a 3 or 6-digit hex (e.g. #6366f1). Using default.`,
        );
        merged.accentColor = defaults.accentColor;
      }
      return merged;
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
