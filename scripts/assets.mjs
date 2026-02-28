/**
 * @file assets.mjs
 * @description Centralized asset paths and JSON loaders for the a11y skill.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_ROOT = path.join(__dirname, "..", "assets");

export const ASSET_PATHS = {
  discovery: {
    crawlerConfig: path.join(ASSET_ROOT, "discovery", "crawler-config.json"),
    stackDetection: path.join(
      ASSET_ROOT,
      "discovery",
      "stack-detection.json",
    ),
    sourceGlobs: path.join(ASSET_ROOT, "discovery", "source-globs.json"),
  },
  remediation: {
    intelligence: path.join(ASSET_ROOT, "remediation", "intelligence.json"),
    platformAliases: path.join(
      ASSET_ROOT,
      "remediation",
      "platform-aliases.json",
    ),
    guardrails: path.join(ASSET_ROOT, "remediation", "guardrails.json"),
  },
  scoring: {
    wcagReference: path.join(ASSET_ROOT, "scoring", "wcag-reference.json"),
    complianceConfig: path.join(
      ASSET_ROOT,
      "scoring",
      "compliance-config.json",
    ),
  },
  reporting: {
    manualChecks: path.join(ASSET_ROOT, "reporting", "manual-checks.json"),
  },
};

export function loadAssetJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    throw new Error(`Missing or invalid ${label} — reinstall the skill.`);
  }
}
