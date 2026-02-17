#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const RULES = [
  {
    pattern: /core task blocked|cannot complete|keyboard trap|inaccessible login/i,
    minimum: "Critical",
    reason: "Issue text indicates a blocker for core user tasks."
  },
  {
    pattern: /checkout|payment|authentication|sign in|screen reader cannot/i,
    minimum: "High",
    reason: "Issue impacts critical flow or key assistive technology behavior."
  },
  {
    pattern: /contrast|focus indicator|aria-|label missing/i,
    minimum: "Medium",
    reason: "Issue indicates a notable accessibility barrier."
  }
];

function parseArgs(argv) {
  const args = {
    path: "audit",
    globPrefix: "A11Y-"
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    if (key === "--path") args.path = value;
    if (key === "--glob-prefix") args.globPrefix = value;
    i += 1;
  }

  return args;
}

function parseDeclaredSeverity(content) {
  const match = content.match(/^- Severity:\s*(Critical|High|Medium|Low)\s*$/m);
  return match ? match[1] : null;
}

function inferMinimum(content) {
  for (const rule of RULES) {
    if (rule.pattern.test(content)) return rule;
  }
  return null;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const declared = parseDeclaredSeverity(content);
  if (!declared) {
    return { ok: false, message: "Missing '- Severity: ...' line" };
  }

  const inferred = inferMinimum(content);
  if (!inferred) {
    return { ok: true, message: `OK: no rule trigger, declared severity '${declared}' accepted` };
  }

  if (SEVERITY_ORDER[declared] > SEVERITY_ORDER[inferred.minimum]) {
    return {
      ok: false,
      message: `Declared '${declared}' is lower than inferred minimum '${inferred.minimum}'. ${inferred.reason}`
    };
  }

  return { ok: true, message: `OK: declared '${declared}' meets inferred minimum '${inferred.minimum}'` };
}

function listIssueFiles(targetPath, prefix) {
  if (fs.statSync(targetPath).isFile()) return [targetPath];

  return fs
    .readdirSync(targetPath)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".md"))
    .sort()
    .map((name) => path.join(targetPath, name));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.path)) {
    throw new Error(`Path not found: ${args.path}`);
  }

  const files = listIssueFiles(args.path, args.globPrefix);
  if (files.length === 0) {
    console.log("Congratulations, no issues found.");
    return;
  }

  let hasFailures = false;
  for (const filePath of files) {
    const result = checkFile(filePath);
    const status = result.ok ? "PASS" : "FAIL";
    console.log(`[${status}] ${filePath}: ${result.message}`);
    if (!result.ok) hasFailures = true;
  }

  if (hasFailures) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
