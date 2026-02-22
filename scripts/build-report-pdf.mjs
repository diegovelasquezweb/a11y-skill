#!/usr/bin/env node

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "./a11y-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generatePdf() {
  const args = process.argv.slice(2);
  const inputPath = args[0];
  const outputPath = args[1];

  if (!inputPath || !outputPath) {
    log.error("Usage: node build-report-pdf.mjs <input.html> <output.pdf>");
    process.exit(1);
  }

  log.info(`Generating PDF from ${inputPath}...`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the local file
    const fileUrl = `file://${path.resolve(inputPath)}`;
    await page.goto(fileUrl, { waitUntil: "load" });

    // Wait for web fonts to finish loading (replaces fixed 1s delay)
    await page.evaluate(() => document.fonts.ready);

    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "1cm",
        right: "1cm",
        bottom: "1cm",
        left: "1cm",
      },
      displayHeaderFooter: false,
    });

    log.success(`PDF report generated: ${outputPath}`);
  } catch (error) {
    log.error(`Failed to generate PDF: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

generatePdf();
