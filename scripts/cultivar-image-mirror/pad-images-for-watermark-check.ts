import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

interface ImageMeta {
  fileName: string;
  inputPath: string;
  outputPath: string;
  width: number;
  height: number;
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_ROOT = path.resolve(SCRIPT_DIR, "output");
const DEFAULT_INPUT_DIR = path.join(DEFAULT_OUTPUT_ROOT, "images");
const DEFAULT_REPORT_DIR = path.join(DEFAULT_OUTPUT_ROOT, "watermark-check");
const DEFAULT_PADDED_DIR = path.join(DEFAULT_REPORT_DIR, "padded-images");

function parseArgs() {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    if (idx === -1) return undefined;
    return args[idx + 1];
  };

  const inputDir = path.resolve(getArg("--input-dir") ?? DEFAULT_INPUT_DIR);
  const reportDir = path.resolve(getArg("--report-dir") ?? DEFAULT_REPORT_DIR);
  const paddedDir = path.resolve(getArg("--padded-dir") ?? DEFAULT_PADDED_DIR);
  const targetWidthArg = getArg("--target-width");
  const background = getArg("--background") ?? "#111111";

  const targetWidth = targetWidthArg ? Number(targetWidthArg) : undefined;
  if (targetWidthArg && (!Number.isFinite(targetWidth) || targetWidth <= 0)) {
    throw new Error(`Invalid --target-width value: ${targetWidthArg}`);
  }

  return {
    inputDir,
    reportDir,
    paddedDir,
    targetWidth,
    background,
  };
}

function listImageFiles(inputDir: string): string[] {
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
  return fs
    .readdirSync(inputDir)
    .filter((name) => allowed.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

function readImageMeta(inputPath: string): { width: number; height: number } {
  const output = execFileSync(
    "magick",
    ["identify", "-format", "%w %h", inputPath],
    { encoding: "utf8" },
  ).trim();
  const [widthToken, heightToken] = output.split(/\s+/);
  const width = Number(widthToken);
  const height = Number(heightToken);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Unable to read dimensions for ${inputPath}`);
  }
  return { width, height };
}

function ensureCleanDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

function padImageToWidth(
  inputPath: string,
  outputPath: string,
  targetWidth: number,
  height: number,
  background: string,
) {
  execFileSync("magick", [
    inputPath,
    "-background",
    background,
    "-gravity",
    "west",
    "-extent",
    `${targetWidth}x${height}`,
    outputPath,
  ]);
}

function buildHtml(
  images: ImageMeta[],
  targetWidth: number,
  reportGeneratedAt: string,
): string {
  const rows = images
    .map((image) => {
      const src = `./padded-images/${image.fileName}`;
      return `
      <div class="row">
        <div class="meta">${image.fileName} (${image.width}x${image.height})</div>
        <div class="img-wrap">
          <img src="${src}" alt="${image.fileName}" loading="lazy" />
          <div class="guide"></div>
        </div>
      </div>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Watermark Alignment Check</title>
    <style>
      body {
        margin: 0;
        padding: 16px;
        background: #0f1115;
        color: #e7ecf3;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      }
      .header {
        margin-bottom: 16px;
        font-size: 13px;
        color: #9bb0d0;
      }
      .rows {
        display: grid;
        gap: 18px;
      }
      .meta {
        font-size: 12px;
        color: #9bb0d0;
        margin-bottom: 6px;
      }
      .img-wrap {
        position: relative;
        width: ${targetWidth}px;
        max-width: 100%;
        border: 1px solid #2a3443;
        border-radius: 6px;
        overflow: hidden;
        background: #111;
      }
      img {
        display: block;
        width: 100%;
        height: auto;
      }
      .guide {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 220px;
        height: 70px;
        border: 1px dashed #ff4d67;
        background: rgba(255, 77, 103, 0.08);
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div class="header">
      generated=${reportGeneratedAt} images=${images.length} targetWidth=${targetWidth}
    </div>
    <div class="rows">
${rows}
    </div>
  </body>
</html>`;
}

function run() {
  const options = parseArgs();
  if (!fs.existsSync(options.inputDir)) {
    throw new Error(`Input directory does not exist: ${options.inputDir}`);
  }

  const files = listImageFiles(options.inputDir);
  if (files.length === 0) {
    throw new Error(`No supported images found in: ${options.inputDir}`);
  }

  fs.mkdirSync(options.reportDir, { recursive: true });
  ensureCleanDir(options.paddedDir);

  const metas: ImageMeta[] = files.map((fileName) => {
    const inputPath = path.join(options.inputDir, fileName);
    const outputPath = path.join(options.paddedDir, fileName);
    const { width, height } = readImageMeta(inputPath);
    return { fileName, inputPath, outputPath, width, height };
  });

  const targetWidth =
    options.targetWidth ?? Math.max(...metas.map((meta) => meta.width));

  for (const meta of metas) {
    padImageToWidth(
      meta.inputPath,
      meta.outputPath,
      targetWidth,
      meta.height,
      options.background,
    );
  }

  const reportGeneratedAt = new Date().toISOString();
  const html = buildHtml(metas, targetWidth, reportGeneratedAt);
  const htmlPath = path.join(options.reportDir, "index.html");
  fs.writeFileSync(htmlPath, html, "utf8");

  console.log(`[watermark-check] Input images: ${metas.length}`);
  console.log(`[watermark-check] Target width: ${targetWidth}`);
  console.log(`[watermark-check] Padded dir: ${options.paddedDir}`);
  console.log(`[watermark-check] HTML: ${htmlPath}`);
}

run();
