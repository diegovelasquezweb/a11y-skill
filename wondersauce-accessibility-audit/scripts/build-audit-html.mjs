#!/usr/bin/env node
/**
 * Build a single HTML view from markdown issue files.
 * No third-party dependencies.
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    inputDir: "audit",
    output: "",
    prefix: "A11Y-",
    title: "Accessibility Audit"
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;
    if (key === "--input-dir") args.inputDir = value;
    if (key === "--output") args.output = value;
    if (key === "--prefix") args.prefix = value;
    if (key === "--title") args.title = value;
    i += 1;
  }

  return args;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function extractField(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(`^- ${escaped}:\\s*(.*)$`, "m");
  const match = text.match(rx);
  return match ? match[1].trim() : "";
}

function extractSection(text, heading) {
  const marker = `## ${heading}`;
  const start = text.indexOf(marker);
  if (start === -1) return "";
  const contentStart = text.indexOf("\n", start);
  if (contentStart === -1) return "";

  const nextHeading = text.indexOf("\n## ", contentStart + 1);
  const raw = nextHeading === -1
    ? text.slice(contentStart + 1)
    : text.slice(contentStart + 1, nextHeading + 1);

  return raw.trim();
}

function extractReproSteps(text) {
  const section = extractSection(text, "Reproduction");
  if (!section) return [];
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, ""));
}

function formatTextBlock(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function isImageSource(value) {
  const normalized = value.toLowerCase().split("#")[0].split("?")[0];
  if (normalized.startsWith("data:image/")) return true;
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"].some((ext) =>
    normalized.endsWith(ext)
  );
}

function resolveEvidence(rawPath, issueFile, outputDir) {
  const raw = rawPath.trim();
  if (!raw) return { kind: "none", value: "" };
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return { kind: "resolved", value: raw };
  }

  const candidates = [];
  if (path.isAbsolute(raw)) {
    candidates.push(raw);
  } else {
    candidates.push(path.resolve(path.dirname(issueFile), raw));
    candidates.push(path.resolve(process.cwd(), raw));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { kind: "resolved", value: path.relative(outputDir, candidate).split(path.sep).join("/") };
    }
  }

  return { kind: "missing", value: raw };
}

function buildIssueCard(issueFile, outputDir) {
  const text = fs.readFileSync(issueFile, "utf-8");

  const id = extractField(text, "ID") || path.basename(issueFile, ".md");
  const title = extractField(text, "Title") || id;
  const severity = extractField(text, "Severity") || "Unknown";
  const wcag = extractField(text, "WCAG Criterion");
  const area = extractField(text, "Affected Area");
  const issueUrl = extractField(text, "URL");
  const selector = extractField(text, "DOM selector / component ID");
  const evidenceRaw = extractField(text, "Screenshot / recording");
  const evidence = resolveEvidence(evidenceRaw, issueFile, outputDir);

  const actual = extractSection(text, "Actual Behavior");
  const expected = extractSection(text, "Expected Behavior");
  const impact = extractSection(text, "User Impact");
  const fix = extractSection(text, "Recommended Fix");
  const reproSteps = extractReproSteps(text);

  const issueLink = path.relative(outputDir, issueFile).split(path.sep).join("/");
  const reproHtml = reproSteps.length > 0
    ? reproSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")
    : "<li>Reproduction steps not provided.</li>";
  const evidenceHtml = evidence.kind === "resolved"
    ? (isImageSource(evidence.value)
      ? `<img src="${escapeHtml(evidence.value)}" alt="Evidence for ${escapeHtml(id)}" loading="lazy">`
      : `<p><a href="${escapeHtml(evidence.value)}">Open evidence artifact</a></p>`)
    : (evidence.kind === "missing"
      ? `<div class="no-image">Evidence path not found: <code>${escapeHtml(evidence.value)}</code></div>`
      : '<div class="no-image">No screenshot linked for this issue</div>');

  return `
<article class="issue">
  <header>
    <h2>${escapeHtml(id)} - ${escapeHtml(title)}</h2>
    <p><strong>Severity:</strong> ${escapeHtml(severity)} | <strong>WCAG:</strong> ${escapeHtml(wcag)} | <strong>Area:</strong> ${escapeHtml(area)}</p>
    <p><strong>URL:</strong> ${escapeHtml(issueUrl)}</p>
    <p><strong>Selector:</strong> ${escapeHtml(selector)}</p>
    <p><a href="${escapeHtml(issueLink)}">Open issue markdown</a></p>
  </header>
  <div class="grid">
    <section>
      <h3>Reproduction</h3>
      <ol>${reproHtml}</ol>
      <h3>Actual</h3>
      <p>${formatTextBlock(actual)}</p>
      <h3>Expected</h3>
      <p>${formatTextBlock(expected)}</p>
      <h3>Impact</h3>
      <p>${formatTextBlock(impact)}</p>
      <h3>Recommended fix</h3>
      <p>${formatTextBlock(fix)}</p>
    </section>
    <section class="evidence">
      <h3>Evidence</h3>
      ${evidenceHtml}
    </section>
  </div>
</article>`;
}

function buildHtml(title, cards) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 24px; }
    h1 { margin: 0 0 16px; }
    .issue { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .issue h2 { margin: 0 0 8px; font-size: 20px; }
    .issue p { margin: 4px 0; }
    .grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin-top: 12px; }
    .grid h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .03em; color: #334155; margin: 12px 0 6px; }
    .evidence img { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; }
    .no-image { border: 1px dashed #cbd5e1; border-radius: 8px; padding: 18px; color: #64748b; }
    @media (max-width: 960px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${cards}
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = path.resolve(args.inputDir);
  const outputPath = args.output
    ? path.resolve(args.output)
    : path.resolve(args.inputDir, "index.html");
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(inputDir)) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }

  const issueFiles = fs
    .readdirSync(inputDir)
    .filter((name) => name.startsWith(args.prefix) && name.endsWith(".md"))
    .sort()
    .map((name) => path.join(inputDir, name));

  if (issueFiles.length === 0) {
    console.log("Congratulations, no issues found.");
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const cards = issueFiles.map((file) => buildIssueCard(file, outputDir)).join("\n");
  fs.writeFileSync(outputPath, buildHtml(args.title, cards), "utf-8");

  console.log(`HTML report written to ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
